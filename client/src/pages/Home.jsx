import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';
import useAddToCart from '../hooks/useAddToCart';
import DoctorCard from '../components/DoctorCard';
import ProductCard from '../components/ProductCard';
import '../styles/home.css';

const ACTIONS = [
  { to: '/find-doctor', icon: '🩺', title: 'Find a Doctor', text: 'Search verified doctors' },
  { to: '/buy-medicines', icon: '💊', title: 'Buy Medicines', text: 'Medicines and healthcare' },
  { to: '/dashboard', icon: '📅', title: 'My Appointments', text: 'Bookings and refunds' },
  { to: '/orders', icon: '📦', title: 'My Orders', text: 'Track your orders' },
];

const STEPS = [
  { icon: '🔎', title: '1. Search', text: 'Find a doctor by name, specialization or city, or search for a medicine.' },
  { icon: '🗓️', title: '2. Book', text: 'Pick a free slot and pay online or at the clinic.' },
  { icon: '✅', title: '3. Consult', text: 'Visit the clinic or consult online, and get updates in your notifications.' },
];

const WHY = [
  { icon: '🛡️', title: 'Verified doctors', text: 'Every doctor is reviewed by an admin before appearing.' },
  { icon: '🔒', title: 'Secure accounts', text: 'Hashed passwords and role-based access.' },
  { icon: '↩️', title: 'Clear refunds', text: 'A visible cancellation policy and refund status.' },
  { icon: '🔔', title: 'Stay informed', text: 'Notifications for bookings, cancellations and refunds.' },
];

function SectionHead({ title, to, linkText }) {
  return (
    <div className="mc-sec-head">
      <h3>{title}</h3>
      {to && <Link to={to}>{linkText} →</Link>}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const { add, busyId, msg } = useAddToCart();

  const [kind, setKind] = useState('doctor');
  const [text, setText] = useState('');
  const [specs, setSpecs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet('/doctors?sort=rating&limit=4'),
      apiGet('/products?limit=4'),
      apiGet('/products/categories'),
      apiGet('/doctors/specializations'),
    ])
      .then(([d, p, c, s]) => {
        setDoctors(d.doctors);
        setProducts(p.products);
        setCats(c.categories);
        setSpecs(s.specializations);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    const base = kind === 'doctor' ? '/find-doctor' : '/buy-medicines';
    navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base);
  };

  return (
    <div className="mc-home">
      <section className="mc-hero">
        <div className="container-xl">
          <h1>{t('hero_title')}</h1>
          <p className="mc-muted mb-0">{t('hero_sub')}</p>

          <div className="mc-search-box">
            <div className="mc-auth-tabs mb-3 mx-auto" style={{ maxWidth: 320 }}>
              <button type="button" className={kind === 'doctor' ? 'active' : ''} onClick={() => setKind('doctor')}>
                {t('search_doctor')}
              </button>
              <button type="button" className={kind === 'medicine' ? 'active' : ''} onClick={() => setKind('medicine')}>
                {t('search_medicine')}
              </button>
            </div>

            <form className="d-flex gap-2" onSubmit={submit}>
              <input
                className="form-control"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={kind === 'doctor' ? 'Try "skin specialist near Barnala"' : 'Search medicines, vitamins, skincare'}
                aria-label="Search"
              />
              <button className="btn btn-mc-primary" type="submit">Search</button>
            </form>

            <div className="mc-chips justify-content-md-center mt-3">
              {kind === 'doctor'
                ? specs.slice(0, 8).map((s) => (
                    <Link key={s} className="mc-chip-btn" to={`/find-doctor?specialization=${encodeURIComponent(s)}`}>
                      {s}
                    </Link>
                  ))
                : cats.slice(0, 8).map((c) => (
                    <Link key={c.slug} className="mc-chip-btn" to={`/buy-medicines?category=${c.slug}`}>
                      {c.name}
                    </Link>
                  ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-xl">
        {error && <div className="alert alert-danger mt-4">{error}</div>}
        {msg && <div className="mc-note mt-3" role="status">{msg}</div>}

        <section className="mc-block">
          <div className="mc-cat-grid">
            {ACTIONS.map((a) => (
              <Link key={a.to} to={a.to} className="mc-cat">
                <span className="mc-cat-icon">{a.icon}</span>
                <strong>{a.title}</strong>
                <span className="mc-muted small">{a.text}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mc-block">
          <SectionHead title={t('featured_doctors')} to="/find-doctor" linkText={t('view_all')} />
          {!loading && doctors.length === 0 && <p className="mc-muted text-center">No doctors are listed yet.</p>}
          <div className="mc-doc-grid">
            {doctors.map((d) => <DoctorCard key={d._id} doctor={d} layout="grid" />)}
          </div>
        </section>

        <section className="mc-block">
          <SectionHead title={t('popular_medicines')} to="/buy-medicines" linkText={t('view_all')} />
          {!loading && products.length === 0 && <p className="mc-muted text-center">No products are listed yet.</p>}
          <div className="mc-prod-grid">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} onAdd={add} adding={busyId === p._id} />
            ))}
          </div>
        </section>

        <section className="mc-block">
          <SectionHead title={t('categories_title')} to="/categories" linkText={t('view_all')} />
          <div className="mc-cat-grid">
            {cats.map((c) => (
              <Link key={c.slug} to={`/buy-medicines?category=${c.slug}`} className="mc-cat">
                <span className="mc-cat-icon">{c.icon}</span>
                <strong>{c.name}</strong>
                <span className="mc-muted small">{c.count} product{c.count === 1 ? '' : 's'}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mc-block">
          <SectionHead title="How it works" />
          <div className="mc-cat-grid">
            {STEPS.map((s) => (
              <div key={s.title} className="mc-card text-center">
                <div className="mc-cat-icon">{s.icon}</div>
                <h6 className="mt-2">{s.title}</h6>
                <p className="mc-muted small mb-0">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mc-block">
          <SectionHead title="Why MediCare" />
          <div className="mc-cat-grid">
            {WHY.map((w) => (
              <div key={w.title} className="mc-card text-center">
                <div className="mc-cat-icon">{w.icon}</div>
                <h6 className="mt-2">{w.title}</h6>
                <p className="mc-muted small mb-0">{w.text}</p>
              </div>
            ))}
          </div>
        </section>

        {!user && (
          <section className="mc-block">
            <div className="mc-cta">
              <h3>Are you a doctor?</h3>
              <p>Join MediCare, set your own schedule and reach patients near you.</p>
              <Link to="/doctor/register" className="btn btn-mc-light">Register as a doctor</Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}