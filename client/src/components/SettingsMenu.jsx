import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];
const SIZES = [
  { v: 100, label: 'A' },
  { v: 112, label: 'A+' },
  { v: 125, label: 'A++' },
];

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { prefs, setPref, t } = usePrefs();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setTheme = (wanted) => {
    if (theme !== wanted) toggleTheme();
  };
  const close = () => setOpen(false);

  return (
    <div className="mc-menu-wrap" ref={ref}>
      <button
        type="button"
        className="mc-toggler"
        aria-label={t('menu_settings')}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ⋮
      </button>

      {open && (
        <div className="mc-menu" role="menu">
          <h6>{t('menu_theme')}</h6>
          <div className="d-flex gap-2 mb-3">
            <button type="button" className={`mc-chip-btn flex-fill ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}>☀️ Light</button>
            <button type="button" className={`mc-chip-btn flex-fill ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}>🌙 Dark</button>
          </div>

          <h6>{t('menu_language')}</h6>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {LANGS.map((l) => (
              <button key={l.code} type="button"
                className={`mc-chip-btn ${prefs.lang === l.code ? 'active' : ''}`}
                onClick={() => setPref('lang', l.code)}>
                {l.label}
              </button>
            ))}
          </div>

          <h6>{t('menu_textsize')}</h6>
          <div className="d-flex gap-2 mb-3">
            {SIZES.map((s) => (
              <button key={s.v} type="button"
                className={`mc-chip-btn flex-fill ${prefs.fontScale === s.v ? 'active' : ''}`}
                onClick={() => setPref('fontScale', s.v)}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="form-check mb-1">
            <input className="form-check-input" type="checkbox" id="pref-contrast"
              checked={prefs.contrast} onChange={(e) => setPref('contrast', e.target.checked)} />
            <label className="form-check-label" htmlFor="pref-contrast">{t('menu_contrast')}</label>
          </div>
          <div className="form-check mb-3">
            <input className="form-check-input" type="checkbox" id="pref-motion"
              checked={prefs.reduceMotion} onChange={(e) => setPref('reduceMotion', e.target.checked)} />
            <label className="form-check-label" htmlFor="pref-motion">{t('menu_motion')}</label>
          </div>

          <hr className="my-2" />
          {user && <Link to="/profile" onClick={close}>My profile</Link>}
          <Link to="/faq" onClick={close}>FAQ</Link>
          <Link to="/privacy" onClick={close}>Privacy Policy</Link>
          <Link to="/terms" onClick={close}>Terms of Service</Link>
          <Link to="/about" onClick={close}>About Us</Link>
        </div>
      )}
    </div>
  );
}