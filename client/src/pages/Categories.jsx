import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../services/api';
import PageHeader from '../components/PageHeader';

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/products/categories')
      .then((d) => setCats(d.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-xl py-4">
      <PageHeader title="Categories" subtitle="Browse healthcare products by category." />

      {loading && <p className="mc-muted text-center">Loading...</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mc-cat-grid">
        {cats.map((c) => (
          <Link key={c.slug} to={`/buy-medicines?category=${c.slug}`} className="mc-cat">
            <span className="mc-cat-icon">{c.icon}</span>
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