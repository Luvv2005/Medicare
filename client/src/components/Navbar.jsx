import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/buy-medicines', label: 'Buy Medicines' },
  { to: '/find-doctor', label: 'Find a Doctor' },
  { to: '/categories', label: 'Categories' },
  { to: '/chat', label: 'Chat' },
  { to: '/about', label: 'About Us' },
  { to: '/cart', label: 'Cart (0)' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { count } = useCart();
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
        <Link to="/" className="mc-logo" onClick={close}>
          <span className="mc-logo-icon">+</span> MediCare
        </Link>

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
                <NavLink to={l.to} end={l.to === '/'} className="nav-link" onClick={close}
                >
                {l.to === '/cart' ? `Cart (${count})` : l.label}
                </NavLink>
              </li>
            ))}
            {user && (
              <li className="nav-item">
                <NavLink to="/dashboard" className="nav-link" onClick={close}>
                  Dashboard
                </NavLink>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2 py-2 py-lg-0 flex-wrap">
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
                <span className="mc-user-chip">
                  {user.name.split(' ')[0]}
                  <small className="ms-1 mc-muted text-capitalize">({user.role})</small>
                </span>
                <button className="btn btn-mc-outline" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-mc-outline" onClick={close}>
                Login / Register
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}