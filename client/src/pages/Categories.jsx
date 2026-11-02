import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../services/api';
import PageHeader from '../components/PageHeader';
import { IconBadge } from '../components/Icon';

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/products/categories')
      .then((d) => setCats(d.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => cats.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())),
    [cats, q]
  );

  return (
    <div className="container-xl py-4">
      <PageHeader title="Categories" subtitle="Browse healthcare products by category." />

      <input
        className="form-control mc-cat-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search categories"
        aria-label="Search categories"
      />

      {loading && <p className="mc-muted text-center">Loading...</p>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && shown.length === 0 && <p className="mc-muted">No category matches your search.</p>}

      <div className="mc-catgrid">
        {shown.map((c) => (
          <Link key={c.slug} to={`/buy-medicines?category=${c.slug}`} className="mc-catcard">
            <IconBadge slug={c.slug} />
            <strong>{c.name}</strong>
            <span className="mc-muted small">{c.count} product{c.count === 1 ? '' : 's'}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 text-center">
        <Link to="/find-doctor" className="btn btn-mc-outline">Looking for a doctor instead?</Link>
      </div>
    </div>
  );
}