'use client';

import { useState, useEffect } from 'react';
import { adminAuthAPI } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthTestPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return <AuthTestContent />;
}

function AuthTestContent() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    contextToken: string | null;
    localStorageToken: string | null;
    cookieToken: string | null;
  }>({
    contextToken: null,
    localStorageToken: null,
    cookieToken: null,
  });
  
  const { isAuthenticated, user, token, isLoading } = useAuth();

  // Check token storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lsToken = localStorage.getItem('admin_token');
      const cookies = document.cookie.split(';');
      const adminCookie = cookies.find(cookie => cookie.trim().startsWith('admin_token='));
      const cookieToken = adminCookie ? adminCookie.split('=')[1] : null;
      
      setTokenInfo({
        contextToken: token,
        localStorageToken: lsToken,
        cookieToken: cookieToken,
      });
    }
  }, [token, isAuthenticated]);

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await adminAuthAPI.login('admin@gms.com', 'admin123');
      setResult(`Login Success: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`Login Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProfile = async () => {
    setLoading(true);
    try {
      const response = await adminAuthAPI.getProfile();
      setResult(`Profile Success: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`Profile Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const testValidateSession = async () => {
    setLoading(true);
    try {
      const isValid = await adminAuthAPI.validateSession();
      setResult(`Session Valid: ${isValid}`);
    } catch (error) {
      setResult(`Validate Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Authentication API Test</h1>
          
          <div className="space-y-4 mb-8">
            <button
              onClick={testLogin}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test Login (admin@gms.com / admin123)'}
            </button>
            
            <button
              onClick={testProfile}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 ml-4"
            >
              {loading ? 'Loading...' : 'Test Get Profile'}
            </button>
            
            <button
              onClick={testValidateSession}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 ml-4"
            >
              {loading ? 'Loading...' : 'Test Validate Session'}
            </button>
          </div>

          {/* Auth State Debug */}
          <div className="bg-blue-100 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Current Auth State:</h3>
            <div className="text-sm space-y-2">
              <p><strong>isAuthenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
              <p><strong>isLoading:</strong> {isLoading ? 'true' : 'false'}</p>
              <p><strong>User:</strong> {user ? user.email : 'null'}</p>
              <p><strong>Context Token:</strong> {tokenInfo.contextToken ? `${tokenInfo.contextToken.substring(0, 20)}...` : 'null'}</p>
              <p><strong>localStorage Token:</strong> {tokenInfo.localStorageToken ? `${tokenInfo.localStorageToken.substring(0, 20)}...` : 'null'}</p>
              <p><strong>Cookie Token:</strong> {tokenInfo.cookieToken ? `${tokenInfo.cookieToken.substring(0, 20)}...` : 'null'}</p>
              <p><strong>All Cookies:</strong> {typeof window !== 'undefined' ? document.cookie || 'No cookies' : 'N/A'}</p>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="whitespace-pre-wrap text-sm">{result || 'No tests run yet'}</pre>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <h4 className="font-semibold mb-2">Test Credentials (Mock API):</h4>
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
              <ul>
                <li><strong>Email:</strong> admin@gms.com</li>
                <li><strong>Password:</strong> admin123</li>
              </ul>
              <ul className="mt-2">
                <li><strong>Email:</strong> superadmin@gms.com</li>
                <li><strong>Password:</strong> super123</li>
              </ul>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <p>💡 <strong>Note:</strong> These credentials work with the mock API. Check browser console for detailed logs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
