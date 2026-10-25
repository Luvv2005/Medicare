import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

export default function DoctorRegister() {
  const { user, registerDoctor } = useAuth();

  const [specs, setSpecs] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    specialization: '', qualifications: '', experienceYears: '',
    registrationNumber: '', registrationCouncil: '',
    consultationFee: '', languages: '', bio: '',
    online: true, inPerson: true, payAtClinic: false,
  });
  const [clinic, setClinic] = useState({ name: '', address: '', city: '', state: '', pincode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet('/doctors/specializations').then((d) => setSpecs(d.specializations)).catch(() => {});
  }, []);

  if (user) {
    return (
      <div className="container py-5">
        <div className="mc-card text-center mc-auth-wrap">
          <h5>You are already logged in</h5>
          <p className="mc-muted">Logout first if you want to register a new doctor account.</p>
          <Link to="/dashboard" className="btn btn-mc-primary">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  const on = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };
  const onClinic = (e) => setClinic({ ...clinic, [e.target.name]: e.target.value });

  const validate = () => {
    if (form.name.trim().length < 2) return 'Please enter your full name';
    if (!emailRegex.test(form.email)) return 'Please enter a valid email';
    if (!phoneRegex.test(form.phone)) return 'Enter a valid 10-digit phone number';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      return 'Password must be 8+ characters with at least one letter and one number';
    if (form.password !== form.confirm) return 'Passwords do not match';
    if (!form.specialization) return 'Please choose a specialization';
    if (!form.qualifications.trim()) return 'Enter at least one qualification (comma separated)';
    const exp = Number(form.experienceYears);
    if (form.experienceYears === '' || !Number.isFinite(exp) || exp < 0 || exp > 70)
      return 'Experience must be between 0 and 70 years';
    if (!form.registrationNumber.trim() || !form.registrationCouncil.trim())
      return 'Medical registration number and council are required';
    if (!clinic.name.trim() || !clinic.address.trim() || !clinic.city.trim() || !clinic.state.trim())
      return 'Clinic name, address, city and state are required';
    if (!pincodeRegex.test(clinic.pincode)) return 'Enter a valid 6-digit pincode';
    const fee = Number(form.consultationFee);
    if (form.consultationFee === '' || !Number.isFinite(fee) || fee < 0)
      return 'Enter a valid consultation fee';
    if (!form.online && !form.inPerson) return 'Choose at least one consultation mode';
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const msg = validate();
    if (msg) return setError(msg);

    setSubmitting(true);
    try {
      await registerDoctor({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        specialization: form.specialization,
        qualifications: form.qualifications,
        experienceYears: Number(form.experienceYears),
        registrationNumber: form.registrationNumber.trim(),
        registrationCouncil: form.registrationCouncil.trim(),
        clinic: {
          name: clinic.name.trim(),
          address: clinic.address.trim(),
          city: clinic.city.trim(),
          state: clinic.state.trim(),
          pincode: clinic.pincode.trim(),
        },
        consultationFee: Number(form.consultationFee),
        modes: { online: form.online, inPerson: form.inPerson },
        payAtClinic: form.inPerson && form.payAtClinic,
        languages: form.languages,
        bio: form.bio.trim(),
      });
      // Success: user set ho gaya, upar wala "already logged in" screen dikhega.
      // Isliye seedha dashboard bhejte hain:
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const Field = ({ label, children, hint }) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      {children}
      {hint && <div className="form-text mc-muted">{hint}</div>}
    </div>
  );

  return (
    <div className="container py-4">
      <div className="mc-auth-wrap" style={{ maxWidth: 720 }}>
        <div className="mc-card">
          <h3 className="mb-1">Register as a Doctor</h3>
          <p className="mc-muted">
            Your application stays <strong>pending</strong> until an admin verifies your details. You
            appear in Find a Doctor only after approval.
          </p>

          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

          <form onSubmit={submit} noValidate>
            <h6 className="mc-section">Account</h6>
            <div className="row">
              <div className="col-md-6"><Field label="Full name">
                <input className="form-control" name="name" value={form.name} onChange={on} autoComplete="name" />
              </Field></div>
              <div className="col-md-6"><Field label="Email">
                <input className="form-control" type="email" name="email" value={form.email} onChange={on} autoComplete="email" />
              </Field></div>
              <div className="col-md-6"><Field label="Phone">
                <input className="form-control" type="tel" inputMode="numeric" maxLength={10} name="phone" value={form.phone} onChange={on} />
              </Field></div>
              <div className="col-md-6"><Field label="Password">
                <input className="form-control" type="password" name="password" value={form.password} onChange={on} autoComplete="new-password" />
              </Field></div>
              <div className="col-md-6"><Field label="Confirm password">
                <input className="form-control" type="password" name="confirm" value={form.confirm} onChange={on} autoComplete="new-password" />
              </Field></div>
            </div>

            <h6 className="mc-section">Professional details</h6>
            <div className="row">
              <div className="col-md-6"><Field label="Specialization">
                <select className="form-select" name="specialization" value={form.specialization} onChange={on}>
                  <option value="">Select...</option>
                  {specs.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field></div>
              <div className="col-md-6"><Field label="Experience (years)">
                <input className="form-control" type="number" min="0" max="70" name="experienceYears" value={form.experienceYears} onChange={on} />
              </Field></div>
              <div className="col-12"><Field label="Qualifications" hint="Comma separated, e.g. MBBS, MD Dermatology">
                <input className="form-control" name="qualifications" value={form.qualifications} onChange={on} />
              </Field></div>
              <div className="col-md-6"><Field label="Medical registration number">
                <input className="form-control" name="registrationNumber" value={form.registrationNumber} onChange={on} />
              </Field></div>
              <div className="col-md-6"><Field label="Registration council" hint="e.g. Punjab Medical Council">
                <input className="form-control" name="registrationCouncil" value={form.registrationCouncil} onChange={on} />
              </Field></div>
              <div className="col-md-6"><Field label="Languages" hint="Comma separated (optional)">
                <input className="form-control" name="languages" value={form.languages} onChange={on} />
              </Field></div>
              <div className="col-12"><Field label="About you (optional)">
                <textarea className="form-control" rows={3} maxLength={1000} name="bio" value={form.bio} onChange={on} />
              </Field></div>
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
                <input className="form-control" inputMode="numeric" maxLength={6} name="pincode" value={clinic.pincode} onChange={onClinic} />
              </Field></div>
            </div>

            <h6 className="mc-section">Consultation</h6>
            <div className="row">
              <div className="col-md-6"><Field label="Consultation fee (₹)">
                <input className="form-control" type="number" min="0" name="consultationFee" value={form.consultationFee} onChange={on} />
              </Field></div>
              <div className="col-md-6">
                <label className="form-label">Modes offered</label>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="m-online" name="online" checked={form.online} onChange={on} />
                  <label className="form-check-label" htmlFor="m-online">Online consultation</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="m-inperson" name="inPerson" checked={form.inPerson} onChange={on} />
                  <label className="form-check-label" htmlFor="m-inperson">In-person (clinic visit)</label>
                </div>
                {form.inPerson && (
                  <div className="form-check mt-1">
                    <input className="form-check-input" type="checkbox" id="m-payclinic" name="payAtClinic" checked={form.payAtClinic} onChange={on} />
                    <label className="form-check-label" htmlFor="m-payclinic">Allow pay at clinic</label>
                  </div>
                )}
              </div>
            </div>

            <p className="small mc-muted">
              Profile photo and verification documents will be added with secure file upload in a later step.
            </p>

            <button className="btn btn-mc-primary w-100" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}