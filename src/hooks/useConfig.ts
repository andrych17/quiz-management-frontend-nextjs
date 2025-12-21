/**
 * Custom hooks for fetching config data (services, locations)
 * Based on Quiz App Backend API Documentation
 */

import { useState, useEffect, useCallback } from 'react';
import { api, ConfigItem, ApiError } from '../lib/enhanced-api-client';

export interface ServiceOption {
  value: number;
  label: string;
  key: string;
}

export interface LocationOption {
  value: number;
  label: string;
  key: string;
}

// Hook for fetching services
export function useServices() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getServices();
      
      if (response.success && response.data) {
        const serviceOptions: ServiceOption[] = response.data.map((service: ConfigItem) => ({
          value: service.id,
          label: service.value,
          key: service.key
        }));
        
        setServices(serviceOptions);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch services';
      setError(errorMessage);
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices
  };
}

// Hook for fetching locations
export function useLocations() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getLocations();
      
      if (response.success && response.data) {
        const locationOptions: LocationOption[] = response.data.map((location: ConfigItem) => ({
          value: location.id,
          label: location.value,
          key: location.key
        }));
        
        setLocations(locationOptions);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch locations';
      setError(errorMessage);
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations
  };
}

// Hook for fetching config by group
export function useConfigGroup(group: string) {
  const [configItems, setConfigItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigGroup = useCallback(async () => {
    if (!group) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.getConfigByGroup(group);
      
      if (response.success && response.data) {
        setConfigItems(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : `Failed to fetch ${group} config`;
      setError(errorMessage);
      console.error(`Error fetching ${group} config:`, err);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    fetchConfigGroup();
  }, [fetchConfigGroup]);

  return {
    configItems,
    loading,
    error,
    refetch: fetchConfigGroup
  };
}

// Hook for enhanced data table with filters and sorting
export function useEnhancedDataTable<T = any>(
  fetchFunction: (options: any) => Promise<any>,
  options?: {
    initialPage?: number;
    initialLimit?: number;
    initialSort?: { field: string; direction: 'ASC' | 'DESC' };
    initialFilters?: Record<string, any>;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(options?.initialPage || 1);
  const [limit, setLimit] = useState(options?.initialLimit || 10);
  const [total, setTotal] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState(options?.initialFilters || {});
  const [search, setSearch] = useState('');
  
  // Sort state
  const [sortConfig, setSortConfig] = useState(
    options?.initialSort || { field: 'createdAt', direction: 'DESC' as 'ASC' | 'DESC' }
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryOptions = {
        pagination: { page, limit },
        search: search.trim() || undefined,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
        ),
        sort: sortConfig
      };

      const response = await fetchFunction(queryOptions);
      
      if (response.success) {
        if (response.data.items) {
          // Paginated response
          setData(response.data.items);
          setTotal(response.data.pagination?.totalItems || 0);
        } else if (Array.isArray(response.data)) {
          // Array response
          setData(response.data);
          setTotal(response.data.length);
        } else {
          // Single item response
          setData([response.data]);
          setTotal(1);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, limit, search, filters, sortConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filtering
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page when searching
  }, []);

  const handleSortChange = useCallback((field: string, direction: 'ASC' | 'DESC') => {
    setSortConfig({ field, direction });
    setPage(1); // Reset to first page when sorting
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    // Data
    data,
    loading,
    error,
    
    // Pagination
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1
    },
    
    // Filters & Search
    filters,
    search,
    
    // Sorting
    sortConfig,
    
    // Actions
    handlePageChange,
    handleLimitChange,
    handleFilterChange,
    handleSearchChange,
    handleSortChange,
    clearFilters,
    refresh
  };
}

// Hook for role-based permissions
export function useRolePermissions() {
  const [permissions, setPermissions] = useState({
    canManageUsers: false,
    canManageQuizzes: false,
    canManageConfig: false,
    isSuperadmin: false,
    isAdmin: false,
    isUser: false
  });
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const response = await api.getProfile();
        
        if (response.success && response.data) {
          const userData = response.data;
          setUser(userData);
          
          const isSuperadmin = userData.role === 'superadmin';
          const isAdmin = userData.role === 'admin';
          const isUser = userData.role === 'user';
          
          setPermissions({
            canManageUsers: isSuperadmin,
            canManageQuizzes: isSuperadmin || isAdmin,
            canManageConfig: isSuperadmin,
            isSuperadmin,
            isAdmin,
            isUser
          });
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only check if we have a token
    const token = localStorage.getItem('access_token');
    if (token) {
      api.setToken(token);
      checkPermissions();
    } else {
      setLoading(false);
    }
  }, []);

  return {
    ...permissions,
    user,
    loading
  };
}
