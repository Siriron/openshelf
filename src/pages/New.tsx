import { useNavigate } from 'react-router-dom';
import { OpenJobForm } from '../components/OpenJobForm';
import { TxLog } from '../components/TxLog';
import { IS_DEPLOYED } from '../config/chains';

export function New() {
  const nav = useNavigate();
  return (
    <div className="page narrow">
      <h1>Open a job</h1>
      <p className="lead">Write what a finished deposit must look like, in plain language, and escrow the fee. Validators will judge each term against the provider's Zenodo record.</p>
      {!IS_DEPLOYED && <p className="notice">The contract is not deployed yet, so writes are disabled.</p>}
      <OpenJobForm onCreated={(id) => nav(`/jobs/${id}`)} />
      <TxLog />
    </div>
  );
}
