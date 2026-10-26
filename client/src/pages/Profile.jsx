import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPut } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

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
  const { user, setUser } = useAuth();
  const isPatient = user.role === 'patient';

  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '' });
  const [addr, setAddr] = useState({
    line: user.address?.line || '',
    city: user.address?.city || '',
    state: user.address?.state || '',
    pincode: user.address?.pincode || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const on = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onAddr = (e) => setAddr({ ...addr, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (form.name.trim().length < 2) return setError('Please enter your name');
    if (form.phone && !phoneRegex.test(form.phone.trim())) return setError('Enter a valid 10-digit phone number');
    if (isPatient && addr.pincode && !pincodeRegex.test(addr.pincode.trim()))
      return setError('Pincode must be 6 digits');

    setBusy(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim() };
      if (isPatient) body.address = addr;
      const res = await apiPut('/auth/profile', body);
      setUser(res.user);
      setMsg('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div className="container-xl py-4">
      <PageHeader title="My profile" subtitle="Keep your details up to date." />
      <div className="mc-auth-wrap" style={{ maxWidth: 640 }}>
        <form className="mc-card" onSubmit={save} noValidate>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          {msg && <div className="alert alert-success py-2" role="status">{msg}</div>}

          <Field label="Email">
            <input className="form-control" value={user.email} disabled />
            <div className="form-text mc-muted">Email verification will be added with OTP support.</div>
          </Field>
          <Field label="Full name">
            <input className="form-control" name="name" value={form.name} onChange={on} autoComplete="name" />
          </Field>
          <Field label="Phone">
            <input className="form-control" name="phone" type="tel" inputMode="numeric" maxLength={10}
              value={form.phone} onChange={on} autoComplete="tel" />
          </Field>

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
      </div>
    </div>
  );
}