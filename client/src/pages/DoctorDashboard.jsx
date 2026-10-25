import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import AvailabilityEditor from '../components/AvailabilityEditor';
import { formatDate, formatTime, istToday } from '../utils/dates';
import { effStatus, STATUS_CHIP, statusLabel, payLabel } from '../utils/appointmentUi';

export default function DoctorDashboard() {
  const [tab, setTab] = useState('appointments');
  const [profile, setProfile] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/doctors/me/profile'), apiGet('/appointments/doctor')])
      .then(([p, a]) => {
        setProfile(p.doctor);
        setList(a.appointments);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

      <div className="mc-auth-tabs mb-3" style={{ maxWidth: 420 }}>
        <button type="button" className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}>
          Appointments
        </button>
        <button type="button" className={tab === 'availability' ? 'active' : ''} onClick={() => setTab('availability')}>
          Availability
        </button>
      </div>

      {tab === 'availability' && <AvailabilityEditor />}

      {tab === 'appointments' && (
        <div className="mc-card">
          <h5>Patient appointments</h5>
          {items.length === 0 ? (
            <p className="mc-muted mb-0">No appointments yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Date</th><th>Time</th><th>Patient</th><th>Phone</th>
                    <th>Mode</th><th>Status</th><th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a._id}>
                      <td>{formatDate(a.date)}</td>
                      <td>{formatTime(a.startTime)}</td>
                      <td>{a.patientName}</td>
                      <td>{a.patientPhone}</td>
                      <td className="text-capitalize">{a.mode}</td>
                      <td><span className={`mc-chip ${STATUS_CHIP[a.eff] || ''}`}>{statusLabel(a.eff)}</span></td>
                      <td>{payLabel(a.paymentStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}