import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';
import { money } from '../utils/orderUi';
import RazorpayRunner from './RazorpayRunner';

export default function OrderPayModal({ order, onClose, onPaid }) {
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/payments/config').then((d) => setMode(d.mode)).catch(() => setMode('off'));
  }, []);

  if (mode === null)
    return (
      <div className="mc-modal-backdrop"><div className="mc-modal mc-card"><p className="mc-muted mb-0">Loading...</p></div></div>
    );

  if (mode === 'razorpay')
    return (
      <RazorpayRunner
        createPath={`/payments/orders/${order._id}/create-order`}
        createBody={{}}
        onPaid={onPaid}
        onClose={onClose}
      />
    );

  const run = async (outcome) => {
    setBusy(true);
    setError('');
    try {
      const res = await apiPost(`/orders/${order._id}/mock-pay`, { outcome });
      onPaid(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="mc-modal mc-card">
        {mode === 'mock' ? (
          <>
            <span className="mc-chip mc-chip--demo mb-2">TEST PAYMENT · NO REAL MONEY</span>
            <h5 className="mt-2">Pay {money(order.total)}</h5>
            <p className="mc-muted small">Order {order.orderNo}. Simulated payment window for development.</p>
          </>
        ) : (
          <>
            <h5>Online payment unavailable</h5>
            <p className="mc-muted small">Online payment is not available right now. Please choose cash on delivery.</p>
          </>
        )}
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <div className="d-grid gap-2">
          {mode === 'mock' && (
            <>
              <button className="btn btn-mc-primary" onClick={() => run('success')} disabled={busy}>
                {busy ? 'Please wait...' : `Pay ${money(order.total)} (test)`}
              </button>
              <button className="btn btn-mc-outline" onClick={() => run('failure')} disabled={busy}>Simulate failure</button>
            </>
          )}
          <button className="btn btn-link" onClick={onClose} disabled={busy}>Close</button>
        </div>
      </div>
    </div>
  );
}