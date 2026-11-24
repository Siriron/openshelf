import { Link } from 'react-router-dom';
import { IS_DEPLOYED } from '../config/chains';

export function Home() {
  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">Escrow for open science</p>
        <h1>Pay for a dataset only when the public record proves it.</h1>
        <p className="lead">
          A client escrows a fee and writes delivery terms in plain language. The provider deposits the data on Zenodo. GenLayer validators read
          Zenodo’s own record and judge every term separately, so the fee splits by what was actually delivered.
        </p>
        <div className="row gap wrap">
          <Link className="btn" to="/new">Open a job</Link>
          <Link className="btn secondary" to="/guide">Walk through a test</Link>
          <Link className="btn ghost" to="/docs">How it works</Link>
        </div>
        {!IS_DEPLOYED && <p className="notice">X</p>}
      </section>

      <section className="cards three">
        <div className="card static"><b>1. Terms are locked first</b><p className="muted">The fee is escrowed and 1 to 5 terms are fixed before any work exists. Nobody can reword “done” afterwards.</p></div>
        <div className="card static"><b>2. The record is the evidence</b><p className="muted">The provider files only a record number. Validators derive the Zenodo address themselves, and the record must carry a token only its depositor can place.</p></div>
        <div className="card static"><b>3. Every term gets a verdict</b><p className="muted">Validators must agree on the record and on each term. Code, not a model, splits the fee: fee × terms met ÷ terms.</p></div>
      </section>

      <section className="panel">
        <h3>Why a blockchain judge and not a form</h3>
        <p>
          The commissioner gains from “not met” and the provider from “met”, and Zenodo only <i>records</i> a deposit; it cannot say whether the deposit
          satisfies a deal written in words. Independent validators re-reading the same public record is what makes that judgment hard to bend.
        </p>
        <p className="muted tiny">Nothing here is a wager: the payout is a deterministic consequence of a judged, evidence-based verdict.</p>
      </section>
    </div>
  );
}
