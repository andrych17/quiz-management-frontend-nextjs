'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { User, ApiError } from '@/types/api';
import { EnhancedApiClient } from '@/lib/enhanced-api-client';

// Initialize API client
const api = new EnhancedApiClient();

// Auth state interface
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  rememberMe: boolean;
}

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; refreshToken: string; rememberMe?: boolean } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'REFRESH_TOKEN'; payload: { token: string; refreshToken: string } }
  | { type: 'SET_REMEMBER_ME'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  rememberMe: true, // Default remember me = true
};

// Reducer function
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        rememberMe: action.payload.rememberMe ?? state.rememberMe,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    
    case 'REFRESH_TOKEN':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
      };
    
    case 'SET_REMEMBER_ME':
      return {
        ...state,
        rememberMe: action.payload,
      };
    
    default:
      return state;
  }
}

// Role-based permission helpers
export interface RolePermissions {
  isSuperadmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  canAccessAllQuizzes: boolean;
  canManageAssignments: boolean;
  canCreateQuizzes: boolean;
  canManageUsers: boolean;
  canManageConfig: boolean;
  canAccessAdminPanel: boolean;
}

// Context interface
export interface AuthContextType extends AuthState, RolePermissions {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateProfile: (user: User) => void;
  hasRole: (roles: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  setRememberMe: (remember: boolean) => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load tokens from localStorage or sessionStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        if (typeof window !== 'undefined') {
          // Try localStorage first (remember me), then sessionStorage
          const savedToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
          const savedRefreshToken = localStorage.getItem('admin_refresh_token') || sessionStorage.getItem('admin_refresh_token');
          const rememberMe = !!localStorage.getItem('admin_token'); // If token in localStorage, user chose remember me
          

          
          if (savedToken) {
            // Validate session with backend
            try {
              const response = await api.getProfile();
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: response.data!,
                  token: savedToken,
                  refreshToken: savedRefreshToken || '',
                  rememberMe: rememberMe,
                },
              });
            } catch (error) {
              // Invalid session, let the logout action handle clearing storage
              dispatch({ type: 'LOGOUT' });
              dispatch({ type: 'LOGOUT' });
            }
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear invalid tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_refresh_token');
        }
        dispatch({ type: 'LOGOUT' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Token monitoring - watch for token disappearance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const tokenMonitor = setInterval(() => {
      const currentLocalToken = localStorage.getItem('admin_token');
      const currentSessionToken = sessionStorage.getItem('admin_token');
      const hasAnyToken = !!(currentLocalToken || currentSessionToken);
      
      if (state.isAuthenticated && !hasAnyToken) {
        // Force logout if token disappeared
        dispatch({ type: 'LOGOUT' });
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(tokenMonitor);
  }, [state.isAuthenticated, state.token]);

  // Save tokens to appropriate storage based on rememberMe setting
  useEffect(() => {

    
    // Only manage storage if not currently loading (avoid race conditions)
    if (typeof window !== 'undefined' && !state.isLoading) {
      const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      
      if (state.token && state.isAuthenticated) {
        // Save to appropriate storage based on rememberMe
        if (state.rememberMe) {
          localStorage.setItem('admin_token', state.token);
          sessionStorage.removeItem('admin_token'); // Clear from session storage
        } else {
          sessionStorage.setItem('admin_token', state.token);
          localStorage.removeItem('admin_token'); // Clear from local storage
        }
        
        // Also set as cookie for middleware access - use localhost-friendly settings
        const cookieValue = `admin_token=${state.token}; path=/; max-age=${state.rememberMe ? 24 * 60 * 60 : 0}`; // Session cookie if not remember me
        const cookieSettings = isLocalhost 
          ? `${cookieValue}; samesite=lax`  // For localhost, use lax instead of strict
          : `${cookieValue}; secure; samesite=strict`; // For production
        document.cookie = cookieSettings;
      } else if (!state.token && !state.isAuthenticated && !state.isLoading) {
        // Only clear if we're definitely logged out (not during initialization)
        localStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_token');
        
        // Clear cookie
        document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }

      if (state.refreshToken) {
        // Save refresh token to appropriate storage
        if (state.rememberMe) {
          localStorage.setItem('admin_refresh_token', state.refreshToken);
          sessionStorage.removeItem('admin_refresh_token');
        } else {
          sessionStorage.setItem('admin_refresh_token', state.refreshToken);
          localStorage.removeItem('admin_refresh_token');
        }
        
        const refreshCookieValue = `admin_refresh_token=${state.refreshToken}; path=/; max-age=${state.rememberMe ? 7 * 24 * 60 * 60 : 0}`;
        const refreshCookieSettings = isLocalhost 
          ? `${refreshCookieValue}; samesite=lax`
          : `${refreshCookieValue}; secure; samesite=strict`;
        document.cookie = refreshCookieSettings;
      } else {
        localStorage.removeItem('admin_refresh_token');
        sessionStorage.removeItem('admin_refresh_token');
        document.cookie = 'admin_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }, [state.token, state.refreshToken, state.rememberMe, state.isAuthenticated, state.isLoading]);

  // Clear storage when logout happens
  useEffect(() => {
    if (!state.isAuthenticated && !state.isLoading && typeof window !== 'undefined') {
      // Clear all tokens from both storage types
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_refresh_token');
      
      // Clear cookies
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'admin_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, [state.isAuthenticated, state.isLoading]);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (state.isAuthenticated && state.refreshToken) {
      // Refresh token every 20 minutes (assuming 24h token expiry)
      intervalId = setInterval(async () => {
        try {
          await refreshTokens();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
          // If refresh fails, logout user
          await logout();
        }
      }, 20 * 60 * 1000); // 20 minutes
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isAuthenticated, state.refreshToken]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await api.login(email, password);

      // Extract auth data from standardized response
      const authData = response.data!;
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: authData.user,
          token: authData.access_token,
          refreshToken: '', // Enhanced API client doesn't provide refresh token yet
          rememberMe: rememberMe,
        },
      });
      
      // Debug: Check cookie immediately after dispatch
      setTimeout(() => {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const adminCookie = cookies.find(c => c.startsWith('admin_token='));
      }, 500);
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Call logout API (if available)
      // Note: Enhanced API client doesn't have logout endpoint yet
      // await api.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
      // Still logout locally even if API fails
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.isAuthenticated, state.token, state.user?.email]);

  const refreshTokens = useCallback(async () => {
    if (!state.refreshToken) return;

    try {
      // Note: Enhanced API client doesn't have refresh token endpoint yet
      // const response = await api.refreshToken(state.refreshToken);
      
      // For now, just throw error to trigger re-authentication
      throw new Error('Token refresh not implemented in Enhanced API client yet');
      
      // dispatch({
      //   type: 'REFRESH_TOKEN',
      //   payload: {
      //     token: response.data!.access_token,
      //     refreshToken: response.data!.refresh_token,
      //   },
      // });
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }, [state.refreshToken]);

  const updateProfile = useCallback((user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  }, []);

  const setRememberMe = useCallback((remember: boolean) => {
    dispatch({ type: 'SET_REMEMBER_ME', payload: remember });
  }, []);

  // Role-based permission helpers
  const hasRole = useCallback((roles: string[]): boolean => {
    return state.user ? roles.includes(state.user.role) : false;
  }, [state.user]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return state.user ? roles.some(role => state.user!.role === role) : false;
  }, [state.user]);

  // Computed role permissions with clear hierarchy
  const isSuperadmin = state.user?.role === 'superadmin';
  const isAdmin = state.user?.role === 'admin';
  const isUser = state.user?.role === 'user';
  
  // Superadmin has access to everything
  // Admin has limited access based on assignments
  const canAccessAllQuizzes = isSuperadmin;
  const canManageAssignments = isSuperadmin;
  const canCreateQuizzes = isSuperadmin || isAdmin;
  const canManageUsers = isSuperadmin;
  const canManageConfig = isSuperadmin;
  const canAccessAdminPanel = isSuperadmin || isAdmin;

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshTokens,
    updateProfile,
    setRememberMe,
    hasRole,
    hasAnyRole,
    isSuperadmin,
    isAdmin,
    isUser,
    canAccessAllQuizzes,
    canManageAssignments,
    canCreateQuizzes,
    canManageUsers,
    canManageConfig,
    canAccessAdminPanel,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
