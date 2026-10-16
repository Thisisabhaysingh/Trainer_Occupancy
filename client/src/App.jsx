import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './modules/auth/pages/Login';
import EmployeeDashboard from './modules/dashboards/pages/EmployeeDashboard';
import ManagerDashboard from './modules/dashboards/pages/ManagerDashboard';
import SeniorManagerDashboard from './modules/dashboards/pages/SeniorManagerDashboard';
import TeamLeadDashboard from './modules/dashboards/pages/TeamLeadDashboard';
import AdminDashboard from './modules/dashboards/pages/AdminDashboard';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { checkAuth } from './modules/auth/state/authSlice';
import ThemeToggleButton from './components/ThemeToggleButton';
import InventoryRoutes from './modules/inventory/routes/InventoryRoutes';
import BranchesPage from './modules/branches/pages/BranchesPage';
import DepartmentsPage from './modules/departments/pages/DepartmentsPage';

const DashboardRedirect = () => {
  const role = useSelector((state) => state.auth.user?.role);
  const destination = {
    employee: '/employee',
    teamlead: '/teamlead',
    manager: '/manager',
    senior_manager: '/senior-manager',
    admin: '/admin',
    inventory_admin: '/inventory/manager',
  }[role] || '/login';
  return <Navigate to={destination} replace />;
};

function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
  return (
    <Router>
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000 }}>
        <ThemeToggleButton />
      </div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
        <Route path="/inventory/*" element={<ProtectedRoute><InventoryRoutes /></ProtectedRoute>} />
        <Route path="/inventory_admin/*" element={<ProtectedRoute role="inventory_admin"><Navigate to="/inventory/manager" replace /></ProtectedRoute>} />
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute role="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/*"
          element={
            <ProtectedRoute role="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/senior-manager/*" element={<ProtectedRoute role="senior_manager"><SeniorManagerDashboard /></ProtectedRoute>} />
        <Route path="/senior_manager/*" element={<ProtectedRoute role="senior_manager"><Navigate to="/senior-manager" replace /></ProtectedRoute>} />
        <Route
          path="/teamlead/*"
          element={
            <ProtectedRoute role="teamlead">
              <TeamLeadDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/branches" element={<ProtectedRoute role="admin"><BranchesPage /></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute role="admin"><DepartmentsPage /></ProtectedRoute>} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
