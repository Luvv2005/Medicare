import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api';

const MAX = 3;

export default function ResubmitForm({ doctor, onDone }) {
  const [specs, setSpecs] = useState([]);
  const [f, setF] = useState({
    specialization: doctor.specialization,
    qualifications: (doctor.qualifications || []).join(', '),
    experienceYears: doctor.experienceYears,
    registrationNumber: doctor.registrationNumber,
    registrationCouncil: doctor.registrationCouncil,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiGet('/doctors/specializations').then((d) => setSpecs(d.specializations)).catch(() => {});
  }, []);

  const left = MAX - (doctor.resubmitCount || 0);
  const on = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await apiPost('/doctors/me/resubmit', f);
      onDone();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  if (left <= 0)
    return (
      <div className="alert alert-danger">
        Your application was rejected: {doctor.rejectionReason || 'no reason given'}. You have used all
        resubmissions. Please contact support.
      </div>
    );

  return (
    <form className="mc-card mb-3" onSubmit={submit}>
      <div className="alert alert-danger py-2">
        <strong>Your application was rejected:</strong> {doctor.rejectionReason || 'no reason given'}
      </div>
      <h5>Fix and resubmit</h5>
      <p className="mc-muted small">
        Correct the details below, upload any new documents in the section above, and resubmit.
        Resubmissions left: {left}.
      </p>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Specialization</label>
          <select className="form-select" name="specialization" value={f.specialization} onChange={on}>
            {specs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Experience (years)</label>
          <input className="form-control" type="number" min="0" max="70" name="experienceYears" value={f.experienceYears} onChange={on} />
        </div>
        <div className="col-12 mb-3">
          <label className="form-label">Qualifications (comma separated)</label>
          <input className="form-control" name="qualifications" value={f.qualifications} onChange={on} />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Registration number</label>
          <input className="form-control" name="registrationNumber" value={f.registrationNumber} onChange={on} />
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Registration council</label>
          <input className="form-control" name="registrationCouncil" value={f.registrationCouncil} onChange={on} />
        </div>
      </div>
      <button className="btn btn-mc-primary" disabled={busy}>{busy ? 'Submitting...' : 'Resubmit for review'}</button>
    </form>
  );
}