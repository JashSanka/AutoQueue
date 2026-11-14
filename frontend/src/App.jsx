import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthPortal from './pages/AuthPortal';
import CustomerDashboard from './pages/CustomerDashboard';
import DealerDashboard from './pages/DealerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './context/useAuth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPortal initialMode="login" />} />
          <Route path="/login" element={<AuthPortal initialMode="login" />} />
          <Route path="/register" element={<AuthPortal initialMode="register" />} />
          <Route
            path="/customer"
            element={
              <ProtectedRoute roles={["CUSTOMER"]}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/dealer" element={<ProtectedRoute roles={["DEALER"]}><DealerDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
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
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
}

export default App;
