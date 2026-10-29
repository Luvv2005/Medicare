import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import useAddToCart from '../hooks/useAddToCart';
import { categoryName } from '../utils/categories';
import { money } from '../utils/orderUi';

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const { add, busyId, msg } = useAddToCart();

  useEffect(() => {
    setLoading(true);
    apiGet(`/products/${id}`)
      .then((d) => setP(d.product))
      .catch((err) => setError(err.status === 404 ? 'Product not found' : err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container py-5 text-center mc-muted">Loading...</div>;
  if (error)
    return (
      <div className="container py-5 text-center">
        <h4>{error}</h4>
        <Link to="/buy-medicines" className="btn btn-mc-primary mt-2">Back to medicines</Link>
      </div>
    );

  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const out = p.stock < 1;
  const maxQty = Math.min(10, p.stock);

  return (
    <div className="container-xl py-4">
      <Link to="/buy-medicines" className="mc-muted d-inline-block mb-3">← Back to medicines</Link>
      {msg && <div className="mc-note mb-3" role="status">{msg}</div>}

      <div className="row g-4">
        <div className="col-md-5">
          <div className="mc-prod-img mc-prod-img--lg">
            {p.image ? <img src={p.image} alt={p.name} /> : <span>{p.icon}</span>}
          </div>
        </div>
        <div className="col-md-7">
          <div className="d-flex flex-wrap gap-1 mb-2">
            <span className="mc-chip">{categoryName(p.category)}</span>
            {p.requiresPrescription && <span className="mc-chip mc-chip--bad">Prescription required</span>}
            {p.isDemo && <span className="mc-chip mc-chip--demo">DEMO PRODUCT</span>}
          </div>
          <h2 className="mb-1">{p.name}</h2>
          {p.brand && <div className="mc-muted mb-2">by {p.brand}</div>}

          <div className="d-flex align-items-baseline flex-wrap gap-2 mb-2">
            <span className="mc-doc-fee" style={{ fontSize: '1.8rem' }}>{money(p.price)}</span>
            {off > 0 && (
              <>
                <s className="mc-muted">{money(p.mrp)}</s>
                <span className="mc-off">{off}% off</span>
              </>
            )}
          </div>

          {out && <p className="mc-bad">Out of stock</p>}
          {!out && p.stock <= 5 && <p className="mc-warn">Only {p.stock} left{p.isDemo ? ' (demo stock)' : ''}</p>}
          {!out && p.stock > 5 && <p className="mc-ok">In stock{p.isDemo ? ' (demo stock)' : ''}</p>}

          <p>{p.description || 'No description added yet.'}</p>

          {p.requiresPrescription && (
            <div className="mc-note mc-note--warn mb-3">
              This medicine needs a valid prescription. Add it to the cart, then upload your prescription
              at checkout. An admin must approve it before you can place the order.
            </div>
          )}

          {!out && (
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className="mc-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase">+</button>
              </div>
              <button className="btn btn-mc-success" disabled={busyId === p._id} onClick={() => add(p, qty)}>
                {busyId === p._id ? 'Adding...' : 'Add to Cart'}
              </button>
              <Link to="/cart" className="btn btn-mc-outline">Go to cart</Link>
            </div>
          )}

          <p className="small mc-muted mt-4 mb-0">
            Always read the label and consult a doctor or pharmacist before using any medicine.
          </p>
        </div>
      </div>
    </div>
  );
}