import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { formatDate, formatTime } from '../utils/dates';
import { STATUS_CHIP, statusLabel, payLabel, refundLabel } from '../utils/appointmentUi';

const FILTERS = ['all', 'confirmed', 'held', 'cancelled', 'completed', 'no_show', 'expired'];

export default function AdminAppointments() {
  const [status, setStatus] = useState('all');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet(`/admin/appointments${status === 'all' ? '' : `?status=${status}`}`)
      .then((d) => !cancelled && setList(d.appointments))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status]);

  return (
    <div className="mc-card">
      <h5>Appointments ({list.length})</h5>
      <div className="mc-chips mb-3">
        {FILTERS.map((f) => (
          <button key={f} className={`mc-chip-btn ${status === f ? 'active' : ''}`} onClick={() => setStatus(f)}>
            {f === 'all' ? 'All' : statusLabel(f)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && <p className="mc-muted">Loading...</p>}
      {!loading && !error && list.length === 0 && <p className="mc-muted mb-0">No appointments.</p>}

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr><th>When</th><th>Doctor</th><th>Patient</th><th>Mode</th><th>Status</th><th>Payment</th></tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a._id}>
                <td>{formatDate(a.date)}<div className="mc-muted small">{formatTime(a.startTime)}</div></td>
                <td>{a.doctor?.name}<div className="mc-muted small">{a.doctor?.specialization}</div></td>
                <td>{a.patientName}<div className="mc-muted small">{a.patient?.email}</div></td>
                <td className="text-capitalize">{a.mode}</td>
                <td>
                  <span className={`mc-chip ${STATUS_CHIP[a.status] || ''}`}>{statusLabel(a.status)}</span>
                  {a.isDemo && <span className="mc-chip mc-chip--demo ms-1">DEMO</span>}
                </td>
                <td>
                  {payLabel(a.paymentStatus)} · ₹{a.amount}
                  {a.refundStatus !== 'none' && <div className="small mc-muted">{refundLabel(a.refundStatus)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}