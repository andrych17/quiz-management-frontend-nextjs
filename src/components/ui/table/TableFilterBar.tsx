"use client";

import { useState, ReactNode } from "react";

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  placeholder?: string;
  options?: { value: string | number | boolean; label: string }[];
  value?: string | number | boolean;
  searchable?: boolean; // For select options with search
}

export interface TableFilters {
  [key: string]: string | number | boolean | undefined;
}

export interface SortConfig {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

interface TableFilterBarProps {
  filters: FilterOption[];
  values: TableFilters;
  onChange: (key: string, value: string | number | boolean | undefined) => void;
  onClear: () => void;
  onSearch?: () => void;
  className?: string;
  children?: ReactNode;
}

export default function TableFilterBar({
  filters,
  values,
  onChange,
  onClear,
  onSearch,
  className = "",
  children
}: TableFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasActiveFilters = Object.values(values).some(value => 
    value !== undefined && value !== "" && value !== null
  );

  const activeFiltersCount = Object.values(values).filter(value => 
    value !== undefined && value !== "" && value !== null
  ).length;

  const renderFilterInput = (filter: FilterOption) => {
    const value = values[filter.key] || "";
    const stringValue = typeof value === 'boolean' ? value.toString() : String(value);

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={filter.placeholder}
            value={stringValue}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            placeholder={filter.placeholder}
            value={stringValue}
            onChange={(e) => onChange(filter.key, e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        );

      case 'boolean':
        return (
          <select
            value={stringValue}
            onChange={(e) => {
              const val = e.target.value;
              onChange(filter.key, val === '' ? undefined : val === 'true');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">{filter.placeholder || `All ${filter.label}`}</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'select':
        return (
          <select
            value={stringValue}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">{filter.placeholder || `Pilih ${filter.label}`}</option>
            {filter.options?.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={stringValue}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Filter Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium">Filter & Pencarian</span>
              {hasActiveFilters && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {children}
            {onSearch && (
              <button
                onClick={onSearch}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Cari
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={onClear}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
