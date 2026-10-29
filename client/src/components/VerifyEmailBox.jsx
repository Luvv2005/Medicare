import { useState } from 'react';
import { apiPost } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailBox() {
  const { user, setUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user.isEmailVerified) return null;

  const run = async (fn) => {
    setErr('');
    setMsg('');
    setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const send = () => run(async () => {
    const r = await apiPost('/auth/send-verify-otp');
    setSent(true);
    setMsg(r.message);
  });
  const verify = () => run(async () => {
    await apiPost('/auth/verify-email', { code: code.trim() });
    setUser({ ...user, isEmailVerified: true });
  });

  return (
    <div className="mc-note mc-note--warn mb-3">
      <strong>Verify your email</strong>
      <div className="small mb-2">A verified email helps you recover your account.</div>
      {err && <div className="alert alert-danger py-1 small">{err}</div>}
      {msg && <div className="alert alert-success py-1 small">{msg}</div>}
      {!sent ? (
        <button className="btn btn-mc-outline btn-mc-sm" onClick={send} disabled={busy}>Send code to {user.email}</button>
      ) : (
        <div className="d-flex gap-2 flex-wrap">
          <input className="form-control" style={{ maxWidth: 180 }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" aria-label="Verification code" />
          <button className="btn btn-mc-primary btn-mc-sm" onClick={verify} disabled={busy || code.length !== 6}>Verify</button>
          <button className="btn btn-link" onClick={send} disabled={busy}>Resend</button>
        </div>
      )}
    </div>
  );
}