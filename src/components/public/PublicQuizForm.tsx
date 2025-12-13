"use client";

import { useState, useEffect, useCallback } from "react";
import { publicSubmitSchema, participantInfoSchema } from "@/../lib/schemas";
import { Quiz } from "@/types";
import { useQuizSession, useQuizTimer, useAutoSave, useSessionPersistence } from "@/hooks/useQuizSession";
import QuizTimer, { TimeWarning } from "@/components/ui/QuizTimer";
import { AlertTriangle, Clock, Save, RefreshCw } from "lucide-react";

interface PublicQuizFormProps {
  quiz: Quiz;
}

export default function PublicQuizForm({ quiz }: PublicQuizFormProps) {
  // State management
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>({});
  const [multiSelectAnswers, setMultiSelectAnswers] = useState<{[key: string]: string[]}>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [participantInfo, setParticipantInfo] = useState({ name: "", nij: "", email: "" });
  const [timeWarnings, setTimeWarnings] = useState<number[]>([]);

  // Session management hooks
  const session = useQuizSession();
  const timer = useQuizTimer();
  const { isRestoring, hasActiveSession } = useSessionPersistence();

  // Auto-save functionality
  const { lastSaved, isSaving, saveError, manualSave } = useAutoSave(
    useCallback(async () => {
      // Save current answers to session or localStorage
      if (typeof window !== 'undefined') {
        const saveData = {
          selectedAnswers,
          multiSelectAnswers,
          currentPage,
          participantInfo,
          timestamp: Date.now(),
        };
        localStorage.setItem(`quiz_progress_${quiz.id}`, JSON.stringify(saveData));
      }
    }, [selectedAnswers, multiSelectAnswers, currentPage, participantInfo, quiz.id])
  );

  // Quiz configuration
  const questionsPerPage = quiz.questionsPerPage || 5;
  const totalPages = Math.ceil(quiz.questions.length / questionsPerPage);
  const startIndex = currentPage * questionsPerPage;
  const endIndex = startIndex + questionsPerPage;
  const currentQuestions = quiz.questions.slice(startIndex, endIndex);
  const hasTimeLimit = !!quiz.durationMinutes;

  // Load saved progress on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !isRestoring) {
      const savedProgress = localStorage.getItem(`quiz_progress_${quiz.id}`);
      if (savedProgress) {
        try {
          const data = JSON.parse(savedProgress);
          setSelectedAnswers(data.selectedAnswers || {});
          setMultiSelectAnswers(data.multiSelectAnswers || {});
          setCurrentPage(data.currentPage || 0);
          setParticipantInfo(data.participantInfo || { name: "", nij: "", email: "" });
        } catch (error) {
          console.error('Failed to restore progress:', error);
        }
      }
    }
  }, [quiz.id, isRestoring]);

  // Handle session expiration
  useEffect(() => {
    if (timer.isExpired && session.sessionStatus === 'ACTIVE') {
      handleTimeExpiration();
    }
  }, [timer.isExpired, session.sessionStatus]);

  const handleTimeExpiration = useCallback(async () => {
    try {
      setError("Waktu quiz telah habis. Jawaban Anda akan disimpan secara otomatis.");
      await session.completeSession();
      // Auto-submit when time expires
      handleSubmit(true);
    } catch (error) {
      console.error('Failed to handle time expiration:', error);
    }
  }, [session]);

  const handleTimeWarning = useCallback((remainingMinutes: number) => {
    setTimeWarnings(prev => [...prev, remainingMinutes]);
  }, []);

  const dismissTimeWarning = useCallback((minutes: number) => {
    setTimeWarnings(prev => prev.filter(m => m !== minutes));
  }, []);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleMultiSelectChange = (questionId: string, option: string, checked: boolean) => {
    setMultiSelectAnswers(prev => {
      const currentSelections = prev[questionId] || [];
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentSelections, option]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentSelections.filter(item => item !== option)
        };
      }
    });
  };

  const handleParticipantInfoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const nij = String(form.get("nij") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    
    try {
      // Validate participant info
      participantInfoSchema.parse({ name, nij, email: email || undefined });
      
      setParticipantInfo({ name, nij, email });
      
      // Initialize session if quiz has time limit
      if (hasTimeLimit) {
        const sessionStarted = await session.initializeSession(quiz, email || `${nij}@temp.com`);
        if (!sessionStarted) {
          setError(session.sessionError || "Gagal memulai sesi quiz");
          return;
        }
      }
      
      setCurrentPage(1); // Move to first question page
      setError(null);
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors[0].message);
      } else {
        setError("Gagal memvalidasi data peserta");
      }
    }
  };

  async function handleSubmit(autoSubmit = false) {
    setError(null);
    setLoading(true);
    
    try {
      // Build answers array based on question type
      const answers = quiz.questions.map((q) => {
        if (q.questionType === 'multiple-select') {
          const selectedOptions = multiSelectAnswers[q.id] || [];
          return {
            questionId: q.id,
            answerText: selectedOptions.join(','),
            selectedOptions: selectedOptions.map(option => q.options?.indexOf(option) || 0)
          };
        } else if (q.questionType === 'multiple-choice') {
          return {
            questionId: q.id,
            answerText: selectedAnswers[q.id] || "",
            selectedOption: selectedAnswers[q.id] ? q.options?.indexOf(selectedAnswers[q.id]) : undefined
          };
        } else {
          return {
            questionId: q.id,
            answerText: selectedAnswers[q.id] || ""
          };
        }
      });

      // Validate submission
      publicSubmitSchema.parse({ 
        name: participantInfo.name, 
        nij: participantInfo.nij, 
        answers 
      });

      // Complete session if active
      if (session.sessionStatus === 'ACTIVE') {
        await session.completeSession();
      }

      // TODO: Submit to backend API
      console.warn('⚠️ Mock data removed - connect to real backend API');
      
      // Simulate success for now
      const result = {
        success: false,
        message: 'Backend API not connected. Please configure real backend endpoint.'
      };

      setSubmitted(true);
      setMessage(autoSubmit ? 
        `${result.message} (Waktu habis - jawaban disimpan otomatis)` : 
        result.message
      );
      
      // Clear saved progress
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`quiz_progress_${quiz.id}`);
      }
      
      setSelectedAnswers({});
      setMultiSelectAnswers({});
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Submit failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Loading state for session restoration
  if (isRestoring) {
    return (
      <div className="mt-6 flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Memuat sesi quiz...</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-green-500 text-4xl mb-4">✓</div>
        <h2 className="text-lg font-semibold text-green-800 mb-2">Test Selesai!</h2>
        <p className="text-green-700 mb-4">{message}</p>
        {timer.timeSpent > 0 && (
          <p className="text-sm text-gray-600 mb-2">
            Waktu pengerjaan: {timer.formatTime(timer.timeSpent)}
          </p>
        )}
        <p className="text-sm text-gray-600">
          Hasil test akan diumumkan kemudian. Silakan tutup halaman ini.
        </p>
      </div>
    );
  }

  // Participant information form (page 0)
  if (currentPage === 0) {
    return (
      <div className="space-y-6 mt-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 font-medium mb-2">Petunjuk Pengerjaan:</p>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Isi data diri dengan lengkap dan benar</li>
            <li>• Bacalah setiap soal dengan teliti</li>
            <li>• Untuk soal pilihan ganda tunggal, pilih satu jawaban yang paling tepat</li>
            <li>• Untuk soal pilihan ganda jamak, pilih semua jawaban yang benar</li>
            <li>• Pastikan semua soal telah dijawab sebelum menyelesaikan test</li>
            {hasTimeLimit && (
              <>
                <li>• Test memiliki batas waktu {quiz.durationMinutes} menit</li>
                <li>• Sesi dapat dijeda dan dilanjutkan kembali</li>
                <li>• Jawaban akan disimpan otomatis secara berkala</li>
              </>
            )}
            <li>• Test hanya dapat dikerjakan satu kali</li>
          </ul>
        </div>

        <form onSubmit={handleParticipantInfoSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={participantInfo.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan nama lengkap Anda"
            />
          </div>

          <div>
            <label htmlFor="nij" className="block text-sm font-medium text-gray-700 mb-2">
              NIJ (Nomor Induk Jilid) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nij"
              name="nij"
              required
              defaultValue={participantInfo.nij}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan NIJ Anda"
            />
          </div>

          {hasTimeLimit && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email {hasTimeLimit && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required={hasTimeLimit}
                defaultValue={participantInfo.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan email Anda"
              />
              <p className="text-xs text-gray-500 mt-1">
                Diperlukan untuk sesi quiz dengan batas waktu
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Memulai..." : `Mulai Test${hasTimeLimit ? ` (${quiz.durationMinutes} menit)` : ''}`}
          </button>
        </form>

        {hasActiveSession && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Sesi Aktif Ditemukan</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Anda memiliki sesi quiz yang sedang berjalan. Melanjutkan akan memulihkan progress Anda.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Check if current page has all required answers
  const isLastPage = currentPage === totalPages;
  const canProceed = currentQuestions.every(q => {
    if (q.questionType === 'multiple-select') {
      return multiSelectAnswers[q.id]?.length > 0;
    }
    return selectedAnswers[q.id]?.trim() !== '' && selectedAnswers[q.id] !== undefined;
  });

  // Test questions (pages 1+)
  return (
    <div className="space-y-6 mt-6">
      {/* Timer Display */}
      {hasTimeLimit && (
        <QuizTimer
          onTimeUp={handleTimeExpiration}
          onWarning={handleTimeWarning}
          className="sticky top-0 z-10 bg-white shadow-sm"
        />
      )}

      {/* Time Warnings */}
      {timeWarnings.map(minutes => (
        <TimeWarning
          key={minutes}
          remainingMinutes={minutes}
          onDismiss={() => dismissTimeWarning(minutes)}
        />
      ))}

      {/* Session Status */}
      {session.sessionStatus && (
        <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
          <div>
            Peserta: <strong>{participantInfo.name}</strong> (NIJ: {participantInfo.nij})
          </div>
          <div className="flex items-center gap-4">
            <span>
              Halaman {currentPage} dari {totalPages} • Soal {startIndex + 1}-{Math.min(endIndex, quiz.questions.length)} dari {quiz.questions.length}
            </span>
            {isSaving && (
              <div className="flex items-center gap-1 text-blue-600">
                <Save className="w-3 h-3 animate-pulse" />
                <span className="text-xs">Menyimpan...</span>
              </div>
            )}
            {lastSaved && (
              <div className="text-xs text-gray-500">
                Tersimpan: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {currentQuestions.map((q) => (
          <div key={q.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="font-medium text-gray-800 mb-4">
              {q.order}. {q.questionText}
              {q.questionType === 'multiple-select' && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Pilih semua yang benar
                </span>
              )}
            </h3>
            
            {q.questionType === 'multiple-choice' && q.options ? (
              <div className="space-y-3">
                {q.options.map((option, index) => (
                  <label key={index} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={option}
                      checked={selectedAnswers[q.id] === option}
                      onChange={() => handleAnswerChange(q.id, option)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      disabled={session.sessionStatus === 'PAUSED' || timer.isExpired}
                    />
                    <span className="text-gray-700 text-sm">{String.fromCharCode(65 + index)}. {option}</span>
                  </label>
                ))}
              </div>
            ) : q.questionType === 'multiple-select' && q.options ? (
              <div className="space-y-3">
                {q.options.map((option, index) => (
                  <label key={index} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      value={option}
                      checked={(multiSelectAnswers[q.id] || []).includes(option)}
                      onChange={(e) => handleMultiSelectChange(q.id, option, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                      disabled={session.sessionStatus === 'PAUSED' || timer.isExpired}
                    />
                    <span className="text-gray-700 text-sm">{String.fromCharCode(65 + index)}. {option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea 
                name={`q_${q.id}`}
                value={selectedAnswers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Ketik jawaban Anda..."
                rows={3}
                disabled={session.sessionStatus === 'PAUSED' || timer.isExpired}
              />
            )}
          </div>
        ))}
      </div>

      {(error || saveError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error || saveError}</p>
        </div>
      )}
      
      <div className="flex justify-between items-center pt-4">
        <div className="flex gap-3">
          {currentPage > 1 && (
            <button
              type="button"
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={session.sessionStatus === 'PAUSED' || timer.isExpired}
            >
              « Sebelumnya
            </button>
          )}
          
          {hasTimeLimit && (
            <button
              type="button"
              onClick={manualSave}
              disabled={isSaving}
              className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-1" />
              {isSaving ? "Menyimpan..." : "Simpan Progress"}
            </button>
          )}
        </div>
        
        <div className="flex gap-3">
          {!isLastPage && (
            <button
              type="button"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!canProceed || session.sessionStatus === 'PAUSED' || timer.isExpired}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya »
            </button>
          )}
          
          {isLastPage && (
            <button 
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || !canProceed || session.sessionStatus === 'PAUSED'}
              className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Menyimpan..." : timer.isExpired ? "Waktu Habis - Submit" : "Selesaikan Test"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
