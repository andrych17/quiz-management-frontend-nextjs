'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Clock, Play, Pause, AlertTriangle } from 'lucide-react';

interface QuizTimerProps {
  onTimeUp?: () => void;
  onWarning?: (remainingMinutes: number) => void;
  warningThresholds?: number[]; // Warning thresholds in minutes
  className?: string;
}

export default function QuizTimer({ 
  onTimeUp, 
  onWarning, 
  warningThresholds = [10, 5, 1],
  className = '' 
}: QuizTimerProps) {
  const { 
    sessionStatus, 
    remainingTimeSeconds, 
    timeSpentSeconds,
    isExpired,
    quiz,
    updateTimeSpent,
    pauseSession,
    resumeSession,
    error
  } = useSession();

  const [localTimeSpent, setLocalTimeSpent] = useState(timeSpentSeconds);
  const [warningsSent, setWarningsSent] = useState<Set<number>>(new Set());
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Local timer that increments every second when active
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (sessionStatus === 'ACTIVE' && !isExpired) {
      intervalId = setInterval(() => {
        setLocalTimeSpent(prev => {
          const newTimeSpent = prev + 1;
          
          // Update backend every 30 seconds
          if (newTimeSpent % 30 === 0) {
            updateTimeSpent(newTimeSpent);
          }
          
          return newTimeSpent;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sessionStatus, isExpired, updateTimeSpent]);

  // Sync local time with session context when it updates
  useEffect(() => {
    setLocalTimeSpent(timeSpentSeconds);
  }, [timeSpentSeconds]);

  // Calculate remaining time based on local timer
  const currentRemainingSeconds = remainingTimeSeconds 
    ? Math.max(0, remainingTimeSeconds - (localTimeSpent - timeSpentSeconds))
    : null;

  // Handle time expiration
  useEffect(() => {
    if (currentRemainingSeconds === 0 && sessionStatus === 'ACTIVE' && !isExpired) {
      onTimeUp?.();
    }
  }, [currentRemainingSeconds, sessionStatus, isExpired, onTimeUp]);

  // Handle warnings
  useEffect(() => {
    if (currentRemainingSeconds && sessionStatus === 'ACTIVE' && !isExpired) {
      const remainingMinutes = Math.ceil(currentRemainingSeconds / 60);
      
      warningThresholds.forEach(threshold => {
        if (remainingMinutes <= threshold && !warningsSent.has(threshold)) {
          setWarningsSent(prev => new Set([...prev, threshold]));
          onWarning?.(remainingMinutes);
        }
      });
    }
  }, [currentRemainingSeconds, sessionStatus, isExpired, warningThresholds, warningsSent, onWarning]);

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle pause/resume
  const handlePauseResume = async () => {
    try {
      if (sessionStatus === 'ACTIVE') {
        setIsPausing(true);
        // Update time before pausing
        await updateTimeSpent(localTimeSpent);
        await pauseSession();
      } else if (sessionStatus === 'PAUSED') {
        setIsResuming(true);
        await resumeSession();
      }
    } catch (error) {
      console.error('Failed to pause/resume session:', error);
    } finally {
      setIsPausing(false);
      setIsResuming(false);
    }
  };

  // Don't render if no quiz duration is set
  if (!quiz?.durationMinutes) {
    return null;
  }

  const isActive = sessionStatus === 'ACTIVE';
  const isPaused = sessionStatus === 'PAUSED';
  const isCompleted = sessionStatus === 'COMPLETED';
  
  // Determine timer color based on remaining time
  const getTimerColor = () => {
    if (isExpired || currentRemainingSeconds === 0) return 'text-red-600';
    if (currentRemainingSeconds && currentRemainingSeconds <= 300) return 'text-red-500'; // 5 minutes
    if (currentRemainingSeconds && currentRemainingSeconds <= 600) return 'text-yellow-500'; // 10 minutes
    return 'text-gray-700';
  };

  const getTimerBgColor = () => {
    if (isExpired || currentRemainingSeconds === 0) return 'bg-red-50 border-red-200';
    if (currentRemainingSeconds && currentRemainingSeconds <= 300) return 'bg-red-50 border-red-200';
    if (currentRemainingSeconds && currentRemainingSeconds <= 600) return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border ${getTimerBgColor()} ${className}`}>
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-500" />
        <div className="flex flex-col">
          <div className={`text-lg font-mono font-bold ${getTimerColor()}`}>
            {currentRemainingSeconds !== null ? (
              formatTime(currentRemainingSeconds)
            ) : (
              formatTime(localTimeSpent)
            )}
          </div>
          <div className="text-xs text-gray-500">
            {currentRemainingSeconds !== null ? 'Sisa waktu' : 'Waktu berjalan'}
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {isExpired && (
          <div className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded text-xs">
            <AlertTriangle className="w-3 h-3" />
            Waktu Habis
          </div>
        )}
        
        {isCompleted && (
          <div className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
            ✓ Selesai
          </div>
        )}

        {isPaused && !isExpired && (
          <div className="flex items-center gap-1 text-yellow-600 bg-yellow-100 px-2 py-1 rounded text-xs">
            <Pause className="w-3 h-3" />
            Dijeda
          </div>
        )}

        {isActive && !isExpired && (
          <div className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
            <Play className="w-3 h-3" />
            Aktif
          </div>
        )}
      </div>

      {/* Pause/Resume Button */}
      {!isExpired && !isCompleted && (
        <button
          onClick={handlePauseResume}
          disabled={isPausing || isResuming}
          className={`
            flex items-center gap-1 px-3 py-1 rounded text-sm font-medium
            transition-colors duration-200
            ${isPaused 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isPausing ? (
            <>Menjeda...</>
          ) : isResuming ? (
            <>Melanjutkan...</>
          ) : isPaused ? (
            <>
              <Play className="w-3 h-3" />
              Lanjutkan
            </>
          ) : (
            <>
              <Pause className="w-3 h-3" />
              Jeda
            </>
          )}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

// Warning component for time alerts
export function TimeWarning({ 
  remainingMinutes, 
  onDismiss 
}: { 
  remainingMinutes: number; 
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000); // Auto-dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 bg-orange-500 text-white p-4 rounded-lg shadow-lg animate-bounce">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <div>
          <div className="font-semibold">Peringatan Waktu!</div>
          <div className="text-sm">
            Sisa waktu: {remainingMinutes} menit
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-2 text-white hover:text-orange-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
