"use client";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface DataFooterProps {
  createdAt?: string | Date;
  createdBy?: string;
  updatedAt?: string | Date;
  updatedBy?: string;
  className?: string;
  showDivider?: boolean;
}

export default function DataFooter({
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  className = "",
  showDivider = true
}: DataFooterProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return null;
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Format: "2 jam yang lalu (10 Nov 2025, 14:30)"
    const relative = formatDistanceToNow(dateObj, { 
      addSuffix: true, 
      locale: idLocale 
    });
    
    const absolute = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${relative} (${absolute})`;
  };

  const formatUser = (user: string | undefined) => {
    if (!user) return 'Sistem';
    return user;
  };

  // Don't render if no data
  if (!createdAt && !updatedAt) {
    return null;
  }

  return (
    <div className={className}>
      {showDivider && <div className="border-t border-gray-200 mt-6 pt-6" />}
      
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Created Info */}
          {createdAt && (
            <div className="space-y-1">
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium">Dibuat</span>
              </div>
              <div className="ml-6">
                <div className="text-gray-900 font-medium">
                  {formatUser(createdBy)}
                </div>
                <div className="text-gray-600">
                  {formatDate(createdAt)}
                </div>
              </div>
            </div>
          )}

          {/* Updated Info */}
          {updatedAt && (
            <div className="space-y-1">
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-medium">Terakhir Diperbarui</span>
              </div>
              <div className="ml-6">
                <div className="text-gray-900 font-medium">
                  {formatUser(updatedBy)}
                </div>
                <div className="text-gray-600">
                  {formatDate(updatedAt)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional metadata can be added here */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Data dikelola secara otomatis oleh sistem</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                Tersinkron
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
