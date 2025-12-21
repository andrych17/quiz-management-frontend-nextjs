"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./FormControls";
import { decryptId, isEncrypted } from "@/lib/encryption";

interface BaseFormProps {
  title: string;
  subtitle?: string;
  backUrl: string;
  backLabel?: string;
  encryptedId?: string;
  onSave?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  isSaving?: boolean;
  children: ReactNode;
  showDeleteButton?: boolean;
  // Metadata props
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  isActive?: boolean;
  status?: string;
}

export function useDecryptedId(encryptedId?: string) {
  const [id, setId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (encryptedId) {
      if (isEncrypted(encryptedId)) {
        const decoded = decryptId(encryptedId);
        setId(decoded);
      } else {
        setId(encryptedId);
      }
    }
    setLoading(false);
  }, [encryptedId]);

  return { id, loading };
}

export function BaseForm({
  title,
  subtitle,
  backUrl,
  backLabel = "Back",
  encryptedId,
  onSave,
  onDelete,
  // onCancel, // Unused in current implementation
  isEditing = false,
  isSaving = false,
  children,
  showDeleteButton = false,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isActive,
  // status // Unused in current implementation
}: BaseFormProps) {
  const { id, loading } = useDecryptedId(encryptedId);
  const router = useRouter();

  const handleBack = () => {
    router.push(backUrl);
  };

  if (loading && encryptedId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              <Button variant="secondary" onClick={handleBack} className="flex items-center justify-center sm:justify-start space-x-2 text-sm w-full sm:w-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{backLabel}</span>
              </Button>
              <div className="min-w-0 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-gray-600 mt-1 text-sm lg:text-base">{subtitle}</p>}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3">
              {isEditing ? (
                <>
                  {onDelete && (
                    <Button variant="danger" onClick={onDelete} disabled={isSaving} className="w-full sm:w-auto">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  )}
                  {onSave && (
                    <Button onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {onSave && (
                    <Button variant="secondary" onClick={onSave} className="w-full sm:w-auto">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                  )}
                  {showDeleteButton && onDelete && (
                    <Button variant="danger" onClick={onDelete} className="w-full sm:w-auto">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>

          {/* Metadata Footer */}
          {(createdAt || updatedAt || createdBy || updatedBy || isActive !== undefined) && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Record Information
                </h4>
                {isActive !== undefined && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isActive 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
                      isActive ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm">
                {createdAt && (
                  <div className="space-y-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Created</span>
                    <p className="text-gray-900 font-medium">
                      {new Date(createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                {updatedAt && (
                  <div className="space-y-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Updated</span>
                    <p className="text-gray-900 font-medium">
                      {new Date(updatedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(updatedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                {createdBy && (
                  <div className="space-y-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Created by</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-xs">
                          {createdBy.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium text-xs truncate">{createdBy}</p>
                    </div>
                  </div>
                )}
                {updatedBy && (
                  <div className="space-y-1">
                    <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Updated by</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-xs">
                          {updatedBy.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium text-xs truncate">{updatedBy}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && encryptedId && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600">
            <strong>Debug:</strong> Encrypted ID: {encryptedId}, Decrypted ID: {id}
          </div>
        )}
      </div>
    </div>
  );
}
