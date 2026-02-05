'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/lib/api-client';
import { formatDateTime, formatDate } from '@/lib/date';
import DataTable, { Column, DataTableAction } from '@/components/ui/table/DataTable';
import BasePageLayout from '@/components/ui/layout/BasePageLayout';

import { Button } from '@/components/ui/button';
import TableFilterBar from '@/components/ui/table/TableFilterBar';
import type { FilterOption, TableFilters, SortConfig } from '@/components/ui/table/TableFilterBar';
import { logger } from '@/lib/logger';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/lib/constants/config';

interface QuizResult {
  id: number;
  participantName: string;
  email: string;
  nij: string;
  quizTitle: string;
  serviceName: string;
  locationName: string;
  score: number;
  passed: boolean;
  startedAt: string;
  completedAt?: string;
  submittedAt?: string;
  totalQuestions: number;
  correctAnswers: number;
  quizId: number;
  status?: string;
  statusLabel?: string;
}

export default function QuizResultsPage() {
  const router = useRouter();
  const { isSuperadmin } = useAuth();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0,
  });

  // Filter and sort states
  const [filterValues, setFilterValues] = useState<TableFilters>({
    submissionStatus: 'submitted' // Default: hide yang sedang dikerjakan
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'submittedAt', direction: 'DESC' });
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Config options for filters
  const [serviceOptions, setServiceOptions] = useState<Array<{key: string, name: string}>>([]);
  const [locationOptions, setLocationOptions] = useState<Array<{key: string, name: string}>>([]);

  useEffect(() => {
    loadConfigOptions();
  }, []);

  useEffect(() => {
    loadResults();
  }, [filterValues, sortConfig, page]);

  const loadConfigOptions = useCallback(async () => {
    try {
      // Load location options from backend API
      const locationRes = await API.config.getLocationConfigs();
      const locationData = locationRes?.data || [];
      const locationOpts = Array.isArray(locationData) ? locationData.map((config: { key: string, value: string }) => ({
        key: config.key,
        name: config.value
      })) : [];
      // Filter out any potential duplicates and ensure unique keys
      const uniqueLocationOpts = locationOpts.filter(opt => opt.key !== 'all_locations');
      setLocationOptions([
        { key: 'all_locations', name: 'All Locations' },
        ...uniqueLocationOpts
      ]);

      // Load service options from backend API
      const serviceRes = await API.config.getServiceConfigs();
      const serviceData = serviceRes?.data || [];
      const serviceOpts = Array.isArray(serviceData) ? serviceData.map((config: { key: string, value: string }) => ({
        key: config.key,
        name: config.value
      })) : [];
      // Filter out any potential duplicates and ensure unique keys
      const uniqueServiceOpts = serviceOpts.filter(opt => opt.key !== 'all_services');
      setServiceOptions([
        { key: 'all_services', name: 'All Services' },
        ...uniqueServiceOpts
      ]);
    } catch (err) {
      console.error('Failed to load config options:', err);
      // If API fails or no data, set default options
      setLocationOptions([{ key: 'all_locations', name: 'All Locations' }]);
      setServiceOptions([{ key: 'all_services', name: 'All Services' }]);
    }
  }, []);

  const loadResults = useCallback(async (filters?: TableFilters, sort?: SortConfig, pageNum?: number) => {
    try {
      setLoading(true);
      setError(null);

      const currentFilters = filters || filterValues;
      const currentSort = sort || sortConfig;
      const currentPage = pageNum || page;

      // Convert filter values to API parameters
      const apiParams: any = {
        page: currentPage,
        limit: pageSize,
      };

      // Add filters
      if (currentFilters.search) {
        apiParams.search = currentFilters.search;
      }
      if (currentFilters.serviceKey && currentFilters.serviceKey !== 'all_services') {
        apiParams.serviceKey = currentFilters.serviceKey;
      }
      if (currentFilters.locationKey && currentFilters.locationKey !== 'all_locations') {
        apiParams.locationKey = currentFilters.locationKey;
      }
      if (currentFilters.quizName) {
        apiParams.quizName = currentFilters.quizName;
      }
      if (currentFilters.startDate) {
        apiParams.startDate = currentFilters.startDate;
      }
      if (currentFilters.endDate) {
        apiParams.endDate = currentFilters.endDate;
      }
      if (currentFilters.submissionStatus) {
        apiParams.submissionStatus = currentFilters.submissionStatus;
      }
      if (currentFilters.passStatus) {
        apiParams.passStatus = currentFilters.passStatus;
      }

      const response = await API.attempts.getAttempts(apiParams);

      if (response.success && response.data) {
        setResults(response.data.items || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
        }));
      } else {
        setError(response.message || 'Failed to load quiz results');
      }
    } catch (err: any) {
      console.error('Error loading quiz results:', err);
      setError(err.message || 'Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  }, [filterValues, sortConfig, page, pageSize]);

  const handleView = (result: QuizResult) => {
    router.push(`/admin/quiz-results/${result.id}`);
  };

  // Create filter options based on loaded config
  const filterOptions = useMemo(() => {
    const serviceFilter: FilterOption = {
      key: 'serviceKey',
      label: 'Service',
      type: 'select',
      placeholder: 'Choose Service',
      options: serviceOptions.map(option => ({ 
        value: option.key, 
        label: option.name 
      }))
    };

    const locationFilter: FilterOption = {
      key: 'locationKey', 
      label: 'Location',
      type: 'select',
      placeholder: 'Choose Location',
      options: locationOptions.map(option => ({ 
        value: option.key, 
        label: option.name 
      }))
    };

    return [
      {
        key: 'search',
        label: 'Search',
        type: 'text',
        placeholder: 'Search by name, email, NIJ...'
      },
      serviceFilter,
      locationFilter,
      {
        key: 'quizName',
        label: 'Quiz Name',
        type: 'text',
        placeholder: 'Enter Quiz Name'
      },
      {
        key: 'startDate',
        label: 'Start Date',
        type: 'date',
        placeholder: 'Select start date'
      },
      {
        key: 'endDate',
        label: 'End Date', 
        type: 'date',
        placeholder: 'Select end date'
      },
      {
        key: 'submissionStatus',
        label: 'Submission Status',
        type: 'select',
        placeholder: 'All Submissions',
        options: [
          { value: 'submitted', label: 'Submitted Only' },
          { value: 'not_submitted', label: 'In Progress Only' }
        ]
      },
      {
        key: 'passStatus',
        label: 'Pass Status',
        type: 'select',
        placeholder: 'All Results',
        options: [
          { value: 'passed', label: 'Passed Only' },
          { value: 'failed', label: 'Failed Only' }
        ]
      }
    ] as FilterOption[];
  }, [serviceOptions, locationOptions]);

  const handleFilterChange = useCallback((filters: TableFilters) => {
    setFilterValues(filters);
    setPage(DEFAULT_PAGE); // Reset to first page when filtering
    loadResults(filters, sortConfig, DEFAULT_PAGE);
  }, [loadResults, sortConfig]);

  const handleFilterValueChange = useCallback((key: string, value: string | number | boolean | undefined) => {
    const newFilters = { ...filterValues, [key]: value };
    handleFilterChange(newFilters);
  }, [filterValues, handleFilterChange]);

  const handleClearFilters = useCallback(() => {
    const defaultFilters = { submissionStatus: 'submitted' };
    setFilterValues(defaultFilters);
    setPage(DEFAULT_PAGE);
    loadResults(defaultFilters, sortConfig, DEFAULT_PAGE);
  }, [loadResults, sortConfig]);

  const handleExportExcel = async () => {
    if (results.length === 0) {
      setError('No data to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      // Build query params from current filters
      const queryParams = new URLSearchParams();
      // Changed: Filter by Quiz Name instead of ID
      if (filterValues.quizName) {
        queryParams.append('quizName', String(filterValues.quizName));
      }
      if (filterValues.serviceKey && filterValues.serviceKey !== 'all_services') {
        queryParams.append('serviceKey', String(filterValues.serviceKey));
      }
      if (filterValues.locationKey && filterValues.locationKey !== 'all_locations') {
        queryParams.append('locationKey', String(filterValues.locationKey));
      }
      if (filterValues.submissionStatus) {
        queryParams.append('submissionStatus', String(filterValues.submissionStatus));
      }
      if (filterValues.passStatus) {
        queryParams.append('passStatus', String(filterValues.passStatus));
      }

      const queryString = queryParams.toString();
      const endpoint = `/api/attempts/export-excel${queryString ? `?${queryString}` : ''}`;
      
      logger.api('GET', endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logger.apiResponse(endpoint, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to export quiz results');
      }

      // Download the Excel file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      logger.debug('Excel export successful');
    } catch (err: any) {
      logger.error('Error exporting quiz results:', err);
      setError(err.message || 'Failed to export quiz results to Excel');
    } finally {
      setIsExporting(false);
    }
  };


  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = async (result: QuizResult) => {
    if (!window.confirm(`Are you sure you want to delete the attempt for ${result.participantName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await API.attempts.deleteAttempt(result.id);
      
      // Refresh results
      await loadResults(filterValues, sortConfig, page);
      
      logger.debug(`Deleted attempt ${result.id}`);
    } catch (err: any) {
      console.error('Error deleting attempt:', err);
      setError(err.message || 'Failed to delete attempt');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column[] = [
    {
      key: 'participantName',
      label: 'Participant',
      sortable: true,
      render: (value: unknown, row: QuizResult) => (
        <div>
          <div className="font-medium">{row.participantName}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
          <div className="text-xs text-gray-400">NIJ: {row.nij}</div>
        </div>
      ),
    },
    {
      key: 'quizTitle',
      label: 'Quiz',
      sortable: true,
      render: (value: unknown, row: QuizResult) => (
        <div>
          <div className="font-medium">{row.quizTitle}</div>
          <div className="text-sm text-gray-500">{row.serviceName}</div>
          <div className="text-xs text-gray-400">{row.locationName}</div>
        </div>
      ),
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      render: (value: unknown, row: QuizResult) => {
        const isInProgress = !row.submittedAt && !row.completedAt;
        
        if (isInProgress) {
          return (
            <div className="text-center">
              <div className="text-sm text-gray-400">-</div>
              <div className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-gray-100 text-gray-500">
                Sedang dikerjakan
              </div>
            </div>
          );
        }
        
        return (
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              row.passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {row.score}
            </div>
            <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
              row.passed 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {row.passed ? '✅ LULUS' : '❌ TIDAK LULUS'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'answers',
      label: 'Answers',
      render: (value: unknown, row: QuizResult) => {
        if (!row) {
          return (
            <div className="text-center">
              <div className="text-sm text-gray-500">No data</div>
            </div>
          );
        }
        
        const isInProgress = !row.submittedAt && !row.completedAt;
        
        if (isInProgress) {
          return (
            <div className="text-center">
              <div className="text-sm text-gray-400">-</div>
              <div className="text-xs text-gray-500">Belum selesai</div>
            </div>
          );
        }
        
        const correctAnswers = row.correctAnswers || 0;
        const totalQuestions = row.totalQuestions || 0;
        
        return (
          <div className="text-center">
            <div className="text-sm">
              <span className="text-green-600 font-medium">{correctAnswers}</span>
              {' / '}
              <span className="text-gray-600">{totalQuestions}</span>
            </div>
            <div className="text-xs text-gray-500">
              {totalQuestions > 0 
                ? Math.round((correctAnswers / totalQuestions) * 100)
                : 0}% benar
            </div>
          </div>
        );
      },
    },
    {
      key: 'submittedAt',
      label: 'Status',
      sortable: true,
      render: (value: unknown, row: QuizResult) => {
        const hasSubmitted = !!row.submittedAt;
        const isCompleted = !!row.completedAt;
        
        if (hasSubmitted) {
          return (
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-medium text-green-700">Completed</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(row.submittedAt)}
              </div>
            </div>
          );
        } else if (isCompleted) {
          return (
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="font-medium text-blue-700">Completed</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(row.completedAt)}
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span className="font-medium text-yellow-700">In Progress</span>
              </div>
              <div className="text-xs text-gray-500">
                Started: {formatDateTime(row.startedAt)}
              </div>
            </div>
          );
        }
      },
    },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'View',
      onClick: handleView,
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      variant: 'primary'
    },
    {
      label: 'Delete',
      onClick: handleDeleteClick,
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger'
    }
  ];

  return (
    <BasePageLayout
      title="Quiz Results"
      subtitle="View and manage quiz attempt results"
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Export Excel Button - Superadmin Only */}
      {isSuperadmin && results.length > 0 && (
        <div className="mb-4 flex justify-end">
          <Button
            onClick={handleExportExcel}
            disabled={isExporting || loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </>
            )}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={results}
        actions={actions}
        filters={filterOptions}
        filterValues={filterValues}
        sortConfig={sortConfig}
        onFilterChange={handleFilterChange}
        onSort={(field, direction) => setSortConfig({ field, direction })}
        loading={loading}
        emptyMessage="No quiz results found"
        emptyIcon={
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        pagination={{
          page: page,
          limit: pageSize,
          total: pagination.totalItems,
          onPageChange: setPage,
          onLimitChange: (newLimit: number) => {
            setPageSize(newLimit);
            setPage(DEFAULT_PAGE);
          }
        }}
      />


    </BasePageLayout>
  );
}
