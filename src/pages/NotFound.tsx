import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="page narrow">
      <h1>Nothing on this shelf</h1>
      <p className="muted">That page does not exist.</p>
      <Link className="btn" to="/">Back to the start</Link>
    </div>
  );
}
