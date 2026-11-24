import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ClaimButton, FileForm, SettleButton } from '../components/Actions';
import { OpenJobForm } from '../components/OpenJobForm';
import { RulingView } from '../components/RulingView';
import { TxLog } from '../components/TxLog';
import { IS_DEPLOYED } from '../config/chains';
import { getJobs } from '../lib/api';
import { gen, sameAddr, short } from '../lib/format';
import { useTx } from '../lib/txlog';
import { useJob } from '../lib/useJob';
import { useWallet } from '../lib/wallet';
import { CopyToken } from './JobDetail';

type Kind = 'open' | 'prepare' | 'file' | 'verdict' | 'wait' | 'settle' | 'claim-provider' | 'claim-client';
type Who = 'Client wallet' | 'Provider wallet' | 'Any wallet' | 'Off-chain';

interface StepDef { kind: Kind; who: Who; title: string; text: string }
interface Scenario { key: string; name: string; blurb: string; expected: string; terms: string; days: number; steps: StepDef[] }
interface Run { id: string; scenario: string; createdAt: number; jobId: number | null }

const BASE_TERMS = [
  'The license is an open license such as CC-BY-4.0 or CC0',
  'At least one CSV data file is included',
  'The description says how the data was collected',
];

const OPEN: StepDef = { kind: 'open', who: 'Client wallet', title: 'Open the job', text: 'The client escrows the fee and locks the terms. The form below is pre-filled; add the provider wallet (a second wallet you control) and send.' };
const PREPARE: StepDef = { kind: 'prepare', who: 'Off-chain', title: 'Publish the dataset on Zenodo', text: 'Done outside this app, with the provider account. It is confirmed by the filing step on-chain.' };

const SCENARIOS: Scenario[] = [
  {
    key: 'full', name: 'Full delivery: paid at once',
    blurb: 'The provider deposits a record that satisfies every term.',
    expected: 'All 3 terms MET. The job settles immediately and the provider can claim the whole fee.',
    terms: BASE_TERMS.join('\n'), days: 7,
    steps: [OPEN, PREPARE,
      { kind: 'file', who: 'Provider wallet', title: 'File the record', text: 'Switch to the provider wallet and file the Zenodo record number. Validators fetch the record themselves.' },
      { kind: 'verdict', who: 'Any wallet', title: 'Read the ruling', text: 'Done when the contract holds a ruling with every term MET and the job is SETTLED.' },
      { kind: 'claim-provider', who: 'Provider wallet', title: 'Provider claims the fee', text: 'Pull-based: the balance is credited at settlement and moved only when claimed.' }],
  },
  {
    key: 'partial', name: 'Partial delivery: fee split by terms met',
    blurb: 'One term is deliberately unmet, so only part of the fee is earned.',
    expected: '2 of 3 terms MET (the record has no file named LICENSE.txt). Provider share = fee × 2 ÷ 3, client keeps the rest.',
    terms: [...BASE_TERMS.slice(0, 2), 'A file named LICENSE.txt is included in the deposit'].join('\n'), days: 7,
    steps: [OPEN, PREPARE,
      { kind: 'file', who: 'Provider wallet', title: 'File the record', text: 'File a record that meets the first two terms but has no LICENSE.txt file.' },
      { kind: 'verdict', who: 'Any wallet', title: 'Read the ruling', text: 'Done when the contract holds a ruling. The job stays OPEN: not every term is met.' },
      { kind: 'settle', who: 'Provider wallet', title: 'Provider accepts the partial result', text: 'The provider may settle early. Anyone may settle after the deadline or after three filings.' },
      { kind: 'claim-provider', who: 'Provider wallet', title: 'Provider claims their share', text: 'Two thirds of the fee.' },
      { kind: 'claim-client', who: 'Client wallet', title: 'Client claims the remainder', text: 'The unearned third comes back to the client.' }],
  },
  {
    key: 'refused', name: 'Wrong record: refused, no filing used',
    blurb: 'The provider files a record that does not carry the job token (or was created before the job).',
    expected: 'The contract refuses the filing at its deterministic gate. The job still shows 0 filings used.',
    terms: BASE_TERMS.join('\n'), days: 7,
    steps: [OPEN,
      { kind: 'prepare', who: 'Off-chain', title: 'Pick a record without the token', text: 'Use any public Zenodo record whose text does NOT contain this job’s token, or one created before the job opened.' },
      { kind: 'file', who: 'Provider wallet', title: 'File it and expect a refusal', text: 'Done only when the log shows the refused filing and the job still has 0 filings used.' }],
  },
  {
    key: 'noshow', name: 'No-show: client refunded after the deadline',
    blurb: 'Nothing is ever filed. After the deadline anyone can settle.',
    expected: 'The whole fee returns to the client. Needs a real wait: the shortest deadline is 1 day.',
    terms: BASE_TERMS.join('\n'), days: 1,
    steps: [OPEN,
      { kind: 'wait', who: 'Off-chain', title: 'Wait for the deadline', text: 'Done when the clock passes the job deadline. Come back with this run ID.' },
      { kind: 'settle', who: 'Any wallet', title: 'Settle', text: 'After the deadline any wallet can settle; no filing means the client gets everything.' },
      { kind: 'claim-client', who: 'Client wallet', title: 'Client claims the refund', text: 'The full fee.' }],
  },
];

const RUNS_KEY = 'openshelf.guide.runs.v1';
const CUR_KEY = 'openshelf.guide.current.v1';
const loadRuns = (): Record<string, Run> => { try { return JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}') as Record<string, Run>; } catch { return {}; } };
const saveRuns = (r: Record<string, Run>) => { try { localStorage.setItem(RUNS_KEY, JSON.stringify(r)); } catch { /* ignore */ } };
const newId = () => `run-${Math.random().toString(36).slice(2, 8)}`;

export function Guide() {
  const { account, connect } = useWallet();
  const { entries } = useTx();
  const [runs, setRuns] = useState<Record<string, Run>>(loadRuns);
  const [currentId, setCurrentId] = useState<string>(() => { try { return localStorage.getItem(CUR_KEY) ?? ''; } catch { return ''; } });
  const [pick, setPick] = useState(SCENARIOS[0].key);
  const [resume, setResume] = useState('');
  const [note, setNote] = useState('');
  const run = currentId ? runs[currentId] ?? null : null;
  const scenario = SCENARIOS.find((s) => s.key === (run?.scenario ?? pick)) ?? SCENARIOS[0];
  const { job, balances, loading, error, refresh } = useJob(run?.jobId ?? null);

  const persist = useCallback((next: Record<string, Run>, cur: string) => {
    setRuns(next); saveRuns(next); setCurrentId(cur);
    try { localStorage.setItem(CUR_KEY, cur); } catch { /* ignore */ }
  }, []);

  const startRun = () => {
    const r: Run = { id: newId(), scenario: pick, createdAt: Date.now(), jobId: null };
    persist({ ...runs, [r.id]: r }, r.id);
    setNote('');
  };
  const clearRun = () => { persist({}, ''); setNote('All guide runs cleared from this browser. On-chain jobs are not affected.'); };
  const doResume = async () => {
    const id = resume.trim();
    if (!id) return;
    if (runs[id]) { persist(runs, id); setNote(`Resumed ${id}.`); return; }
    // unknown on this browser: look for the run tag in the latest jobs' titles
    try {
      const first = await getJobs(0, 1);
      const page = await getJobs(Math.max(0, first.total - 25), 25);
      const found = page.jobs.find((j) => j.title.includes(`[${id}]`));
      if (!found) return setNote(`No run ${id} here and no job tagged [${id}] in the latest 25 jobs.`);
      const sc = SCENARIOS.find((s) => found.title.includes(s.name))?.key ?? SCENARIOS[0].key;
      persist({ ...runs, [id]: { id, scenario: sc, createdAt: Date.now(), jobId: found.id } }, id);
      setNote(`Rebuilt ${id} from job #${found.id}.`);
    } catch { setNote('Could not look the run up right now.'); }
  };

  const failedFile = useMemo(
    () => entries.some((e) => job && e.action.startsWith(`file_deposit #${job.id}`) && e.ok === false),
    [entries, job],
  );

  const done = (s: StepDef): boolean => {
    if (s.kind === 'open') return !!job;
    if (!job) return false;
    const settled = job.status === 'SETTLED';
    switch (s.kind) {
      case 'prepare': return scenario.key === 'refused' ? failedFile && job.filings === 0 : job.filings > 0 || settled;
      case 'file': return scenario.key === 'refused' ? failedFile && job.filings === 0 : job.filings >= 1;
      case 'verdict': return job.last_ruling !== null;
      case 'wait': return Date.now() / 1000 > job.deadline;
      case 'settle': return settled;
      case 'claim-provider': return settled && BigInt(job.provider_credit) > BigInt(0) && balances.provider === '0';
      case 'claim-client': return settled && BigInt(job.client_credit) > BigInt(0) && balances.client === '0';
      default: return false;
    }
  };

  const activeIndex = scenario.steps.findIndex((s) => !done(s));
  const roleOk = (w: Who) => w === 'Any wallet' || w === 'Off-chain' || (job && (w === 'Client wallet' ? sameAddr(account, job.client) : sameAddr(account, job.provider)));

  const action = (s: StepDef): ReactNode => {
    if (s.kind === 'open' && run) {
      return (
        <OpenJobForm
          key={run.id}
          defaults={{ title: `[${run.id}] ${scenario.name}`, terms: scenario.terms, days: scenario.days, fee: '1' }}
          onCreated={(id) => { persist({ ...runs, [run.id]: { ...run, jobId: id } }, run.id); }}
        />
      );
    }
    if (!job) return null;
    if (s.kind === 'prepare') {
      return (
        <div>
          {scenario.key === 'refused' ? <p>Do <b>not</b> use the token below.</p> : <p>Put this token in the record’s description, title or keywords before publishing. Create the record after the job opened.</p>}
          <CopyToken token={job.token} />
          {scenario.key === 'full' && <ul className="plain"><li>License: CC-BY-4.0 or CC0</li><li>Include a .csv file</li><li>Describe how the data was collected</li></ul>}
          {scenario.key === 'partial' && <ul className="plain"><li>License CC-BY-4.0, a .csv file, a collection description</li><li>No file named LICENSE.txt</li></ul>}
        </div>
      );
    }
    if (s.kind === 'file') return <FileForm job={job} onDone={refresh} />;
    if (s.kind === 'settle') return <SettleButton job={job} onDone={refresh} />;
    if (s.kind === 'claim-provider') return <ClaimButton claimable={balances.provider} onDone={refresh} />;
    if (s.kind === 'claim-client') return <ClaimButton claimable={balances.client} onDone={refresh} />;
    if (s.kind === 'verdict' || s.kind === 'wait') return <button className="btn small ghost" onClick={refresh} disabled={loading}>{loading ? 'Reading…' : 'Refresh from chain'}</button>;
    return null;
  };

  return (
    <div className="page">
      <h1>Test guide</h1>
      <p className="lead">Walk a real scenario end to end. A step turns done only when the contract’s on-chain state shows its result, never because you clicked.</p>
      {!IS_DEPLOYED && <p className="notice">The contract is not deployed yet. You can read the scenarios, but steps cannot run until its address is set in <code>src/config/chains.ts</code>.</p>}
      {!account && <p className="notice">Connect a wallet to act. You will need two wallets: one as the client, one as the provider.</p>}
      {!account && <button className="btn small" onClick={connect}>Connect wallet</button>}

      <section className="panel">
        <label>
          Scenario
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
          </select>
        </label>
        <p>{SCENARIOS.find((s) => s.key === pick)?.blurb}</p>
        <p><b>Expected outcome:</b> {SCENARIOS.find((s) => s.key === pick)?.expected}</p>
        <div className="row gap wrap">
          <button className="btn" onClick={startRun}>New run</button>
          <input className="inline" value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Resume run ID, e.g. run-ab12cd" />
          <button className="btn secondary" onClick={doResume}>Resume</button>
          <button className="btn ghost" onClick={refresh} disabled={!run?.jobId || loading}>Refresh</button>
          <button className="btn ghost" onClick={clearRun}>Clear</button>
        </div>
        {note && <p className="muted">{note}</p>}
      </section>

      {run && (
        <section className="panel">
          <div className="row between wrap">
            <h3>Run <code>{run.id}</code></h3>
            <span className="muted tiny">{scenario.name}{job ? ` · job #${job.id}` : ''}</span>
          </div>
          {run.scenario !== pick && <p className="muted tiny">The dropdown shows another scenario; press “New run” to switch. This run keeps its own.</p>}
          {error && <p className="error">{error}</p>}
          <ol className="steps">
            {scenario.steps.map((s, i) => {
              const d = done(s);
              const active = i === activeIndex;
              return (
                <li key={i} className={d ? 'done' : active ? 'active' : ''}>
                  <div className="row between wrap">
                    <b>{i + 1}. {s.title}</b>
                    <span className="row gap"><span className="pill wait">{s.who}</span><span className={`pill ${d ? 'good' : 'wait'}`}>{d ? 'done on-chain' : active ? 'next' : 'waiting'}</span></span>
                  </div>
                  <p className="muted">{s.text}</p>
                  {active && job && !roleOk(s.who) && (
                    <p className="notice">Switch your wallet to the {s.who === 'Client wallet' ? 'client' : 'provider'} account ({short(s.who === 'Client wallet' ? job.client : job.provider)}).</p>
                  )}
                  {active && action(s)}
                </li>
              );
            })}
          </ol>
          {job && (
            <p className="muted tiny">
              Job #{job.id}: {job.status}, {job.filings} filing(s) used, best {job.best_met}/{job.terms.length} terms met. Claimable: client {gen(balances.client)}, provider {gen(balances.provider)}.
            </p>
          )}
          {job?.last_ruling && <RulingView job={job} ruling={job.last_ruling} title="Latest ruling" />}
        </section>
      )}
      <TxLog />
    </div>
  );
}
