import { useState } from 'react';
import { getBalance, getJob } from '../lib/api';
import { useTx } from '../lib/txlog';
import { useWallet } from '../lib/wallet';
import type { Job } from '../lib/types';

export const extractRecord = (input: string): string => {
  const m = input.trim().match(/(\d{1,12})\s*\/?$/);
  return m ? String(Number(m[1])) : '';
};

export function FileForm({ job, onDone, presetRecord }: { job: Job; onDone: () => void; presetRecord?: string }) {
  const { account } = useWallet();
  const { send, busy } = useTx();
  const [raw, setRaw] = useState(presetRecord ?? '');
  const [error, setError] = useState('');
  const rid = extractRecord(raw);

  const submit = async () => {
    setError('');
    if (!account) return setError('Connect your wallet first.');
    if (!rid || rid === '0') return setError('Enter the numeric Zenodo record number (or paste its zenodo.org/records/… link).');
    const before = job.filings;
    const ok = await send({
      action: `file_deposit #${job.id} (record ${rid})`,
      fn: 'file_deposit',
      args: [BigInt(job.id), rid],
      verify: async () => (await getJob(job.id)).filings > before,
    });
    onDone();
    if (!ok) setError('The contract refused this filing or consensus did not complete. See the transaction log for the reason; no filing was used.');
  };

  return (
    <div className="form">
      <label>
        Zenodo record number
        <input value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="e.g. 4242 or https://zenodo.org/records/4242" spellCheck={false} />
      </label>
      {raw && <p className="muted tiny">{rid ? `Will file record ${rid}. Only the number is used, never the link.` : 'No record number found yet.'}</p>}
      {error && <p className="error">{error}</p>}
      <button className="btn" onClick={submit} disabled={busy || !account || job.status !== 'OPEN' || job.filings_left <= 0}>
        {busy ? 'Validators are reading Zenodo…' : 'File deposit for ruling'}
      </button>
      {busy && <p className="muted tiny">Every validator fetches the record itself and judges each term. This can take several minutes.</p>}
    </div>
  );
}

export function SettleButton({ job, onDone, label }: { job: Job; onDone: () => void; label?: string }) {
  const { account } = useWallet();
  const { send, busy } = useTx();
  const run = async () => {
    await send({
      action: `settle #${job.id}`,
      fn: 'settle',
      args: [BigInt(job.id)],
      verify: async () => (await getJob(job.id)).status === 'SETTLED',
    });
    onDone();
  };
  return (
    <button className="btn secondary" onClick={run} disabled={busy || !account || job.status !== 'OPEN'}>
      {busy ? 'Working…' : (label ?? 'Settle the job')}
    </button>
  );
}

export function ClaimButton({ claimable, onDone }: { claimable: string; onDone: () => void }) {
  const { account } = useWallet();
  const { send, busy } = useTx();
  const run = async () => {
    if (!account) return;
    await send({
      action: 'claim',
      fn: 'claim',
      args: [],
      verify: async () => (await getBalance(account)).claimable === '0',
    });
    onDone();
  };
  return (
    <button className="btn" onClick={run} disabled={busy || !account || claimable === '0'}>
      {busy ? 'Working…' : 'Claim my balance'}
    </button>
  );
}
