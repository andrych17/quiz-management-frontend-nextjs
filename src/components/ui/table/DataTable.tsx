"use client";

import { useState, useEffect } from "react";
import TableFilterBar, { FilterOption, TableFilters, SortConfig } from "./TableFilterBar";
import SortableHeader from "./SortableHeader";

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableAction {
  label: string;
  onClick: (row: any) => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: (row: any) => boolean;
  show?: (row: any) => boolean;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  actions?: DataTableAction[];
  filters?: FilterOption[];
  defaultFilters?: TableFilters;
  filterValues?: TableFilters;
  onFilterChange?: (filters: TableFilters) => void;
  sortConfig?: SortConfig;
  onSort?: (field: string, direction: 'ASC' | 'DESC') => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  topActions?: React.ReactNode;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  showExport?: boolean;
  onExport?: () => void;
  className?: string;
}

export default function DataTable({
  data,
  columns,
  actions,
  filters = [],
  defaultFilters = {},
  filterValues: externalFilterValues,
  onFilterChange,
  sortConfig,
  onSort,
  loading = false,
  emptyMessage = "Tidak ada data yang tersedia",
  emptyIcon,
  title,
  subtitle,
  topActions,
  pagination,
  showExport = false,
  onExport,
  className = ""
}: DataTableProps) {
  
  // Use external filter values if provided, otherwise use internal state
  const filterValues = externalFilterValues || defaultFilters;

  const handleSort = (field: string, direction: 'ASC' | 'DESC') => {
    onSort?.(field, direction);
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    const newFilters = { ...filterValues, [key]: value };
    onFilterChange?.(newFilters);
  };

  const handleClearFilters = () => {
    onFilterChange?.({});
  };

  const getActionButtonClass = (variant: string = 'secondary') => {
    const variants = {
      primary: 'text-blue-600 hover:text-blue-900 hover:bg-blue-50',
      secondary: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
      danger: 'text-red-600 hover:text-red-900 hover:bg-red-50',
      success: 'text-green-600 hover:text-green-900 hover:bg-green-50',
    };
    return variants[variant as keyof typeof variants] || variants.secondary;
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Header */}
      {(title || subtitle || topActions) && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            {title && <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm sm:text-base text-gray-600">{subtitle}</p>}
          </div>
          {topActions && <div className="flex flex-wrap gap-2 sm:space-x-3">{topActions}</div>}
        </div>
      )}

      {/* Filters */}
      {filters.length > 0 && (
        <TableFilterBar
          filters={filters}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
        >
          {/* {showExport && onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          )} */}
        </TableFilterBar>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 text-sm">Memuat data...</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
              <div className="flex flex-col items-center">
                {emptyIcon || (
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                )}
                <p className="text-gray-500 font-medium">{emptyMessage}</p>
                <p className="text-gray-400 text-sm mt-1">Data akan muncul di sini</p>
              </div>
            </div>
          ) : (
            data.map((row, index) => (
              <div key={row.id || index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                {columns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium text-gray-500 flex-shrink-0">{column.label}:</span>
                    <span className="text-sm text-gray-900 text-right flex-1">
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : row[column.key] || '-'
                      }
                    </span>
                  </div>
                ))}
                {actions && actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    {actions.map((action, actionIndex) => {
                      const shouldShow = action.show ? action.show(row) : true;
                      const isDisabled = action.disabled ? action.disabled(row) : false;
                      
                      if (!shouldShow) return null;

                      return (
                        <button
                          key={actionIndex}
                          onClick={() => !isDisabled && action.onClick(row)}
                          disabled={isDisabled}
                          className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                            isDisabled
                              ? 'text-gray-400 cursor-not-allowed border-gray-200'
                              : action.variant === 'danger'
                              ? 'text-red-600 border-red-200 hover:bg-red-50'
                              : action.variant === 'success'
                              ? 'text-green-600 border-green-200 hover:bg-green-50'
                              : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination - Mobile */}
        {pagination && data.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 mt-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-700">
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>
                  {' - '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {' / '}
                  <span className="font-medium">{pagination.total}</span>
                </span>

                <select
                  value={pagination.limit}
                  onChange={(e) => pagination.onLimitChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md text-xs px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex gap-1 justify-center">
                <button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(3, Math.ceil(pagination.total / pagination.limit)) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => pagination.onPageChange(page)}
                      className={`px-3 py-1.5 text-xs border rounded-md ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <SortableHeader
                    key={column.key}
                    field={column.key}
                    label={column.label}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    sortable={column.sortable}
                    className={column.className}
                  />
                ))}
                {actions && actions.length > 0 && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-500">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      {emptyIcon || (
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      )}
                      <p className="text-gray-500 text-lg font-medium">{emptyMessage}</p>
                      <p className="text-gray-400 mt-1">Data akan muncul di sini setelah ditambahkan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={column.key} className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}>
                        {column.render
                          ? column.render(row[column.key], row, index)
                          : row[column.key] || '-'
                        }
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          {actions.map((action, actionIndex) => {
                            const shouldShow = action.show ? action.show(row) : true;
                            const isDisabled = action.disabled ? action.disabled(row) : false;
                            
                            if (!shouldShow) return null;

                            return (
                              <button
                                key={actionIndex}
                                onClick={() => !isDisabled && action.onClick(row)}
                                disabled={isDisabled}
                                className={`inline-flex items-center p-2 rounded-md text-sm font-medium transition-colors ${
                                  isDisabled
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : getActionButtonClass(action.variant)
                                }`}
                                title={action.label}
                              >
                                {action.icon}
                                <span className="sr-only">{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Desktop */}
        {pagination && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4 w-full sm:w-auto">
                <span className="text-xs sm:text-sm text-gray-700">
                  <span className="hidden sm:inline">Menampilkan{' '}</span>
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  -{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  <span className="hidden sm:inline">dari</span>
                  <span className="sm:hidden">/</span>{' '}
                  <span className="font-medium">{pagination.total}</span>
                </span>

                <select
                  value={pagination.limit}
                  onChange={(e) => pagination.onLimitChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md text-xs sm:text-sm px-2 sm:px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-center sm:justify-start">
                <button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Sebelumnya</span>
                  <span className="sm:hidden">←</span>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(3, Math.ceil(pagination.total / pagination.limit)) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => pagination.onPageChange(page)}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}