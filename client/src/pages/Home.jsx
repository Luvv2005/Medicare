import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';
import useAddToCart from '../hooks/useAddToCart';
import DoctorCard from '../components/DoctorCard';
import ProductCard from '../components/ProductCard';
import HowItWorks from '../components/HowItWorks';
import HeroSlider from '../components/HeroSlider';
import SwipeToggle from '../components/SwipeToggle';
import { IconBadge } from '../components/Icon';

const ACTIONS = [
  { to: '/find-doctor', icon: 'stethoscope', title: 'Find a Doctor', text: 'Search verified doctors' },
  { to: '/find-doctor?type=local', icon: 'pin', title: 'Local Clinics', text: 'Village and town doctors' },
  { to: '/buy-medicines', icon: 'pill', title: 'Buy Medicines', text: 'Medicines and healthcare' },
  { to: '/dashboard', icon: 'calendar', title: 'My Appointments', text: 'Bookings and refunds' },
  { to: '/orders', icon: 'package', title: 'My Orders', text: 'Track your orders' },
  { to: '/chat', icon: 'chat', title: 'Chat with Doctor', text: 'Messages and calls' },
];

const WHY = [
  { icon: 'shield', title: 'Verified doctors', text: 'Every doctor is reviewed by an admin before appearing.' },
  { icon: 'lock', title: 'Secure accounts', text: 'Hashed passwords and role-based access.' },
  { icon: 'refund', title: 'Clear refunds', text: 'A visible cancellation policy and refund status.' },
  { icon: 'bell', title: 'Stay informed', text: 'Notifications for bookings, cancellations and refunds.' },
  { icon: 'chat', title: 'Talk to your doctor', text: 'Chat, share reports and join calls after booking.' },
];

const KINDS = [
  { value: 'medicine', label: 'Medicine' },
  { value: 'doctor', label: 'Doctor' },
];

function SectionHead({ title, to, linkText }) {
  return (
    <div className="mc-sec2-head">
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

  const [kind, setKind] = useState('medicine');
  const [text, setText] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [totals, setTotals] = useState({ doctors: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    () =>
      Promise.all([
        apiGet('/doctors?sort=rating&limit=8'),
        apiGet('/products?limit=10'),
        apiGet('/products/categories'),
      ])
        .then(([d, p, c]) => {
          setError('');
          setDoctors(d.doctors);
          setProducts(p.products);
          setCats(c.categories);
          setTotals({ doctors: d.total, products: p.total });
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const submit = (e) => {
    e.preventDefault();
    const q = text.trim();
    const base = kind === 'doctor' ? '/find-doctor' : '/buy-medicines';
    navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base);
  };

  const stats = [
    { v: totals.doctors, l: 'Doctors' },
    { v: cats.filter((c) => c.count > 0).length, l: 'Categories' },
    { v: totals.products, l: 'Medicines' },
    { v: '24/7', l: 'Help assistant' },
  ];

  return (
    <div className="container-xl pb-4">
      <section className="mc-banner">
        <h1>Your Health, Delivered &amp; Care Simplified</h1>
        <p>Order medicines and find trusted doctors near you, all in one place.</p>

        <SwipeToggle value={kind} onChange={setKind} options={KINDS} label="Search for medicine or doctor" />

        <form className="d-flex gap-2" onSubmit={submit}>
          <input
            className="form-control"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={kind === 'doctor' ? 'Try "skin specialist near Barnala"' : 'Search medicines…'}
            aria-label="Search"
          />
          <button className="btn btn-mc-green" type="submit">Search</button>
        </form>

        <div className="d-flex flex-wrap gap-2 mt-3">
          <Link to="/buy-medicines" className="btn btn-white">Buy Medicines</Link>
          <Link to="/find-doctor" className="btn btn-navy">Find a Doctor</Link>
        </div>
      </section>

      {error && <div className="alert alert-danger mt-4">{error}</div>}
      {msg && <div className="mc-note mt-3" role="status">{msg}</div>}

      <section className="mc-split">
        <div>
          <h2>
            Talk to a <span className="mc-grad-text">caring doctor</span>, get medicines at your door
          </h2>
          <p className="mc-muted">
            Find the right doctor near you, book a visit in minutes, chat about your reports and
            order medicines, all in one place.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/find-doctor" className="btn btn-mc-green">Find a Doctor</Link>
            <Link to="/buy-medicines" className="btn btn-mc-outline">Order Medicines</Link>
          </div>
          <div className="mc-stat-row">
            {stats.map((s) => (
              <div className="mc-stat-chip" key={s.l}>
                <strong>{s.v}</strong>
                <span className="mc-muted small">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
        <HeroSlider />
      </section>

      <section className="mc-sec2">
        <div className="mc-catgrid">
          {ACTIONS.map((a) => (
            <Link key={a.to} to={a.to} className="mc-catcard">
              <IconBadge name={a.icon} />
              <strong>{a.title}</strong>
              <span className="mc-muted small">{a.text}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mc-sec2">
        <SectionHead title="Categories" />
        <div className="mc-catgrid">
          {cats.slice(0, 12).map((c) => (
            <Link key={c.slug} to={`/buy-medicines?category=${c.slug}`} className="mc-catcard">
              <IconBadge slug={c.slug} />
              <strong>{c.name}</strong>
            </Link>
          ))}
        </div>
        <div className="text-center mt-4">
          <Link to="/categories" className="btn btn-mc-outline">View all {cats.length} categories →</Link>
        </div>
      </section>

      <section className="mc-sec2">
        <SectionHead title={t('featured_doctors')} to="/find-doctor" linkText={t('view_all')} />
        {!loading && doctors.length === 0 && <p className="mc-muted text-center">No doctors are listed yet.</p>}
        <div className="mc-doc-grid">
          {doctors.map((d) => <DoctorCard key={d._id} doctor={d} layout="grid" />)}
        </div>
      </section>

      <section className="mc-sec2">
        <SectionHead title={t('popular_medicines')} to="/buy-medicines" linkText={t('view_all')} />
        {!loading && products.length === 0 && <p className="mc-muted text-center">No products are listed yet.</p>}
        <div className="mc-prod-grid">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} onAdd={add} adding={busyId === p._id} />
          ))}
        </div>
      </section>

      <HowItWorks />

      <section className="mc-sec2">
        <SectionHead title="Why MediCare" />
        <div className="mc-catgrid">
          {WHY.map((w) => (
            <div key={w.title} className="mc-card mc-hov">
              <IconBadge name={w.icon} />
              <h6 className="mt-2">{w.title}</h6>
              <p className="mc-muted small mb-0">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="mc-sec2">
          <div className="mc-cta">
            <h3>Are you a doctor?</h3>
            <p>Join MediCare, set your own schedule and reach patients near you.</p>
            <Link to="/doctor/register" className="btn btn-mc-light">Register as a doctor</Link>
          </div>
        </section>
      )}
    </div>
  );
}