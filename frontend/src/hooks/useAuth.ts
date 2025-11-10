/**
 * Authentication Hook
 * 
 * Manages authentication state, login/logout, and user data.
 */

import { useState, useEffect, useCallback } from 'react';
import { clearAuthData, getAccessToken, getRefreshToken, authenticatedFetch, API_BASE, startPeriodicTokenRefresh } from '../utils/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('userData');
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      
      if ((!token && !refreshToken) || !userData) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      } catch (e) {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Handle login success
  const handleLoginSuccess = useCallback((userData: any) => {
    setIsAuthenticated(true);
    setUser(userData);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (token) {
        // Try to logout (add token to blocklist)
        // This may fail if account is already deleted, but that's okay
        await authenticatedFetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST'
        }).catch(() => {
          // Silently ignore errors (account may already be deleted)
        });
      }
    } finally {
      // Always clear auth state and data, regardless of API call success
      setIsAuthenticated(false);
      setUser(null);
      clearAuthData();
      window.history.pushState({}, '', '/login');
    }
  }, []);

  // Start token refresh when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const stopRefresh = startPeriodicTokenRefresh();
    return stopRefresh;
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    user,
    isLoading,
    handleLoginSuccess,
    handleLogout
  };
};

