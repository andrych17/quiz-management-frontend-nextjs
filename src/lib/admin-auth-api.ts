import { 
  User, 
  SessionApiResponse 
} from '@/types';

// Base API URL from environment or fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Admin authentication API client
export class AdminAuthAPI {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Admin login
   */
  static async login(email: string, password: string): Promise<any> {
    const response = await AdminAuthAPI.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response;
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<{
    success: boolean;
    data: User;
  }> {
    return AdminAuthAPI.request<{
      success: boolean;
      data: User;
    }>('/auth/profile');
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    data: {
      token: string;
      refreshToken: string;
    };
  }> {
    return AdminAuthAPI.request<any>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  /**
   * Change password
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return AdminAuthAPI.request<{
      success: boolean;
      message: string;
    }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  /**
   * Logout
   */
  static async logout(): Promise<{
    success: boolean;
    message: string;
  }> {
    return AdminAuthAPI.request<{
      success: boolean;
      message: string;
    }>('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * Validate current session
   */
  static async validateSession(): Promise<boolean> {
    try {
      await AdminAuthAPI.getProfile();
      return true;
    } catch {
      return false;
    }
  }
}

// Convenience functions for easier usage
export const adminAuthAPI = {
  login: AdminAuthAPI.login,
  getProfile: AdminAuthAPI.getProfile,
  refreshToken: AdminAuthAPI.refreshToken,
  changePassword: AdminAuthAPI.changePassword,
  logout: AdminAuthAPI.logout,
  validateSession: AdminAuthAPI.validateSession,
};
