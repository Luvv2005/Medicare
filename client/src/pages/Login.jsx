import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useLocation } from 'react-router-dom';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/;

export default function Login() {
  const { user, login, register } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState('login'); // 'login' ya 'register'
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pehle se logged in hai to login page dikhane ka koi matlab nahi
  if (user) return <Navigate to={redirectTo} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  // Frontend validation (jaldi feedback ke liye). Asli validation backend karta hai.
  const validateRegister = () => {
    if (form.name.trim().length < 2) return 'Please enter your full name';
    if (!emailRegex.test(form.email)) return 'Please enter a valid email';
    if (form.phone && !phoneRegex.test(form.phone))
      return 'Phone must be a valid 10-digit Indian number';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      return 'Password must be 8+ characters with at least one letter and one number';
    if (form.password !== form.confirm) return 'Passwords do not match';
    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      const msg = validateRegister();
      if (msg) return setError(msg);
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name.trim(),
          email: form.email,
          phone: form.phone,
          password: form.password,
        });
      }
      // Success par user set ho jata hai aur upar wala <Navigate> redirect kar deta hai
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4 py-md-5">
      <div className="mc-auth-wrap">
        <div className="mc-card">
          <div className="mc-auth-tabs mb-4">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>

          <h4 className="mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h4>
          <p className="mc-muted mb-4">
            {mode === 'login'
              ? 'Login to book appointments and order medicines.'
              : 'Patient account. Doctors can register separately later.'}
          </p>

          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label" htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={onChange}
                  autoComplete="name"
                  placeholder="Your full name"
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label" htmlFor="phone">
                  Phone <span className="mc-muted">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="form-control"
                  value={form.phone}
                  onChange={onChange}
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-group">
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  value={form.password}
                  onChange={onChange}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="btn btn-mc-outline"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label" htmlFor="confirm">Confirm password</label>
                <input
                  id="confirm"
                  name="confirm"
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  value={form.confirm}
                  onChange={onChange}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-mc-primary w-100 mt-2"
              disabled={submitting}
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Login'
                : 'Create account'}
            </button>
          </form>
          <p className="text-center mc-muted mt-3 mb-0">
            Are you a doctor?{' '}
            <Link to="/doctor/register">Register as a doctor</Link>
          </p>
        </div>
      </div>
    </div>
  );
}