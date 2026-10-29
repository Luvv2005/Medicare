import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../services/api';
import { apiUpload, openProtected, apiPathOf } from '../utils/files';

function Prescriptions() {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(
    () => apiGet(`/admin-verify/prescriptions?status=${status}`).then((d) => setList(d.prescriptions)).catch((e) => setErr(e.message)),
    [status]
  );
  useEffect(() => { load(); }, [load]);

  const review = async (p, action) => {
    let note = '';
    if (action === 'reject') {
      note = window.prompt('Reason for rejection (min 5 characters):');
      if (note === null) return;
    }
    setErr(''); setMsg('');
    try {
      await apiPatch(`/admin-verify/prescriptions/${p._id}/review`, { action, note });
      setMsg(`Prescription ${action}d.`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="mc-card">
      <div className="mc-chips mb-3">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} className={`mc-chip-btn text-capitalize ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>
      <p className="mc-muted small">Check that the prescription is genuine, current and matches the medicines before approving.</p>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {list.length === 0 && <p className="mc-muted mb-0">Nothing here.</p>}
      {list.map((p) => (
        <div className="mc-appt" key={p._id}>
          <strong>{p.user?.name}</strong> <span className="mc-muted small">{p.user?.email}</span>
          <div className="small">{new Date(p.createdAt).toLocaleString('en-IN')}{p.note ? ` · Note: ${p.note}` : ''}</div>
          {p.reviewNote && <div className="small mc-muted">Review note: {p.reviewNote}</div>}
          <div className="d-flex gap-2 flex-wrap mt-1">
            <button className="btn btn-mc-outline btn-mc-sm" onClick={() => openProtected(`/files/${p.file}`)}>View file</button>
            {p.status === 'pending' && (
              <>
                <button className="btn btn-mc-primary btn-mc-sm" onClick={() => review(p, 'approve')}>Approve</button>
                <button className="btn btn-mc-outline btn-mc-sm" onClick={() => review(p, 'reject')}>Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DoctorDocs() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    apiGet('/admin/doctors').then((d) => setList(d.doctors.filter((x) => (x.documents || []).length))).catch((e) => setErr(e.message));
  }, []);
  return (
    <div className="mc-card">
      <p className="mc-muted small">Verify these against the National Medical Register or the State Medical Council, then approve or reject the doctor from the admin Doctors tab.</p>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {list.length === 0 && <p className="mc-muted mb-0">No doctor has uploaded documents yet.</p>}
      {list.map((d) => (
        <div className="mc-appt" key={d._id}>
          <strong>{d.name}</strong> <span className="mc-chip text-capitalize">{d.status}</span>
          <div className="small mc-muted">Reg. {d.registrationNumber} ({d.registrationCouncil})</div>
          {d.documents.map((x, i) => (
            <div key={i} className="small">📄 {x.label} <button className="btn btn-link p-0 small" onClick={() => openProtected(apiPathOf(x.url))}>View</button></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProductImages() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => apiGet('/admin/products').then((d) => setList(d.products)).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const upload = async (p, e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      await apiUpload(`/files/product/${p._id}`, fd);
      setMsg(`Image saved for ${p.name}.`);
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <div className="mc-card">
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>Product</th><th>Image</th><th /></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p._id}>
                <td>{p.icon} {p.name}</td>
                <td>{p.image ? <img src={p.image} alt="" style={{ height: 40, borderRadius: 6 }} /> : <span className="mc-muted small">emoji only</span>}</td>
                <td>
                  <label className="btn btn-mc-outline btn-mc-sm mb-0">
                    Upload
                    <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(p, e)} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminVerify() {
  const [tab, setTab] = useState('rx');
  return (
    <div className="container-xl py-4">
      <h3 className="mb-3 text-center">Verification and media</h3>
      <div className="mc-chips mb-3 justify-content-md-center">
        {[['rx', 'Prescriptions'], ['docs', 'Doctor documents'], ['img', 'Product images']].map(([k, l]) => (
          <button key={k} className={`mc-chip-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
        <Link to="/admin" className="mc-chip-btn text-decoration-none">← Admin dashboard</Link>
      </div>
      {tab === 'rx' && <Prescriptions />}
      {tab === 'docs' && <DoctorDocs />}
      {tab === 'img' && <ProductImages />}
    </div>
  );
}