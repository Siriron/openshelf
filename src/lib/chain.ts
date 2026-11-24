import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { CONTRACT_ADDRESS, STUDIONET } from '../config/chains';

const ADDRESS = CONTRACT_ADDRESS as `0x${string}`;

export class TimeoutError extends Error {
  txHash: string;
  isTimeout = true;
  constructor(hash: string) {
    super('Consensus is taking longer than expected. Your transaction was submitted: check it on the explorer.');
    this.txHash = hash;
  }
}

export class NotDeployedError extends Error {
  constructor() {
    super('The contract address is not set yet (src/config/chains.ts).');
  }
}

export const isRateLimit = (e: unknown) => /429|-32429|rate.?limit/i.test(String((e as Error)?.message ?? e));

export const friendlyError = (e: unknown): string => {
  if (e instanceof TimeoutError || e instanceof NotDeployedError) return e.message;
  if (isRateLimit(e)) return 'StudioNet is rate-limiting this connection. Wait a minute and try again.';
  const m = String((e as Error)?.message ?? e);
  const code = (e as { code?: number })?.code;
  if (code === 4001 || /user rejected|denied/i.test(m)) return 'You rejected the request in your wallet.';
  return m.length > 280 ? `${m.slice(0, 280)}…` : m;
};

export async function ensureChain(): Promise<void> {
  const eth = window.ethereum;
  if (!eth) return;
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET.chainId }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({ method: 'wallet_addEthereumChain', params: [STUDIONET] });
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET.chainId }] });
    } else if (code === -32002) {
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      throw err;
    }
  }
}

const readClient = () => createClient({ chain: studionet });

export async function readJson<T>(functionName: string, args: unknown[] = []): Promise<T> {
  if (!CONTRACT_ADDRESS) throw new NotDeployedError();
  const raw = await readClient().readContract({ address: ADDRESS, functionName, args: args as never });
  return JSON.parse(String(raw)) as T;
}

export interface TxOutcome {
  hash: string;
  status: string; // statusName from the receipt, e.g. ACCEPTED
  exec: string; // txExecutionResultName, e.g. FINISHED_WITH_RETURN; '' if the field is absent
}

export const BAD_STATUSES = ['UNDETERMINED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT', 'CANCELED'];

export async function writeAndWait(
  account: string,
  functionName: string,
  args: unknown[],
  value: bigint = BigInt(0),
  onHash?: (hash: string) => void,
): Promise<TxOutcome> {
  if (!CONTRACT_ADDRESS) throw new NotDeployedError();
  await ensureChain();
  const client = createClient({
    chain: studionet,
    account: account as `0x${string}`, // plain wallet address, never createAccount()
    provider: window.ethereum as never,
  });
  if (typeof (client as unknown as { connect?: unknown }).connect === 'function') {
    try {
      await client.connect('studionet');
    } catch {
      /* optional on some SDK builds */
    }
  }
  const hash = (await client.writeContract({
    address: ADDRESS,
    functionName,
    args: args as never,
    value,
  })) as string;
  onHash?.(hash);
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: hash as never,
      status: TransactionStatus.ACCEPTED,
      retries: 120,
      interval: 4000,
    });
    return { hash, status: String(receipt.statusName ?? ''), exec: String(receipt.txExecutionResultName ?? '') };
  } catch (e) {
    if (isRateLimit(e)) throw e;
    throw new TimeoutError(hash);
  }
}

/** One cheap status read for a transaction the user already sent (used by the "check finality" button). */
export async function txStatus(hash: string): Promise<TxOutcome> {
  const tx = await readClient().getTransaction({ hash: hash as never });
  return { hash, status: String(tx.statusName ?? ''), exec: String(tx.txExecutionResultName ?? '') };
}
