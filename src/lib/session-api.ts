import { 
  StartSessionRequest, 
  StartSessionResponse, 
  SessionStatusResponse, 
  SessionActionResponse 
} from '@/types';
import { API_BASE_URL } from './constants/api';

// API client for quiz session management
export class QuizSessionAPI {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Start a new quiz session
   */
  static async startSession(request: StartSessionRequest): Promise<StartSessionResponse> {
    return QuizSessionAPI.request<StartSessionResponse>('/quiz-sessions/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Resume a paused session
   */
  static async resumeSession(sessionToken: string): Promise<SessionActionResponse> {
    return QuizSessionAPI.request<SessionActionResponse>('/quiz-sessions/resume', {
      method: 'POST',
      body: JSON.stringify({ sessionToken }),
    });
  }

  /**
   * Pause an active session
   */
  static async pauseSession(sessionToken: string): Promise<SessionActionResponse> {
    return QuizSessionAPI.request<SessionActionResponse>(`/quiz-sessions/${sessionToken}/pause`, {
      method: 'POST',
    });
  }

  /**
   * Complete a session
   */
  static async completeSession(sessionToken: string): Promise<SessionActionResponse> {
    return QuizSessionAPI.request<SessionActionResponse>(`/quiz-sessions/${sessionToken}/complete`, {
      method: 'POST',
    });
  }

  /**
   * Update session time spent
   */
  static async updateSessionTime(
    sessionToken: string, 
    timeSpentSeconds: number
  ): Promise<SessionActionResponse> {
    return QuizSessionAPI.request<SessionActionResponse>('/quiz-sessions/update-time', {
      method: 'POST',
      body: JSON.stringify({ sessionToken, timeSpentSeconds }),
    });
  }

  /**
   * Get session status by token
   */
  static async getSessionStatus(sessionToken: string): Promise<SessionStatusResponse> {
    return QuizSessionAPI.request<SessionStatusResponse>(`/quiz-sessions/token/${sessionToken}`);
  }

  /**
   * Get user session for a specific quiz
   */
  static async getUserSession(
    userEmail: string, 
    quizId: number
  ): Promise<SessionStatusResponse> {
    return QuizSessionAPI.request<SessionStatusResponse>(`/quiz-sessions/email/${encodeURIComponent(userEmail)}/quiz/${quizId}`);
  }
}

// Convenience functions for easier usage
export const sessionAPI = {
  start: QuizSessionAPI.startSession,
  resume: QuizSessionAPI.resumeSession,
  pause: QuizSessionAPI.pauseSession,
  complete: QuizSessionAPI.completeSession,
  updateTime: QuizSessionAPI.updateSessionTime,
  getStatus: QuizSessionAPI.getSessionStatus,
  getUserSession: QuizSessionAPI.getUserSession,
};
