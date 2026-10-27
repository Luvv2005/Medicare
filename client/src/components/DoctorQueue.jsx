import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../services/api';
import useSocketEvent from '../hooks/useSocketEvent';
import { formatTime } from '../utils/dates';

const QCHIP = {
  none: ['Not arrived', ''],
  waiting: ['Waiting', 'mc-chip--demo'],
  called: ['Called', 'mc-chip--demo'],
  in_consultation: ['In consultation', 'mc-chip--ok'],
  done: ['Done', 'mc-chip--ok'],
};

export default function DoctorQueue({ onChanged }) {
  const [data, setData] = useState({ items: [], serving: {}, graceMinutes: 15, date: '' });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await apiGet('/queue/doctor'));
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // backup, asli update Socket.IO se
    return () => clearInterval(t);
  }, [load]);
  useSocketEvent('queue:update', load);

  const act = async (a, action) => {
    setMsg('');
    setBusyId(a._id);
    try {
      await apiPatch(`/queue/${a._id}/action`, { action });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId('');
      load();
      onChanged();
    }
  };

  const Btn = ({ a, action, label, primary }) => (
    <button className={`btn ${primary ? 'btn-mc-primary' : 'btn-mc-outline'} btn-mc-sm me-1`}
      disabled={busyId === a._id} onClick={() => act(a, action)}>
      {label}
    </button>
  );

  if (loading) return <p className="mc-muted">Loading...</p>;

  return (
    <div className="mc-card">
      <h5>Today's clinic queue {data.date && <small className="mc-muted">({data.date})</small>}</h5>
      <div className="mc-serving mb-3">
        <span className="mc-chip">Now serving (morning): {data.serving.morning ? `#${data.serving.morning}` : '-'}</span>
        <span className="mc-chip">Now serving (evening): {data.serving.evening ? `#${data.serving.evening}` : '-'}</span>
      </div>
      <p className="mc-muted small">
        In-person patients get a token when they check in on the day. No-show can be marked{' '}
        {data.graceMinutes} minute(s) after the appointment time.
      </p>

      {msg && <div className="alert alert-info py-2">{msg}</div>}
      {data.items.length === 0 && <p className="mc-muted mb-0">No in-person appointments today.</p>}

      {data.items.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr><th>Token</th><th>Time</th><th>Patient</th><th>Session</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {data.items.map((a) => {
                const confirmed = a.status === 'confirmed';
                const q = QCHIP[a.queueStatus] || QCHIP.none;
                return (
                  <tr key={a._id}>
                    <td><strong>{a.token != null ? `#${a.token}` : '-'}</strong></td>
                    <td>{formatTime(a.startTime)}</td>
                    <td>{a.patientName}<div className="mc-muted small">{a.patientPhone}</div></td>
                    <td className="text-capitalize">{a.session}</td>
                    <td>
                      {confirmed ? (
                        <span className={`mc-chip ${q[1]}`}>{q[0]}</span>
                      ) : (
                        <span className={`mc-chip ${a.status === 'completed' ? 'mc-chip--ok' : 'mc-chip--bad'}`}>
                          {a.status === 'no_show' ? 'No-show' : 'Completed'}
                        </span>
                      )}
                    </td>
                    <td className="text-nowrap">
                      {confirmed && a.queueStatus === 'none' && <Btn a={a} action="check_in" label="Check in" />}
                      {confirmed && a.queueStatus === 'waiting' && (
                        <>
                          <Btn a={a} action="call" label="Call" primary />
                          <Btn a={a} action="start" label="Start" />
                        </>
                      )}
                      {confirmed && a.queueStatus === 'called' && <Btn a={a} action="start" label="Start" primary />}
                      {confirmed && a.queueStatus === 'in_consultation' && (
                        <Btn a={a} action="complete" label="Complete" primary />
                      )}
                      {confirmed && a.queueStatus !== 'in_consultation' && a.graceOver && (
                        <Btn a={a} action="no_show" label="No-show" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}