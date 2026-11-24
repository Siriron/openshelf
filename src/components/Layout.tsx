import { NavLink, Outlet } from 'react-router-dom';
import { short } from '../lib/format';
import { useWallet } from '../lib/wallet';

export function Layout() {
  const { account, connect, connecting, error } = useWallet();
  return (
    <>
      <header className="top">
        <NavLink to="/" className="brand"><img src="/favicon.svg" alt="" width={28} height={28} /> OpenShelf</NavLink>
        <nav>
          <NavLink to="/jobs">Jobs</NavLink>
          <NavLink to="/new">Open a job</NavLink>
          <NavLink to="/guide">Test guide</NavLink>
          <NavLink to="/docs">Docs</NavLink>
        </nav>
        {account ? <span className="pill wait" title={account}>{short(account)}</span> : <button className="btn small" onClick={connect} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect wallet'}</button>}
      </header>
      {error && <p className="error banner">{error}</p>}
      <main><Outlet /></main>
      <footer className="foot">
        <span>Built on <a href="https://genlayer.com" target="_blank" rel="noreferrer">GenLayer</a> · StudioNet (temporary test network)</span>
      </footer>
    </>
  );
}
