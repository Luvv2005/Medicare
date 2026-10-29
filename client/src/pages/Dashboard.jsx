import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PatientDashboard from './PatientDashboard';
import DoctorDashboard from './DoctorDashboard';
import VerifyEmailBox from '../components/VerifyEmailBox';
import DoctorMedia from '../components/DoctorMedia';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container-xl py-4">
      <div className="mc-card mb-3">
        <h2 className="mb-1">Hello, {user.name} 👋</h2>
        <p className="mc-muted mb-2">{user.email}</p>
        <span className="mc-badge text-capitalize">{user.role}</span>
      </div>

      <VerifyEmailBox />

      {user.role === 'admin' && (
        <div className="mc-card mb-3">
          <h5>Admin tools</h5>
          <p className="mc-muted">Manage users, doctors, orders, prescriptions and more.</p>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/admin" className="btn btn-mc-primary">Open Admin Dashboard</Link>
            <Link to="/admin/verify" className="btn btn-mc-outline">Prescriptions, documents, images</Link>
          </div>
        </div>
      )}

      {user.role === 'patient' && (
        <>
          <div className="mb-3 d-flex flex-wrap gap-2">
            <Link to="/orders" className="btn btn-mc-outline">My medicine orders</Link>
            <Link to="/payments" className="btn btn-mc-outline">Payment history</Link>
            <Link to="/profile" className="btn btn-mc-outline">Profile and address</Link>
            <Link to="/chat" className="btn btn-mc-outline">Chat</Link>
            <Link to="/map" className="btn btn-mc-outline">Doctors on map</Link>
          </div>
          <PatientDashboard />
        </>
      )}
      {user.role === 'doctor' && (
        <>
          <DoctorMedia />
          <DoctorDashboard />
        </>
      )}
    </div>
  );
}