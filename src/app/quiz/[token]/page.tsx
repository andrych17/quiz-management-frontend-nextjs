'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API } from '@/lib/api-client';
import { Quiz, Question, ApiError } from '@/types/api';
import { getAbsoluteImageUrl } from '@/lib/constants/api';

export default function PublicQuizPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [services, setServices] = useState<Array<{ key: string; value: string; description?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: '',
    nij: '',
    servoNumber: '',
    serviceKey: ''
  });
  const [currentAnswers, setCurrentAnswers] = useState<{[key: number]: string | string[]}>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [startDateTime, setStartDateTime] = useState<string | null>(null);
  const [endDateTime, setEndDateTime] = useState<string | null>(null);
  const [showStartWarning, setShowStartWarning] = useState(false);
  const [isResumingQuiz, setIsResumingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [participantDataLoading, setParticipantDataLoading] = useState(false);
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{url: string; alt: string} | null>(null);

  useEffect(() => {
    if (token) {
      loadQuiz();
      loadServices();
    }
  }, [token]);

  // Check localStorage and call API resume to validate attempt
  useEffect(() => {
    if (!quiz) return;

    const checkResumeQuiz = async () => {
      const storageKey = `quiz_attempt_${quiz.id}`;
      const savedAttempt = localStorage.getItem(storageKey);

      if (savedAttempt) {
        try {
          const attemptData = JSON.parse(savedAttempt);

          // Call API to validate and get latest attempt data
          console.log('🔍 Checking resume quiz with API...');
          const response = await API.public.resumeQuiz(token, {
            email: attemptData.email,
            nij: attemptData.nij
          });

          if (response.success && response.data) {
            const apiData = response.data;

            // Check if already submitted
            if (apiData.alreadySubmitted) {
              localStorage.removeItem(storageKey);
              setError('Quiz sudah di-submit sebelumnya. Anda tidak dapat mengerjakan quiz ini lagi.');
              setQuizCompleted(true);
              return;
            }

            // Check if time expired
            if (apiData.timeExpired) {
              localStorage.removeItem(storageKey);
              setError('Waktu pengerjaan quiz telah habis. Silakan hubungi administrator.');
              return;
            }

            // Resume quiz with validated data from API
            const now = new Date();
            const end = new Date(apiData.endDateTime);

            if (now > end) {
              // Double check - time expired
              localStorage.removeItem(storageKey);
              setError('Waktu pengerjaan quiz telah habis. Silakan hubungi administrator.');
              return;
            }

            console.log('✅ Quiz can be resumed - restoring state...');
            setIsResumingQuiz(true);
            setParticipantInfo({
              name: apiData.participantName,
              email: apiData.email,
              nij: apiData.nij,
              servoNumber: apiData.servoNumber || '',
              serviceKey: apiData.serviceKey || ''
            });
            setAttemptId(apiData.attemptId);
            setStartDateTime(apiData.startDateTime);
            setEndDateTime(apiData.endDateTime);

            // Restore answers: merge API data with localStorage (localStorage has priority)
            const answersMap: {[key: number]: string | string[]} = {};

            // First, load answers from API (from database)
            if (apiData.answers && Array.isArray(apiData.answers)) {
              apiData.answers.forEach((ans: any) => {
                answersMap[ans.questionId] = ans.answer;
              });
            }

            // Then, merge with localStorage answers (localStorage is more recent)
            if (attemptData.answers && typeof attemptData.answers === 'object') {
              Object.entries(attemptData.answers).forEach(([questionId, answer]) => {
                answersMap[parseInt(questionId)] = answer as string | string[];
              });
            }

            setCurrentAnswers(answersMap);

            // Restore current page from localStorage
            setCurrentQuestionIndex(attemptData.currentPage || 0);
            setShowQuiz(true);

            // Calculate remaining time
            const remainingMs = end.getTime() - now.getTime();
            setTimeLeft(Math.floor(remainingMs / 1000));

            console.log('✅ Quiz resumed successfully with timer countdown');
          } else {
            // No active attempt found or error - clear localStorage
            console.log('ℹ️ No active attempt found');
            localStorage.removeItem(storageKey);
          }
        } catch (error: any) {
          console.error('Failed to check resume quiz:', error);
          // On API error, clear localStorage and let user start fresh
          localStorage.removeItem(storageKey);
        }
      }
    };

    checkResumeQuiz();
  }, [quiz, token]);

  // Timer countdown based on endDateTime
  useEffect(() => {
    if (endDateTime && showQuiz) {
      const timer = setInterval(() => {
        const now = new Date();
        const end = new Date(endDateTime);
        const remainingMs = end.getTime() - now.getTime();
        const remainingSecs = Math.floor(remainingMs / 1000);

        if (remainingSecs <= 0) {
          setTimeLeft(0);
          clearInterval(timer);
          // Time's up - auto submit
          handleSubmitQuiz(true);
        } else {
          setTimeLeft(remainingSecs);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [endDateTime, showQuiz]);

  // Auto-save to localStorage every few seconds
  useEffect(() => {
    if (showQuiz && quiz && !isResumingQuiz) {
      const interval = setInterval(() => {
        saveToLocalStorage();
      }, 5000); // Save every 5 seconds
      return () => clearInterval(interval);
    }
  }, [showQuiz, quiz, currentAnswers, currentQuestionIndex, isResumingQuiz]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.public.getPublicQuiz(token);

      if (response.success && response.data) {
        // The API returns the quiz directly in data with questions as a property
        setQuiz(response.data);
        
        // Use actual questions from API
        const quizQuestions = response.data.questions || [];
        
        setQuestions(quizQuestions);
      } else {
        const errorMsg = response?.message || 'Quiz not found or not published';
        setError(errorMsg);
        console.error('Quiz load failed:', { 
          success: response?.success, 
          message: response?.message,
          data: response?.data 
        });
      }

    } catch (err: any) {
      console.error('Failed to load quiz:', err);
      setError(err?.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await API.public.getServices();
      if (response.success && response.data) {
        setServices(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load services:', err);
      // Don't set error - services is optional
    }
  };

  const saveToLocalStorage = () => {
    if (!quiz || !attemptId) return;

    const storageKey = `quiz_attempt_${quiz.id}`;
    const attemptData = {
      attemptId,
      quizId: quiz.id,
      participantName: participantInfo.name,
      email: participantInfo.email,
      nij: participantInfo.nij,
      servoNumber: participantInfo.servoNumber,
      serviceKey: participantInfo.serviceKey,
      startDateTime,
      endDateTime,
      answers: currentAnswers,
      currentPage: currentQuestionIndex,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(attemptData));
  };

  const handleStartQuiz = async () => {
    // Validate form first
    if (!validateForm()) {
      setError('Mohon perbaiki data yang tidak valid');
      return;
    }

    // Show warning modal before starting
    setShowStartWarning(true);
  };

  const confirmStartQuiz = async () => {
    setShowStartWarning(false);
    setIsStarting(true);
    setError(null);
    setValidationErrors({});
    
    try {
      if (!quiz) {
        setError('Quiz not found');
        setIsStarting(false);
        return;
      }

      // Call backend API to start/resume quiz
      const response = await API.public.submitQuiz(token, {
        nij: participantInfo.nij,
        email: participantInfo.email,
        participantName: participantInfo.name,
        servoNumber: participantInfo.servoNumber || undefined,
        serviceKey: participantInfo.serviceKey,
        quizId: quiz.id,
        answers: [] // Empty array to indicate start, not submit
      });

      if (!response.success) {
        setError(response.message || 'Gagal memulai quiz');
        setIsStarting(false);
        return;
      }

      const attemptData = response.data;
      
      if (!attemptData) {
        setError('Invalid response from server');
        setIsStarting(false);
        return;
      }
      
      // Save to state
      setAttemptId(attemptData.id);
      setStartDateTime(attemptData.startDateTime || null);
      setEndDateTime(attemptData.endDateTime || null);
      setQuizStartTime(new Date(attemptData.startDateTime || new Date()));

      // If resuming, load existing answers
      if (attemptData.answers && attemptData.answers.length > 0) {
        const answersMap: {[key: number]: string | string[]} = {};
        attemptData.answers.forEach((ans: any) => {
          answersMap[ans.questionId] = ans.answer;
        });
        setCurrentAnswers(answersMap);
      }

      // Calculate remaining time
      const now = new Date();
      const end = new Date(attemptData.endDateTime || now);
      const remainingMs = end.getTime() - now.getTime();
      setTimeLeft(Math.floor(remainingMs / 1000));

      // Save to localStorage
      const storageKey = `quiz_attempt_${quiz.id}`;
      const localData = {
        attemptId: attemptData.id,
        quizId: quiz.id,
        participantName: participantInfo.name,
        email: participantInfo.email,
        nij: participantInfo.nij,
        servoNumber: participantInfo.servoNumber,
        serviceKey: participantInfo.serviceKey,
        startDateTime: attemptData.startDateTime || new Date().toISOString(),
        endDateTime: attemptData.endDateTime || new Date().toISOString(),
        answers: {},
        currentPage: 0,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(localData));

      setShowQuiz(true);
    } catch (err: any) {
      console.error('Failed to start quiz:', err);
      setError(err?.message || 'Gagal memulai quiz');
    } finally {
      setIsStarting(false);
    }
  };

  const saveAnswersAsync = async () => {
    if (!attemptId || Object.keys(currentAnswers).length === 0) return;

    try {
      const answersArray = Object.entries(currentAnswers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: Array.isArray(answer) ? answer.join(',') : (answer as string)
      }));
      
      if (!quiz) return;
      
      await API.public.submitQuiz(token, {
        nij: participantInfo.nij,
        email: participantInfo.email,
        participantName: participantInfo.name,
        servoNumber: participantInfo.servoNumber || undefined,
        serviceKey: participantInfo.serviceKey,
        quizId: quiz.id,
        answers: answersArray
      });
    } catch (err: any) {
      console.error('Failed to auto-save answers:', err);
      // Don't show error to user for auto-save failures
    }
  };

  const handleAnswerChange = (questionId: number, answer: string | string[]) => {
    setCurrentAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };
      
      // Save to localStorage immediately when answer changes
      if (quiz) {
        const storageKey = `quiz_attempt_${quiz.id}`;
        const savedAttempt = localStorage.getItem(storageKey);
        if (savedAttempt) {
          const attemptData = JSON.parse(savedAttempt);
          attemptData.answers = newAnswers;
          attemptData.lastUpdated = new Date().toISOString();
          localStorage.setItem(storageKey, JSON.stringify(attemptData));
        }
      }

      return newAnswers;
    });
  };

  const handleMultipleAnswerChange = (questionId: number, optionValue: string, isChecked: boolean) => {
    setCurrentAnswers(prev => {
      const currentAnswer = prev[questionId] as string[] || [];
      let newAnswer: string[];
      
      if (isChecked) {
        newAnswer = [...currentAnswer, optionValue];
      } else {
        newAnswer = currentAnswer.filter(item => item !== optionValue);
      }
      
      return {
        ...prev,
        [questionId]: newAnswer
      };
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      
      // Save current page to localStorage
      if (quiz) {
        const storageKey = `quiz_attempt_${quiz.id}`;
        const savedAttempt = localStorage.getItem(storageKey);
        if (savedAttempt) {
          const attemptData = JSON.parse(savedAttempt);
          attemptData.currentPage = newIndex;
          attemptData.lastUpdated = new Date().toISOString();
          localStorage.setItem(storageKey, JSON.stringify(attemptData));
        }
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      
      // Save current page to localStorage
      if (quiz) {
        const storageKey = `quiz_attempt_${quiz.id}`;
        const savedAttempt = localStorage.getItem(storageKey);
        if (savedAttempt) {
          const attemptData = JSON.parse(savedAttempt);
          attemptData.currentPage = newIndex;
          attemptData.lastUpdated = new Date().toISOString();
          localStorage.setItem(storageKey, JSON.stringify(attemptData));
        }
      }
    }
  };

  // Validation functions
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return 'Email harus diisi';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Format email tidak valid';
    return null;
  };

  const validateNIJ = (nij: string): string | null => {
    if (!nij.trim()) return 'NIJ harus diisi';
    if (nij.length < 3) return 'NIJ minimal 3 karakter';
    return null;
  };

  const validateName = (name: string): string | null => {
    if (!name.trim()) return 'Nama lengkap harus diisi';
    if (name.length < 2) return 'Nama minimal 2 karakter';
    return null;
  };

  const validateServiceKey = (serviceKey: string): string | null => {
    if (!serviceKey.trim()) return 'Jenis pelayanan harus dipilih';
    return null;
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    const nijError = validateNIJ(participantInfo.nij);
    if (nijError) errors.nij = nijError;
    
    const emailError = validateEmail(participantInfo.email);
    if (emailError) errors.email = emailError;
    
    const nameError = validateName(participantInfo.name);
    if (nameError) errors.name = nameError;
    
    const serviceKeyError = validateServiceKey(participantInfo.serviceKey);
    if (serviceKeyError) errors.serviceKey = serviceKeyError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to check if participant already submitted (using API and localStorage)
  const checkParticipantSubmission = async (nij: string, email?: string): Promise<boolean> => {
    if (!nij || nij.length < 3) return false;
    
    setParticipantDataLoading(true);
    try {
      // Check via API with NIJ (and email if provided)
      try {
        const checkData = email ? { nij, email } : { nij };
        const checkResponse = await API.public.checkQuizSubmission(token, checkData);
        
        if (checkResponse.success && checkResponse.data.hasSubmitted) {
          setHasSubmittedBefore(true);
          setError('Anda sudah pernah mengerjakan quiz ini. Setiap peserta hanya dapat mengerjakan quiz sekali.');
          return true; // Already submitted
        }
        
        // If participant exists in API response but hasn't submitted, auto-fill the form
        if (checkResponse.success && checkResponse.data.submission && !checkResponse.data.hasSubmitted) {
          const participantData = checkResponse.data.submission;
          setParticipantInfo(prev => ({
            ...prev,
            name: participantData.participantName || prev.name,
            email: participantData.email || prev.email
          }));
        }
      } catch (apiErr: any) {

      }
      
      // Check localStorage for submission history
      const submissionKey = `quiz_${token}_${nij}`;
      const hasSubmitted = localStorage.getItem(submissionKey);
      
      if (hasSubmitted) {
        setHasSubmittedBefore(true);
        setError('Anda sudah pernah mengerjakan quiz ini. Hanya diperbolehkan satu kali pengerjaan.');
        return true; // Already submitted
      } else {
        setHasSubmittedBefore(false);
        if (!email) setError(null); // Only clear error if not from start quiz flow
        return false; // Not submitted
      }
    } catch (err: any) {
      setHasSubmittedBefore(false);
      return false; // Assume not submitted on error
    } finally {
      setParticipantDataLoading(false);
    }
  };

  const handleSubmitQuiz = async (isAutoSubmit: boolean = false) => {
    // Allow submission even if not all questions are answered
    // The confirm dialog will show how many questions are unanswered
    /* Removed strict validation - users can submit with unanswered questions
    if (!isAutoSubmit) {
      const unansweredQuestions: number[] = [];
      questions.forEach((question) => {
        const answer = currentAnswers[question.id];
        const hasAnswer = Array.isArray(answer) 
          ? answer.length > 0 
          : answer?.toString().trim().length > 0;
        
        if (!hasAnswer) {
          unansweredQuestions.push(question.id);
        }
      });
      
      if (unansweredQuestions.length > 0) {
        setError(`Mohon jawab semua pertanyaan. ${unansweredQuestions.length} pertanyaan belum dijawab.`);
        setShowConfirmSubmit(false);
        return;
      }
    }
    */
    
    setIsSubmitting(true);
    try {
      // Final submit with all answers
      const answersArray = Object.entries(currentAnswers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: Array.isArray(answer) ? answer.join(',') : (answer as string)
      }));
      
      if (!quiz) {
        setError('Quiz not found');
        return;
      }
      
      const response = await API.public.submitQuiz(token, {
        nij: participantInfo.nij,
        email: participantInfo.email,
        participantName: participantInfo.name,
        servoNumber: participantInfo.servoNumber || undefined,
        serviceKey: participantInfo.serviceKey,
        quizId: quiz.id,
        answers: answersArray
      });

      if (response.success) {
        // Clear localStorage for this quiz attempt
        if (quiz) {
          const storageKey = `quiz_attempt_${quiz.id}`;
          localStorage.removeItem(storageKey);
        }

        // Save submission to localStorage to prevent duplicate attempts
        const submissionKey = `quiz_${token}_${participantInfo.nij}`;
        localStorage.setItem(submissionKey, 'true');
        
        // Show completion page
        const message = isAutoSubmit 
          ? `Waktu habis! Quiz telah di-submit otomatis. ${answeredCount} dari ${questions.length} pertanyaan terjawab.`
          : `Anda telah menyelesaikan quiz. ${answeredCount} dari ${questions.length} pertanyaan terjawab.`;
        
        setCompletionMessage(message);
        setQuizCompleted(true);
        setShowQuiz(false);
        setError(null);
      } else {
        setError('Gagal mengirim jawaban. Silakan coba lagi.');
      }
    } catch (err: any) {
      console.error('Submit failed:', err);
      setError('Gagal mengirim jawaban. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">⚠️ {error || 'Quiz not found'}</p>
          <p className="text-gray-600">Silakan hubungi administrator untuk mendapatkan link quiz yang valid.</p>
        </div>
      </div>
    );
  }

  // Show completion page if quiz is completed
  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Selesai!</h2>
            <p className="text-gray-600 mb-4">{completionMessage}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
              <p className="text-blue-900"><strong>Nama:</strong> {participantInfo.name}</p>
              <p className="text-blue-900"><strong>NIJ:</strong> {participantInfo.nij}</p>
              <p className="text-blue-900"><strong>Email:</strong> {participantInfo.email}</p>
              {participantInfo.serviceKey && (
                <p className="text-blue-900"><strong>Jenis Pelayanan:</strong> {services.find(s => s.key === participantInfo.serviceKey)?.value || participantInfo.serviceKey}</p>
              )}
              {participantInfo.servoNumber && (
                <p className="text-blue-900"><strong>Servo Number:</strong> {participantInfo.servoNumber}</p>
              )}
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              ✅ Jawaban Anda telah berhasil dikirim.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Hasil quiz akan diumumkan kemudian. Terima kasih atas partisipasi Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show participant info form if quiz not started
  if (!showQuiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
            <p className="text-gray-600">{quiz.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>⏱️ Waktu: {quiz.durationMinutes || 60} menit</p>
              <p>📝 Jumlah pertanyaan: {questions.length}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIJ *
              </label>
              <input
                type="text"
                value={participantInfo.nij}
                onChange={(e) => {
                  setParticipantInfo(prev => ({...prev, nij: e.target.value}));
                  // Clear validation error when user types
                  if (validationErrors.nij) {
                    setValidationErrors(prev => ({...prev, nij: ''}));
                  }
                  // Clear previous submission check
                  if (hasSubmittedBefore) {
                    setHasSubmittedBefore(false);
                    setError(null);
                  }
                }}
                onBlur={() => {
                  const error = validateNIJ(participantInfo.nij);
                  if (error) {
                    setValidationErrors(prev => ({...prev, nij: error}));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.nij 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Masukkan NIJ Anda"
                required
              />
              {validationErrors.nij && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.nij}</p>
              )}
              {participantDataLoading && (
                <p className="text-blue-500 text-sm mt-1">Memeriksa data peserta...</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={participantInfo.email}
                onChange={(e) => {
                  setParticipantInfo(prev => ({...prev, email: e.target.value}));
                  // Clear validation error when user types
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({...prev, email: ''}));
                  }
                }}
                onBlur={() => {
                  const error = validateEmail(participantInfo.email);
                  if (error) {
                    setValidationErrors(prev => ({...prev, email: error}));
                  }
                }}
                className={`w-full px-3 py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.email 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Masukkan email Anda"
                required
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={participantInfo.name}
                onChange={(e) => {
                  setParticipantInfo(prev => ({...prev, name: e.target.value}));
                  // Clear validation error when user types
                  if (validationErrors.name) {
                    setValidationErrors(prev => ({...prev, name: ''}));
                  }
                }}
                onBlur={() => {
                  const error = validateName(participantInfo.name);
                  if (error) {
                    setValidationErrors(prev => ({...prev, name: error}));
                  }
                }}
                className={`w-full px-3 py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.name 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Masukkan nama lengkap Anda"
                required
              />
              {validationErrors.name && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Jenis Pelayanan *
              </label>
              <select
                value={participantInfo.serviceKey}
                onChange={(e) => {
                  setParticipantInfo(prev => ({...prev, serviceKey: e.target.value}));
                  if (validationErrors.serviceKey) {
                    setValidationErrors(prev => ({...prev, serviceKey: ''}));
                  }
                }}
                className={`w-full px-3 py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.serviceKey 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              >
                <option value="">-- Pilih Jenis Pelayanan --</option>
                {services.map((service) => (
                  <option key={service.key} value={service.key}>
                    {service.value}
                  </option>
                ))}
              </select>
              {validationErrors.serviceKey && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{validationErrors.serviceKey}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Servo Number
              </label>
              <input
                type="text"
                value={participantInfo.servoNumber}
                onChange={(e) => {
                  setParticipantInfo(prev => ({...prev, servoNumber: e.target.value}));
                }}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Masukkan servo number (opsional)"
              />
              <p className="text-gray-500 text-xs mt-1">Kosongkan jika tidak ada</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-2 sm:p-3 rounded-md text-xs sm:text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleStartQuiz}
              disabled={isStarting || !participantInfo.nij || !participantInfo.email || !participantInfo.name || !participantInfo.serviceKey || Object.values(validationErrors).some(error => error) || hasSubmittedBefore}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-md text-sm sm:text-base font-medium ${
                isStarting || !participantInfo.nij || !participantInfo.email || !participantInfo.name || !participantInfo.serviceKey || Object.values(validationErrors).some(error => error) || hasSubmittedBefore
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isStarting ? 'Memulai Quiz...' : hasSubmittedBefore ? 'Sudah Pernah Dikerjakan' : 'Mulai Quiz'}
            </button>
          </div>
        </div>

        {/* Warning Modal */}
        {showStartWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ PERHATIAN!</h2>
              </div>

              <div className="text-left space-y-3 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>Quiz akan <strong>LANGSUNG DIMULAI</strong> setelah Anda klik &quot;Mulai&quot;</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>Timer <strong>TIDAK BISA DI-PAUSE</strong> dan akan terus berjalan</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>Jika Anda refresh browser, quiz bisa dilanjutkan tapi <strong>timer tetap jalan</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>Pastikan <strong>koneksi internet Anda stabil</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-600 mr-2">•</span>
                      <span>Pastikan Anda memiliki waktu cukup untuk menyelesaikan quiz</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-900">
                    <strong>⏱️ Durasi Quiz: {quiz.durationMinutes || 60} menit</strong>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    📝 {questions.length} pertanyaan
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartWarning(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={confirmStartQuiz}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Saya Mengerti, Mulai Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show all questions at once (no pagination)
  const answeredCount = Object.keys(currentAnswers).filter(key => {
    const answer = currentAnswers[parseInt(key)];
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    return answer?.toString().trim().length > 0;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{quiz.title}</h1>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                <span>Q {currentQuestionIndex + 1}/{questions.length}</span>
                <span>•</span>
                <span>✓ {answeredCount}/{questions.length}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 self-start sm:self-auto">
              {/* Timer */}
              <div className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-3 py-1 rounded-lg ${
                (timeLeft || 0) <= 300 ? 'bg-red-100 border border-red-200' :
                (timeLeft || 0) <= 600 ? 'bg-yellow-100 border border-yellow-200' :
                'bg-green-100 border border-green-200'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-base sm:text-lg ${
                    (timeLeft || 0) <= 300 ? 'text-red-800' :
                    (timeLeft || 0) <= 600 ? 'text-yellow-800' :
                    'text-green-800'
                  }`}>⏰</span>
                  <span className={`font-mono text-xs sm:text-base font-semibold ${
                    (timeLeft || 0) <= 300 ? 'text-red-800' :
                    (timeLeft || 0) <= 600 ? 'text-yellow-800' :
                    'text-green-800'
                  }`}>
                    {formatTime(timeLeft || 0)}
                  </span>
                </div>
                <span className={`text-[10px] sm:text-xs ${
                  (timeLeft || 0) <= 300 ? 'text-red-700' :
                  (timeLeft || 0) <= 600 ? 'text-yellow-700' :
                  'text-green-700'
                }`}>
                  🔴 LIVE - Tidak bisa pause
                </span>
              </div>
            </div>
          </div>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <p className="text-sm flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}
        
        </div>
      </div>

      {/* Questions Content */}
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {questions.map((question, index) => {
            const questionNumber = index + 1;
            const questionAnswer = currentAnswers[question.id];
            
            return (
              <div key={question.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="mb-4 sm:mb-6">
                  <div className="mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-medium text-gray-900">
                      Question {questionNumber}
                    </h2>
                  </div>
                  
                  <p className="text-gray-800 text-sm sm:text-lg leading-relaxed">
                    {(question as any).questionText || (question as any).question || (question as any).text || 'Question text'}
                  </p>

                  {/* Question Images */}
                  {(question as any).images && (question as any).images.length > 0 && (
                    <div className="mt-4 mb-4">
                      <div className={`grid gap-3 ${(question as any).images.length === 1 ? 'grid-cols-1' : (question as any).images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                        {(question as any).images
                          .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                          .map((image: any, imgIndex: number) => (
                            <div key={image.id || imgIndex} className="relative">
                              <img 
                                src={getAbsoluteImageUrl(image.downloadUrl || image.imageUrl)} 
                                alt={image.altText || image.imageCaption || `Question ${questionNumber} image ${imgIndex + 1}`}
                                className="rounded-lg shadow-md w-full h-auto max-h-64 object-contain bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                loading="lazy"
                                onClick={() => {
                                  const imageUrl = getAbsoluteImageUrl(image.downloadUrl || image.imageUrl);
                                  if (imageUrl) {
                                    setZoomedImage({
                                      url: imageUrl,
                                      alt: image.altText || image.imageCaption || `Question ${questionNumber} image ${imgIndex + 1}`
                                    });
                                  }
                                }}
                                title="Klik untuk memperbesar"
                              />
                              {image.imageCaption && (
                                <p className="text-xs text-gray-500 mt-1 text-center">{image.imageCaption}</p>
                              )}
                            </div>
                          ))}
                      </div>
                      {(question as any).images.length > 1 && (
                        <p className="text-xs text-gray-400 mt-2 text-center">
                          📷 {(question as any).images.length} gambar - klik untuk memperbesar
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Answer Options */}
                <div className="space-y-2 sm:space-y-3">
                  {(question as any).questionType === 'multiple-choice' && (question as any).options && (
                    <div className="space-y-2 sm:space-y-3">
                      {(question as any).options.map((option: string, index: number) => (
                        <label key={index} className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option}
                            checked={questionAnswer === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                          />
                          <span className="flex-1 text-sm sm:text-base text-gray-900">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(question as any).questionType === 'multiple-select' && (question as any).options && (
                    <div className="space-y-2 sm:space-y-3">
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">📝 Pilih semua jawaban yang benar (bisa lebih dari satu)</p>
                      {(question as any).options.map((option: string, index: number) => {
                        const currentAnswerArray = Array.isArray(questionAnswer) ? questionAnswer : [];
                        const isChecked = currentAnswerArray.includes(option);
                        
                        return (
                          <label key={index} className="flex items-start space-x-2 sm:space-x-3 p-2.5 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              value={option}
                              checked={isChecked}
                              onChange={(e) => handleMultipleAnswerChange(question.id, option, e.target.checked)}
                              className="h-4 w-4 text-blue-600 rounded mt-0.5 flex-shrink-0"
                            />
                            <span className="flex-1 text-sm sm:text-base text-gray-900">{option}</span>
                          </label>
                        );
                      })}
                      {Array.isArray(questionAnswer) && questionAnswer.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs sm:text-sm text-blue-700">
                          Dipilih: {questionAnswer.length} jawaban
                        </div>
                      )}
                    </div>
                  )}

                  {(question as any).questionType === 'true-false' && (
                    <div className="space-y-2 sm:space-y-3">
                      {['true', 'false'].map((option) => (
                        <label key={option} className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option}
                            checked={questionAnswer === option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="h-4 w-4 text-blue-600 flex-shrink-0"
                          />
                          <span className="flex-1 text-sm sm:text-base text-gray-900 capitalize">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}


                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className={`flex justify-center mt-6 sm:mt-8 ${
          timeLeft !== null && timeLeft <= 60 ? 'mb-24' : ''
        }`}>
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="px-8 py-3 text-base sm:text-lg bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-lg"
          >
            Submit Quiz
          </button>
        </div>
      </div>




      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 p-4 sm:p-6 max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Confirm Submission</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Are you sure you want to submit your quiz? You have answered {answeredCount} out of {questions.length} questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-xs sm:text-sm text-red-600 font-medium mb-2">
                ⚠️ {questions.length - answeredCount} pertanyaan belum dijawab!
              </p>
            )}
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
              Time remaining: {formatTime(timeLeft || 0)}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 text-sm sm:text-base text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Continue Quiz
              </button>
              <button
                onClick={() => handleSubmitQuiz(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-submit Warning */}
      {timeLeft !== null && timeLeft <= 60 && timeLeft > 0 && showQuiz && (
        <div className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 bg-red-600 text-white p-3 sm:p-4 rounded-lg shadow-lg max-w-sm sm:max-w-md mx-auto sm:mx-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-2xl">⚠️</span>
            <div>
              <p className="text-sm sm:text-base font-semibold">Time Running Out!</p>
              <p className="text-xs sm:text-sm">Quiz will auto-submit in {timeLeft} seconds</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
              aria-label="Close"
            >
              ✕
            </button>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.alt}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {zoomedImage.alt && (
              <p className="text-white text-center mt-2 text-sm">{zoomedImage.alt}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}