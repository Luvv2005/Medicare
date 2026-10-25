import { Link } from 'react-router-dom';
import { categoryName } from '../utils/categories';
import { money } from '../utils/orderUi';

export default function ProductCard({ product: p, onAdd, adding }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const out = p.stock < 1;

  return (
    <article className="mc-prod">
      <Link to={`/medicines/${p._id}`} className="mc-prod-img" aria-label={`View ${p.name}`}>
        {p.image ? <img src={p.image} alt={p.name} /> : <span>{p.icon}</span>}
      </Link>

      <div className="d-flex flex-wrap gap-1 mb-2">
        <span className="mc-chip">{categoryName(p.category)}</span>
        {p.requiresPrescription && <span className="mc-chip mc-chip--bad">Rx</span>}
        {p.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
      </div>

      <h6 className="mb-1">{p.name}</h6>
      <p className="mc-muted small mc-prod-desc">{p.description}</p>

      <div className="mt-auto">
        <div className="d-flex align-items-baseline flex-wrap gap-2 mb-1">
          <span className="mc-doc-fee">{money(p.price)}</span>
          {off > 0 && (
            <>
              <s className="mc-muted small">{money(p.mrp)}</s>
              <span className="mc-off">{off}% off</span>
            </>
          )}
        </div>
        {out && <div className="small mc-bad mb-1">Out of stock</div>}
        {!out && p.stock <= 5 && <div className="small mc-warn mb-1">Only {p.stock} left</div>}

        <div className="d-flex gap-2">
          <Link to={`/medicines/${p._id}`} className="btn btn-mc-outline btn-mc-sm">Details</Link>
          <button
            type="button"
            className="btn btn-mc-success btn-mc-sm flex-fill"
            disabled={out || adding}
            onClick={() => onAdd(p)}
          >
            {adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}