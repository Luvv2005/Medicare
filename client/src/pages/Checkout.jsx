import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import OrderPayModal from '../components/OrderPayModal';
import { money } from '../utils/orderUi';

const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const { cart, loading, refresh } = useCart();
  const navigate = useNavigate();

  const [addr, setAddr] = useState({
    name: user.name || '', phone: user.phone || '', line: '', city: '', state: '', pincode: '',
  });
  const [method, setMethod] = useState('cod');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payOrder, setPayOrder] = useState(null);

  // Pichle order ka address dobara use ho jaye
  useEffect(() => {
    apiGet('/orders/mine')
      .then((d) => {
        const last = d.orders[0]?.address;
        if (last) setAddr(last);
      })
      .catch(() => {});
  }, []);

  const on = (e) => setAddr({ ...addr, [e.target.name]: e.target.value });

  if (!loading && cart.items.length === 0 && !payOrder)
    return (
      <div className="container py-5 text-center">
        <h5>Your cart is empty</h5>
        <Link to="/buy-medicines" className="btn btn-mc-primary mt-2">Buy medicines</Link>
      </div>
    );

  const validate = () => {
    if (addr.name.trim().length < 2) return 'Please enter your name';
    if (!phoneRegex.test(addr.phone.trim())) return 'Enter a valid 10-digit phone number';
    if (addr.line.trim().length < 5) return 'Please enter the full address';
    if (!addr.city.trim() || !addr.state.trim()) return 'City and state are required';
    if (!pincodeRegex.test(addr.pincode.trim())) return 'Enter a valid 6-digit pincode';
    return '';
  };

  const place = async () => {
    setError('');
    const msg = validate();
    if (msg) return setError(msg);

    setBusy(true);
    try {
      const res = await apiPost('/orders', { address: addr, paymentMethod: method });
      await refresh(); // cart ab khali hai
      if (method === 'online') setPayOrder(res.order);
      else navigate('/orders', { state: { msg: `Order ${res.order.orderNo} placed. Pay cash on delivery.` } });
    } catch (err) {
      setError(err.message);
      refresh();
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <div className="container-xl py-4">
      {payOrder && (
        <OrderPayModal
          order={payOrder}
          onClose={() =>
            navigate('/orders', { state: { msg: 'Payment not completed. Pay from My orders within 15 minutes.' } })
          }
          onPaid={(o) => navigate('/orders', { state: { msg: `Test payment successful. Order ${o.orderNo} placed.` } })}
        />
      )}

      <h2 className="mb-3">Checkout</h2>
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="mc-card">
            <h5>Delivery address</h5>
            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

            <div className="row">
              <div className="col-md-6"><Field label="Full name">
                <input className="form-control" name="name" value={addr.name} onChange={on} autoComplete="name" />
              </Field></div>
              <div className="col-md-6"><Field label="Phone">
                <input className="form-control" name="phone" type="tel" inputMode="numeric" maxLength={10}
                  value={addr.phone} onChange={on} autoComplete="tel" />
              </Field></div>
              <div className="col-12"><Field label="Address">
                <input className="form-control" name="line" value={addr.line} onChange={on} placeholder="House no, street, area" />
              </Field></div>
              <div className="col-md-4"><Field label="City">
                <input className="form-control" name="city" value={addr.city} onChange={on} />
              </Field></div>
              <div className="col-md-4"><Field label="State">
                <input className="form-control" name="state" value={addr.state} onChange={on} />
              </Field></div>
              <div className="col-md-4"><Field label="Pincode">
                <input className="form-control" name="pincode" inputMode="numeric" maxLength={6}
                  value={addr.pincode} onChange={on} />
              </Field></div>
            </div>

            <h5 className="mt-2">Payment</h5>
            <div className="form-check">
              <input className="form-check-input" type="radio" id="m-cod" checked={method === 'cod'} onChange={() => setMethod('cod')} />
              <label className="form-check-label" htmlFor="m-cod">Cash on delivery</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" id="m-online" checked={method === 'online'} onChange={() => setMethod('online')} />
              <label className="form-check-label" htmlFor="m-online">Pay online (test mode)</label>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="mc-card mc-sticky">
            <h5>Order summary</h5>
            {cart.items.map((it) => (
              <div className="d-flex justify-content-between small mb-1" key={it.product._id}>
                <span>{it.product.name} × {it.quantity}</span>
                <span>{money(it.lineTotal)}</span>
              </div>
            ))}
            <hr />
            <div className="d-flex justify-content-between"><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
            <div className="d-flex justify-content-between">
              <span>Delivery</span><span>{cart.deliveryFee === 0 ? 'Free' : money(cart.deliveryFee)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold my-2"><span>Total</span><span>{money(cart.total)}</span></div>
            <button className="btn btn-mc-primary w-100" onClick={place}
              disabled={busy || cart.hasIssues || cart.hasPrescriptionItem}>
              {busy ? 'Please wait...' : method === 'online' ? `Place order and pay ${money(cart.total)}` : 'Place order (COD)'}
            </button>
            <Link to="/cart" className="btn btn-link w-100 mt-2">Back to cart</Link>
          </div>
        </div>
      </div>
    </div>
  );
}