/**
 * Advanced API Client with Filtering & Sorting Support
 * Based on Quiz App Backend API Documentation
 */

import { TableFilters, SortConfig, PaginationConfig } from "../components/ui/table/TableFilterBar";
import { API_BASE_URL } from './constants/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  metadata?: {
    duration?: number;
    pagination?: PaginationMeta;
    total?: number;
    count?: number;
  };
  errors?: ValidationError[];
  timestamp: string;
  statusCode: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// User Types with Key-Based Service/Location Storage (Updated November 2025)
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  serviceKey: string; // 'sm', 'am', 'tech_support', 'all_services'
  locationKey: string; // 'jakarta_pusat', 'jakarta_utara', 'all_locations'
  service?: {
    key: string;
    value: string; // Display name from config lookup
  };
  location?: {
    key: string;
    value: string; // Display name from config lookup
  };
  assignedQuizzes?: Quiz[];
  createdAt: string;
  updatedAt: string;
}

// Quiz Types with Key-Based Service/Location Storage (Updated November 2025)
export interface Quiz {
  id: number;
  title: string;
  description?: string;
  slug: string;
  token: string;
  quizType: 'scheduled' | 'manual';
  serviceKey: string; // Key-based service targeting
  locationKey: string; // Key-based location targeting
  service?: {
    key: string;
    value: string; // Display name from config lookup
  };
  location?: {
    key: string;
    value: string; // Display name from config lookup
  };
  startDateTime?: string;
  endDateTime?: string;
  durationMinutes: number;
  passingScore?: number;
  isActive: boolean;
  isPublished: boolean;
  questions?: Question[];
  scoringTemplates?: QuizScoring[];
  assignedUsers?: User[];
  createdAt: string;
  updatedAt: string;
}

// Question with Images
export interface Question {
  id: number;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  points: number;
  order: number;
  quizId: number;
  images?: QuizImage[];
}

export interface QuizImage {
  id: number;
  questionId: number; // Changed from quizId
  fileName: string;
  originalName: string;
  filePath: string;
  fullUrl: string;
  altText?: string;
  isActive: boolean;
}

export interface QuizScoring {
  id: number;
  scoringName: string;
  correctAnswerPoints: number;
  incorrectAnswerPenalty: number;
  multiplier: number;
  passingScore?: number;
  isActive: boolean;
}

// Config Item for Services/Locations
export interface ConfigItem {
  id: number;
  group: string;
  key: string;
  value: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

// Attempt Types
export interface Attempt {
  id: number;
  participantName: string;
  email: string;
  score: number;
  submittedAt: string;
  quizId: number;
  quiz?: Quiz;
  createdAt: string;
}

// Query Builder Class
export class QueryBuilder {
  private params = new URLSearchParams();

  // Pagination
  page(page: number): this {
    this.params.set('page', page.toString());
    return this;
  }

  limit(limit: number): this {
    this.params.set('limit', limit.toString());
    return this;
  }

  // Search
  search(query: string): this {
    if (query.trim()) {
      this.params.set('search', query.trim());
    }
    return this;
  }

  // Filters
  filter(key: string, value: string | number | boolean): this {
    if (value !== undefined && value !== null && value !== '') {
      this.params.set(key, value.toString());
    }
    return this;
  }

  filters(filters: TableFilters): this {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        this.params.set(key, value.toString());
      }
    });
    return this;
  }

  // Sorting
  sort(config: SortConfig): this {
    if (config.field) {
      this.params.set('sortBy', config.field);
      this.params.set('sortOrder', config.direction);
    }
    return this;
  }

  // Build query string
  build(): string {
    return this.params.toString();
  }

  // Reset
  reset(): this {
    this.params = new URLSearchParams();
    return this;
  }
}

// Enhanced API Client
export class EnhancedApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get token from storage if not set in instance
    const token = this.token || (typeof window !== 'undefined' 
      ? localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
      : null);
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new ApiError(result.message, result.errors, result.statusCode);
    }

    return result;
  }

  // Query builder helper
  query(): QueryBuilder {
    return new QueryBuilder();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{
      access_token: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request<User>('/auth/profile');
  }

  // Users API with Key-Based Filtering & Sorting (Updated November 2025)
  async getUsers(options?: {
    pagination?: Pick<PaginationConfig, 'page' | 'limit'>;
    search?: string;
    filters?: {
      serviceKey?: string; // Updated to key-based filtering
      locationKey?: string; // Updated to key-based filtering
      role?: string;
    };
    sort?: SortConfig;
  }) {
    const query = this.query();

    // Apply pagination
    if (options?.pagination) {
      query.page(options.pagination.page).limit(options.pagination.limit);
    }

    // Apply search
    if (options?.search) {
      query.search(options.search);
    }

    // Apply key-based filters
    if (options?.filters) {
      if (options.filters.serviceKey) query.filter('serviceKey', options.filters.serviceKey);
      if (options.filters.locationKey) query.filter('locationKey', options.filters.locationKey);
      if (options.filters.role) query.filter('role', options.filters.role);
    }

    // Apply sorting
    if (options?.sort) {
      query.sort(options.sort);
    }

    const queryString = query.build();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<User>>(endpoint);
  }

  async getUser(id: number) {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    serviceKey: string; // Updated to key-based
    locationKey: string; // Updated to key-based
  }) {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: Partial<User>) {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number) {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Quizzes API with Key-Based Filtering & Sorting (Updated November 2025)
  async getQuizzes(options?: {
    pagination?: Pick<PaginationConfig, 'page' | 'limit'>;
    search?: string;
    filters?: {
      serviceKey?: string; // Updated to key-based filtering
      locationKey?: string; // Updated to key-based filtering
      isActive?: boolean;
    };
    sort?: SortConfig;
  }) {
    const query = this.query();

    // Apply pagination
    if (options?.pagination) {
      query.page(options.pagination.page).limit(options.pagination.limit);
    }

    // Apply search
    if (options?.search) {
      query.search(options.search);
    }

    // Apply key-based filters
    if (options?.filters) {
      if (options.filters.serviceKey) query.filter('serviceKey', options.filters.serviceKey);
      if (options.filters.locationKey) query.filter('locationKey', options.filters.locationKey);
      if (options.filters.isActive !== undefined) query.filter('isActive', options.filters.isActive);
    }

    // Apply sorting
    if (options?.sort) {
      query.sort(options.sort);
    }

    const queryString = query.build();
    const endpoint = `/quizzes${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<Quiz>>(endpoint);
  }

  async getQuiz(id: number) {
    return this.request<Quiz>(`/quizzes/${id}`);
  }

  async createQuiz(quizData: {
    title: string;
    description?: string;
    quizType: 'scheduled' | 'manual';
    startDateTime?: string;
    endDateTime?: string;
    durationMinutes: number;
    serviceKey: string; // Updated to key-based
    locationKey: string; // Updated to key-based
    passingScore?: number;
  }) {
    return this.request<Quiz>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  }

  async updateQuiz(id: number, quizData: Partial<Quiz>) {
    return this.request<Quiz>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quizData),
    });
  }

  async deleteQuiz(id: number) {
    return this.request<void>(`/quizzes/${id}`, {
      method: 'DELETE',
    });
  }

  // Config API for Services/Locations
  async getConfigItems(options?: {
    pagination?: Pick<PaginationConfig, 'page' | 'limit'>;
    filters?: {
      group?: string;
    };
    sort?: SortConfig;
  }) {
    const query = this.query();

    if (options?.pagination) {
      query.page(options.pagination.page).limit(options.pagination.limit);
    }

    if (options?.filters?.group) {
      query.filter('group', options.filters.group);
    }

    if (options?.sort) {
      query.sort(options.sort);
    } else {
      // Default sorting for config items
      query.sort({ field: 'group', direction: 'ASC' });
    }

    const queryString = query.build();
    const endpoint = `/config${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<ConfigItem>>(endpoint);
  }

  async getServices() {
    return this.request<ConfigItem[]>('/config/services');
  }

  async getLocations() {
    return this.request<ConfigItem[]>('/config/locations');
  }

  async getConfigByGroup(group: string) {
    return this.request<ConfigItem[]>(`/config/group/${group}`);
  }

  // Attempts API with Enhanced Filtering & Sorting
  async getAttempts(options?: {
    pagination?: Pick<PaginationConfig, 'page' | 'limit'>;
    filters?: {
      quizId?: number;
      email?: string;
    };
    sort?: SortConfig;
  }) {
    const query = this.query();

    if (options?.pagination) {
      query.page(options.pagination.page).limit(options.pagination.limit);
    }

    if (options?.filters) {
      if (options.filters.quizId) query.filter('quizId', options.filters.quizId);
      if (options.filters.email) query.filter('email', options.filters.email);
    }

    if (options?.sort) {
      query.sort(options.sort);
    }

    const queryString = query.build();
    const endpoint = `/attempts${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<Attempt>>(endpoint);
  }

  async getAttempt(id: number) {
    return this.request<Attempt>(`/attempts/${id}`);
  }
}

// Error Class
export class ApiError extends Error {
  constructor(
    message: string,
    public errors?: ValidationError[],
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }

  getFieldErrors(): Record<string, string> {
    if (!this.errors) return {};
    
    return this.errors.reduce((acc, error) => {
      acc[error.field] = error.message;
      return acc;
    }, {} as Record<string, string>);
  }
}

// Key-Based Storage Utilities (Added November 2025)
export const KeyBasedUtils = {
  // Service Key Constants
  SERVICE_KEYS: {
    ALL_SERVICES: 'all_services',
    SM: 'sm',
    AM: 'am', 
    TECH_SUPPORT: 'tech_support',
    NETM: 'netm',
    CS: 'cs',
    IT_SUPPORT: 'it_support',
    BD: 'bd',
    QA: 'qa'
  },

  // Location Key Constants
  LOCATION_KEYS: {
    ALL_LOCATIONS: 'all_locations',
    JAKARTA_PUSAT: 'jakarta_pusat',
    JAKARTA_UTARA: 'jakarta_utara', 
    JAKARTA_SELATAN: 'jakarta_selatan',
    JAKARTA_BARAT: 'jakarta_barat',
    JAKARTA_TIMUR: 'jakarta_timur',
    SURABAYA: 'surabaya',
    BANDUNG: 'bandung',
    MEDAN: 'medan',
    SEMARANG: 'semarang',
    MAKASSAR: 'makassar',
    TANGERANG: 'tangerang',
    BEKASI: 'bekasi',
    DEPOK: 'depok'
  },

  // Get service display name from key
  getServiceDisplayName: (serviceKey: string, services: ConfigItem[]): string => {
    const service = services.find(s => s.key === serviceKey);
    return service?.value || serviceKey;
  },

  // Get location display name from key  
  getLocationDisplayName: (locationKey: string, locations: ConfigItem[]): string => {
    const location = locations.find(l => l.key === locationKey);
    return location?.value || locationKey;
  },

  // Check if user is superadmin
  isSuperAdmin: (user: User): boolean => {
    return user.role === 'superadmin' || 
           (user.serviceKey === KeyBasedUtils.SERVICE_KEYS.ALL_SERVICES && 
            user.locationKey === KeyBasedUtils.LOCATION_KEYS.ALL_LOCATIONS);
  },

  // Check if user can access specific service/location
  canAccessQuiz: (user: User, quiz: Quiz): boolean => {
    if (KeyBasedUtils.isSuperAdmin(user)) return true;
    
    return user.serviceKey === quiz.serviceKey && 
           user.locationKey === quiz.locationKey;
  },

  // Build filter params for API calls
  buildFilterParams: (filters: Record<string, any>): string => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    return params.toString();
  },

  // Format user for display
  formatUserDisplay: (user: User): string => {
    const service = user.service?.value || user.serviceKey;
    const location = user.location?.value || user.locationKey;
    return `${user.name} (${service} - ${location})`;
  },

  // Format quiz for display
  formatQuizDisplay: (quiz: Quiz): string => {
    const service = quiz.service?.value || quiz.serviceKey;
    const location = quiz.location?.value || quiz.locationKey;
    return `${quiz.title} (${service} - ${location})`;
  }
};

// Create singleton instance
export const api = new EnhancedApiClient();

// Export for use in components
export default api;