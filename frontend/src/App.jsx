import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthPortal from './pages/AuthPortal';
import CustomerDashboard from './pages/CustomerDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPortal initialMode="login" />} />
          <Route path="/login" element={<AuthPortal initialMode="login" />} />
          <Route path="/register" element={<AuthPortal initialMode="register" />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
