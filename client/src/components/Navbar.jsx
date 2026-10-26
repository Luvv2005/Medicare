import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePrefs } from '../context/PrefsContext';
import NotificationBell from './NotificationBell';
import SettingsMenu from './SettingsMenu';

const links = [
  { to: '/', key: 'nav_home' },
  { to: '/buy-medicines', key: 'nav_buy' },
  { to: '/find-doctor', key: 'nav_find' },
  { to: '/categories', key: 'nav_categories' },
  { to: '/chat', key: 'nav_chat' },
  { to: '/about', key: 'nav_about' },
  { to: '/cart', key: 'nav_cart' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg mc-navbar">
      <div className="container-fluid px-3 px-lg-4">
        <div className="d-flex align-items-center gap-2">
          <SettingsMenu />
          <Link to="/" className="mc-logo" onClick={close}>
            <span className="mc-logo-icon">+</span> MediCare
          </Link>
        </div>

        <button
          className="mc-toggler d-lg-none"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>

        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav mx-auto">
            {links.map((l) => (
              <li className="nav-item" key={l.to}>
                <NavLink to={l.to} end={l.to === '/'} className="nav-link" onClick={close}>
                  {l.to === '/cart' ? `${t(l.key)} (${count})` : t(l.key)}
                </NavLink>
              </li>
            ))}
            {user && (
              <li className="nav-item">
                <NavLink to="/dashboard" className="nav-link" onClick={close}>
                  {t('nav_dashboard')}
                </NavLink>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2 py-2 py-lg-0 flex-wrap">
            {user && <NotificationBell />}
            <button
              className="mc-toggler"
              onClick={toggleTheme}
              aria-label="Switch light/dark theme"
              title="Switch theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {user ? (
              <>
                <Link to="/profile" className="mc-user-chip" onClick={close}>
                  {user.name.split(' ')[0]}
                  <small className="ms-1 mc-muted text-capitalize">({user.role})</small>
                </Link>
                <button className="btn btn-mc-outline" onClick={handleLogout}>
                  {t('logout')}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-mc-outline" onClick={close}>
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}