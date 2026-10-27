import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch, apiPost } from '../services/api';
import useSocketEvent from '../hooks/useSocketEvent';
import PayModal from '../components/PayModal';
import RescheduleModal from '../components/RescheduleModal';
import WaitlistPanel from '../components/WaitlistPanel';
import { formatDate, formatTime, istToday } from '../utils/dates';
import { effStatus, STATUS_CHIP, statusLabel, payLabel, refundLabel } from '../utils/appointmentUi';

const QUEUE_TEXT = {
  waiting: 'Waiting for your turn',
  called: 'Your turn: please go in',
  in_consultation: 'In consultation',
  done: 'Consultation done',
};

function QueueInfo({ q, busy, onCheckIn }) {
  if (!q) return null;
  if (!q.checkedIn) {
    if (q.status !== 'confirmed') return null;
    return (
      <div className="mc-queue-box">
        <div className="flex-fill">
          <strong>Reached the clinic?</strong>
          <div className="mc-muted small">Check in to get your token number.</div>
        </div>
        <button className="btn btn-mc-primary btn-mc-sm" disabled={busy} onClick={onCheckIn}>
          I've arrived
        </button>
      </div>
    );
  }
  return (
    <div className="mc-queue-box">
      <div className="mc-token" aria-label={`Token ${q.token}`}>#{q.token}</div>
      <div className="flex-fill">
        <strong>{QUEUE_TEXT[q.queueStatus] || 'In queue'}</strong>
        <div className="mc-queue-stats mt-1">
          <span><strong>{q.nowServing ? `#${q.nowServing}` : '-'}</strong><small className="mc-muted">Now serving</small></span>
          {q.ahead !== null && <span><strong>{q.ahead}</strong><small className="mc-muted">Patients ahead</small></span>}
          {q.waitMinutes !== null && <span><strong>~{q.waitMinutes} min</strong><small className="mc-muted">Approx. wait</small></span>}
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ a, q, busy, onPay, onCancel, onReschedule, onCheckIn }) {
  const active = ['held', 'confirmed'].includes(a.eff);
  const future = new Date(`${a.date}T${a.startTime}:00+05:30`) > new Date();
  const canReschedule = a.eff === 'confirmed' && a.queueStatus === 'none' && (a.rescheduleCount || 0) < 2 && future;

  return (
    <div className="mc-appt">
      <div className="d-flex flex-wrap justify-content-between gap-2">
        <div>
          <strong>{a.doctor?.name || 'Doctor'}</strong>
          <div className="mc-muted small">{a.doctor?.specialization}</div>
          <div>
            {formatDate(a.date)} · {formatTime(a.startTime)}
            <span className="mc-muted text-capitalize"> · {a.mode}</span>
          </div>
          {a.mode === 'in-person' && a.doctor?.clinic && (
            <div className="mc-muted small">{a.doctor.clinic.name}, {a.doctor.clinic.city}</div>
          )}
        </div>
        <div className="d-flex flex-wrap gap-1 align-items-start">
          <span className={`mc-chip ${STATUS_CHIP[a.eff] || ''}`}>{statusLabel(a.eff)}</span>
          <span className="mc-chip">{payLabel(a.paymentStatus)} · ₹{a.amount}</span>
          {a.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
        </div>
      </div>

      {a.eff === 'confirmed' && <QueueInfo q={q} busy={busy} onCheckIn={() => onCheckIn(a)} />}

      {a.eff === 'no_show' && (
        <div className="small mt-2 mc-muted">
          Marked as no-show. There is no automatic penalty. Contact support if this is a mistake.
        </div>
      )}

      {a.eff === 'cancelled' && a.cancelledBy === 'doctor' && (
        <div className="small mt-2">
          <strong>Cancelled by doctor.</strong> Reason: {a.cancelReason}
          <div className="mt-1 d-flex flex-wrap gap-2">
            {a.doctor?._id && (
              <Link to={`/doctors/${a.doctor._id}`} className="btn btn-mc-primary btn-mc-sm">Book another slot</Link>
            )}
            {a.doctor?.specialization && (
              <Link to={`/find-doctor?specialization=${encodeURIComponent(a.doctor.specialization)}`}
                className="btn btn-mc-outline btn-mc-sm">
                Find another {a.doctor.specialization}
              </Link>
            )}
          </div>
        </div>
      )}

      {a.eff === 'cancelled' && a.paymentStatus === 'paid' && a.refundStatus === 'none' && (
        <div className="small mc-muted mt-2">No refund applied as per the cancellation policy.</div>
      )}

      {a.refundStatus !== 'none' && (
        <div className="small mt-2">
          <span className="mc-chip mc-chip--demo">{refundLabel(a.refundStatus)}</span>{' '}
          ₹{a.refundAmount} refund.{' '}
          <span className="mc-muted">Actual time to reach you depends on your bank or payment provider.</span>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mt-2">
        {a.eff === 'held' && (
          <button className="btn btn-mc-primary btn-mc-sm" onClick={() => onPay(a)}>Pay now</button>
        )}
        {canReschedule && (
          <button className="btn btn-mc-outline btn-mc-sm" onClick={() => onReschedule(a)} disabled={busy}>
            Reschedule
          </button>
        )}
        {active && future && (
          <button className="btn btn-mc-outline btn-mc-sm" onClick={() => onCancel(a)} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const [list, setList] = useState([]);
  const [queue, setQueue] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');
  const [payAppt, setPayAppt] = useState(null);
  const [reschedAppt, setReschedAppt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, q] = await Promise.all([apiGet('/appointments/mine'), apiGet('/queue/mine')]);
      setList(a.appointments);
      setQueue(Object.fromEntries(q.items.map((i) => [i.appointmentId, i])));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('queue:update', load);

  const cancel = async (a) => {
    setMsg('');
    setBusyId(a._id);
    try {
      const p = await apiGet(`/appointments/${a._id}/cancel-preview`);
      if (!window.confirm(`${p.message}\n\nCancel this appointment?`)) return;
      const r = await apiPatch(`/appointments/${a._id}/cancel`, { reason: 'Cancelled by patient' });
      setMsg(r.message);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId('');
      load();
    }
  };

  const checkIn = async (a) => {
    setMsg('');
    setBusyId(a._id);
    try {
      const r = await apiPost(`/queue/${a._id}/check-in`);
      setMsg(r.message);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId('');
      load();
    }
  };

  const today = istToday();
  const items = list.map((a) => ({ ...a, eff: effStatus(a) }));
  const upcoming = items.filter((a) => ['held', 'confirmed'].includes(a.eff) && a.date >= today);
  const history = items.filter((a) => !upcoming.includes(a));

  const card = (a) => (
    <AppointmentCard
      key={a._id}
      a={a}
      q={queue[a._id]}
      busy={busyId === a._id}
      onPay={setPayAppt}
      onCancel={cancel}
      onReschedule={setReschedAppt}
      onCheckIn={checkIn}
    />
  );

  return (
    <>
      <WaitlistPanel onChanged={load} />

      <div className="mc-card">
        {payAppt && (
          <PayModal
            appointment={payAppt}
            onClose={() => { setPayAppt(null); load(); }}
            onPaid={() => { setPayAppt(null); setMsg('Test payment successful. Appointment confirmed.'); load(); }}
          />
        )}
        {reschedAppt && (
          <RescheduleModal
            appointment={reschedAppt}
            onClose={() => setReschedAppt(null)}
            onDone={(m) => { setReschedAppt(null); setMsg(m); load(); }}
          />
        )}

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h5 className="mb-0">My appointments</h5>
          <Link to="/find-doctor" className="btn btn-mc-primary btn-mc-sm">Book new</Link>
        </div>

        {msg && <div className="alert alert-info py-2">{msg}</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {loading && <p className="mc-muted">Loading...</p>}

        {!loading && !error && list.length === 0 && (
          <p className="mc-muted mb-0">No appointments yet. Find a doctor to book your first one.</p>
        )}

        {upcoming.length > 0 && <h6 className="mt-3">Upcoming</h6>}
        {upcoming.map(card)}

        {history.length > 0 && <h6 className="mt-4">History</h6>}
        {history.map(card)}
      </div>
    </>
  );
}