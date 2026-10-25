import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import useDebounce from '../hooks/useDebounce';
import useAddToCart from '../hooks/useAddToCart';
import ProductCard from '../components/ProductCard';

export default function BuyMedicines() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';

  const [searchText, setSearchText] = useState(get('q'));
  const debounced = useDebounce(searchText, 400);

  const [cats, setCats] = useState([]);
  const [data, setData] = useState({ products: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { add, busyId, msg } = useAddToCart();

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    apiGet('/products/categories').then((d) => setCats(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounced.trim() !== get('q')) setParam('q', debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    const qs = new URLSearchParams();
    ['q', 'category', 'sort', 'rx', 'inStock', 'page'].forEach((k) => {
      if (get(k)) qs.set(k, get(k));
    });
    qs.set('limit', '12');

    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet(`/products?${qs.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const page = Number(get('page')) || 1;

  const clearAll = () => {
    setParams({}, { replace: true });
    setSearchText('');
  };

  return (
    <div className="container-xl py-4">
      <h2 className="mb-1">Buy Medicines</h2>
      <p className="mc-muted">Medicines, vitamins, skincare and everyday healthcare products.</p>

      {msg && <div className="mc-note mb-3" role="status">{msg}</div>}

      <div className="row g-2 mb-3">
        <div className="col-12 col-md">
          <input
            className="form-control"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name or brand"
            aria-label="Search products"
          />
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={get('sort')} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort">
            <option value="">Name (A-Z)</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={get('rx')} onChange={(e) => setParam('rx', e.target.value)} aria-label="Prescription filter">
            <option value="">Rx and non-Rx</option>
            <option value="no">No prescription needed</option>
            <option value="yes">Prescription required</option>
          </select>
        </div>
      </div>

      <div className="mc-chips mb-2">
        <button className={`mc-chip-btn ${!get('category') ? 'active' : ''}`} onClick={() => setParam('category', '')}>
          All
        </button>
        {cats.map((c) => (
          <button
            key={c.slug}
            className={`mc-chip-btn ${get('category') === c.slug ? 'active' : ''}`}
            onClick={() => setParam('category', c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="instock"
          checked={get('inStock') === 'true'}
          onChange={(e) => setParam('inStock', e.target.checked ? 'true' : '')}
        />
        <label className="form-check-label" htmlFor="instock">In stock only</label>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {!error && (
        <p className="mc-muted mb-2">
          {loading ? 'Loading...' : `${data.total} product${data.total === 1 ? '' : 's'} found`}
        </p>
      )}

      {!loading && !error && data.products.length === 0 && (
        <div className="mc-card text-center">
          <h5>No products found</h5>
          <p className="mc-muted">Try another search or clear the filters.</p>
          <button className="btn btn-mc-primary" onClick={clearAll}>Clear filters</button>
        </div>
      )}

      <div className="mc-prod-grid" style={{ opacity: loading ? 0.5 : 1 }}>
        {data.products.map((p) => (
          <ProductCard key={p._id} product={p} onAdd={add} adding={busyId === p._id} />
        ))}
      </div>

      {data.pages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
          <button className="btn btn-mc-outline" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
            ← Prev
          </button>
          <span className="mc-muted">Page {page} of {data.pages}</span>
          <button className="btn btn-mc-outline" disabled={page >= data.pages} onClick={() => setParam('page', String(page + 1))}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}