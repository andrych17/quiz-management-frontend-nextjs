"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/types/api";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { TextField } from "@/components/ui/common";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { isSuperadmin } = useAuth();

  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dialogType, setDialogType] = useState<'success' | 'error'>('success');
  const [dialogMessage, setDialogMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Options for dropdowns
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string, label: string }>>([]);
  const [serviceOptions, setServiceOptions] = useState<Array<{ value: string, label: string }>>([]);

  const isCreateMode = userId === "new";

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'user' | 'superadmin',
    location: '',
    service: '',
    isActive: true
  });
  const [metadata, setMetadata] = useState<{
    createdAt?: string;
    updatedAt?: string;
  }>({});

  // Warn user about unsaved changes
  useUnsavedChanges(hasUnsavedChanges);

  const clearMessages = () => {
    setError(null);
  };

  // Extract userId from params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setUserId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [locationRes, serviceRes] = await Promise.all([
        API.config.getConfigsByGroup('location'),
        API.config.getConfigsByGroup('service')
      ]);

      // Load location options
      if (locationRes?.success) {
        const locationData = locationRes.data || [];
        const locationOpts = Array.isArray(locationData) ? locationData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setLocationOptions(locationOpts);
      }

      // Load service options
      if (serviceRes?.success) {
        const serviceData = serviceRes.data || [];
        const serviceOpts = Array.isArray(serviceData) ? serviceData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setServiceOptions(serviceOpts);
      }

    } catch (err: any) {
      console.error('Failed to load options:', err);
      setError(err?.message || 'Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userRes, locationRes, serviceRes] = await Promise.all([
        API.users.getUser(Number(userId)),
        API.config.getConfigsByGroup('location'),
        API.config.getConfigsByGroup('service')
      ]);

      // Load location options
      if (locationRes?.success) {
        const locationData = locationRes.data || [];
        const locationOpts = Array.isArray(locationData) ? locationData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setLocationOptions(locationOpts);
      }

      // Load service options
      if (serviceRes?.success) {
        const serviceData = serviceRes.data || [];
        const serviceOpts = Array.isArray(serviceData) ? serviceData.map((config: { key: string, value: string }) => ({
          value: config.key,
          label: config.value
        })) : [];
        setServiceOptions(serviceOpts);
      }

      if (userRes.success && userRes.data) {
        const userData = userRes.data;
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          password: '',
          confirmPassword: '',
          role: userData.role || 'admin',
          location: (typeof userData.location === 'object' && userData.location !== null) ? userData.location.key : userData.location || '',
          service: (typeof userData.service === 'object' && userData.service !== null) ? userData.service.key : userData.service || '',
          isActive: userData.isActive !== undefined ? userData.isActive : true
        });
        setMetadata({
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        });
      }

    } catch (err: any) {
      console.error('Failed to load user data:', err);
      setError(err?.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    if (!isSuperadmin) {
      setError("Access denied. Superadmin role required.");
      setLoading(false);
      return;
    }

    if (isCreateMode) {
      loadOptions();
    } else {
      loadUserData();
    }
  }, [userId, isSuperadmin, isCreateMode]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate form
      if (!formData.name.trim() || !formData.email.trim()) {
        setError("Name and email are required");
        return;
      }

      if (isCreateMode && !formData.password.trim()) {
        setError("Password is required for new users");
        return;
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Prepare user data
      const userData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        locationKey: formData.location && formData.location !== 'none' ? formData.location : undefined,
        serviceKey: formData.service && formData.service !== 'none' ? formData.service : undefined,
        isActive: formData.isActive
      };

      if (formData.password.trim()) {
        userData.password = formData.password;
      }

      let result;
      if (isCreateMode) {
        result = await API.users.createUser(userData);
      } else {
        result = await API.users.updateUser(Number(userId), userData);
      }

      if (result.success) {
        const successMessage = isCreateMode ? 'User created successfully!' : 'User updated successfully!';

        // Reset unsaved changes flag
        setHasUnsavedChanges(false);

        // Show success dialog
        setDialogType('success');
        setDialogMessage(successMessage);
        setShowDialog(true);
        setError(null);

        // Reset password fields after save
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      } else {
        // Show error dialog
        setDialogType('error');
        setDialogMessage(result.message || 'Failed to save user');
        setShowDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to save user:', err);

      // Show error dialog
      setDialogType('error');
      setDialogMessage(err?.message || 'Failed to save user');
      setShowDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    if (dialogType === 'success') {
      if (isCreateMode) {
        // Redirect to user list after creating
        router.push('/admin/users');
      }
      // For edit mode, just close dialog and stay on page
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const result = await API.users.deleteUser(Number(userId));

      if (result.success) {
        setShowDeleteConfirm(false);
        setDialogType('success');
        setDialogMessage('User berhasil dihapus!');
        setShowDialog(true);

        setTimeout(() => {
          router.push('/admin/users');
        }, 1500);
      } else {
        setShowDeleteConfirm(false);
        setDialogType('error');
        setDialogMessage(result.message || 'Gagal menghapus user');
        setShowDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setShowDeleteConfirm(false);
      setDialogType('error');
      setDialogMessage(err?.message || 'Gagal menghapus user');
      setShowDialog(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/users');
  };

  if (!userId || loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSuperadmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">Access denied. Superadmin role required.</div>
          <Button onClick={() => router.push('/admin/users')}>Back to Users</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              if (confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?')) {
                router.push("/admin/users");
              }
            } else {
              router.push("/admin/users");
            }
          }}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Users
        </button>
        <h1 className="text-2xl font-bold">
          {isCreateMode ? "Create User" : "Edit User"}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder="Contoh: John Doe"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder="Contoh: john@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">
                {isCreateMode ? 'Password' : 'Password (kosongkan jika tidak diubah)'}
                {isCreateMode && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder="Masukkan password"
                required={isCreateMode}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">
                Confirm Password
                {isCreateMode && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder="Konfirmasi password"
                required={isCreateMode}
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role || undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, role: value as 'admin' | 'user' | 'superadmin' });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Select
                value={formData.location || "none"}
                onValueChange={(value) => {
                  setFormData({ ...formData, location: value === "none" ? "" : value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {locationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="service">Service</Label>
              <Select
                value={formData.service || "none"}
                onValueChange={(value) => {
                  setFormData({ ...formData, service: value === "none" ? "" : value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {serviceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status field - only show in edit mode */}
            {!isCreateMode && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.isActive !== undefined ? (formData.isActive ? 'active' : 'inactive') : undefined}
                  onValueChange={(value) => {
                    setFormData({ ...formData, isActive: value === 'active' });
                    setHasUnsavedChanges(true);
                    clearMessages();
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Section */}
        {!isCreateMode && (metadata.createdAt || metadata.updatedAt) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {metadata.createdAt && (
                <div>
                  <span className="text-gray-500">Dibuat pada:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(metadata.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              {metadata.updatedAt && (
                <div>
                  <span className="text-gray-500">Terakhir diubah:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(metadata.updatedAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <div>
            {!isCreateMode && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting || saving}
              >
                {deleting ? 'Menghapus...' : 'Hapus User'}
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin membatalkan?')) {
                    router.push("/admin/users");
                  }
                } else {
                  router.push("/admin/users");
                }
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || deleting}
            >
              {saving ? 'Menyimpan...' : (isCreateMode ? 'Buat User' : 'Update User')}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success/Error Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        // Only allow closing via button click, not by clicking outside or ESC
        if (!open) return;
        setShowDialog(open);
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dialogType === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                {dialogType === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              {dialogType === 'success' ? 'Success' : 'Error'}
            </DialogTitle>
            <DialogDescription>
              {dialogMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={handleDialogClose}
              variant={dialogType === 'success' ? 'default' : 'destructive'}
            >
              {dialogType === 'success' ? 'OK' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}