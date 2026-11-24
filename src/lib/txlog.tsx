import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { BAD_STATUSES, friendlyError, TimeoutError, txStatus, writeAndWait } from './chain';
import { useWallet } from './wallet';

export interface TxEntry {
  id: string;
  at: number;
  action: string;
  who: string;
  status: string; // PENDING | ACCEPTED | FINALIZED | ERROR ...
  exec: string; // execution result name or '' when unknown
  hash: string;
  note: string;
  ok: boolean | null; // null = still pending; ok means the on-chain state really changed
}

interface SendArgs {
  action: string;
  fn: string;
  args: unknown[];
  value?: bigint;
  /** Re-reads contract state and says whether the write really took effect. Success is never inferred from ACCEPTED alone. */
  verify: () => Promise<boolean>;
}

interface Ctx {
  entries: TxEntry[];
  busy: boolean;
  send: (a: SendArgs) => Promise<boolean>;
  checkFinality: (id: string) => Promise<void>;
  clear: () => void;
  text: () => string;
}

const KEY = 'openshelf.txlog.v1';
const Context = createContext<Ctx | null>(null);

const load = (): TxEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as TxEntry[];
  } catch {
    return [];
  }
};
const save = (e: TxEntry[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(e.slice(-60)));
  } catch {
    /* storage can be unavailable */
  }
};

export function TxProvider({ children }: { children: ReactNode }) {
  const { account } = useWallet();
  const [entries, setEntries] = useState<TxEntry[]>(load);
  const [busy, setBusy] = useState(false);

  const patch = useCallback((id: string, p: Partial<TxEntry>) => {
    setEntries((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...p } : e));
      save(next);
      return next;
    });
  }, []);

  const send = useCallback(
    async ({ action, fn, args, value, verify }: SendArgs) => {
      if (!account) return false;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const base: TxEntry = { id, at: Date.now(), action, who: account, status: 'PENDING', exec: '', hash: '', note: '', ok: null };
      setEntries((prev) => {
        const next = [...prev, base];
        save(next);
        return next;
      });
      setBusy(true);
      try {
        const out = await writeAndWait(account, fn, args, value, (hash) => patch(id, { hash }));
        let ok = false;
        let note = '';
        if (BAD_STATUSES.includes(out.status)) {
          note = `Consensus ended as ${out.status}. Nothing changed.`;
        } else if (out.exec && out.exec !== 'FINISHED_WITH_RETURN') {
          note = `The contract rejected the call (${out.exec}). Open the transaction for the reason.`;
        } else {
          ok = await verify();
          if (!ok) note = 'Accepted by validators, but the contract state did not change: the call was refused by the contract.';
        }
        patch(id, { status: out.status || 'ACCEPTED', exec: out.exec, hash: out.hash, ok, note });
        return ok;
      } catch (e) {
        patch(id, {
          status: e instanceof TimeoutError ? 'TIMEOUT' : 'ERROR',
          hash: e instanceof TimeoutError ? e.txHash : '',
          note: friendlyError(e),
          ok: false,
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [account, patch],
  );

  const checkFinality = useCallback(
    async (id: string) => {
      const e = entries.find((x) => x.id === id);
      if (!e || !e.hash) return;
      try {
        const out = await txStatus(e.hash);
        patch(id, { status: out.status || e.status, exec: out.exec || e.exec });
      } catch (err) {
        patch(id, { note: friendlyError(err) });
      }
    },
    [entries, patch],
  );

  const clear = useCallback(() => {
    setEntries([]);
    save([]);
  }, []);

  const text = useCallback(
    () =>
      entries
        .map(
          (e) =>
            `${new Date(e.at).toISOString()} | ${e.action} | by ${e.who} | status ${e.status} | execution ${e.exec || 'unknown'} | ${e.ok === null ? 'pending' : e.ok ? 'state changed' : 'no change'} | tx ${e.hash || '-'}${e.note ? ` | ${e.note}` : ''}`,
        )
        .join('\n'),
    [entries],
  );

  const value = useMemo(() => ({ entries, busy, send, checkFinality, clear, text }), [entries, busy, send, checkFinality, clear, text]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTx(): Ctx {
  const v = useContext(Context);
  if (!v) throw new Error('useTx must be used inside TxProvider');
  return v;
}
