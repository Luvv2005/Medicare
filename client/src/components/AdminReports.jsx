import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { money } from '../utils/orderUi';

const num = (obj, key) => (obj && obj[key]) || 0;

function Group({ title, rows }) {
  return (
    <div className="mc-card">
      <h6>{title}</h6>
      {rows.map(([label, value]) => (
        <div className="d-flex justify-content-between small py-1" key={label}>
          <span className="mc-muted">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AdminReports() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/admin/stats').then(setS).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!s) return <p className="mc-muted">Loading...</p>;

  return (
    <>
      <div className="mc-note mc-note--warn mb-3 small">
        These numbers include demo data until it is removed.
      </div>

      <div className="mc-stats mb-3">
        <div className="mc-stat"><div className="mc-stat-value">{money(s.money.collected)}</div><div className="mc-muted small">Collected (paid)</div></div>
        <div className="mc-stat"><div className="mc-stat-value">{money(s.money.refunds.total)}</div><div className="mc-muted small">Refunds</div></div>
        <div className="mc-stat"><div className="mc-stat-value">{money(s.money.net)}</div><div className="mc-muted small">Net</div></div>
      </div>

      <div className="mc-cat-grid" style={{ alignItems: 'start' }}>
        <Group title="Users" rows={[
          ['Patients', num(s.users, 'patient')], ['Doctors', num(s.users, 'doctor')], ['Admins', num(s.users, 'admin')],
        ]} />
        <Group title="Doctors" rows={[
          ['Pending', num(s.doctors, 'pending')], ['Approved', num(s.doctors, 'approved')], ['Rejected', num(s.doctors, 'rejected')],
        ]} />
        <Group title="Appointments" rows={[
          ['Confirmed', num(s.appointments, 'confirmed')], ['Awaiting payment', num(s.appointments, 'held')],
          ['Completed', num(s.appointments, 'completed')], ['Cancelled', num(s.appointments, 'cancelled')],
          ['No-show', num(s.appointments, 'no_show')], ['Expired', num(s.appointments, 'expired')],
        ]} />
        <Group title="Orders" rows={[
          ['Placed', num(s.orders, 'placed')], ['Confirmed', num(s.orders, 'confirmed')],
          ['Shipped', num(s.orders, 'shipped')], ['Delivered', num(s.orders, 'delivered')],
          ['Cancelled', num(s.orders, 'cancelled')], ['Awaiting payment', num(s.orders, 'pending_payment')],
        ]} />
        <Group title="Money" rows={[
          ['Paid appointments', `${s.money.appointmentPayments.count} · ${money(s.money.appointmentPayments.total)}`],
          ['Paid orders', `${s.money.orderPayments.count} · ${money(s.money.orderPayments.total)}`],
          ['Refunds started', `${s.money.refunds.count} · ${money(s.money.refunds.total)}`],
        ]} />
      </div>
    </>
  );
}