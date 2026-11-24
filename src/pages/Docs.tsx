const API: [string, string, string][] = [
  ['open_job(title, terms, provider, days)', 'write, payable', 'Escrows the sent GEN as the fee, locks 1 to 5 terms (one per line, 8 to 200 chars), the provider and a 1 to 30 day deadline. Returns id, fee, token, deadline.'],
  ['file_deposit(job_id, record_id)', 'write, consensus', 'Provider only. Validators fetch zenodo.org/api/records/<id>, apply the gates, judge each term. Up to 3 filings per job. All terms met settles at once.'],
  ['settle(job_id)', 'write', 'Provider any time; anyone after the deadline or after 3 filings. Credits fee × best_met ÷ terms to the provider and the rest to the client.'],
  ['claim()', 'write', 'Moves the caller’s credited balance. Zeroed and persisted before the transfer.'],
  ['get_job(job_id)', 'view', 'Full job with terms, token, deadline and the latest and best rulings.'],
  ['get_jobs(offset, limit)', 'view', 'Paged list, 25 at most.'],
  ['get_balance(address)', 'view', 'Claimable wei as a string. Address casing is normalised.'],
  ['get_last_job(address)', 'view', 'The newest job id opened by that client (never a global counter).'],
];

export function Docs() {
  return (
    <div className="page narrow docs">
      <h1>Documentation</h1>
      <nav className="toc">
        {['overview', 'how', 'architecture', 'contract', 'api', 'faq', 'status'].map((a) => <a key={a} href={`#${a}`}>{a}</a>)}
      </nav>

      <h2 id="overview">Overview</h2>
      <p>OpenShelf is an escrow for open-science dataset deposits. The client pays for what the public record proves, term by term.</p>

      <h2 id="how">How it works</h2>
      <ol className="plain">
        <li>The client opens a job: title, 1 to 5 plain-language terms, the provider’s wallet, a deadline, and the fee in GEN.</li>
        <li>The contract derives a claim token from the job id and the provider’s address.</li>
        <li>The provider publishes a dataset on Zenodo with the token in its description, title or keywords, then files the record number.</li>
        <li>Each validator fetches the record, reduces it to fixed facts, and judges every term. They must agree on the record and on each verdict.</li>
        <li>Plain code splits the fee. Each party withdraws its own credit with <code>claim()</code>.</li>
      </ol>

      <h2 id="architecture">Architecture</h2>
      <p><b>Frontend owns:</b> wallet connection, reads, forms, the test guide. <b>Contract owns:</b> escrow, locked terms, the gates, the verdict comparison rule, the fee arithmetic, the exits. <b>Zenodo owns:</b> the record itself.</p>
      <table className="log">
        <thead><tr><th>Host</th><th>URL pattern</th><th>Fetch</th><th>Deciding fields</th></tr></thead>
        <tbody><tr><td>zenodo.org</td><td>/api/records/&lt;digits&gt; (from the filed number, never a URL)</td><td>web.get</td><td>id (identity echo), status, created, metadata.title/description/keywords/license/access_right/resource_type/creators, files[].key/size/checksum</td></tr></tbody>
      </table>
      <p><b>Deterministic gates</b> (a failing gate refuses the filing and uses none of the three): the record’s own id equals the filed number; it is published; it carries this job’s token; it was created after the job opened; it has not served another job.</p>

      <h2 id="contract">Smart contract</h2>
      <p>One Python contract on GenVM (<code>contracts/openshelf.py</code>). Validators compare the whole reduced record and every term verdict with zero tolerance; the reasons are shown but not compared. The fee split is never a model output. Every fee has a bounded exit: the provider may settle early, anyone may settle after the deadline or once the filings are used.</p>

      <h2 id="api">API reference</h2>
      <div className="scroll">
        <table className="log"><thead><tr><th>Method</th><th>Kind</th><th>Behaviour</th></tr></thead>
          <tbody>{API.map(([m, k, d]) => <tr key={m}><td><code>{m}</code></td><td>{k}</td><td>{d}</td></tr>)}</tbody></table>
      </div>

      <h2 id="faq">FAQ</h2>
      <p><b>Can the provider file someone else’s dataset?</b> No. The record must contain a token derived from this job and their address; only a record’s depositor can put text in it.</p>
      <p><b>Can a record be reused?</b> Not across jobs. The same job may re-file the same record after fixing its metadata.</p>
      <p><b>What if validators cannot reach Zenodo?</b> The filing reverts as transient and costs no filing.</p>
      <p><b>Is a ruling final?</b> Accepted means validators agreed and it is still appealable. Payouts are queued until finalization.</p>
      <p><b>Are file contents read?</b> No. Terms are judged from the title, description, keywords, license, access, type, creators and the file names, sizes and counts.</p>

      <h2 id="status">Testing status</h2>
      <p>
        The repository’s direct-mode tests execute the real contract under the GenVM SDK (pinned v0.2.16) and mock only Zenodo and the model. They prove the state
        machine, gates, fee arithmetic, validator agreement rules and error handling. They do <b>not</b> prove real model behaviour, the live Zenodo payload beyond
        its documented fields, or real multi-node timing. StudioNet is a temporary test network: deployed addresses may not survive resets, so the tests are the proof, not the address.
      </p>
    </div>
  );
}
