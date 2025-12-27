"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import DataTable, { Column, DataTableAction } from "@/components/ui/table/DataTable";
import type { FilterOption, TableFilters, SortConfig } from "@/components/ui/table/TableFilterBar";
import BasePageLayout from "@/components/ui/layout/BasePageLayout";
import type { Quiz as ApiQuiz } from "@/types/api";
import { ApiError } from "@/types/api";
import { API } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<ApiQuiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterValues, setFilterValues] = useState<TableFilters>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createdAt', direction: 'DESC' });
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string, label: string }>>([]);
  const [serviceOptions, setServiceOptions] = useState<Array<{ value: string, label: string }>>([]);

  // Add logging for state changes
  useEffect(() => {
  }, [filterValues]);

  useEffect(() => {
  }, [quizzes]);

  useEffect(() => {
  }, [loading]);

  useEffect(() => {
  }, [locationOptions]);

  useEffect(() => {
  }, [serviceOptions]);

  const router = useRouter();
  const { canAccessAllQuizzes, isAdmin, isSuperadmin, canCreateQuizzes } = useAuth();



  const loadQuizzes = useCallback(async (filters: TableFilters = {}, sort?: SortConfig, currentPage: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      // Prepare API parameters to match API client structure
      const apiParams = {
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sort: sort ? {
          field: sort.field,
          direction: sort.direction
        } : undefined,
        page: currentPage,
        limit: 10
      };
      const res = await API.quizzes.getQuizzes(apiParams);
      const response = res.data as {
        items?: ApiQuiz[],
        data?: ApiQuiz[],
        total?: number,
        count?: number,
        pagination?: {
          totalItems?: number;
          totalPages?: number;
          currentPage?: number;
          pageSize?: number;
        }
      };
      const quizzesData = response?.items || response?.data || (Array.isArray(res.data) ? res.data : []);
      const totalCount = response?.pagination?.totalItems || response?.total || response?.count || (Array.isArray(quizzesData) ? quizzesData.length : 0);
      setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
      setTotal(totalCount);
    } catch (err: unknown) {
      console.error('Failed to load quizzes', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load quizzes');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfigOptions = useCallback(async () => {
    try {
      // Load location options from backend API using correct endpoint
      const locationRes = await API.config.getLocationConfigs();
      const locationData = locationRes?.data || [];
      const locationOpts = Array.isArray(locationData) ? locationData.map((config: { key: string, value: string }, index: number) => {
        return {
          value: config.key,
          label: config.value
        };
      }) : [];
      setLocationOptions(locationOpts);

      // Load service options from backend API using correct endpoint
      const serviceRes = await API.config.getServiceConfigs();
      const serviceData = serviceRes?.data || [];
      const serviceOpts = Array.isArray(serviceData) ? serviceData.map((config: { key: string, value: string }) => ({
        value: config.key,
        label: config.value
      })) : [];
      setServiceOptions(serviceOpts);
    } catch (err) {
      console.error('Failed to load config options:', err);
      // If API fails or no data, set empty arrays
      setLocationOptions([]);
      setServiceOptions([]);
    }
  }, []);

  useEffect(() => {
    // Load config options first
    loadConfigOptions();
    // Load quizzes
    loadQuizzes();
  }, [loadQuizzes, loadConfigOptions]);

  const columns: Column[] = [
    {
      key: "title",
      label: "Quiz Title",
      sortable: true,
      render: (value: unknown, row: ApiQuiz) => {
        const count = Array.isArray(row.questions) ? row.questions.length : 0;
        return (
          <div className="min-w-[200px]">
            <div className="font-medium text-gray-900">{row.title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{count} soal</span>
            </div>
          </div>
        );
      }
    },
    {
      key: "status",
      label: "Status",
      render: (value: unknown, row: ApiQuiz) => {
        const isPublished = row.isPublished;
        return (
          <span className={`inline-flex items-center px-2 py-1 text-xs rounded ${isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
            {isPublished ? 'Published' : 'Draft'}
          </span>
        );
      }
    },
    {
      key: "service",
      label: "Service",
      render: (value: unknown, row: ApiQuiz) => {
        // Priority: serviceName > service.value > serviceKey > serviceType > 'Not Assigned'
        const serviceName = row.serviceName || row.service?.value || row.serviceKey || row.serviceType || 'Not Assigned';
        return (
          <span className="text-xs text-gray-700">
            {serviceName}
          </span>
        );
      }
    },
    {
      key: "location",
      label: "Location",
      render: (value: unknown, row: ApiQuiz) => {
        // Priority: locationName > location.value > locationKey > 'Global'
        const locationName = row.locationName || row.location?.value || row.locationKey || 'Global';
        return (
          <span className="text-xs text-gray-700">
            {locationName}
          </span>
        );
      }
    },
    {
      key: "createdAt",
      label: "Dibuat",
      sortable: true,
      render: (value: unknown, row: ApiQuiz) => {
        const date = new Date(row.createdAt || '');
        return (
          <div className="text-xs text-gray-600">
            {date.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        );
      }
    }
  ];

  const actions: DataTableAction[] = [
    {
      label: "Edit",
      onClick: (quiz: ApiQuiz) => handleEdit(quiz),
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      variant: "primary" as const
    },
    {
      label: "Delete",
      onClick: (quiz: ApiQuiz) => handleDelete(quiz),
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: "danger" as const,
      show: () => canAccessAllQuizzes
    }
  ];

  const handleEdit = (quiz: ApiQuiz) => {
    router.push(`/admin/quizzes/${quiz.id}`);
  };

  const handleDelete = (quiz: ApiQuiz) => {
    if (confirm(`Are you sure you want to delete "${quiz.title}"?`)) {
      (async () => {
        try {
          await API.quizzes.deleteQuiz(Number(quiz.id));
          await loadQuizzes();
        } catch (err: unknown) {
          console.error('Delete failed', err);
          alert(err instanceof Error ? err.message : 'Delete failed');
        }
      })();
    }
  };

  // Filter options untuk tabel - using dynamic config data
  const filters: FilterOption[] = useMemo(() => {
    const assignedLocationFilter = {
      key: 'assignedLocation',
      label: 'Assigned Location',
      type: 'select',
      placeholder: 'Choose Location',
      options: locationOptions
    };

    const assignedServiceFilter = {
      key: 'assignedService',
      label: 'Assigned Service',
      type: 'select',
      placeholder: 'Choose Service',
      options: serviceOptions
    };
    const filterOptions = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        placeholder: 'Search by title...'
      },
      {
        key: 'description',
        label: 'Description',
        type: 'text',
        placeholder: 'Search by description...'
      },
      {
        key: 'isPublished',
        label: 'Status Publish',
        type: 'select',
        placeholder: 'Choose Status',
        options: [
          { value: 'true', label: 'Published' }
        ]
      },
      assignedLocationFilter,
      assignedServiceFilter
    ] as FilterOption[];
    return filterOptions;
  }, [locationOptions, serviceOptions]);

  const handleFilterChange = useCallback((filters: TableFilters) => {
    setFilterValues(filters);
    setPage(1); // Reset to first page when filtering
    // Make API call with new filters
    loadQuizzes(filters, sortConfig, 1);
  }, [loadQuizzes, sortConfig, filterValues]);

  const handleSort = useCallback((field: string, direction: 'ASC' | 'DESC') => {
    setSortConfig({ field, direction });
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">⚠️ {error}</p>
          <button
            onClick={() => loadQuizzes()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <BasePageLayout
      title="Quiz Management"
      subtitle={canAccessAllQuizzes ? "Manage all quizzes and assessments" : "Manage your assigned quizzes"}
      actions={
        canCreateQuizzes && (
          <button
            onClick={() => router.push('/admin/quizzes/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Quiz
          </button>
        )
      }
    >
      <DataTable
        columns={columns}
        data={quizzes}
        actions={actions}
        filters={filters}
        filterValues={filterValues}
        sortConfig={sortConfig}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        loading={loading}
        emptyMessage="No quizzes found"
        emptyIcon={
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
          onLimitChange: handleLimitChange
        }}
        showExport
        onExport={() => { }}
      />
    </BasePageLayout>
  );
}
