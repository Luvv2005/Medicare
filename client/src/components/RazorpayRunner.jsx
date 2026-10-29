import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../services/api';
import { loadRazorpay } from '../utils/razorpay';

// Razorpay popup kholta hai. Payment ke baad signature server par verify hota hai.
export default function RazorpayRunner({ createPath, createBody, onPaid, onClose }) {
  const [status, setStatus] = useState('Opening secure payment...');
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const ran = useRef(-1);

  useEffect(() => {
    if (ran.current === attempt) return;
    ran.current = attempt;
    setError('');
    setStatus('Opening secure payment...');

    (async () => {
      try {
        if (!(await loadRazorpay()))
          throw new Error('Could not load the payment window. Check your internet connection or turn off ad-blockers.');
        const o = await apiPost(createPath, createBody);
        let paid = false;

        const rzp = new window.Razorpay({
          key: o.keyId,
          amount: o.amount,
          currency: o.currency,
          order_id: o.orderId,
          name: 'MediCare',
          description: o.description,
          prefill: o.prefill,
          theme: { color: '#2b7fe0' },
          handler: async (resp) => {
            paid = true;
            setStatus('Confirming your payment...');
            try {
              const res = await apiPost('/payments/verify', {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
              onPaid(res.appointment || res.order);
            } catch (err) {
              setCanRetry(false);
              setError(`${err.message} If money was deducted, your booking or order will be confirmed automatically in a short while, or refunded. Check your dashboard.`);
            }
          },
          modal: { ondismiss: () => { if (!paid) onClose(); } },
        });
        rzp.open();
        setStatus('Complete the payment in the Razorpay window.');
      } catch (err) {
        setCanRetry(true);
        setError(err.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="mc-modal mc-card">
        <h5>Payment</h5>
        {!error && <p className="mc-muted">{status}</p>}
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <div className="d-grid gap-2">
          {error && canRetry && (
            <button className="btn btn-mc-primary" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          )}
          {(error || status.startsWith('Complete')) && (
            <button className="btn btn-link" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}