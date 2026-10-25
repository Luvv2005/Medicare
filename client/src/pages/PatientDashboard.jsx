import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../services/api';
import PayModal from '../components/PayModal';
import { formatDate, formatTime, istToday } from '../utils/dates';
import { effStatus, STATUS_CHIP, statusLabel, payLabel, refundLabel } from '../utils/appointmentUi';

export default function PatientDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');
  const [payAppt, setPayAppt] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet('/appointments/mine');
      setList(data.appointments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (a) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setMsg('');
    setBusyId(a._id);
    try {
      await apiPatch(`/appointments/${a._id}/cancel`, { reason: 'Cancelled by patient' });
      setMsg('Appointment cancelled.');
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

  const Card = ({ a }) => (
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
          {a.refundStatus !== 'none' && <span className="mc-chip mc-chip--demo">{refundLabel(a.refundStatus)}</span>}
          {a.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-2">
        {a.eff === 'held' && (
          <button className="btn btn-mc-primary btn-mc-sm" onClick={() => setPayAppt(a)}>
            Pay now
          </button>
        )}
        {['held', 'confirmed'].includes(a.eff) && a.paymentStatus !== 'paid' && (
          <button className="btn btn-mc-outline btn-mc-sm" onClick={() => cancel(a)} disabled={busyId === a._id}>
            Cancel
          </button>
        )}
        {a.eff === 'confirmed' && a.paymentStatus === 'paid' && (
          <span className="mc-muted small">Cancellation with refund arrives in Step 9.</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="mc-card">
      {payAppt && (
        <PayModal
          appointment={payAppt}
          onClose={() => { setPayAppt(null); load(); }}
          onPaid={() => { setPayAppt(null); setMsg('Test payment successful. Appointment confirmed.'); load(); }}
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
      {upcoming.map((a) => <Card key={a._id} a={a} />)}

      {history.length > 0 && <h6 className="mt-4">History</h6>}
      {history.map((a) => <Card key={a._id} a={a} />)}
    </div>
  );
}