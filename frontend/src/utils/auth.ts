/**
 * Authentication utilities for token management and API calls
 */

// API Base URL Configuration
// Auto-detects whether to use localhost or network IP based on where the app is accessed from
const getApiBase = (): string => {
  // Use environment variable if set (for production/custom deployments)
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }
  
  // Auto-detect: Use the same hostname as the frontend, just change the port
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  return isLocalhost 
    ? 'http://localhost:5000' 
    : 'http://192.168.0.104:5000'; // Replace with your computer's IP for mobile access
};

export const API_BASE = getApiBase();

// Token storage helpers
export const getAccessToken = (): string | null => localStorage.getItem('authToken');
export const getRefreshToken = (): string | null => localStorage.getItem('refreshToken');

// Saves new tokens to localStorage and schedules a token refresh
export const storeTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem('authToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  // Reschedule refresh when new tokens arrive (if refresh system is active)
  if (refreshTimeoutId !== undefined) scheduleTokenRefresh();
};

// Clears all authentication data from localStorage and clears the refresh timeout
export const clearAuthData = () => {
  ['authToken', 'refreshToken', 'userData'].forEach(key => localStorage.removeItem(key));
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
};

// Token refresh - gets new access token using refresh token and stores new tokens in localStorage
export const refreshAccessToken = async (): Promise<string | null> => {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    // Wait for ongoing refresh to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isRefreshing) {
          clearInterval(checkInterval);
          resolve(getAccessToken());
        }
      }, 100);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 5000);
    });
  }

  try {
    isRefreshing = true;
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Ensure consistent token naming (backend returns access_token and refresh_token)
      const accessToken = data.access_token || data.accessToken;
      const refreshToken = data.refresh_token || data.refreshToken;
      
      if (!accessToken) {
        return null;
      }
      
      storeTokens(accessToken, refreshToken);
      return accessToken;
    }
    return null;
  } catch {
    return null;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Gets the current authenticated user's ID from the API
 * @returns Promise<string | null> - The user ID or null if not found
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const response = await authenticatedFetch(`${API_BASE}/api/profile`);
    if (response.ok) {
      const userData = await response.json();
      return userData.id || null;
    }
  } catch (error) {
    // Silently fail - user ID is optional
  }
  return null;
};

// Token refresh scheduling - schedules a token refresh based on token expiry
let refreshTimeoutId: NodeJS.Timeout | null | undefined = undefined;
let isRefreshing = false; // Prevent concurrent refresh attempts

const scheduleTokenRefresh = (): void => {
  // Clear existing timeout
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }

  try {
    const token = getAccessToken();
    if (!token) return;

    const payload = JSON.parse(atob(token.split('.')[1]));
    const timeUntilExpiry = (payload.exp * 1000) - Date.now();
    
    // Refresh 10% before expiry (min 5 minutes)
    const refreshBuffer = Math.max(timeUntilExpiry * 0.1, 5 * 60 * 1000);
    const refreshTime = timeUntilExpiry - refreshBuffer;
    
    // If expiring soon, refresh now. Otherwise schedule for later
    if (timeUntilExpiry <= 5 * 60 * 1000) {
      refreshAccessToken().then(() => scheduleTokenRefresh());
    } else if (refreshTime > 0 && refreshTime < 24 * 60 * 60 * 1000) {
      refreshTimeoutId = setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) scheduleTokenRefresh();
      }, refreshTime);
    }
  } catch {
    // Token invalid, ignore
  }
};

// Authenticated API calls with auto-refresh on 401
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let token = getAccessToken();
  
  // Build headers
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make request
  let response = await fetch(url, {
    ...options,
    headers
  });

  // If 401, refresh token and retry
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }

  return response;
};

export const isAuthenticated = async (): Promise<boolean> => {
  return !!(getAccessToken() || getRefreshToken());
};

// Notification count management (simple callback system)
let notificationRefreshCallbacks: Array<() => void> = [];
let notificationIncrementCallbacks: Array<() => void> = [];

export const registerNotificationCallbacks = (
  onRefresh: () => void,
  onIncrement: () => void
) => {
  notificationRefreshCallbacks.push(onRefresh);
  notificationIncrementCallbacks.push(onIncrement);
  
  return () => {
    notificationRefreshCallbacks = notificationRefreshCallbacks.filter(cb => cb !== onRefresh);
    notificationIncrementCallbacks = notificationIncrementCallbacks.filter(cb => cb !== onIncrement);
  };
};

// Increment count optimistically when user likes (backend creates notification)
export const incrementNotificationCount = () => {
  notificationIncrementCallbacks.forEach(cb => cb());
};

// Refresh count from backend (call after mark read/delete operations)
export const refreshNotificationCount = () => {
  notificationRefreshCallbacks.forEach(cb => cb());
};

// Start automatic token refresh system
// After initial call, scheduleTokenRefresh() handles itself recursively
export const startPeriodicTokenRefresh = (): (() => void) => {
  refreshTimeoutId = null; // Mark system as active
  scheduleTokenRefresh(); // Schedule initial refresh

  return () => {
    // Cleanup: clear timeout when user logs out
    if (refreshTimeoutId) {
      clearTimeout(refreshTimeoutId);
    }
    refreshTimeoutId = undefined; // Mark system as inactive
  };
};
