// Base model with standard columns
export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  isActive: boolean;
  status?: string; // Don't use this yet as per request
}

export type Question = {
  id: string;
  order: number;
  questionText: string;
  questionType: 'multiple-choice' | 'multiple-select'; // Support multiple types
  options?: string[]; // For multiple choice questions
  correctAnswer: string; // For multiple choice: option text, for multiple-select: comma-separated option texts
};

export type AttemptAnswer = {
  questionId: string;
  answerText: string;
  selectedOption?: number; // For single multiple choice answers
  selectedOptions?: number[]; // For multiple select answers
};

export type Attempt = {
  id: string;
  quizId: string;
  participantName: string;
  nij: string;
  answers: AttemptAnswer[];
  score: number;
  passed: boolean; // whether the participant passed based on passing score
  submittedAt: string; // ISO
};

export type Quiz = {
  id: string;
  title: string;
  slug?: string;
  linkToken: string;
  isPublished: boolean;
  expiresAt?: string | null; // ISO; null = never expires
  questions: Question[];
  attempts: Attempt[];
  createdBy: string; // dummy admin id/email
  createdAt: string;
  updatedAt: string;
  passingScore: number; // minimum score to pass (out of total questions)
  questionsPerPage: number; // pagination setting
  durationMinutes?: number; // Quiz duration in minutes (null = no time limit)
};

// Admin types with BaseModel
export interface User extends BaseModel {
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
  lastLogin?: string;
}

export interface ConfigItem extends BaseModel {
  group: string;
  key: string;
  value: string;
  description?: string;
  order?: number;
}

// Quiz Session Management Types
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED';

export interface QuizSession {
  id: string;
  sessionToken: string;
  quizId: string;
  userId?: string;
  userEmail: string;
  sessionStatus: SessionStatus;
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  timeSpentSeconds: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface SessionApiResponse {
  success: boolean;
  data?: QuizSession & {
    remainingTimeSeconds?: number;
    isExpired?: boolean;
  };
  message?: string;
  error?: string;
}

export interface StartSessionRequest {
  quizId: number;
  userEmail: string;
}

export interface StartSessionResponse {
  success: boolean;
  data: {
    sessionToken: string;
    expiresAt: string;
    sessionStatus: SessionStatus;
  };
}

export interface SessionStatusResponse {
  success: boolean;
  data: {
    id: number;
    sessionToken: string;
    sessionStatus: SessionStatus;
    timeSpentSeconds: number;
    remainingTimeSeconds: number;
    isExpired: boolean;
    quiz?: {
      id: number;
      title: string;
      durationMinutes?: number;
    };
  };
}

export interface SessionActionResponse {
  success: boolean;
  message: string;
}

// Add more standardized types as needed
export type AdminStats = {
  totalQuizzes: number;
  totalParticipants: number;
  totalAttempts: number;
  averageScore: number;
};

// Re-export API types for compatibility
export * from './api';
