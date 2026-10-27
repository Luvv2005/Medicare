import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../services/api';
import useSocketEvent from '../hooks/useSocketEvent';
import AvailabilityEditor from '../components/AvailabilityEditor';
import DoctorProfileEditor from '../components/DoctorProfileEditor';
import DoctorQueue from '../components/DoctorQueue';
import { formatDate, formatTime, istToday } from '../utils/dates';
import { effStatus, STATUS_CHIP, statusLabel, payLabel, refundLabel } from '../utils/appointmentUi';

function SessionCancel({ onDone }) {
  const [date, setDate] = useState('');
  const [part, setPart] = useState('day');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setError('');
    setMsg('');
    if (!date) return setError('Choose a date');
    if (reason.trim().length < 5) return setError('Please give a reason (min 5 characters)');
    if (!window.confirm('Cancel this session? All booked patients will be notified and online payments refunded.')) return undefined;

    setBusy(true);
    try {
      const r = await apiPost('/appointments/doctor/cancel-session', { date, part, reason: reason.trim() });
      setMsg(r.message);
      setReason('');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div className="mc-card mb-3">
      <h5>Cancel a session</h5>
      <p className="mc-muted small">
        Cancels every booking in that time, notifies each patient, refunds online payments, and stops new
        bookings for it. Those slots are not offered to the waiting list.
      </p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      <div className="row g-2 align-items-end">
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">Date</label>
          <input type="date" className="form-control" min={istToday()} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small mb-1">Session</label>
          <select className="form-select" value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="day">Whole day</option>
            <option value="morning">Morning (before 1 PM)</option>
            <option value="evening">Evening (1 PM onwards)</option>
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label small mb-1">Reason</label>
          <input className="form-control" value={reason} maxLength={300}
            onChange={(e) => setReason(e.target.value)} placeholder="e.g. Emergency surgery" />
        </div>
        <div className="col-12 col-md-2">
          <button className="btn btn-mc-outline w-100" onClick={submit} disabled={busy}>
            {busy ? 'Cancelling...' : 'Cancel session'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [tab, setTab] = useState('appointments');
  const [profile, setProfile] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([apiGet('/doctors/me/profile'), apiGet('/appointments/doctor')]);
      setProfile(p.doctor);
      setList(a.appointments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('queue:update', load);

  const cancelAppt = async (a) => {
    const reason = window.prompt(
      `Cancel ${a.patientName}'s appointment on ${formatDate(a.date)} at ${formatTime(a.startTime)}?\n\nEnter a reason (min 5 characters):`
    );
    if (reason === null) return;
    setActionMsg('');
    setBusyId(a._id);
    try {
      const r = await apiPatch(`/appointments/${a._id}/doctor-cancel`, { reason });
      setActionMsg(r.message);
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setBusyId('');
      load();
    }
  };

  const mark = async (a, action) => {
    setActionMsg('');
    setBusyId(a._id);
    try {
      await apiPatch(`/queue/${a._id}/action`, { action });
      setActionMsg(action === 'complete' ? 'Marked as completed.' : 'Marked as no-show.');
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setBusyId('');
      load();
    }
  };

  const today = istToday();
  const items = list.map((a) => ({ ...a, eff: effStatus(a) })).filter((a) => a.eff !== 'expired');
  const count = (fn) => items.filter(fn).length;
  const stats = [
    { label: 'Total', value: items.length },
    { label: 'Upcoming', value: count((a) => a.eff === 'confirmed' && a.date >= today) },
    { label: 'Awaiting payment', value: count((a) => a.eff === 'held') },
    { label: 'Completed', value: count((a) => a.eff === 'completed') },
    { label: 'Cancelled', value: count((a) => a.eff === 'cancelled') },
    { label: 'No-show', value: count((a) => a.eff === 'no_show') },
  ];

  if (loading) return <p className="mc-muted">Loading...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      {profile && profile.status !== 'approved' && (
        <div className={`alert ${profile.status === 'rejected' ? 'alert-danger' : 'alert-warning'}`}>
          {profile.status === 'pending' &&
            'Your application is pending admin approval. You will appear in Find a Doctor after approval.'}
          {profile.status === 'rejected' &&
            `Your application was rejected: ${profile.rejectionReason || 'no reason given'}`}
        </div>
      )}

      <div className="mc-stats mb-3">
        {stats.map((s) => (
          <div className="mc-stat" key={s.label}>
            <div className="mc-stat-value">{s.value}</div>
            <div className="mc-muted small">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mc-chips mb-3">
        {[
          ['appointments', 'Appointments'],
          ['queue', 'Queue'],
          ['availability', 'Availability'],
          ['profile', 'Profile'],
        ].map(([key, label]) => (
          <button key={key} type="button" className={`mc-chip-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'availability' && <AvailabilityEditor />}
      {tab === 'profile' && <DoctorProfileEditor />}
      {tab === 'queue' && <DoctorQueue onChanged={load} />}

      {tab === 'appointments' && (
        <>
          <SessionCancel onDone={load} />

          <div className="mc-card">
            <h5>Patient appointments</h5>
            {actionMsg && <div className="alert alert-info py-2">{actionMsg}</div>}
            {items.length === 0 ? (
              <p className="mc-muted mb-0">No appointments yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th><th>Time</th><th>Patient</th><th>Phone</th>
                      <th>Mode</th><th>Status</th><th>Payment</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => {
                      const started = new Date(`${a.date}T${a.startTime}:00+05:30`) <= new Date();
                      return (
                        <tr key={a._id}>
                          <td>{formatDate(a.date)}</td>
                          <td>{formatTime(a.startTime)}</td>
                          <td>{a.patientName}</td>
                          <td>{a.patientPhone}</td>
                          <td className="text-capitalize">{a.mode}</td>
                          <td><span className={`mc-chip ${STATUS_CHIP[a.eff] || ''}`}>{statusLabel(a.eff)}</span></td>
                          <td>
                            {payLabel(a.paymentStatus)}
                            {a.refundStatus !== 'none' && (
                              <div className="small mc-muted">{refundLabel(a.refundStatus)}</div>
                            )}
                          </td>
                          <td className="text-nowrap">
                            {a.eff === 'confirmed' && !started && (
                              <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === a._id}
                                onClick={() => cancelAppt(a)}>
                                Cancel
                              </button>
                            )}
                            {a.eff === 'confirmed' && started && (
                              <>
                                <button className="btn btn-mc-primary btn-mc-sm me-1" disabled={busyId === a._id}
                                  onClick={() => mark(a, 'complete')}>
                                  Complete
                                </button>
                                <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === a._id}
                                  onClick={() => mark(a, 'no_show')}>
                                  No-show
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small mc-muted mt-2 mb-0">
              For in-person visits today, use the Queue tab. It handles check-in, calling and starting the consultation.
            </p>
          </div>
        </>
      )}
    </>
  );
}