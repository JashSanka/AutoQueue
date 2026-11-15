import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-neutral-400 font-mono text-xs">
        <div className="flex items-center space-x-3 border border-[#262626] bg-[#121212] px-6 py-4">
          <div className="w-2 h-2 bg-amber-500 animate-pulse"></div>
          <span className="tracking-widest uppercase text-neutral-300">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const targetRole = roles && roles.length === 1 ? roles[0].toLowerCase() : 'customer';
    return <Navigate to={`/${targetRole}/login`} state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    const userRole = user?.role ? user.role.toLowerCase() : 'customer';
    return <Navigate to={`/${userRole}`} replace />;
  }

  return children;
}
