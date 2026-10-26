import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminProducts from '../components/AdminProducts';
import AdminOrders from '../components/AdminOrders';
import AdminRefunds from '../components/AdminRefunds';
import AdminAppointments from '../components/AdminAppointments';
import AdminReports from '../components/AdminReports';

const TABS = [
  { key: 'doctors', label: 'Doctors' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'Users' },
  { key: 'audit', label: 'Audit logs' },
];
const STATUSES = ['pending', 'approved', 'rejected', 'all'];
const STATUS_CHIP = { pending: 'mc-chip--demo', approved: 'mc-chip--ok', rejected: 'mc-chip--bad' };

function Doctors() {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rejectId, setRejectId] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = status === 'all' ? '' : `?status=${status}`;
      const data = await apiGet(`/admin/doctors${q}`);
      setList(data.doctors);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const approve = async (d) => {
    setMsg(''); setError(''); setBusyId(d._id);
    try {
      await apiPatch(`/admin/doctors/${d._id}/approve`);
      setMsg(`${d.name} approved. They now appear in Find a Doctor.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  const reject = async (d) => {
    setMsg(''); setError('');
    if (reason.trim().length < 5) return setError('Please write a rejection reason (min 5 characters)');
    setBusyId(d._id);
    try {
      await apiPatch(`/admin/doctors/${d._id}/reject`, { reason: reason.trim() });
      setMsg(`${d.name} rejected.`);
      setRejectId(''); setReason('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
    return undefined;
  };

  return (
    <>
      <div className="mc-chips mb-3 justify-content-md-center">
        {STATUSES.map((s) => (
          <button key={s} className={`mc-chip-btn text-capitalize ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && <p className="mc-muted">Loading...</p>}
      {!loading && list.length === 0 && <p className="mc-muted">No {status === 'all' ? '' : status} applications.</p>}

      {list.map((d) => (
        <div className="mc-card mb-3" key={d._id}>
          <div className="d-flex flex-wrap justify-content-between gap-2">
            <div>
              <h5 className="mb-0">{d.name}</h5>
              <div className="mc-muted">{d.specialization} · {d.experienceYears} yrs</div>
            </div>
            <div className="d-flex flex-wrap gap-1 align-items-start">
              <span className={`mc-chip text-capitalize ${STATUS_CHIP[d.status]}`}>{d.status}</span>
              {d.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
            </div>
          </div>

          <div className="row g-2 mt-2 small">
            <div className="col-md-6">
              <div><strong>Email:</strong> {d.user?.email}</div>
              <div><strong>Phone:</strong> {d.user?.phone || '-'}</div>
              <div><strong>Qualifications:</strong> {d.qualifications.join(', ')}</div>
            </div>
            <div className="col-md-6">
              <div><strong>Registration no.:</strong> {d.registrationNumber}</div>
              <div><strong>Council:</strong> {d.registrationCouncil}</div>
              <div><strong>Fee:</strong> ₹{d.consultationFee}</div>
            </div>
            <div className="col-12">
              <strong>Clinic:</strong> {d.clinic.name}, {d.clinic.address}, {d.clinic.city}, {d.clinic.state} - {d.clinic.pincode}
            </div>
            {d.status === 'rejected' && d.rejectionReason && (
              <div className="col-12"><strong>Rejection reason:</strong> {d.rejectionReason}</div>
            )}
          </div>

          <div className="mt-3">
            {rejectId === d._id ? (
              <div>
                <input className="form-control mb-2" placeholder="Reason for rejection"
                  value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="d-flex gap-2">
                  <button className="btn btn-mc-primary btn-mc-sm" onClick={() => reject(d)} disabled={busyId === d._id}>
                    Confirm reject
                  </button>
                  <button className="btn btn-mc-outline btn-mc-sm" onClick={() => { setRejectId(''); setReason(''); setError(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="d-flex gap-2 flex-wrap">
                {d.status !== 'approved' && (
                  <button className="btn btn-mc-primary btn-mc-sm" onClick={() => approve(d)} disabled={busyId === d._id}>
                    Approve
                  </button>
                )}
                {d.status !== 'rejected' && (
                  <button className="btn btn-mc-outline btn-mc-sm" onClick={() => { setRejectId(d._id); setReason(''); setError(''); }}>
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(
    () => apiGet('/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message)),
    []
  );
  useEffect(() => { load(); }, [load]);

  const toggle = async (u) => {
    const next = !u.isActive;
    const warn = next
      ? `Unblock ${u.name}?${u.role === 'doctor' ? ' The doctor must be approved again from the Doctors tab.' : ''}`
      : `Block ${u.name}? They will not be able to log in.${u.role === 'doctor' ? ' The doctor will also be removed from Find a Doctor.' : ''}`;
    if (!window.confirm(warn)) return;
    setError(''); setMsg(''); setBusyId(u._id);
    try {
      await apiPatch(`/admin/users/${u._id}/active`, { isActive: next });
      setMsg(`${u.name} ${next ? 'unblocked' : 'blocked'}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mc-card">
      <h6 className="mc-muted">All users ({users.length})</h6>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name} {u.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}</td>
                <td>{u.email}</td>
                <td className="text-capitalize">{u.role}</td>
                <td>
                  <span className={`mc-chip ${u.isActive ? 'mc-chip--ok' : 'mc-chip--bad'}`}>
                    {u.isActive ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="text-nowrap">
                  {u.role !== 'admin' && u._id !== me._id && (
                    <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === u._id} onClick={() => toggle(u)}>
                      {u.isActive ? 'Block' : 'Unblock'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiGet('/admin/audit-logs').then((d) => setLogs(d.logs)).catch((e) => setError(e.message));
  }, []);
  return (
    <div className="mc-card">
      <h6 className="mc-muted">Recent admin actions</h6>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {logs.length === 0 && !error && <p className="mc-muted mb-0">No actions recorded yet.</p>}
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.actor?.name}</td>
                <td>{l.action}</td>
                <td className="small">{l.details?.reason || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('doctors');
  return (
    <div className="container-xl py-4">
      <h3 className="mb-3 text-center">Admin Dashboard</h3>
      <div className="mc-chips mb-3 justify-content-md-center">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`mc-chip-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'doctors' && <Doctors />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'orders' && <AdminOrders />}
      {tab === 'refunds' && <AdminRefunds />}
      {tab === 'appointments' && <AdminAppointments />}
      {tab === 'reports' && <AdminReports />}
      {tab === 'users' && <Users />}
      {tab === 'audit' && <AuditLogs />}
    </div>
  );
}