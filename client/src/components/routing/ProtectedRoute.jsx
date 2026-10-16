import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingState from '../states/LoadingState';

const ProtectedRoute = ({ children, role }) => {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) return <LoadingState message="Checking your session…" minHeight="60vh" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user?.role !== role) return <Navigate to={`/${user?.role || 'login'}`} replace />;
  return children;
};

export default ProtectedRoute;
