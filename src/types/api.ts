// Standardized API response types based on backend documentation

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponseMetadata {
  duration?: number;
  pagination?: PaginationMeta;
  total?: number;
  count?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  metadata?: ApiResponseMetadata;
  errors?: ValidationError[];
  timestamp: string;
  statusCode: number;
  path?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// Authentication response types
export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'user';
  createdAt: string;
  updatedAt?: string;
  locationKey?: string;
  serviceKey?: string;
  isActive?: boolean;
  location?: {
    key: string;
    value: string;
  };
  service?: {
    key: string;
    value: string;
  };
}

// User Quiz Assignment types
export interface UserQuizAssignment {
  id: number;
  userId: number;
  quizId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  user?: User;
  quiz?: Quiz;
}

// Quiz related types
export interface Quiz {
  id: number;
  title: string;
  description?: string;
  slug: string;
  token: string;
  serviceType?: string;
  quizType?: 'scheduled' | 'manual';
  locationKey?: string;
  location?: {
    id: number;
    key: string;
    value: string;
  };
  serviceKey?: string;
  service?: {
    id: number;
    key: string;
    value: string;
  };
  isPublished: boolean;
  isActive?: boolean;
  passingScore?: number;
  questionsPerPage?: number;
  durationMinutes?: number;
  startDateTime?: string;
  endDateTime?: string;
  quizLink?: string;
  normalUrl?: string;
  shortUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  images?: QuizImage[];
  scoringTemplates?: QuizScoring[];
  questions?: Question[];
}

export interface QuizImage {
  id: number;
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

export interface Question {
  id: number;
  quizId: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  order: number;
  createdAt: string;
}

export interface Attempt {
  id: number;
  quizId: number;
  userId?: number;
  userEmail: string;
  score?: number;
  passed?: boolean;
  startedAt: string;
  submittedAt?: string;
  timeSpent?: number;
}

export interface AttemptAnswer {
  id: number;
  attemptId: number;
  questionId: number;
  answer: string;
  isCorrect?: boolean;
  points?: number;
  submittedAt: string;
}

// Session management types
export interface QuizSession {
  id: number;
  sessionToken: string;
  quizId: number;
  userId?: number;
  userEmail: string;
  sessionStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED';
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  timeSpentSeconds: number;
  remainingTimeSeconds?: number;
  isExpired?: boolean;
  metadata?: Record<string, any>;
}

// Configuration types
export interface Config {
  id: number;
  group: string;
  key: string;
  value: string;
  description?: string;
  order?: number;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public errors?: ValidationError[],
    public statusCode?: number,
    public path?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request parameter types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UserFilterParams extends PaginationParams {
  name?: string;
  email?: string;
  role?: string;
  locationId?: string | number;
  serviceId?: string | number;
  location?: string;
  service?: string;
  isActive?: string | boolean;
}

export interface CreateQuizDto {
  title: string;
  description?: string;
  serviceType?: string;
  passingScore?: number;
  questionsPerPage?: number;
  durationMinutes?: number;
  startDateTime?: string;
  endDateTime?: string;
}

export interface UpdateQuizDto extends Partial<CreateQuizDto> {
  isPublished?: boolean;
}

export interface CreateQuestionDto {
  quizId: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  order?: number;
}

export interface StartQuizSessionDto {
  quizId: number;
  userEmail: string;
}

export interface UpdateSessionTimeDto {
  sessionToken: string;
  timeSpentSeconds: number;
}
