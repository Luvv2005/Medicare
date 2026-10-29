import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Stars = ({ n }) => <span className="mc-stars" aria-label={`${n} out of 5`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

export default function ReviewSection({ doctorId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiGet(`/reviews/doctor/${doctorId}`).then((d) => setReviews(d.reviews)).catch(() => {});
    if (user?.role === 'patient')
      apiGet(`/reviews/eligible/${doctorId}`).then((d) => setEligible(d.eligible)).catch(() => {});
  }, [doctorId, user]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const r = await apiPost('/reviews', { doctorId, rating, comment });
      setMsg(r.message);
      setComment('');
      load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mc-card mt-3">
      <h5>Patient reviews</h5>
      {reviews.length === 0 && <p className="mc-muted">No reviews yet.</p>}
      {reviews.map((r) => (
        <div className="mc-appt" key={r._id}>
          <Stars n={r.rating} /> <strong>{r.name}</strong>
          <small className="mc-muted"> · {new Date(r.createdAt).toLocaleDateString('en-IN')}</small>
          {r.comment && <p className="mb-0">{r.comment}</p>}
        </div>
      ))}

      {eligible && (
        <form className="mt-3" onSubmit={submit}>
          <h6>Rate your completed visit</h6>
          <select className="form-select mb-2" style={{ maxWidth: 160 }} value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Rating">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
          <textarea className="form-control mb-2" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)" />
          <button className="btn btn-mc-primary btn-mc-sm" disabled={busy}>Submit review</button>
        </form>
      )}
      {msg && <div className="alert alert-info py-2 mt-2">{msg}</div>}
    </div>
  );
}