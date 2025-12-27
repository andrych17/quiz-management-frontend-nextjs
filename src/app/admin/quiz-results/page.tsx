'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { API } from '@/lib/api-client';
import DataTable, { Column, DataTableAction } from '@/components/ui/table/DataTable';
import BasePageLayout from '@/components/ui/layout/BasePageLayout';
import { Modal } from '@/components/ui/common/Modal';
import { Button } from '@/components/ui/button';
import TableFilterBar from '@/components/ui/table/TableFilterBar';
import type { FilterOption, TableFilters, SortConfig } from '@/components/ui/table/TableFilterBar';

interface QuizResult {
  id: number;
  participantName: string;
  email: string;
  nij: string;
  quizTitle: string;
  serviceName: string;
  locationName: string;
  score: number;
  grade?: string;
  passed: boolean;
  startedAt: string;
  completedAt?: string;
  submittedAt?: string;
  totalAnswers: number;
  correctAnswers: number;
}

export default function QuizResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0,
  });

  // Filter and sort states
  const [filterValues, setFilterValues] = useState<TableFilters>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'submittedAt', direction: 'DESC' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const locationRes = await API.config.getConfigsByGroup('location');
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
      const serviceRes = await API.config.getConfigsByGroup('service');
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
      if (currentFilters.quizId) {
        apiParams.quizId = currentFilters.quizId;
      }
      if (currentFilters.startDate) {
        apiParams.startDate = currentFilters.startDate;
      }
      if (currentFilters.endDate) {
        apiParams.endDate = currentFilters.endDate;
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
        key: 'quizId',
        label: 'Quiz ID',
        type: 'number',
        placeholder: 'Enter Quiz ID'
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
      }
    ] as FilterOption[];
  }, [serviceOptions, locationOptions]);

  const handleFilterChange = useCallback((filters: TableFilters) => {
    setFilterValues(filters);
    setPage(1); // Reset to first page when filtering
    loadResults(filters, sortConfig, 1);
  }, [loadResults, sortConfig]);

  const handleFilterValueChange = useCallback((key: string, value: string | number | boolean | undefined) => {
    const newFilters = { ...filterValues, [key]: value };
    handleFilterChange(newFilters);
  }, [filterValues, handleFilterChange]);

  const handleClearFilters = useCallback(() => {
    setFilterValues({});
    setPage(1);
    loadResults({}, sortConfig, 1);
  }, [loadResults, sortConfig]);



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
      render: (value: unknown, row: QuizResult) => (
        <div className="text-center">
          <div className={`text-lg font-semibold ${
            row.passed ? 'text-green-600' : 'text-red-600'
          }`}>
            {row.score}%
          </div>
          {row.grade && (
            <div className="text-sm text-gray-500">{row.grade}</div>
          )}
          <div className={`text-xs px-2 py-1 rounded-full inline-block ${
            row.passed 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {row.passed ? 'PASSED' : 'FAILED'}
          </div>
        </div>
      ),
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
        
        const correctAnswers = row.correctAnswers || 0;
        const totalAnswers = row.totalAnswers || 0;
        
        return (
          <div className="text-center">
            <div className="text-sm">
              <span className="text-green-600 font-medium">{correctAnswers}</span>
              {' / '}
              <span className="text-gray-600">{totalAnswers}</span>
            </div>
            <div className="text-xs text-gray-500">
              {totalAnswers > 0 
                ? Math.round((correctAnswers / totalAnswers) * 100)
                : 0}% correct
            </div>
          </div>
        );
      },
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      sortable: true,
      render: (value: unknown, row: QuizResult) => (
        <div className="text-sm">
          {row.submittedAt 
            ? new Date(row.submittedAt).toLocaleDateString() + ' ' + 
              new Date(row.submittedAt).toLocaleTimeString()
            : row.completedAt
              ? new Date(row.completedAt).toLocaleDateString() + ' ' + 
                new Date(row.completedAt).toLocaleTimeString()
              : 'Not completed'
          }
        </div>
      ),
    },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'View Details',
      onClick: handleView,
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      variant: 'primary' as const
    },
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
            setPage(1);
          }
        }}
      />
    </BasePageLayout>
  );
}
