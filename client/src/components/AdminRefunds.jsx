import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';
import { money } from '../utils/orderUi';

const CHIP = {
  pending: 'mc-chip--demo',
  initiated: 'mc-chip--demo',
  processed: 'mc-chip--ok',
  failed: 'mc-chip--bad',
};

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [mode, setMode] = useState('off');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/admin/refunds');
      setRefunds(d.refunds);
      setMode(d.mode);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (r, action) => {
    setError('');
    setMsg('');
    setBusyId(r._id);
    try {
      await apiPost(`/admin/refunds/${r._id}/${action}`);
      setMsg(action === 'retry' ? 'Refund retried.' : 'Refund marked as failed (test).');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mc-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Refunds ({refunds.length})</h5>
        <button className="btn btn-mc-outline btn-mc-sm" onClick={load}>Refresh</button>
      </div>
      <p className="mc-muted small">
        Test refunds become <strong>Processed</strong> about a minute after being initiated.
        Actual refunds depend on the payment provider and bank.
      </p>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {refunds.length === 0 && !error && <p className="mc-muted mb-0">No refunds yet.</p>}

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr><th>Created</th><th>For</th><th>Patient</th><th>Amount</th><th>Status</th><th>Tries</th><th /></tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r._id}>
                <td>{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                <td className="text-capitalize">
                  {r.sourceType}
                  <div className="mc-muted small">…{String(r.sourceId).slice(-6)}</div>
                </td>
                <td>{r.patient?.name}</td>
                <td>{money(r.amount)}</td>
                <td>
                  <span className={`mc-chip text-capitalize ${CHIP[r.status]}`}>{r.status}</span>
                  {r.isSimulated && <span className="mc-chip mc-chip--demo ms-1">TEST</span>}
                  {r.status === 'failed' && <div className="small mc-bad">{r.failureReason}</div>}
                </td>
                <td>{r.attempts}</td>
                <td className="text-nowrap">
                  {r.status === 'initiated' && mode === 'mock' && (
                    <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === r._id}
                      onClick={() => act(r, 'simulate-failure')}>Simulate failure</button>
                  )}
                  {r.status === 'failed' && (
                    <button className="btn btn-mc-primary btn-mc-sm" disabled={busyId === r._id}
                      onClick={() => act(r, 'retry')}>Retry</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}