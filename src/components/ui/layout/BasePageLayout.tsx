"use client";

import { ReactNode } from "react";

interface Tab {
  id: string;
  name: string;
  icon?: ReactNode;
  count?: number;
}

interface BasePageLayoutProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
  };
  actions?: ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: ReactNode;
}

export default function BasePageLayout({
  title,
  subtitle,
  badge,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children
}: BasePageLayoutProps) {
  const getBadgeClasses = (variant: string) => {
    const variants = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      red: 'bg-red-100 text-red-800 border-red-200',
    };
    return variants[variant as keyof typeof variants] || variants.blue;
  };

  const getTabIcon = (icon: ReactNode) => {
    if (typeof icon === 'string') {
      // Handle emoji icons
      return <span className="text-lg">{icon}</span>;
    }
    return icon;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto">
          <div className="py-6 px-4 sm:px-6">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  {badge && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBadgeClasses(badge.variant)}`}>
                      {badge.text}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-gray-600 text-lg">{subtitle}</p>
                )}
              </div>
              
              {actions && (
                <div className="flex items-center gap-3 flex-shrink-0">
                  {actions}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="border-t border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
                  >
                    {tab.icon && getTabIcon(tab.icon)}
                    <span>{tab.name}</span>
                    {tab.count !== undefined && (
                      <span className={`${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      } ml-2 py-0.5 px-2 rounded-full text-xs font-medium`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-full mx-auto py-8">
        {children}
      </div>
    </div>
  );
}
