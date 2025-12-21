'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API } from '@/lib/api-client';
import { Quiz, Question, ApiError } from '@/types/api';

export default function PublicQuizPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: '',
    nij: ''
  });
  const [currentAnswers, setCurrentAnswers] = useState<{[key: number]: string | string[]}>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [participantDataLoading, setParticipantDataLoading] = useState(false);
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (token) {
      loadQuiz();
    }
  }, [token]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && showQuiz) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      // Time's up - auto submit (allow empty answers)
      handleSubmitQuiz(true);
    }
  }, [timeLeft, showQuiz]);

  // Auto-save answers every 10 seconds
  useEffect(() => {
    if (showQuiz && attemptId && Object.keys(currentAnswers).length > 0) {
      const interval = setInterval(() => {
        saveAnswersAsync();
      }, 10000); // Save every 10 seconds
      return () => clearInterval(interval);
    }
  }, [showQuiz, attemptId, currentAnswers]);

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

  const handleStartQuiz = async () => {
    // Validate form first
    if (!validateForm()) {
      setError('Mohon perbaiki data yang tidak valid');
      return;
    }

    setIsStarting(true);
    setError(null);
    setValidationErrors({});
    
    try {
      if (!quiz) {
        setError('Quiz not found');
        setIsStarting(false);
        return;
      }

      // Check for duplicate submission via API before starting
      const alreadySubmitted = await checkParticipantSubmission(participantInfo.nij);
      
      if (alreadySubmitted) {
        setIsStarting(false);
        return; // Don't start if already submitted
      }

      // Save participant data to localStorage for future auto-fill
      const participantKey = `participant_${participantInfo.nij}`;
      localStorage.setItem(participantKey, JSON.stringify({
        email: participantInfo.email,
        name: participantInfo.name
      }));

      // Start quiz directly without API call (no submission yet)
      const localAttemptId = Date.now();
      setAttemptId(localAttemptId);
      setQuizStartTime(new Date());
      const duration = quiz?.durationMinutes || 60;
      setTimeLeft(duration * 60); // Convert minutes to seconds
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
        quizId: quiz.id,
        answers: answersArray
      });
    } catch (err: any) {
      console.error('Failed to auto-save answers:', err);
      // Don't show error to user for auto-save failures
    }
  };

  const handleAnswerChange = (questionId: number, answer: string | string[]) => {
    setCurrentAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
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
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
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

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    const nijError = validateNIJ(participantInfo.nij);
    if (nijError) errors.nij = nijError;
    
    const emailError = validateEmail(participantInfo.email);
    if (emailError) errors.email = emailError;
    
    const nameError = validateName(participantInfo.name);
    if (nameError) errors.name = nameError;
    
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
        
        // Try to get saved participant data for auto-fill
        const participantKey = `participant_${nij}`;
        const savedData = localStorage.getItem(participantKey);
        if (savedData) {
          try {
            const data = JSON.parse(savedData);
            setParticipantInfo(prev => ({
              ...prev,
              email: data.email || prev.email,
              name: data.name || prev.name
            }));
          } catch (e) {
            // Could not parse saved participant data
          }
        }
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
    // Validate all questions are answered for manual submit
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
        quizId: quiz.id,
        answers: answersArray
      });

      if (response.success) {
        // Save submission to localStorage to prevent duplicate attempts
        const submissionKey = `quiz_${token}_${participantInfo.nij}`;
        const participantKey = `participant_${participantInfo.nij}`;
        
        localStorage.setItem(submissionKey, 'true');
        localStorage.setItem(participantKey, JSON.stringify({
          email: participantInfo.email,
          name: participantInfo.name
        }));
        
        // Show completion message instead of redirecting
        setShowQuiz(false);
        setError(null);
        
        const message = isAutoSubmit 
          ? `Waktu habis! Quiz telah di-submit otomatis.\n${answeredCount} dari ${questions.length} pertanyaan terjawab.\nNIJ: ${participantInfo.nij}`
          : `Anda telah menyelesaikan quiz.\n${answeredCount} dari ${questions.length} pertanyaan terjawab.\nNIJ: ${participantInfo.nij}`;
        
        alert(message);
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

            {error && (
              <div className="bg-red-50 text-red-700 p-2 sm:p-3 rounded-md text-xs sm:text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleStartQuiz}
              disabled={isStarting || !participantInfo.nij || !participantInfo.email || !participantInfo.name || Object.values(validationErrors).some(error => error) || hasSubmittedBefore}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-md text-sm sm:text-base font-medium ${
                isStarting || !participantInfo.nij || !participantInfo.email || !participantInfo.name || Object.values(validationErrors).some(error => error) || hasSubmittedBefore
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isStarting ? 'Memulai Quiz...' : hasSubmittedBefore ? 'Sudah Pernah Dikerjakan' : 'Mulai Quiz'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pagination logic
  const questionsPerPage = quiz?.questionsPerPage || 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = currentPage * questionsPerPage;
  const currentPageQuestions = questions.slice(startIndex, startIndex + questionsPerPage);
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
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full ${
                (timeLeft || 0) <= 300 ? 'bg-red-100 text-red-800' :
                (timeLeft || 0) <= 600 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                <span className="text-base sm:text-lg">⏰</span>
                <span className="font-mono text-xs sm:text-base font-semibold">
                  {formatTime(timeLeft || 0)}
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
          {currentPageQuestions.map((question, pageIndex) => {
            const questionNumber = startIndex + pageIndex + 1;
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

                  {/* TODO: Image functionality - currently disabled
                  {(question as any).imageUrl && (
                    <div className="mt-4">
                      <img 
                        src={(question as any).imageUrl} 
                        alt="Question image"
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                  */}
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

                  {(question as any).questionType === 'text' && (
                    <div>
                      <textarea
                        value={questionAnswer || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                        placeholder="Type your answer here..."
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className={`flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 sm:gap-4 mt-4 sm:mt-6 ${
          timeLeft !== null && timeLeft <= 60 ? 'mb-24' : ''
        }`}>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed order-1"
          >
            <span className="hidden sm:inline">← Previous Page</span>
            <span className="sm:hidden">← Prev</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-3 sm:order-2">
            <span className="text-xs sm:text-sm text-gray-600 text-center">
              <span className="hidden sm:inline">Page {currentPage + 1} of {totalPages} ({questions.length} questions)</span>
              <span className="sm:hidden">Page {currentPage + 1}/{totalPages}</span>
            </span>
            
            {currentPage < totalPages - 1 && (
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <span className="hidden sm:inline">Next Page →</span>
                <span className="sm:hidden">Next →</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 order-2 sm:order-3">
            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <span className="hidden sm:inline">Submit Quiz</span>
              <span className="sm:hidden">Submit</span>
            </button>
          </div>
        </div>
      </div>




      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
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
    </div>
  );
}