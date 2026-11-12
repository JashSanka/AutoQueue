import { useState, useEffect, useCallback } from 'react';
import { loginUser, registerCustomer as apiRegister, getProfile } from '../api/auth';
import { AuthContext } from './useAuth';

const TOKEN_KEY = 'autoqueue_jwt_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate and restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await getProfile(savedToken);
        if (isMounted && response?.success && response.user) {
          setUser(response.user);
          setToken(savedToken);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Session verification failed:', err.message);
        localStorage.removeItem(TOKEN_KEY);
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const response = await loginUser({ email, password });
      
      if (!response?.token || !response?.user) {
        throw new Error('Malformed authentication response from server.');
      }

      if (response.user.role !== 'CUSTOMER') {
        throw new Error(`Access restricted: Detected ${response.user.role} role. This portal is strictly for customers.`);
      }

      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    }
  }, []);

  const register = useCallback(async (customerData) => {
    setAuthError(null);
    try {
      const response = await apiRegister(customerData);
      return response;
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
