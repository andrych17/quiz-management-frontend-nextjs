import { 
  ApiResponse, 
  ApiError, 
  PaginatedResponse, 
  PaginationParams,
  UserFilterParams,
  AuthResponse,
  User,
  Quiz,
  Question,
  Attempt,
  AttemptAnswer,
  QuizSession,
  Config,
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  StartQuizSessionDto,
  UpdateSessionTimeDto
} from '@/types/api';
import { API_BASE_URL } from './constants/api';

/**
 * Base API client with standardized response handling
 */
export class BaseApiClient {
  protected static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    // Check both localStorage and sessionStorage for token
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    const token = localToken || sessionToken;
    

    

    
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const responseData: ApiResponse<T> = await response.json();
      
      // Only log successful responses to reduce console noise
      if (response.ok && responseData.success) {
      }

      // Only throw for actual HTTP errors (4xx, 5xx), not for success:false with 200
      if (!response.ok) {
        throw new ApiError(
          responseData.message || `HTTP Error: ${response.status}`,
          responseData.errors,
          responseData.statusCode || response.status,
          responseData.path
        );
      }
      
      // For HTTP 200 with success:false, let frontend handle it normally
      // This way backend validation errors don't throw exceptions

      return responseData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }

  protected static buildParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const result = searchParams.toString();
    return result ? `?${result}` : '';
  }
}

/**
 * Authentication API client
 */
export class AuthAPI extends BaseApiClient {
  static async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async register(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  static async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile');
  }

  static async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    return this.request<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  static async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  static async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }
}

/**
 * User Management API client
 */
export class UsersAPI extends BaseApiClient {
  static async getUsers(params: UserFilterParams = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    const queryString = this.buildParams(params);
    return this.request<PaginatedResponse<User>>(`/users${queryString}`);
  }

  static async getUser(id: number): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  static async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async updateUser(id: number, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  static async deleteUser(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

/**
 * Quiz Management API client with role-based filtering
 * - Superadmin: sees all quizzes
 * - Admin: sees only assigned quizzes
 * - User: sees only published quizzes
 */
export class QuizzesAPI extends BaseApiClient {
  static async getQuizzes(params?: {
    filters?: { [key: string]: string | number | boolean | undefined };
    sort?: { field: string; direction: 'ASC' | 'DESC' };
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Quiz[]>> {
    let url = '/quizzes';
    if (params) {
      const queryParams = new URLSearchParams();
      
      // Add filter parameters with correct mapping
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            // Map frontend filter keys to backend parameter names
            let backendKey = key;
            if (key === 'assignedService') {
              backendKey = 'serviceKey';
            } else if (key === 'assignedLocation') {
              backendKey = 'locationKey';
            } else if (key === 'isPublished') {
              backendKey = 'isPublished';
            } else if (key === 'title') {
              backendKey = 'title';
            } else if (key === 'description') {
              backendKey = 'description';
            }
            
            const filterValue = String(value);
            queryParams.append(backendKey, filterValue);
          }
        });
      }
      
      // Add sort parameters
      if (params.sort) {
        queryParams.append('sort', params.sort.field);
        queryParams.append('order', params.sort.direction);
      }
      
      // Add pagination parameters
      if (params.page) {
        queryParams.append('page', String(params.page));
      }
      if (params.limit) {
        queryParams.append('limit', String(params.limit));
      }
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<Quiz[]>(url);
  }

  static async getQuiz(id: number): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}`);
  }

  static async createQuiz(quizData: CreateQuizDto): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  }

  static async updateQuiz(id: number, quizData: UpdateQuizDto): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quizData),
    });
  }

  static async deleteQuiz(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/quizzes/${id}`, {
      method: 'DELETE',
    });
  }

  static async getQuizQuestions(id: number): Promise<ApiResponse<Question[]>> {
    return this.request<Question[]>(`/quizzes/${id}/questions`);
  }

  static async getQuizAttempts(id: number): Promise<ApiResponse<Attempt[]>> {
    return this.request<Attempt[]>(`/quizzes/${id}/attempts`);
  }

  static async duplicateQuiz(id: number): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}/duplicate`, {
      method: 'POST',
    });
  }

  static async publishQuiz(id: number): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}/publish`, {
      method: 'PUT',
    });
  }

  static async unpublishQuiz(id: number): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}/unpublish`, {
      method: 'PUT',
    });
  }

  static async generateQuizLink(id: number): Promise<ApiResponse<{ normalUrl: string; shortUrl: string }>> {
    return this.request<{ normalUrl: string; shortUrl: string }>(`/quizzes/${id}/generate-link`, {
      method: 'POST',
    });
  }

  // New endpoints for manual quiz management
  static async startManualQuiz(id: number, startData?: {
    startDateTime?: string;
    durationMinutes?: number;
  }): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(startData || {}),
    });
  }

  // Template management (admin only)
  static async getQuizTemplates(params: {
    serviceType?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<PaginatedResponse<Quiz>>> {
    const queryString = this.buildParams(params);
    return this.request<PaginatedResponse<Quiz>>(`/quizzes/templates${queryString}`);
  }

  static async copyQuizTemplate(sourceId: number, copyData: {
    title: string;
    description?: string;
    serviceType?: string;
    locationId?: number;
  }): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${sourceId}/copy-template`, {
      method: 'POST',
      body: JSON.stringify(copyData),
    });
  }

  static async getTemplatePreview(templateId: number): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/quizzes/${templateId}/template-preview`);
  }

  // Public quiz access by token (no authentication required)
  static async getPublicQuizByToken(token: string): Promise<ApiResponse<Quiz>> {
    // Use a separate method without auth headers for public access
    const url = `${API_BASE_URL}/api/quizzes/token/${token}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData: ApiResponse<Quiz> = await response.json();
      
      if (!response.ok || !responseData.success) {
        throw new ApiError(
          responseData.message || `HTTP Error: ${response.status}`,
          responseData.errors,
          responseData.statusCode || response.status,
          responseData.path
        );
      }

      return responseData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }
}

/**
 * Question Management API client
 */
export class QuestionsAPI extends BaseApiClient {
  static async getQuestions(): Promise<ApiResponse<Question[]>> {
    return this.request<Question[]>('/questions');
  }

  static async getQuestion(id: number): Promise<ApiResponse<Question>> {
    return this.request<Question>(`/questions/${id}`);
  }

  static async createQuestion(questionData: CreateQuestionDto): Promise<ApiResponse<Question>> {
    return this.request<Question>('/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  }

  static async updateQuestion(id: number, questionData: Partial<CreateQuestionDto>): Promise<ApiResponse<Question>> {
    return this.request<Question>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  }

  static async deleteQuestion(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/questions/${id}`, {
      method: 'DELETE',
    });
  }

  static async reorderQuestions(quizId: number, questionIds: number[]): Promise<ApiResponse<void>> {
    return this.request<void>(`/questions/quiz/${quizId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ questionIds }),
    });
  }
}

/**
 * Attempt Management API client
 */
export class AttemptsAPI extends BaseApiClient {
  // Get attempts with pagination and filters
  static async getAttempts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    serviceKey?: string;
    locationKey?: string;
    quizId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const url = queryParams.toString() ? `/attempts?${queryParams.toString()}` : '/attempts';
    return this.request<any>(url);
  }

  static async getAttempt(id: number): Promise<ApiResponse<Attempt>> {
    return this.request<Attempt>(`/attempts/${id}`);
  }

  // Get attempt with detailed answers for viewing/reviewing
  static async getAttemptWithAnswers(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/attempts/${id}/view`);
  }

  static async createAttempt(attemptData: Partial<Attempt>): Promise<ApiResponse<Attempt>> {
    return this.request<Attempt>('/attempts', {
      method: 'POST',
      body: JSON.stringify(attemptData),
    });
  }

  static async updateAttempt(id: number, attemptData: Partial<Attempt>): Promise<ApiResponse<Attempt>> {
    return this.request<Attempt>(`/attempts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(attemptData),
    });
  }

  static async deleteAttempt(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/attempts/${id}`, {
      method: 'DELETE',
    });
  }

  static async getAttemptAnswers(id: number): Promise<ApiResponse<AttemptAnswer[]>> {
    return this.request<AttemptAnswer[]>(`/attempts/${id}/answers`);
  }

  static async exportQuizAttempts(quizId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/attempts/quiz/${quizId}/export`);
  }
}

/**
 * Quiz Session Management API client
 */
export class QuizSessionsAPI extends BaseApiClient {
  static async startSession(sessionData: StartQuizSessionDto): Promise<ApiResponse<{ sessionToken: string; expiresAt: string; sessionStatus: string }>> {
    return this.request<{ sessionToken: string; expiresAt: string; sessionStatus: string }>('/quiz-sessions/start', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  static async getSessionByToken(sessionToken: string): Promise<ApiResponse<QuizSession>> {
    return this.request<QuizSession>(`/quiz-sessions/token/${sessionToken}`);
  }

  static async getSession(sessionToken: string): Promise<ApiResponse<QuizSession>> {
    return this.getSessionByToken(sessionToken);
  }

  static async saveAnswers(sessionToken: string, data: { answers: any[] }): Promise<ApiResponse<void>> {
    return this.request<void>(`/quiz-sessions/${sessionToken}/answers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async submitSession(sessionToken: string, data: { answers: any[] }): Promise<ApiResponse<{ finalScore?: number; passed?: boolean; completedAt: string }>> {
    return this.request<{ finalScore?: number; passed?: boolean; completedAt: string }>(`/quiz-sessions/${sessionToken}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getUserSession(userId: number, quizId: number): Promise<ApiResponse<QuizSession>> {
    return this.request<QuizSession>(`/quiz-sessions/user/${userId}/quiz/${quizId}`);
  }

  static async getSessionByEmail(userEmail: string, quizId: number): Promise<ApiResponse<QuizSession>> {
    return this.request<QuizSession>(`/quiz-sessions/email/${userEmail}/quiz/${quizId}`);
  }

  static async pauseSession(sessionToken: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/quiz-sessions/${sessionToken}/pause`, {
      method: 'POST',
    });
  }

  static async resumeSession(sessionToken: string): Promise<ApiResponse<void>> {
    return this.request<void>('/quiz-sessions/resume', {
      method: 'POST',
      body: JSON.stringify({ sessionToken }),
    });
  }

  static async completeSession(sessionToken: string): Promise<ApiResponse<{ finalScore?: number; passed?: boolean; completedAt: string }>> {
    return this.request<{ finalScore?: number; passed?: boolean; completedAt: string }>(`/quiz-sessions/${sessionToken}/complete`, {
      method: 'POST',
    });
  }

  static async updateSessionTime(updateData: UpdateSessionTimeDto): Promise<ApiResponse<void>> {
    return this.request<void>('/quiz-sessions/update-time', {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  }

  static async getActiveSessions(): Promise<ApiResponse<QuizSession[]>> {
    return this.request<QuizSession[]>('/quiz-sessions/active');
  }

  static async getQuizSessions(quizId: number): Promise<ApiResponse<QuizSession[]>> {
    return this.request<QuizSession[]>(`/quiz-sessions/quiz/${quizId}`);
  }

  static async getSessionStatistics(quizId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/quiz-sessions/quiz/${quizId}/statistics`);
  }

  static async cleanupExpiredSessions(): Promise<ApiResponse<{ cleanedUp: number }>> {
    return this.request<{ cleanedUp: number }>('/quiz-sessions/cleanup-expired', {
      method: 'POST',
    });
  }
}

/**
 * Configuration Management API client
 */
export class ConfigAPI extends BaseApiClient {
  static async getConfigs(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Config>>> {
    if (!params) {
      return this.request<PaginatedResponse<Config>>('/config');
    }
    
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<PaginatedResponse<Config>>(`/config${queryString}`);
  }

  static async getConfig(id: number): Promise<ApiResponse<Config>> {
    return this.request<Config>(`/config/${id}`);
  }

  static async getConfigsByGroup(group: string): Promise<ApiResponse<Config[]>> {
    return this.request<Config[]>(`/config/group/${group}`);
  }

  static async getLocationConfigs(): Promise<ApiResponse<Config[]>> {
    return this.request<Config[]>('/config/locations');
  }

  static async getServiceConfigs(): Promise<ApiResponse<Config[]>> {
    return this.request<Config[]>('/config/services');
  }

  static async createConfig(configData: Omit<Config, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<ApiResponse<Config>> {
    return this.request<Config>('/config', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  }

  static async updateConfig(id: number, configData: Partial<Omit<Config, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>): Promise<ApiResponse<Config>> {
    return this.request<Config>(`/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  static async deleteConfig(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/config/${id}`, {
      method: 'DELETE',
    });
  }
}

/**
 * User Quiz Assignment API client (superadmin only)
 */
export class UserQuizAssignmentsAPI extends BaseApiClient {
  static async getAssignments(): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request<PaginatedResponse<any>>('/user-quiz-assignments');
  }

  static async createAssignment(assignmentData: {
    userId: number;
    quizId: number;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request<any>('/user-quiz-assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  static async removeAssignment(assignmentId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/user-quiz-assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  static async getUserQuizzes(userId: number): Promise<ApiResponse<PaginatedResponse<Quiz>>> {
    return this.request<PaginatedResponse<Quiz>>(`/user-quiz-assignments/user/${userId}/quizzes`);
  }

  static async getQuizUsers(quizId: number): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.request<PaginatedResponse<User>>(`/user-quiz-assignments/quiz/${quizId}/users`);
  }

  static async getUserAssignments(userId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/user-quiz-assignments/user/${userId}`);
  }
}

/**
 * User Quiz Assignment API client
 */
export class UserQuizAssignmentAPI extends BaseApiClient {
  static async getAllAssignments(): Promise<ApiResponse<any>> {
    return this.request<any>('/user-quiz-assignments');
  }

  static async getUserQuizzes(userId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/user-quiz-assignments/user/${userId}/quizzes`);
  }

  static async getQuizUsers(quizId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/user-quiz-assignments/quiz/${quizId}/users`);
  }

  static async createAssignment(userId: number, quizId: number): Promise<ApiResponse<any>> {
    return this.request<any>('/user-quiz-assignments', {
      method: 'POST',
      body: JSON.stringify({ userId, quizId, isActive: true }),
    });
  }

  static async removeAssignment(assignmentId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/user-quiz-assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }
}

/**
 * Admin Statistics and Reports API client
 */
export class AdminAPI extends BaseApiClient {
  static async getSchedulerStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/schedule/status');
  }

  static async getSchedulerStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/schedule/stats');
  }

  static async manualCleanup(): Promise<ApiResponse<{ cleanedUp: number }>> {
    return this.request<{ cleanedUp: number }>('/schedule/cleanup/manual', {
      method: 'POST',
    });
  }

  static async emergencyCleanup(): Promise<ApiResponse<{ cleanedUp: number }>> {
    return this.request<{ cleanedUp: number }>('/schedule/cleanup/emergency', {
      method: 'POST',
    });
  }

  // Quiz Results/Attempts Management
  static async getAllAttempts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    serviceKey?: string;
    locationKey?: string;
    quizId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return this.request<any>(`/attempts?${queryParams.toString()}`);
  }

  static async getAttemptById(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/attempts/${id}`);
  }

  static async getAttemptWithAnswers(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/attempts/${id}/view`);
  }

  static async deleteAttempt(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/attempts/${id}`, {
      method: 'DELETE',
    });
  }

  static async exportQuizAttempts(quizId: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/attempts/quiz/${quizId}/export`);
  }
}

/**
 * Public Quiz API client (no authentication required)
 */
export class PublicAPI extends BaseApiClient {
  static async getPublicQuiz(token: string): Promise<ApiResponse<Quiz>> {
    return this.request<Quiz>(`/public/quiz/${token}`);
  }

  static async submitQuiz(token: string, submitData: {
    participantName: string;
    email: string;
    nij: string;
    quizId: number;
    answers: Array<{
      questionId: number;
      answer: string;
    }>;
  }): Promise<ApiResponse<Attempt>> {
    return this.request<Attempt>(`/public/quiz/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify(submitData),
    });
  }

  static async checkQuizSubmission(token: string, checkData: { nij: string; email?: string }): Promise<ApiResponse<any>> {
    return this.request<any>(`/public/quiz/${token}/check`, {
      method: 'POST',
      body: JSON.stringify(checkData),
    });
  }
}

/**
 * Consolidated API client - single entry point for all APIs
 */
export const API = {
  auth: AuthAPI,
  users: UsersAPI,
  quizzes: QuizzesAPI,
  questions: QuestionsAPI,
  attempts: AttemptsAPI,
  sessions: QuizSessionsAPI,
  config: ConfigAPI,
  admin: AdminAPI,
  userQuizAssignments: UserQuizAssignmentsAPI,
  public: PublicAPI,
};

// Legacy compatibility
export const adminAuthAPI = {
  login: AuthAPI.login,
  getProfile: AuthAPI.getProfile,
  refreshToken: AuthAPI.refreshToken,
  changePassword: AuthAPI.changePassword,
  logout: AuthAPI.logout,
  validateSession: async (): Promise<boolean> => {
    try {
      await AuthAPI.getProfile();
      return true;
    } catch {
      return false;
    }
  },
};
