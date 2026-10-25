import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container-xl py-4">
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

      {user.role === 'patient' && <PatientDashboard />}
      {user.role === 'doctor' && <DoctorDashboard />}
    </div>
  );
}