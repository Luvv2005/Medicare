import { useState } from 'react';
import { apiPost } from '../services/api';

export default function PayModal({ appointment, onClose, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (outcome) => {
    setBusy(true);
    setError('');
    try {
      const res = await apiPost('/payments/mock-confirm', {
        appointmentId: appointment._id,
        outcome,
      });
      onPaid(res.appointment);
    } catch (err) {
      setError(err.message); // failure par bhi yahi dikhega, user dobara try kar sakta hai
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="mc-modal mc-card">
        <span className="mc-chip mc-chip--demo mb-2">TEST PAYMENT · NO REAL MONEY</span>
        <h5 className="mt-2">Pay ₹{appointment.amount}</h5>
        <p className="mc-muted small">
          This is a simulated payment window for development. Real online payment
          (UPI, cards, netbanking) will be added in the final step.
        </p>

        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

        <div className="d-grid gap-2">
          <button className="btn btn-mc-primary" onClick={() => run('success')} disabled={busy}>
            {busy ? 'Please wait...' : `Pay ₹${appointment.amount} (test)`}
          </button>
          <button className="btn btn-mc-outline" onClick={() => run('failure')} disabled={busy}>
            Simulate failure
          </button>
          <button className="btn btn-link" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}