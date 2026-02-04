"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatDate } from '@/lib/date';
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/api-client";
import type { User } from "@/types/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Load user data from API
  useEffect(() => {
    const loadUserData = async () => {
      if (!authUser?.id) return;
      
      try {
        setLoading(true);
        const response = await API.users.getUser(authUser.id);
        
        if (response.success && response.data) {
          const userData = response.data;
          setUser(userData);
          setEditForm({
            name: userData.name || "",
            email: userData.email || "",
            password: "",
            confirmPassword: ""
          });
        } else {
          setMessage({ type: 'error', text: 'Failed to load profile data' });
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setMessage({ type: 'error', text: err?.message || 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [authUser?.id]);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Validate password if provided
      if (editForm.password) {
        if (editForm.password !== editForm.confirmPassword) {
          setMessage({ type: 'error', text: 'Passwords do not match!' });
          setIsLoading(false);
          return;
        }
        if (editForm.password.length < 6) {
          setMessage({ type: 'error', text: 'Password must be at least 6 characters!' });
          setIsLoading(false);
          return;
        }
      }
      
      // Only update basic profile fields, not location, service, status, role
      const updateData: any = {
        name: editForm.name,
        email: editForm.email
      };
      
      // Add password if provided
      if (editForm.password.trim()) {
        updateData.password = editForm.password;
      }
      
      const response = await API.users.updateUser(user.id, updateData);
      
      if (response.success) {
        setUser({
          ...user,
          name: editForm.name,
          email: editForm.email
        });
        
        // Reset password fields
        setEditForm({
          ...editForm,
          password: "",
          confirmPassword: ""
        });
        
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to update profile' });
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-red-600">Failed to load profile data</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">👤 My Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-2xl">
              {user.name.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500 capitalize">
              {user.role === 'superadmin' ? '👑 Superadmin' : '🛡️ Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Profile Information</h3>
            <button
              onClick={() => {
                if (isEditing) {
                  setEditForm({
                    name: user.name,
                    email: user.email,
                    password: "",
                    confirmPassword: ""
                  });
                }
                setIsEditing(!isEditing);
              }}
              className={`px-4 py-2 rounded-md transition-colors ${
                isEditing
                  ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    placeholder="Enter your email address"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">
                    New Password (leave blank to keep current)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={editForm.confirmPassword}
                    onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Full Name</label>
                  <p className="text-lg text-gray-900">{user.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email Address</label>
                  <p className="text-lg text-gray-900">{user.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Role</label>
                  <p className="text-lg text-gray-900 capitalize">
                    {user.role === 'superadmin' ? '👑 Superadmin' : user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <p className="text-lg text-gray-900">
                    {user.isActive ? '✅ Active' : '❌ Inactive'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Location</label>
                  <p className="text-lg text-gray-900">{user.location?.value || 'Not set'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Service</label>
                  <p className="text-lg text-gray-900">{user.service?.value || 'Not set'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Member Since</label>
                  <p className="text-lg text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-lg text-gray-900">{user.updatedAt ? formatDateTime(user.updatedAt) : 'Never'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
