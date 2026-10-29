import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api';
import { apiUpload, openProtected, apiPathOf } from '../utils/files';
import { avatarColor, initials } from '../utils/doctorUtils';

export default function DoctorMedia() {
  const [d, setD] = useState(null);
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(
    () => apiGet('/doctors/me/profile').then((r) => setD(r.doctor)).catch((e) => setErr(e.message)),
    []
  );
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setErr('');
    setMsg('');
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const photo = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    run(async () => { await apiUpload('/files/doctor-photo', fd); setMsg('Photo updated.'); });
  };

  const doc = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const fd = new FormData();
    fd.append('label', label);
    fd.append('file', f);
    run(async () => {
      const r = await apiUpload('/files/doctor-doc', fd);
      setMsg(r.message);
      setLabel('');
    });
  };

  const locate = () => {
    if (!navigator.geolocation) return setErr('Location is not supported in this browser');
    return navigator.geolocation.getCurrentPosition(
      (pos) =>
        run(async () => {
          await apiPut('/files/doctor-location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setMsg('Clinic location saved. You now appear on the map.');
        }),
      () => setErr('Location permission denied'),
      { timeout: 10000 }
    );
  };

  if (!d) return err ? <div className="alert alert-danger">{err}</div> : null;
  const hasLoc = Array.isArray(d.clinic?.location?.coordinates) && d.clinic.location.coordinates.length === 2;

  return (
    <div className="mc-card mb-3">
      <h5>Photo, documents and map location</h5>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      {msg && <div className="alert alert-success py-2">{msg}</div>}

      <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
        {d.profilePhoto ? (
          <img className="mc-avatar" src={d.profilePhoto} alt="Profile" />
        ) : (
          <div className="mc-avatar" style={{ background: avatarColor(d.name) }}>{initials(d.name)}</div>
        )}
        <label className="btn btn-mc-outline btn-mc-sm mb-0">
          Upload profile photo
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={photo} />
        </label>
      </div>

      <h6>Verification documents</h6>
      <p className="mc-muted small">
        Registration certificate, degree, ID. Only you and the admin can see these. JPG, PNG, WEBP or PDF, up to 5 MB.
      </p>
      {(d.documents || []).map((x, i) => (
        <div key={i} className="small mb-1">
          📄 {x.label}{' '}
          <button className="btn btn-link p-0 small" onClick={() => openProtected(apiPathOf(x.url))}>View</button>
        </div>
      ))}
      <div className="d-flex gap-2 flex-wrap align-items-center mt-2 mb-3">
        <input className="form-control" style={{ maxWidth: 220 }} value={label} maxLength={60}
          onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Degree" aria-label="Document label" />
        <label className={`btn btn-mc-outline btn-mc-sm mb-0 ${label.trim().length < 2 ? 'disabled' : ''}`}>
          Choose file
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden
            disabled={label.trim().length < 2} onChange={doc} />
        </label>
      </div>

      <h6>Clinic map location</h6>
      <p className="mc-muted small mb-2">
        {hasLoc ? 'Your clinic is on the map.' : 'Not set yet, so patients cannot see you on the map or in nearby search.'}
      </p>
      <button className="btn btn-mc-outline btn-mc-sm" onClick={locate}>
        📍 Use my current location as clinic location
      </button>
    </div>
  );
}