import { useState } from 'react';
import { getLastJob } from '../lib/api';
import { toWei } from '../lib/format';
import { useTx } from '../lib/txlog';
import { useWallet } from '../lib/wallet';

export interface JobDefaults {
  title?: string;
  terms?: string;
  provider?: string;
  days?: number;
  fee?: string;
}

const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function OpenJobForm({ defaults, onCreated }: { defaults?: JobDefaults; onCreated: (jobId: number) => void }) {
  const { account } = useWallet();
  const { send, busy } = useTx();
  const [title, setTitle] = useState(defaults?.title ?? '');
  const [terms, setTerms] = useState(defaults?.terms ?? '');
  const [provider, setProvider] = useState(defaults?.provider ?? '');
  const [days, setDays] = useState(String(defaults?.days ?? 7));
  const [fee, setFee] = useState(defaults?.fee ?? '1');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!account) return setError('Connect your wallet first.');
    const lines = terms.split('\n').map((t) => t.trim()).filter(Boolean);
    if (lines.length < 1 || lines.length > 5) return setError('Give 1 to 5 delivery terms, one per line.');
    if (lines.some((t) => t.length < 8 || t.length > 200)) return setError('Each term must be 8 to 200 characters.');
    if (!ADDR.test(provider.trim())) return setError('The provider must be a full 0x wallet address.');
    if (provider.trim().toLowerCase() === account.toLowerCase()) return setError('The provider must be a different wallet from yours.');
    const d = Number(days);
    if (!Number.isInteger(d) || d < 1 || d > 30) return setError('The deadline must be 1 to 30 days.');
    let wei: bigint;
    try {
      wei = toWei(fee);
    } catch {
      return setError('The fee must be a number, for example 1 or 0.5.');
    }
    if (wei <= BigInt(0)) return setError('The fee must be above zero.');
    let before = 0;
    try {
      before = (await getLastJob(account)).job_id;
    } catch {
      /* first job, or the read failed: the verify step below re-reads */
    }
    const ok = await send({
      action: 'open_job',
      fn: 'open_job',
      args: [title.trim() || 'Untitled dataset job', lines.join('\n'), provider.trim().toLowerCase(), BigInt(d)],
      value: wei,
      verify: async () => (await getLastJob(account)).job_id > before,
    });
    if (ok) onCreated((await getLastJob(account)).job_id);
  };

  return (
    <div className="form">
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Coastal survey 2026 dataset" />
      </label>
      <label>
        Delivery terms (one per line, 1 to 5)
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5} placeholder="The license must be an open license such as CC-BY or CC0" />
      </label>
      <div className="grid2">
        <label>
          Provider wallet (the one who will deposit)
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="0x…" spellCheck={false} />
        </label>
        <label>
          Fee to escrow (GEN)
          <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Deadline (days, 1 to 30)
          <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" onClick={submit} disabled={busy || !account}>
        {busy ? 'Waiting for validators…' : 'Escrow the fee and open the job'}
      </button>
      {busy && <p className="muted tiny">Writes go through consensus and can take several minutes. Keep this tab open.</p>}
      <p className="muted tiny">The terms are locked the moment the job opens, before any work exists. Nobody can reword them later.</p>
    </div>
  );
}
