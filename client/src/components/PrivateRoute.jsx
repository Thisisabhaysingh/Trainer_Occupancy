import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, role }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role) {
    return <Navigate to={`/${user.role}`} />;
  }

  return children;
};

export default PrivateRoute; 