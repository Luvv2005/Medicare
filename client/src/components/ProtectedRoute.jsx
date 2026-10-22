import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Use: <ProtectedRoute><Page /></ProtectedRoute>
// Ya role ke saath: <ProtectedRoute roles={['admin']}><Page /></ProtectedRoute>
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container py-5 text-center mc-muted">Loading...</div>;
  }

  if (!user) {
    // login ke baad user wapas isi page par aayega
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}