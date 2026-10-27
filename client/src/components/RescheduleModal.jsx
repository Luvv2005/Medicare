import { useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../services/api';
import { next14, formatDay, formatDate, formatTime } from '../utils/dates';

export default function RescheduleModal({ appointment: a, onClose, onDone }) {
  const [days] = useState(next14);
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected('');
    setError('');
    apiGet(`/doctors/${a.doctor._id}/slots?date=${date}&mode=${a.mode}`)
      .then((r) => !cancelled && setSlots(r.slots))
      .catch((err) => {
        if (!cancelled) {
          setSlots([]);
          setError(err.message);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [a.doctor._id, a.mode, date]);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await apiPatch(`/appointments/${a._id}/reschedule`, { date, startTime: selected });
      onDone(r.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mc-modal-backdrop" role="dialog" aria-modal="true" aria-label="Reschedule">
      <div className="mc-modal mc-modal--wide mc-card">
        <h5>Reschedule appointment</h5>
        <p className="mc-muted small">
          Currently {formatDate(a.date)} at {formatTime(a.startTime)} ({a.mode}) with {a.doctor.name}.
          You can reschedule up to 2 times, at least 2 hours before the appointment.
        </p>

        <div className="mc-days mb-3">
          {days.map((d) => (
            <button key={d} type="button" className={`mc-day ${date === d ? 'active' : ''}`}
              onClick={() => setDate(d)}>
              {formatDay(d)}
            </button>
          ))}
        </div>

        {loading && <p className="mc-muted small">Loading slots...</p>}
        {!loading && slots.length === 0 && !error && <p className="mc-muted small">No slots on this date.</p>}
        <div className="mc-slot-grid mb-3">
          {slots.map((s) => (
            <button key={s.startTime} type="button" disabled={!s.available}
              className={`mc-slot ${selected === s.startTime ? 'active' : ''}`}
              onClick={() => setSelected(s.startTime)}>
              {formatTime(s.startTime)}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

        <div className="d-grid gap-2">
          <button className="btn btn-mc-primary" disabled={!selected || busy} onClick={confirm}>
            {busy ? 'Please wait...' : 'Confirm new slot'}
          </button>
          <button className="btn btn-link" onClick={onClose} disabled={busy}>Close</button>
        </div>
      </div>
    </div>
  );
}