import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs } from '../lib/api';
import { friendlyError } from '../lib/chain';
import { gen, short } from '../lib/format';
import { IS_DEPLOYED } from '../config/chains';
import type { Job } from '../lib/types';

export function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!IS_DEPLOYED) return;
    setLoading(true);
    setError('');
    try {
      const first = await getJobs(0, 1);
      const start = Math.max(0, first.total - 25);
      const page = await getJobs(start, 25);
      setTotal(page.total);
      setJobs([...page.jobs].reverse());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page">
      <div className="row between wrap">
        <h1>Jobs on the shelf</h1>
        <div className="row gap">
          <button className="btn small ghost" onClick={load} disabled={loading}>{loading ? 'Reading…' : 'Refresh'}</button>
          <Link className="btn small" to="/new">Open a job</Link>
        </div>
      </div>
      {!IS_DEPLOYED && <p className="notice">The contract is not deployed yet. Once its address is set in <code>src/config/chains.ts</code>, jobs appear here.</p>}
      {error && <p className="error">{error}</p>}
      {IS_DEPLOYED && !loading && !error && jobs.length === 0 && <p className="muted">No jobs yet. Open the first one.</p>}
      <div className="cards">
        {jobs.map((j) => (
          <Link className="card" key={j.id} to={`/jobs/${j.id}`}>
            <div className="row between">
              <b>#{j.id} {j.title}</b>
              <span className={`pill ${j.status === 'SETTLED' ? 'good' : 'wait'}`}>{j.status}</span>
            </div>
            <div className="muted tiny">{gen(j.fee)} · {j.terms.length} terms · {j.best_met}/{j.terms.length} met · provider {short(j.provider)}</div>
          </Link>
        ))}
      </div>
      {total > 25 && <p className="muted tiny">Showing the latest 25 of {total}.</p>}
    </div>
  );
}
