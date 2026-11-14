import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PortalAuth from './pages/PortalAuth';
import PortalHome from './pages/PortalHome';
import CustomerDashboard from './pages/CustomerDashboard';
import DealerWorkspace from './pages/DealerWorkspace';
import AdminWorkspace from './pages/AdminWorkspace';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './context/useAuth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalHome />} />
          <Route path="/customer/login" element={<PortalAuth role="CUSTOMER" />} />
          <Route path="/customer/register" element={<PortalAuth role="CUSTOMER" register />} />
          <Route path="/dealer/login" element={<PortalAuth role="DEALER" />} />
          <Route path="/dealer/register" element={<PortalAuth role="DEALER" register />} />
          <Route path="/admin/login" element={<PortalAuth role="ADMIN" />} />
          <Route
            path="/customer"
            element={
              <ProtectedRoute roles={["CUSTOMER"]}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/dealer" element={<ProtectedRoute roles={["DEALER"]}><DealerWorkspace /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminWorkspace /></ProtectedRoute>} />
          <Route path="/dashboard" element={<RoleHome />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function RoleHome() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
}

export default App;
