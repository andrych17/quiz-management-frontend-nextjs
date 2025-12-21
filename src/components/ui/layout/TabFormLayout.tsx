"use client";

import { useState, ReactNode } from "react";
import DataFooter from "./DataFooter";

export interface TabConfig {
  id: string;
  name: string;
  icon?: string | ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabFormLayoutProps {
  title: string;
  subtitle?: string;
  tabs: TabConfig[];
  children: (activeTab: string) => ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  showSaveButton?: boolean;
  showCancelButton?: boolean;
  
  // Data footer props
  createdAt?: string | Date;
  createdBy?: string;
  updatedAt?: string | Date;
  updatedBy?: string;
  
  className?: string;
}

export default function TabFormLayout({
  title,
  subtitle,
  tabs,
  children,
  actions,
  isLoading = false,
  onSave,
  onCancel,
  saveLabel = "Simpan Perubahan",
  cancelLabel = "Batal",
  showSaveButton = true,
  showCancelButton = true,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  className = ""
}: TabFormLayoutProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  const getTabIcon = (icon: string | ReactNode) => {
    if (typeof icon === 'string') {
      return <span className="text-lg">{icon}</span>;
    }
    return icon;
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  {isLoading && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">Memproses...</span>
                    </div>
                  )}
                </div>
                {subtitle && (
                  <p className="text-gray-600 text-lg">{subtitle}</p>
                )}
              </div>
              
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.disabled 
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
                >
                  {tab.icon && getTabIcon(tab.icon)}
                  <span>{tab.name}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    } ml-2 py-0.5 px-2 rounded-full text-xs font-medium`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tab Header Info */}
          {activeTabData && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                {activeTabData.icon && getTabIcon(activeTabData.icon)}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{activeTabData.name}</h3>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'general' && 'Informasi dasar dan pengaturan utama'}
                    {activeTab === 'details' && 'Detail informasi dan konfigurasi lanjutan'}
                    {activeTab === 'settings' && 'Pengaturan dan preferensi sistem'}
                    {activeTab === 'permissions' && 'Hak akses dan otorisasi'}
                    {activeTab === 'assignments' && 'Penugasan dan relasi data'}
                    {activeTab === 'questions' && 'Pertanyaan dan konten quiz'}
                    {activeTab === 'preview' && 'Pratinjau dan validasi'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="px-6 py-6">
            {children(activeTab)}
          </div>

          {/* Action Buttons */}
          {(showSaveButton || showCancelButton || actions) && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {isLoading ? 'Sedang memproses...' : 'Pastikan semua data sudah benar sebelum menyimpan'}
                </div>
                <div className="flex space-x-3">
                  {showCancelButton && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelLabel}
                    </button>
                  )}
                  {showSaveButton && onSave && (
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin -ml-1 mr-3 h-4 w-4 text-white">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {saveLabel}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Footer */}
          <DataFooter
            createdAt={createdAt}
            createdBy={createdBy}
            updatedAt={updatedAt}
            updatedBy={updatedBy}
            className="px-6 pb-6"
          />
        </div>
      </div>
    </div>
  );
}
