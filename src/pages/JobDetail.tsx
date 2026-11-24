import { Link, useParams } from 'react-router-dom';
import { ClaimButton, FileForm, SettleButton } from '../components/Actions';
import { RulingView } from '../components/RulingView';
import { TxLog } from '../components/TxLog';
import { CONTRACT_ADDRESS, explorerAddress, IS_DEPLOYED } from '../config/chains';
import { gen, sameAddr, short, when } from '../lib/format';
import { useJob } from '../lib/useJob';
import { useWallet } from '../lib/wallet';

export function CopyToken({ token }: { token: string }) {
  const copy = () => navigator.clipboard?.writeText(token).catch(() => undefined);
  return (
    <div className="token">
      <code>{token}</code>
      <button className="btn small ghost" onClick={copy}>
        Copy
      </button>
    </div>
  );
}

export function JobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const valid = Number.isInteger(jobId) && jobId >= 1;
  const { account } = useWallet();
  const { job, balances, loading, error, refresh } = useJob(valid ? jobId : null);

  if (!valid) return <div className="page narrow"><h1>No such job</h1><Link to="/jobs">Back to jobs</Link></div>;
  if (!IS_DEPLOYED) return <div className="page narrow"><h1>Job #{jobId}</h1><p className="notice">The contract is not deployed yet, so there is nothing to read.</p></div>;
  if (error) return <div className="page narrow"><h1>Job #{jobId}</h1><p className="error">{error}</p><button className="btn" onClick={refresh}>Try again</button></div>;
  if (!job) return <div className="page narrow"><h1>Job #{jobId}</h1><p className="muted">{loading ? 'Reading the contract…' : 'Not found.'}</p></div>;

  const isClient = sameAddr(account, job.client);
  const isProvider = sameAddr(account, job.provider);
  const now = Math.floor(Date.now() / 1000);
  const settleOpen = job.status === 'OPEN' && (isProvider || now > job.deadline || job.filings_left <= 0);
  const mine = isClient ? balances.client : isProvider ? balances.provider : '0';

  return (
    <div className="page">
      <div className="row between wrap">
        <div>
          <p className="eyebrow">Job #{job.id}</p>
          <h1>{job.title}</h1>
        </div>
        <div className="row gap">
          <span className={`pill ${job.status === 'SETTLED' ? 'good' : 'wait'}`}>{job.status}</span>
          <button className="btn small ghost" onClick={refresh} disabled={loading}>{loading ? 'Reading…' : 'Refresh'}</button>
        </div>
      </div>

      <section className="panel">
        <dl className="facts">
          <dt>Escrowed fee</dt><dd>{gen(job.fee)}</dd>
          <dt>Client</dt><dd>{short(job.client)} {isClient && <span className="pill wait">you</span>}</dd>
          <dt>Provider</dt><dd>{short(job.provider)} {isProvider && <span className="pill wait">you</span>}</dd>
          <dt>Opened</dt><dd>{when(job.opened)}</dd>
          <dt>Deadline</dt><dd>{when(job.deadline)}</dd>
          <dt>Filings left</dt><dd>{job.filings_left} of 3</dd>
          {job.status === 'SETTLED' && (<><dt>Provider share</dt><dd>{gen(job.provider_credit)}</dd><dt>Client share</dt><dd>{gen(job.client_credit)}</dd></>)}
        </dl>
        <h3>Delivery terms (locked at opening)</h3>
        <ol className="plain">{job.terms.map((t, i) => <li key={i}>{t}</li>)}</ol>
      </section>

      {job.status === 'OPEN' && (
        <section className="panel">
          <h3>Claim token</h3>
          <p>
            The provider must put this exact token in the <b>description, title or keywords</b> of their Zenodo record. Only the depositor can edit
            a record, so this is what proves the record is theirs. The record must also have been created after this job opened.
          </p>
          <CopyToken token={job.token} />
        </section>
      )}

      {job.status === 'OPEN' && isProvider && (
        <section className="panel">
          <h3>File a deposit</h3>
          <FileForm job={job} onDone={refresh} />
        </section>
      )}
      {job.status === 'OPEN' && !isProvider && (
        <p className="muted">Only the provider wallet can file a deposit{account ? '' : '. Connect a wallet to act'}.</p>
      )}

      {job.last_ruling && <RulingView job={job} ruling={job.last_ruling} title="Latest ruling" />}
      {job.best_ruling && job.last_ruling && job.best_ruling.at !== job.last_ruling.at && <RulingView job={job} ruling={job.best_ruling} title="Best ruling (this one sets the payout)" />}

      {job.status === 'OPEN' && (
        <section className="panel">
          <h3>Settle</h3>
          <p>
            Payout is the fee times terms met over total terms, using the best ruling. {isProvider ? 'As the provider you can accept the current result now.' : 'Settling opens after the deadline, or once all three filings are used.'}
          </p>
          {settleOpen ? <SettleButton job={job} onDone={refresh} /> : <p className="muted tiny">Not open to your wallet yet.</p>}
        </section>
      )}

      {(isClient || isProvider) && (
        <section className="panel">
          <h3>Your balance</h3>
          <p>{gen(mine)} claimable.</p>
          <ClaimButton claimable={mine} onDone={refresh} />
          <p className="muted tiny">Payouts are queued until the transaction is finalized; until then a ruling is provisional and can be appealed.</p>
        </section>
      )}

      <TxLog />
      <p className="muted tiny">Contract <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">{short(CONTRACT_ADDRESS)}</a> on StudioNet.</p>
    </div>
  );
}
