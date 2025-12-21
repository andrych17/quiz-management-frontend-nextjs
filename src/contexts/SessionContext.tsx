'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { SessionStatus, SessionStatusResponse, Quiz } from '@/types';
import { sessionAPI } from '@/lib/session-api';

// Quiz info for session (simplified version)
export interface SessionQuizInfo {
  id: number;
  title: string;
  durationMinutes?: number;
}

// Session state interface
export interface SessionState {
  sessionToken: string | null;
  sessionStatus: SessionStatus | null;
  timeSpentSeconds: number;
  remainingTimeSeconds: number | null;
  isExpired: boolean;
  quiz: SessionQuizInfo | null;
  isLoading: boolean;
  error: string | null;
  lastUpdateTime: number;
}

// Session actions
type SessionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION'; payload: SessionStatusResponse['data'] }
  | { type: 'UPDATE_TIME'; payload: { timeSpent: number; remaining: number } }
  | { type: 'SET_STATUS'; payload: SessionStatus }
  | { type: 'CLEAR_SESSION' }
  | { type: 'SET_EXPIRED'; payload: boolean };

// Initial state
const initialState: SessionState = {
  sessionToken: null,
  sessionStatus: null,
  timeSpentSeconds: 0,
  remainingTimeSeconds: null,
  isExpired: false,
  quiz: null,
  isLoading: false,
  error: null,
  lastUpdateTime: Date.now(),
};

// Reducer function
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_SESSION':
      return {
        ...state,
        sessionToken: action.payload.sessionToken,
        sessionStatus: action.payload.sessionStatus,
        timeSpentSeconds: action.payload.timeSpentSeconds,
        remainingTimeSeconds: action.payload.remainingTimeSeconds,
        isExpired: action.payload.isExpired,
        quiz: action.payload.quiz || state.quiz,
        isLoading: false,
        error: null,
        lastUpdateTime: Date.now(),
      };
    
    case 'UPDATE_TIME':
      return {
        ...state,
        timeSpentSeconds: action.payload.timeSpent,
        remainingTimeSeconds: action.payload.remaining,
        lastUpdateTime: Date.now(),
      };
    
    case 'SET_STATUS':
      return { ...state, sessionStatus: action.payload };
    
    case 'SET_EXPIRED':
      return { 
        ...state, 
        isExpired: action.payload, 
        sessionStatus: action.payload ? 'EXPIRED' : state.sessionStatus 
      };
    
    case 'CLEAR_SESSION':
      return { ...initialState, lastUpdateTime: Date.now() };
    
    default:
      return state;
  }
}

// Context interface
export interface SessionContextType extends SessionState {
  startSession: (quizId: number, userEmail: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
  updateTimeSpent: (seconds: number) => Promise<void>;
}

// Create context
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Provider component
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  // Load session token from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('quiz_session_token');
      if (savedToken && !state.sessionToken) {
        // Auto-restore session if token exists
        refreshSessionByToken(savedToken);
      }
    }
  }, []);

  // Save session token to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (state.sessionToken) {
        localStorage.setItem('quiz_session_token', state.sessionToken);
      } else {
        localStorage.removeItem('quiz_session_token');
      }
    }
  }, [state.sessionToken]);

  // Auto-refresh session status every 30 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (state.sessionToken && state.sessionStatus === 'ACTIVE') {
      intervalId = setInterval(() => {
        refreshSession();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.sessionToken, state.sessionStatus]);

  const refreshSessionByToken = async (token: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await sessionAPI.getStatus(token);
      dispatch({ type: 'SET_SESSION', payload: response.data });
    } catch (error) {
      console.error('Failed to refresh session:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore session' });
      // Clear invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('quiz_session_token');
      }
    }
  };

  const startSession = useCallback(async (quizId: number, userEmail: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await sessionAPI.start({ quizId, userEmail });
      
      if (response.success) {
        // Get full session details after starting
        const statusResponse = await sessionAPI.getStatus(response.data.sessionToken);
        dispatch({ type: 'SET_SESSION', payload: statusResponse.data });
      } else {
        throw new Error('Failed to start session');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const pauseSession = useCallback(async () => {
    if (!state.sessionToken) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await sessionAPI.pause(state.sessionToken);
      dispatch({ type: 'SET_STATUS', payload: 'PAUSED' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.sessionToken]);

  const resumeSession = useCallback(async () => {
    if (!state.sessionToken) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await sessionAPI.resume(state.sessionToken);
      dispatch({ type: 'SET_STATUS', payload: 'ACTIVE' });
      // Refresh to get updated time information
      await refreshSession();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.sessionToken]);

  const completeSession = useCallback(async () => {
    if (!state.sessionToken) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await sessionAPI.complete(state.sessionToken);
      dispatch({ type: 'SET_STATUS', payload: 'COMPLETED' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.sessionToken]);

  const refreshSession = useCallback(async () => {
    if (!state.sessionToken) return;

    try {
      const response = await sessionAPI.getStatus(state.sessionToken);
      dispatch({ type: 'SET_SESSION', payload: response.data });
      
      // Check if session expired
      if (response.data.isExpired && !state.isExpired) {
        dispatch({ type: 'SET_EXPIRED', payload: true });
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // Don't set error for background refresh failures
    }
  }, [state.sessionToken, state.isExpired]);

  const updateTimeSpent = useCallback(async (seconds: number) => {
    if (!state.sessionToken) return;

    try {
      await sessionAPI.updateTime(state.sessionToken, seconds);
      // Update local state without full refresh for better UX
      const remaining = state.remainingTimeSeconds ? Math.max(0, state.remainingTimeSeconds - 1) : 0;
      dispatch({ 
        type: 'UPDATE_TIME', 
        payload: { 
          timeSpent: seconds, 
          remaining: remaining 
        } 
      });
    } catch (error) {
      console.error('Failed to update time:', error);
      // Don't throw error for time updates to avoid interrupting quiz
    }
  }, [state.sessionToken, state.remainingTimeSeconds]);

  const clearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION' });
  }, []);

  const contextValue: SessionContextType = {
    ...state,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    refreshSession,
    clearSession,
    updateTimeSpent,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook to use session context
export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
