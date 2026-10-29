import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../services/api';
import PageHeader from '../components/PageHeader';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setErr('');
    setMsg('');
    setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const sendCode = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await apiPost('/auth/forgot-password', { email: email.trim() });
      setMsg(r.message);
      setStep(2);
    });
  };

  const reset = (e) => {
    e.preventDefault();
    if (pw !== pw2) return setErr('Passwords do not match');
    return run(async () => {
      const r = await apiPost('/auth/reset-password', { email: email.trim(), code: code.trim(), password: pw });
      setMsg(r.message);
      setStep(3);
    });
  };

  return (
    <div className="container py-4">
      <PageHeader title="Forgot password" subtitle="Reset your password with an email code." />
      <div className="mc-auth-wrap">
        <div className="mc-card">
          {err && <div className="alert alert-danger py-2" role="alert">{err}</div>}
          {msg && <div className="alert alert-success py-2" role="status">{msg}</div>}

          {step === 1 && (
            <form onSubmit={sendCode}>
              <label className="form-label" htmlFor="fp-email">Email</label>
              <input id="fp-email" type="email" className="form-control mb-3" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <button className="btn btn-mc-primary w-100" disabled={busy}>Send code</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={reset}>
              <label className="form-label" htmlFor="fp-code">6-digit code</label>
              <input id="fp-code" className="form-control mb-3" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
              <label className="form-label" htmlFor="fp-pw">New password</label>
              <input id="fp-pw" type="password" className="form-control mb-3" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
              <label className="form-label" htmlFor="fp-pw2">Confirm new password</label>
              <input id="fp-pw2" type="password" className="form-control mb-3" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              <button className="btn btn-mc-primary w-100" disabled={busy}>Change password</button>
              <button type="button" className="btn btn-link w-100 mt-2" onClick={() => { setStep(1); setMsg(''); }}>Use a different email</button>
            </form>
          )}

          {step === 3 && <Link to="/login" className="btn btn-mc-primary w-100">Go to login</Link>}
        </div>
      </div>
    </div>
  );
}