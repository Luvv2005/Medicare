import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { money } from '../utils/orderUi';

export default function Cart() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading, setQty, removeItem } = useCart();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  if (authLoading) return <div className="container py-5 text-center mc-muted">Loading...</div>;

  if (!user)
    return (
      <div className="container py-5">
        <div className="mc-card text-center mc-auth-wrap">
          <h5>Login to see your cart</h5>
          <p className="mc-muted">Your cart is saved to your account.</p>
          <Link to="/login" state={{ from: { pathname: '/cart' } }} className="btn btn-mc-primary">Login / Register</Link>
        </div>
      </div>
    );

  if (user.role !== 'patient')
    return (
      <div className="container py-5">
        <div className="mc-card text-center mc-auth-wrap">
          <h5>Cart is for patient accounts</h5>
          <p className="mc-muted mb-0">Doctors and admins cannot place medicine orders.</p>
        </div>
      </div>
    );

  const change = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };

  const update = async (item, quantity) => {
    setBusyId(item.product._id);
    await change(() => setQty(item.product._id, quantity));
    setBusyId('');
  };
  const remove = async (item) => {
    setBusyId(item.product._id);
    await change(() => removeItem(item.product._id));
    setBusyId('');
  };

  if (!loading && cart.items.length === 0)
    return (
      <div className="container py-5">
        <div className="mc-card text-center mc-auth-wrap">
          <h5>Your cart is empty</h5>
          <p className="mc-muted">Add medicines and healthcare products to get started.</p>
          <Link to="/buy-medicines" className="btn btn-mc-primary">Buy medicines</Link>
        </div>
      </div>
    );

  const blocked = cart.hasIssues || cart.hasPrescriptionItem;
  const away = cart.freeDeliveryAbove - cart.subtotal;

  return (
    <div className="container-xl py-4">
      <h2 className="mb-3 text-center">Your cart ({cart.count})</h2>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="mc-card">
            {cart.items.map((it) => (
              <div className="mc-cart-line" key={it.product._id}>
                <div className="mc-cart-icon">{it.product.icon}</div>
                <div className="flex-fill">
                  <Link to={`/medicines/${it.product._id}`} className="fw-bold">{it.product.name}</Link>
                  <div className="mc-muted small">{money(it.product.price)} each</div>
                  {it.product.requiresPrescription && <span className="mc-chip mc-chip--bad">Rx</span>}
                  {!it.ok && (
                    <div className="small mc-bad">
                      {it.product.stock < 1 || it.product.status !== 'approved'
                        ? 'No longer available. Please remove.'
                        : `Only ${it.product.stock} in stock. Reduce quantity.`}
                    </div>
                  )}
                </div>
                <div className="text-end">
                  <div className="mc-qty mb-1">
                    <button type="button" disabled={busyId === it.product._id || it.quantity <= 1}
                      onClick={() => update(it, it.quantity - 1)} aria-label="Decrease">−</button>
                    <span>{it.quantity}</span>
                    <button type="button" disabled={busyId === it.product._id}
                      onClick={() => update(it, it.quantity + 1)} aria-label="Increase">+</button>
                  </div>
                  <div className="fw-bold">{money(it.lineTotal)}</div>
                  <button type="button" className="btn btn-link p-0 small" onClick={() => remove(it)}
                    disabled={busyId === it.product._id}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="mc-card mc-sticky">
            <h5>Order summary</h5>
            <div className="d-flex justify-content-between"><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
            <div className="d-flex justify-content-between">
              <span>Delivery</span><span>{cart.deliveryFee === 0 ? 'Free' : money(cart.deliveryFee)}</span>
            </div>
            {cart.deliveryFee > 0 && (
              <div className="small mc-muted">Add {money(away)} more for free delivery</div>
            )}
            <hr />
            <div className="d-flex justify-content-between fw-bold mb-3"><span>Total</span><span>{money(cart.total)}</span></div>

            {cart.hasPrescriptionItem && (
              <div className="mc-note mc-note--warn mb-3 small">
                Your cart has prescription medicine. Checkout for these needs prescription upload,
                which is not available yet. Remove the Rx items to continue.
              </div>
            )}

            <button className="btn btn-mc-primary w-100" disabled={blocked} onClick={() => navigate('/checkout')}>
              Proceed to checkout
            </button>
            <Link to="/orders" className="btn btn-link w-100 mt-2">My orders</Link>
          </div>
        </div>
      </div>
    </div>
  );
}



