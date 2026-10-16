import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../core/auth/permissions';

const PermissionGuard = ({ children, permission, permissions, fallback = null, redirectTo }) => {
  const user = useSelector((state) => state.auth.user);
  const required = permissions || (permission ? [permission] : []);
  const allowed = required.every((item) => hasPermission(user, item));

  if (allowed) return children;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return fallback;
};

export default PermissionGuard;
