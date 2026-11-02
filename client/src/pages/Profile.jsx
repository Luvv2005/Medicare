import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiDelete, apiPost, apiPut } from '../services/api';
import { apiUpload } from '../utils/files';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import { initials, avatarColor } from '../utils/doctorUtils';

const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const isPatient = user.role === 'patient';
  const isAdmin = user.role === 'admin';

  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', gender: user.gender || '' });
  const [addr, setAddr] = useState({
    line: user.address?.line || '',
    city: user.address?.city || '',
    state: user.address?.state || '',
    pincode: user.address?.pincode || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [photoBusy, setPhotoBusy] = useState(false);

  const [delStep, setDelStep] = useState(0); // 0 band, 1 code bhejna, 2 code daalna
  const [delCode, setDelCode] = useState('');
  const [delSure, setDelSure] = useState(false);
  const [delMsg, setDelMsg] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  const on = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onAddr = (e) => setAddr({ ...addr, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (form.name.trim().length < 2) return setError('Please enter your name');
    if (form.phone && !phoneRegex.test(form.phone.trim())) return setError('Enter a valid 10-digit phone number');
    if (isPatient && addr.pincode && !pincodeRegex.test(addr.pincode.trim())) return setError('Pincode must be 6 digits');

    setBusy(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim(), gender: form.gender };
      if (isPatient) body.address = addr;
      const res = await apiPut('/auth/profile', body);
      setUser({ ...user, ...res.user });
      setMsg('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const pickPhoto = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setError('');
    setMsg('');
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await apiUpload('/files/avatar', fd);
      setUser({ ...user, avatar: r.avatar });
      setMsg('Photo updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setError('');
    setMsg('');
    setPhotoBusy(true);
    try {
      await apiDelete('/files/avatar');
      setUser({ ...user, avatar: '' });
      setMsg('Photo removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const sendDeleteCode = async () => {
    setDelErr('');
    setDelMsg('');
    setDelBusy(true);
    try {
      const r = await apiPost('/auth/send-delete-otp');
      setDelMsg(r.message);
      setDelStep(2);
    } catch (err) {
      setDelErr(err.message);
    } finally {
      setDelBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDelErr('');
    setDelBusy(true);
    try {
      await apiPost('/auth/delete-account', { code: delCode.trim() });
      logout();
      navigate('/');
    } catch (err) {
      setDelErr(err.message);
      setDelBusy(false);
    }
  };

  return (
    <div className="container-xl py-4">
      <PageHeader title="My profile" subtitle="Keep your details up to date." />
      <div className="mc-auth-wrap" style={{ maxWidth: 640 }}>
        <form className="mc-card" onSubmit={save} noValidate>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          {msg && <div className="alert alert-success py-2" role="status">{msg}</div>}

          <div className="d-flex align-items-center gap-3 flex-wrap mb-4">
            {user.avatar ? (
              <img className="mc-avatar-xl" src={user.avatar} alt="Profile" />
            ) : (
              <div className="mc-avatar-xl" style={{ background: avatarColor(user.name) }}>{initials(user.name)}</div>
            )}
            <div className="d-flex flex-wrap gap-2">
              <label className={`btn btn-mc-outline btn-mc-sm mb-0 ${photoBusy ? 'disabled' : ''}`}>
                {photoBusy ? 'Please wait...' : user.avatar ? 'Change photo' : 'Upload photo'}
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} />
              </label>
              {user.avatar && (
                <button type="button" className="btn btn-link" onClick={removePhoto} disabled={photoBusy}>Remove</button>
              )}
            </div>
          </div>

          <Field label="Email">
            <input className="form-control" value={user.email} disabled />
            <div className="form-text mc-muted">
              {user.isEmailVerified ? '✓ Verified' : 'Not verified yet. You can verify it from your dashboard.'}
            </div>
          </Field>
          <Field label="Full name">
            <input className="form-control" name="name" value={form.name} onChange={on} autoComplete="name" />
          </Field>
          <div className="row">
            <div className="col-md-6"><Field label="Phone">
              <input className="form-control" name="phone" type="tel" inputMode="numeric" maxLength={10}
                value={form.phone} onChange={on} autoComplete="tel" />
            </Field></div>
            <div className="col-md-6"><Field label="Gender">
              <select className="form-select" name="gender" value={form.gender} onChange={on}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field></div>
          </div>

          {isPatient && (
            <>
              <h6 className="mc-section">Saved address</h6>
              <p className="mc-muted small">Used to fill your medicine delivery address. Online consultations do not need it.</p>
              <Field label="Address">
                <input className="form-control" name="line" value={addr.line} onChange={onAddr} placeholder="House no, street, area" />
              </Field>
              <div className="row">
                <div className="col-md-4"><Field label="City">
                  <input className="form-control" name="city" value={addr.city} onChange={onAddr} />
                </Field></div>
                <div className="col-md-4"><Field label="State">
                  <input className="form-control" name="state" value={addr.state} onChange={onAddr} />
                </Field></div>
                <div className="col-md-4"><Field label="Pincode">
                  <input className="form-control" name="pincode" inputMode="numeric" maxLength={6}
                    value={addr.pincode} onChange={onAddr} />
                </Field></div>
              </div>
            </>
          )}

          {user.role === 'doctor' && (
            <p className="small mc-muted">
              Your clinic address, fee and working hours are edited from{' '}
              <Link to="/dashboard">Dashboard → Profile</Link>.
            </p>
          )}

          <button className="btn btn-mc-primary w-100" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save profile'}
          </button>

          {isPatient && (
            <div className="d-flex flex-wrap justify-content-center gap-3 mt-3">
              <Link to="/orders">My orders</Link>
              <Link to="/payments">Payment history</Link>
            </div>
          )}
        </form>

        {!isAdmin && (
          <div className="mc-danger">
            <h6>Delete account</h6>
            <p className="small mc-muted">
              This removes your personal details, photo, prescriptions and cart, and you will no longer be
              able to log in. Records of past payments, orders and appointments are kept for accounting
              and legal reasons. You cannot delete while you have upcoming appointments, an order in
              progress or a refund pending.
            </p>

            {delErr && <div className="alert alert-danger py-2">{delErr}</div>}
            {delMsg && <div className="alert alert-info py-2">{delMsg}</div>}

            {delStep === 0 && (
              <button type="button" className="btn btn-mc-outline" onClick={() => setDelStep(1)}>Delete my account</button>
            )}

            {delStep === 1 && (
              <div className="d-flex gap-2 flex-wrap">
                <button type="button" className="btn btn-mc-primary" onClick={sendDeleteCode} disabled={delBusy}>
                  {delBusy ? 'Sending...' : `Send code to ${user.email}`}
                </button>
                <button type="button" className="btn btn-link" onClick={() => { setDelStep(0); setDelErr(''); }}>Cancel</button>
              </div>
            )}

            {delStep === 2 && (
              <>
                <input className="form-control mb-2" style={{ maxWidth: 220 }} inputMode="numeric" maxLength={6}
                  value={delCode} onChange={(e) => setDelCode(e.target.value)} placeholder="6-digit code" aria-label="Deletion code" />
                <div className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" id="del-sure" checked={delSure}
                    onChange={(e) => setDelSure(e.target.checked)} />
                  <label className="form-check-label" htmlFor="del-sure">I understand this cannot be undone.</label>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn btn-mc-primary" onClick={confirmDelete}
                    disabled={delBusy || delCode.length !== 6 || !delSure}>
                    {delBusy ? 'Deleting...' : 'Permanently delete'}
                  </button>
                  <button type="button" className="btn btn-link" onClick={sendDeleteCode} disabled={delBusy}>Resend code</button>
                  <button type="button" className="btn btn-link" onClick={() => { setDelStep(0); setDelCode(''); setDelMsg(''); setDelErr(''); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}