import { kb, when } from '../lib/format';
import type { Job, Ruling } from '../lib/types';

export function RulingView({ job, ruling, title }: { job: Job; ruling: Ruling; title: string }) {
  const r = ruling.record;
  return (
    <section className="panel">
      <div className="row between">
        <h3>{title}</h3>
        <span className={`pill ${ruling.met === ruling.total ? 'good' : ruling.met === 0 ? 'bad' : 'wait'}`}>
          {ruling.met} of {ruling.total} terms met
        </span>
      </div>
      <ol className="terms">
        {job.terms.map((t, i) => (
          <li key={i}>
            <span className={`pill ${ruling.statuses[i] === 'MET' ? 'good' : 'bad'}`}>{ruling.statuses[i] === 'MET' ? 'MET' : 'NOT MET'}</span>
            <div>
              {t}
              {ruling.reasons[i] && <div className="muted tiny">{ruling.reasons[i]}</div>}
            </div>
          </li>
        ))}
      </ol>
      {ruling.note && <p className="muted">{ruling.note}</p>}
      <details>
        <summary>What the validators read (Zenodo record {ruling.record_id})</summary>
        <dl className="facts">
          <dt>Title</dt>
          <dd>{r.title || '-'}</dd>
          <dt>License</dt>
          <dd>{r.license || '-'}</dd>
          <dt>Access / type</dt>
          <dd>
            {r.access || '-'} / {r.kind || '-'}
          </dd>
          <dt>Created</dt>
          <dd>{when(r.created)}</dd>
          <dt>Claim token present</dt>
          <dd>{r.token_found ? 'yes' : 'no'}</dd>
          <dt>Files</dt>
          <dd>
            {r.files_total} file(s), {kb(r.bytes_total)}
            <ul className="files">
              {r.files.map((f) => (
                <li key={f.name + f.md5}>
                  {f.name} <span className="muted">({kb(f.size)})</span>
                </li>
              ))}
            </ul>
          </dd>
          <dt>Description</dt>
          <dd>{r.description || '-'}</dd>
        </dl>
      </details>
    </section>
  );
}
