import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

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
  const close = () => setOpen(false);

  return (
    <nav className="navbar navbar-expand-lg mc-navbar">
      <div className="container-fluid px-3 px-lg-4">
        <Link to="/" className="mc-logo" onClick={close}>
          <span className="mc-logo-icon">+</span> MediCare
        </Link>

        {/* Hamburger (mobile) */}
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
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center gap-2 py-2 py-lg-0">
            <button
              className="mc-toggler"
              onClick={toggleTheme}
              aria-label="Switch light/dark theme"
              title="Switch theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link to="/login" className="btn btn-mc-outline" onClick={close}>
              Login / Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}