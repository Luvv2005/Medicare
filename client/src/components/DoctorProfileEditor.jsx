import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api';

const pincodeRegex = /^\d{6}$/;

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function DoctorProfileEditor() {
  const [locked, setLocked] = useState(null);
  const [form, setForm] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGet('/doctors/me/profile')
      .then(({ doctor: d }) => {
        setLocked({
          name: d.name,
          specialization: d.specialization,
          registrationNumber: d.registrationNumber,
          registrationCouncil: d.registrationCouncil,
        });
        setForm({
          bio: d.bio || '',
          consultationFee: d.consultationFee,
          languages: (d.languages || []).join(', '),
          online: d.modes.online,
          inPerson: d.modes.inPerson,
          payAtClinic: d.payAtClinic,
        });
        setClinic({
          name: d.clinic.name, address: d.clinic.address, city: d.clinic.city,
          state: d.clinic.state, pincode: d.clinic.pincode,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="mc-muted">Loading...</p>;
  if (!form) return <div className="alert alert-danger">{error || 'Profile not found'}</div>;

  const on = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };
  const onClinic = (e) => setClinic({ ...clinic, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const fee = Number(form.consultationFee);
    if (form.consultationFee === '' || !Number.isFinite(fee) || fee < 0) return setError('Enter a valid fee');
    if (!form.online && !form.inPerson) return setError('Choose at least one consultation mode');
    if (!clinic.name.trim() || !clinic.address.trim() || !clinic.city.trim() || !clinic.state.trim())
      return setError('Clinic name, address, city and state are required');
    if (!pincodeRegex.test(clinic.pincode.trim())) return setError('Enter a valid 6-digit pincode');

    setBusy(true);
    try {
      await apiPut('/doctors/me/profile', {
        bio: form.bio,
        consultationFee: fee,
        languages: form.languages,
        modes: { online: form.online, inPerson: form.inPerson },
        payAtClinic: form.inPerson && form.payAtClinic,
        clinic,
      });
      setMsg('Profile saved. Changes show on Find a Doctor. Existing appointments keep their original fee.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <form className="mc-card" onSubmit={save} noValidate>
      <h5>Edit profile</h5>
      <div className="mc-note mb-3 small">
        <strong>{locked.name}</strong> · {locked.specialization} · Reg. {locked.registrationNumber} ({locked.registrationCouncil}).
        To change these verified details, contact the admin.
      </div>

      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      {msg && <div className="alert alert-success py-2" role="status">{msg}</div>}

      <div className="row">
        <div className="col-md-4"><Field label="Consultation fee (₹)">
          <input className="form-control" type="number" min="0" name="consultationFee"
            value={form.consultationFee} onChange={on} />
        </Field></div>
        <div className="col-md-8"><Field label="Languages (comma separated)">
          <input className="form-control" name="languages" value={form.languages} onChange={on} />
        </Field></div>
        <div className="col-12"><Field label="About you">
          <textarea className="form-control" rows={3} maxLength={1000} name="bio" value={form.bio} onChange={on} />
        </Field></div>
      </div>

      <div className="mb-3">
        <label className="form-label">Modes offered</label>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="pe-online" name="online" checked={form.online} onChange={on} />
          <label className="form-check-label" htmlFor="pe-online">Online consultation</label>
        </div>
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="pe-inperson" name="inPerson" checked={form.inPerson} onChange={on} />
          <label className="form-check-label" htmlFor="pe-inperson">In-person (clinic visit)</label>
        </div>
        {form.inPerson && (
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="pe-pay" name="payAtClinic" checked={form.payAtClinic} onChange={on} />
            <label className="form-check-label" htmlFor="pe-pay">Allow pay at clinic</label>
          </div>
        )}
      </div>

      <h6 className="mc-section">Clinic</h6>
      <div className="row">
        <div className="col-md-6"><Field label="Clinic name">
          <input className="form-control" name="name" value={clinic.name} onChange={onClinic} />
        </Field></div>
        <div className="col-md-6"><Field label="Address">
          <input className="form-control" name="address" value={clinic.address} onChange={onClinic} />
        </Field></div>
        <div className="col-md-4"><Field label="City">
          <input className="form-control" name="city" value={clinic.city} onChange={onClinic} />
        </Field></div>
        <div className="col-md-4"><Field label="State">
          <input className="form-control" name="state" value={clinic.state} onChange={onClinic} />
        </Field></div>
        <div className="col-md-4"><Field label="Pincode">
          <input className="form-control" name="pincode" inputMode="numeric" maxLength={6}
            value={clinic.pincode} onChange={onClinic} />
        </Field></div>
      </div>

      <button className="btn btn-mc-primary" type="submit" disabled={busy}>
        {busy ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  );
}