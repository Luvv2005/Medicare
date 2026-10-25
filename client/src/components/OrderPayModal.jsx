import { useState } from 'react';
import { apiPost } from '../services/api';
import { money } from '../utils/orderUi';

export default function OrderPayModal({ order, onClose, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
        <span className="mc-chip mc-chip--demo mb-2">TEST PAYMENT · NO REAL MONEY</span>
        <h5 className="mt-2">Pay {money(order.total)}</h5>
        <p className="mc-muted small">Order {order.orderNo}. Simulated payment window for development.</p>

        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

        <div className="d-grid gap-2">
          <button className="btn btn-mc-primary" onClick={() => run('success')} disabled={busy}>
            {busy ? 'Please wait...' : `Pay ${money(order.total)} (test)`}
          </button>
          <button className="btn btn-mc-outline" onClick={() => run('failure')} disabled={busy}>Simulate failure</button>
          <button className="btn btn-link" onClick={onClose} disabled={busy}>Close</button>
        </div>
      </div>
    </div>
  );
}