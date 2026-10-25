import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../services/api';
import { effOrderStatus, ORDER_LABEL, ORDER_CHIP, orderPayLabel, money } from '../utils/orderUi';

const ACTIONS = {
  placed: [{ to: 'confirmed', label: 'Confirm' }, { to: 'cancelled', label: 'Cancel' }],
  confirmed: [{ to: 'shipped', label: 'Mark shipped' }, { to: 'cancelled', label: 'Cancel' }],
  shipped: [{ to: 'delivered', label: 'Mark delivered' }],
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await apiGet('/admin/orders');
      setOrders(d.orders);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = async (o, to) => {
    if (to === 'cancelled' && !window.confirm('Cancel this order? Stock will be restored.')) return;
    setError('');
    setMsg('');
    setBusyId(o._id);
    try {
      await apiPatch(`/admin/orders/${o._id}/status`, { status: to });
      setMsg(`Order ${o.orderNo} is now ${to}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mc-card">
      <h5>Orders ({orders.length})</h5>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {orders.length === 0 && !error && <p className="mc-muted mb-0">No orders yet.</p>}

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const eff = effOrderStatus(o);
              return (
                <tr key={o._id}>
                  <td>
                    {o.orderNo}
                    <div className="mc-muted small">{new Date(o.createdAt).toLocaleDateString('en-IN')}</div>
                  </td>
                  <td>
                    {o.user?.name}
                    <div className="mc-muted small">{o.address.city}, {o.address.pincode}</div>
                  </td>
                  <td className="small">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</td>
                  <td>{money(o.total)}</td>
                  <td>{orderPayLabel(o)}</td>
                  <td>
                    <span className={`mc-chip ${ORDER_CHIP[eff] || ''}`}>{ORDER_LABEL[eff]}</span>{' '}
                    {o.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
                  </td>
                  <td className="text-nowrap">
                    {(ACTIONS[o.status] || []).map((a) => (
                      <button key={a.to} className="btn btn-mc-outline btn-mc-sm me-1"
                        disabled={busyId === o._id} onClick={() => change(o, a.to)}>
                        {a.label}
                      </button>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}