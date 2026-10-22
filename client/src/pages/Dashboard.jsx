import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container py-4">
      <div className="mc-card mb-3">
        <h2 className="mb-1">Hello, {user.name} 👋</h2>
        <p className="mc-muted mb-2">{user.email}</p>
        <span className="mc-badge text-capitalize">{user.role}</span>
      </div>

      {user.role === 'admin' && (
        <div className="mc-card mb-3">
          <h5>Admin tools</h5>
          <p className="mc-muted">Manage users, doctors, orders and more.</p>
          <Link to="/admin" className="btn btn-mc-primary">Open Admin Dashboard</Link>
        </div>
      )}

      {user.role === 'patient' && (
        <div className="mc-card">
          <h5>Patient dashboard</h5>
          <p className="mc-muted mb-0">
            Appointments, orders and refunds will appear here (Steps 7 to 9).
          </p>
        </div>
      )}

      {user.role === 'doctor' && (
        <div className="mc-card">
          <h5>Doctor dashboard</h5>
          <p className="mc-muted mb-0">
            Appointments, slots and queue will appear here (Steps 4 to 9).
          </p>
        </div>
      )}
    </div>
  );
}