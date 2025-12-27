"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConfigAPI } from "@/lib/api-client";
import type { Config } from "@/types/api";
import { ApiError } from "@/types/api";
import { CONFIG_GROUPS, DEFAULT_CONFIG_STATUS, DEFAULT_CONFIG_ORDER } from "@/lib/constants/config";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export default function ConfigDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [paramId, setParamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    group: "",
    key: "",
    value: "",
    description: "",
    order: DEFAULT_CONFIG_ORDER,
    isActive: DEFAULT_CONFIG_STATUS
  });
  const [metadata, setMetadata] = useState<{
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string | null;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dialogType, setDialogType] = useState<'success' | 'error'>('success');
  const [dialogMessage, setDialogMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isCreateMode = paramId === "new";

  // Warn user about unsaved changes
  useUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setParamId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!paramId) return;

    const loadConfig = async () => {
      if (!isCreateMode) {
        try {
          setLoading(true);
          const response = await ConfigAPI.getConfig(parseInt(paramId));

          if (response.success && response.data) {
            const config = response.data;
            setFormData({
              group: config.group,
              key: config.key,
              value: config.value,
              description: config.description || "",
              order: config.order || DEFAULT_CONFIG_ORDER,
              isActive: config.isActive
            });
            setMetadata({
              createdAt: config.createdAt,
              updatedAt: config.updatedAt,
              createdBy: config.createdBy,
              updatedBy: config.updatedBy
            });
          } else {
            setError(response.message || 'Failed to load configuration');
          }
        } catch (err) {
          setError('Failed to connect to server');
          console.error('Error loading config:', err);
        }
      }
      setLoading(false);
    };

    loadConfig();
  }, [paramId, isCreateMode]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if ((window as any).configRedirectTimer) {
        clearTimeout((window as any).configRedirectTimer);
      }
    };
  }, []);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!formData.group || !formData.key || !formData.value) {
        setError('Please fill in all required fields');
        return;
      }

      const configData = {
        group: formData.group,
        key: formData.key,
        value: formData.value,
        description: formData.description || undefined,
        order: formData.order,
        isActive: formData.isActive
      };

      let response;
      if (isCreateMode) {
        response = await ConfigAPI.createConfig(configData);
      } else {
        response = await ConfigAPI.updateConfig(parseInt(paramId), configData);
      }

      if (response.success) {
        const successMessage = isCreateMode
          ? 'Configuration created successfully!'
          : 'Configuration updated successfully!';

        // Reset unsaved changes flag
        setHasUnsavedChanges(false);

        // Show success dialog
        setDialogType('success');
        setDialogMessage(successMessage);
        setShowDialog(true);
        setError(null);
      } else {
        // Show error dialog
        setDialogType('error');
        setDialogMessage(response.message || 'Failed to save configuration');
        setShowDialog(true);
      }
    } catch (err) {
      console.error('Error saving config:', err);
      let errorMessage = 'Failed to connect to server';

      if (err instanceof ApiError) {
        // Handle validation errors - check if errors contain different info than main message
        if (err.errors && err.errors.length > 0) {
          // Check if error details are different from main message
          const errorDetails = err.errors.map(e => e.message).join(', ');
          if (errorDetails !== err.message && !err.message.includes(errorDetails)) {
            errorMessage = `${err.message}. Details: ${errorDetails}`;
          } else {
            errorMessage = err.message;
          }
        } else {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Show error dialog
      setDialogType('error');
      setDialogMessage(errorMessage);
      setShowDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    if (dialogType === 'success') {
      if (isCreateMode) {
        // Clear form for create mode
        setFormData({
          group: "",
          key: "",
          value: "",
          description: "",
          order: DEFAULT_CONFIG_ORDER,
          isActive: DEFAULT_CONFIG_STATUS
        });
      }
      // For edit mode, just close dialog and stay on page
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const result = await ConfigAPI.deleteConfig(parseInt(paramId));

      if (result.success) {
        setShowDeleteConfirm(false);
        setDialogType('success');
        setDialogMessage('Konfigurasi berhasil dihapus!');
        setShowDialog(true);

        setTimeout(() => {
          router.push('/admin/config');
        }, 1500);
      } else {
        setShowDeleteConfirm(false);
        setDialogType('error');
        setDialogMessage(result.message || 'Gagal menghapus konfigurasi');
        setShowDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to delete config:', err);
      setShowDeleteConfirm(false);
      setDialogType('error');
      setDialogMessage(err?.message || 'Gagal menghapus konfigurasi');
      setShowDialog(true);
    } finally {
      setDeleting(false);
    }
  };

  if (!paramId || loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
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
                router.push("/admin/config");
              }
            } else {
              router.push("/admin/config");
            }
          }}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Configurations
        </button>
        <h1 className="text-2xl font-bold">
          {isCreateMode ? "Create Configuration" : "Edit Configuration"}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">




        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group">
                Group <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.group || undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, group: value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Group" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIG_GROUPS.map(group => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="key">
                Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="key"
                type="text"
                value={formData.key}
                onChange={(e) => {
                  setFormData({ ...formData, key: e.target.value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder="Contoh: jakarta_pusat, pelayanan_anak"
                required
              />
            </div>

            <div>
              <Label htmlFor="value">
                Value <span className="text-red-500">*</span>
              </Label>
              <Input
                id="value"
                type="text"
                value={formData.value}
                onChange={(e) => {
                  setFormData({ ...formData, value: e.target.value });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder="Contoh: Jakarta Pusat, Pelayanan Anak"
                required
              />
            </div>

            <div>
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => {
                  setFormData({ ...formData, order: parseInt(e.target.value) || DEFAULT_CONFIG_ORDER });
                  setHasUnsavedChanges(true);
                  clearMessages();
                }}
                placeholder={String(DEFAULT_CONFIG_ORDER)}
                min="1"
              />
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

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setHasUnsavedChanges(true);
                clearMessages();
              }}
              rows={3}
              placeholder="Contoh: Lokasi Jakarta Pusat, Pelayanan untuk anak-anak gereja"
            />
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
                    {metadata.createdBy && (
                      <span className="text-gray-600"> oleh {metadata.createdBy}</span>
                    )}
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
                    {metadata.updatedBy && (
                      <span className="text-gray-600"> oleh {metadata.updatedBy}</span>
                    )}
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
                {deleting ? 'Menghapus...' : 'Hapus Konfigurasi'}
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('Anda memiliki perubahan yang belum disimpan. Yakin ingin membatalkan?')) {
                    router.push("/admin/config");
                  }
                } else {
                  router.push("/admin/config");
                }
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || deleting}
            >
              {saving ? 'Menyimpan...' : (isCreateMode ? 'Buat Konfigurasi' : 'Update Konfigurasi')}
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
              Apakah Anda yakin ingin menghapus konfigurasi ini? Tindakan ini tidak dapat dibatalkan.
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

      {/* shadcn Dialog Component */}
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