'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Quiz } from '@/types';

// Hook for managing quiz session lifecycle
export function useQuizSession() {
  const session = useSession();
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Check if session is ready for quiz taking
  useEffect(() => {
    const ready = session.sessionToken && 
                  session.sessionStatus && 
                  ['ACTIVE', 'PAUSED'].includes(session.sessionStatus) &&
                  !session.isExpired;
    setIsSessionReady(!!ready);
  }, [session.sessionToken, session.sessionStatus, session.isExpired]);

  // Initialize session for a quiz
  const initializeSession = useCallback(async (quiz: Quiz, userEmail: string) => {
    try {
      setSessionError(null);
      
      // Convert string ID to number for API
      const quizId = parseInt(quiz.id, 10);
      if (isNaN(quizId)) {
        throw new Error('Invalid quiz ID');
      }
      
      await session.startSession(quizId, userEmail);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      setSessionError(errorMessage);
      return false;
    }
  }, [session]);

  // Complete the quiz session
  const completeSession = useCallback(async () => {
    try {
      setSessionError(null);
      await session.completeSession();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete session';
      setSessionError(errorMessage);
      return false;
    }
  }, [session]);

  // Check if quiz has time limit
  const hasTimeLimit = !!session.quiz?.durationMinutes;

  return {
    ...session,
    isSessionReady,
    sessionError,
    hasTimeLimit,
    initializeSession,
    completeSession,
  };
}

// Hook for quiz timer functionality
export function useQuizTimer() {
  const session = useSession();
  const [timeWarnings, setTimeWarnings] = useState<number[]>([]);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  // Handle time expiration
  const handleTimeUp = useCallback(() => {
    setIsTimeExpired(true);
    // Could trigger auto-submit or other actions
  }, []);

  // Handle time warnings
  const handleTimeWarning = useCallback((remainingMinutes: number) => {
    setTimeWarnings(prev => [...prev, remainingMinutes]);
  }, []);

  // Dismiss warning
  const dismissWarning = useCallback((minutesToDismiss?: number) => {
    setTimeWarnings(prev => 
      minutesToDismiss 
        ? prev.filter(min => min !== minutesToDismiss)
        : []
    );
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get time status
  const getTimeStatus = useCallback(() => {
    if (!session.remainingTimeSeconds) return 'no-limit';
    if (session.remainingTimeSeconds === 0 || isTimeExpired) return 'expired';
    if (session.remainingTimeSeconds <= 300) return 'critical'; // 5 minutes
    if (session.remainingTimeSeconds <= 600) return 'warning'; // 10 minutes
    return 'normal';
  }, [session.remainingTimeSeconds, isTimeExpired]);

  // Calculate progress percentage
  const getTimeProgress = useCallback(() => {
    if (!session.quiz?.durationMinutes || !session.remainingTimeSeconds) return null;
    
    const totalSeconds = session.quiz.durationMinutes * 60;
    const elapsed = totalSeconds - session.remainingTimeSeconds;
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
  }, [session.quiz?.durationMinutes, session.remainingTimeSeconds]);

  // Reset timer state
  const resetTimer = useCallback(() => {
    setTimeWarnings([]);
    setIsTimeExpired(false);
  }, []);

  return {
    timeSpent: session.timeSpentSeconds,
    remainingTime: session.remainingTimeSeconds,
    hasTimeLimit: !!session.quiz?.durationMinutes,
    isActive: session.sessionStatus === 'ACTIVE',
    isPaused: session.sessionStatus === 'PAUSED',
    isExpired: isTimeExpired || session.isExpired,
    timeWarnings,
    timeStatus: getTimeStatus(),
    timeProgress: getTimeProgress(),
    formatTime,
    handleTimeUp,
    handleTimeWarning,
    dismissWarning,
    resetTimer,
  };
}

// Hook for auto-saving quiz progress
export function useAutoSave(
  saveFunction: () => Promise<void>,
  interval: number = 30000 // 30 seconds default
) {
  const session = useSession();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (session.sessionStatus !== 'ACTIVE') return;

    try {
      setIsSaving(true);
      setSaveError(null);
      await saveFunction();
      setLastSaved(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Auto-save failed';
      setSaveError(errorMessage);
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [saveFunction, session.sessionStatus]);

  // Set up auto-save interval
  useEffect(() => {
    if (session.sessionStatus === 'ACTIVE') {
      const intervalId = setInterval(performAutoSave, interval);
      return () => clearInterval(intervalId);
    }
  }, [session.sessionStatus, performAutoSave, interval]);

  // Manual save
  const manualSave = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  return {
    lastSaved,
    isSaving,
    saveError,
    manualSave,
  };
}

// Hook for session persistence (handles page refreshes)
export function useSessionPersistence() {
  const session = useSession();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkExistingSession = async () => {
      try {
        if (typeof window !== 'undefined') {
          const savedToken = localStorage.getItem('quiz_session_token');
          if (savedToken && !session.sessionToken) {
            await session.refreshSession();
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    checkExistingSession();
  }, [session]);

  // Save session data before page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (session.sessionStatus === 'ACTIVE' && session.timeSpentSeconds > 0) {
        // Update time spent before leaving
        session.updateTimeSpent(session.timeSpentSeconds);
        
        // Show warning for active sessions
        event.preventDefault();
        event.returnValue = 'Anda sedang dalam sesi quiz. Meninggalkan halaman akan menjeda sesi Anda.';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  return {
    isRestoring,
    hasActiveSession: !!session.sessionToken && session.sessionStatus === 'ACTIVE',
  };
}
