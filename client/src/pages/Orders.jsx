import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiGet, apiPatch } from '../services/api';
import OrderPayModal from '../components/OrderPayModal';
import { effOrderStatus, ORDER_LABEL, ORDER_CHIP, orderPayLabel, money } from '../utils/orderUi';

export default function Orders() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState(location.state?.msg || '');
  const [busyId, setBusyId] = useState('');
  const [payOrder, setPayOrder] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/orders/mine');
      setOrders(d.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (o) => {
    if (!window.confirm('Cancel this order?')) return;
    setMsg('');
    setBusyId(o._id);
    try {
      await apiPatch(`/orders/${o._id}/cancel`);
      setMsg(`Order ${o.orderNo} cancelled.`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId('');
      load();
    }
  };

  return (
    <div className="container-xl py-4">
      {payOrder && (
        <OrderPayModal
          order={payOrder}
          onClose={() => { setPayOrder(null); load(); }}
          onPaid={(o) => { setPayOrder(null); setMsg(`Test payment successful. Order ${o.orderNo} placed.`); load(); }}
        />
      )}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h2 className="mb-0">My orders</h2>
        <Link to="/buy-medicines" className="btn btn-mc-primary btn-mc-sm">Shop more</Link>
      </div>

      {msg && <div className="alert alert-info py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && <p className="mc-muted">Loading...</p>}
      {!loading && !error && orders.length === 0 && (
        <div className="mc-card"><p className="mc-muted mb-0">No orders yet.</p></div>
      )}

      {orders.map((o) => {
        const eff = effOrderStatus(o);
        const canPay = eff === 'pending_payment';
        const canCancel = ['pending_payment', 'placed', 'confirmed'].includes(eff) && o.paymentStatus !== 'paid';
        return (
          <div className="mc-card mb-3" key={o._id}>
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <strong>{o.orderNo}</strong>
                <div className="mc-muted small">{new Date(o.createdAt).toLocaleString('en-IN')}</div>
              </div>
              <div className="d-flex flex-wrap gap-1 align-items-start">
                <span className={`mc-chip ${ORDER_CHIP[eff] || ''}`}>{ORDER_LABEL[eff]}</span>
                <span className="mc-chip">{orderPayLabel(o)}</span>
                {o.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
              </div>
            </div>

            <div className="mt-2">
              {o.items.map((it) => (
                <div className="d-flex justify-content-between small" key={it.product}>
                  <span>{it.icon} {it.name} × {it.quantity}</span>
                  <span>{money(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between small"><span>Delivery</span><span>{o.deliveryFee ? money(o.deliveryFee) : 'Free'}</span></div>
            <div className="d-flex justify-content-between fw-bold"><span>Total</span><span>{money(o.total)}</span></div>
            <div className="mc-muted small mt-2">
              Deliver to: {o.address.name}, {o.address.line}, {o.address.city}, {o.address.state} - {o.address.pincode}
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
              {canPay && <button className="btn btn-mc-primary btn-mc-sm" onClick={() => setPayOrder(o)}>Pay now</button>}
              {canCancel && (
                <button className="btn btn-mc-outline btn-mc-sm" disabled={busyId === o._id} onClick={() => cancel(o)}>
                  Cancel order
                </button>
              )}
              {o.paymentStatus === 'paid' && ['placed', 'confirmed'].includes(eff) && (
                <span className="mc-muted small">Cancellation with refund arrives in Step 9.</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}