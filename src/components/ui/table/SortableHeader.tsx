"use client";

import { SortConfig } from "./TableFilterBar";

interface SortableHeaderProps {
  field: string;
  label: string;
  sortConfig?: SortConfig;
  onSort: (field: string, direction: 'ASC' | 'DESC') => void;
  className?: string;
  sortable?: boolean;
}

export default function SortableHeader({
  field,
  label,
  sortConfig,
  onSort,
  className = "",
  sortable = true
}: SortableHeaderProps) {
  const isSorted = sortConfig?.field === field;
  const currentDirection = isSorted ? sortConfig.direction : null;

  const handleSort = () => {
    if (!sortable) return;

    let newDirection: 'ASC' | 'DESC' = 'ASC';
    
    if (currentDirection === 'ASC') {
      newDirection = 'DESC';
    } else if (currentDirection === 'DESC') {
      newDirection = 'ASC';
    }

    onSort(field, newDirection);
  };

  const getSortIcon = () => {
    if (!sortable) return null;

    if (!isSorted) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (currentDirection === 'ASC') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
        sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
      } ${className}`}
      onClick={handleSort}
    >
      <div className="flex items-center space-x-1 group">
        <span>{label}</span>
        {sortable && (
          <span className="flex-shrink-0 transition-colors group-hover:text-gray-600">
            {getSortIcon()}
          </span>
        )}
        {isSorted && (
          <span className="text-xs text-blue-600 font-normal ml-1">
            ({currentDirection})
          </span>
        )}
      </div>
    </th>
  );
}
