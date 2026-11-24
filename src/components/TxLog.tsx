import { useState } from 'react';
import { explorerTx } from '../config/chains';
import { short } from '../lib/format';
import { useTx } from '../lib/txlog';

export function TxLog() {
  const { entries, text, clear, checkFinality } = useTx();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked */
    }
  };
  return (
    <section className="panel" aria-label="Transaction log">
      <div className="row between">
        <h3>Transaction log</h3>
        <div className="row gap">
          <button className="btn small ghost" onClick={copy} disabled={!entries.length}>
            {copied ? 'Copied' : 'Copy log'}
          </button>
          <button className="btn small ghost" onClick={clear} disabled={!entries.length}>
            Clear
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="muted">No transactions yet. Each write you send appears here with its status, execution result and hash.</p>
      ) : (
        <div className="scroll">
          <table className="log">
            <thead>
              <tr>
                <th>Action</th>
                <th>Status</th>
                <th>Execution</th>
                <th>Outcome</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.action}
                    <div className="muted tiny">{short(e.who)}</div>
                  </td>
                  <td>
                    {e.status}
                    {e.status === 'ACCEPTED' && (
                      <div className="tiny">
                        provisional, appealable{' '}
                        <button className="link" onClick={() => checkFinality(e.id)}>
                          check finality
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{e.exec || 'unknown'}</td>
                  <td>
                    <span className={`pill ${e.ok === null ? 'wait' : e.ok ? 'good' : 'bad'}`}>
                      {e.ok === null ? 'pending' : e.ok ? 'state changed' : 'no change'}
                    </span>
                    {e.note && <div className="tiny muted">{e.note}</div>}
                  </td>
                  <td>
                    {e.hash ? (
                      <a href={explorerTx(e.hash)} target="_blank" rel="noreferrer">
                        {short(e.hash)}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
