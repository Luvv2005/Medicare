import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import PageHeader from '../components/PageHeader';
import { money } from '../utils/orderUi';

const CHIP = { pending: 'mc-chip--demo', initiated: 'mc-chip--demo', processed: 'mc-chip--ok', failed: 'mc-chip--bad' };

export default function PaymentHistory() {
  const [data, setData] = useState({ payments: [], refunds: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/payments/history')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-xl py-4">
      <PageHeader title="Payment history" subtitle="Your payments and refunds." />
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="mc-muted text-center">Loading...</p>}

      {!loading && !error && (
        <>
          <div className="mc-card mb-4">
            <h5>Payments ({data.payments.length})</h5>
            {data.payments.length === 0 ? (
              <p className="mc-muted mb-0">No payments yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Date</th><th>For</th><th>Method</th><th>Amount</th><th>Reference</th></tr></thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={`${p.kind}-${p.id}`}>
                        <td>{new Date(p.date).toLocaleString('en-IN')}</td>
                        <td>{p.title}{p.simulated && <span className="mc-chip mc-chip--demo ms-1">TEST</span>}</td>
                        <td>{p.method}</td>
                        <td>{money(p.amount)}</td>
                        <td className="small mc-muted">{p.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mc-card">
            <h5>Refunds ({data.refunds.length})</h5>
            <p className="mc-muted small">Actual time to reach you depends on your bank or payment provider.</p>
            {data.refunds.length === 0 ? (
              <p className="mc-muted mb-0">No refunds.</p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Date</th><th>For</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.refunds.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                        <td className="text-capitalize">{r.sourceType}</td>
                        <td>{money(r.amount)}</td>
                        <td>
                          <span className={`mc-chip text-capitalize ${CHIP[r.status]}`}>{r.status}</span>
                          {r.simulated && <span className="mc-chip mc-chip--demo ms-1">TEST</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}