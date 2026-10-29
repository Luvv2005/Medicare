import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api';
import { apiUpload } from '../utils/files';
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
    name: user.name || '',
    phone: user.phone || '',
    line: user.address?.line || '',
    city: user.address?.city || '',
    state: user.address?.state || '',
    pincode: user.address?.pincode || '',
  });
  const [method, setMethod] = useState('cod');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payOrder, setPayOrder] = useState(null);

  const [rx, setRx] = useState([]);
  const [rxSel, setRxSel] = useState('');
  const [rxMsg, setRxMsg] = useState('');
  const needRx = cart.hasPrescriptionItem;

  const loadRx = useCallback(
    () => apiGet('/prescriptions/mine').then((d) => setRx(d.prescriptions)).catch(() => { }),
    []
  );
  useEffect(() => { if (needRx) loadRx(); }, [needRx, loadRx]);
  useEffect(() => {
    const usable = rx.filter((p) => p.usable);
    setRxSel((cur) => (usable.some((p) => p._id === cur) ? cur : usable[0]?._id || ''));
  }, [rx]);

  useEffect(() => {
    apiGet('/orders/mine')
      .then((d) => {
        const last = d.orders[0]?.address;
        if (last && !user.address?.line) setAddr(last);
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const on = (e) => setAddr({ ...addr, [e.target.name]: e.target.value });

  const uploadRx = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setRxMsg('');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await apiUpload('/prescriptions', fd);
      setRxMsg(r.message);
      loadRx();
    } catch (err) {
      setRxMsg(err.message);
    }
  };

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
    if (needRx && !rxSel) return 'Select an approved prescription for your prescription medicines';
    return '';
  };

  const place = async () => {
    setError('');
    const msg = validate();
    if (msg) return setError(msg);

    setBusy(true);
    try {
      const res = await apiPost('/orders', {
        address: addr, paymentMethod: method, prescriptionId: needRx ? rxSel : undefined,
      });
      await refresh();
      if (method === 'online') setPayOrder(res.order);
      else navigate('/orders', { state: { msg: `Order ${res.order.orderNo} placed. Pay cash on delivery.` } });
    } catch (err) {
      setError(err.message);
      refresh();
      if (needRx) loadRx();
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const STATUS = { pending: 'Waiting for admin review', approved: 'Approved', rejected: 'Rejected' };

  return (
    <div className="container-xl py-4">
      {payOrder && (
        <OrderPayModal
          order={payOrder}
          onClose={() =>
            navigate('/orders', { state: { msg: 'Payment not completed. Pay from My orders within 15 minutes.' } })
          }
          onPaid={(o) => navigate('/orders', { state: { msg: `Payment successful. Order ${o.orderNo} placed.` } })}
        />
      )}

      <h2 className="mb-3 text-center">Checkout</h2>
      <div className="row g-4">
        <div className="col-lg-7">
          {needRx && (
            <div className="mc-card mb-3">
              <h5>Prescription</h5>
              <p className="mc-muted small">
                Your cart has prescription medicine. Upload a clear photo or PDF of a valid prescription.
                An admin reviews it before you can order. Each prescription works for one order.
              </p>
              {rxMsg && <div className="alert alert-info py-2">{rxMsg}</div>}
              {rx.length === 0 && <p className="mc-muted small">No prescriptions uploaded yet.</p>}
              {rx.map((p) => (
                <div className="form-check mb-1" key={p._id}>
                  <input className="form-check-input" type="radio" id={`rx-${p._id}`} disabled={!p.usable}
                    checked={rxSel === p._id} onChange={() => setRxSel(p._id)} />
                  <label className="form-check-label" htmlFor={`rx-${p._id}`}>
                    {p.fileName} · {new Date(p.createdAt).toLocaleDateString('en-IN')} ·{' '}
                    <span className={p.status === 'approved' ? 'mc-ok' : p.status === 'rejected' ? 'mc-bad' : 'mc-warn'}>
                      {p.status === 'approved' && !p.usable ? 'Already used' : STATUS[p.status]}
                    </span>
                    {p.status === 'rejected' && p.reviewNote ? ` (${p.reviewNote})` : ''}
                  </label>
                </div>
              ))}
              <label className="btn btn-mc-outline btn-mc-sm mt-2 mb-0">
                Upload prescription
                <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={uploadRx} />
              </label>
            </div>
          )}

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
              <label className="form-check-label" htmlFor="m-online">Pay online (UPI, card, netbanking)</label>
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
              disabled={busy || cart.hasIssues || (needRx && !rxSel)}>
              {busy ? 'Please wait...' : method === 'online' ? `Place order and pay ${money(cart.total)}` : 'Place order (COD)'}
            </button>
            <Link to="/cart" className="btn btn-link w-100 mt-2">Back to cart</Link>
          </div>
        </div>
      </div>
    </div>
  );
}