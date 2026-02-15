'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/date';
import { API } from '@/lib/api-client';
import BasePageLayout from '@/components/ui/layout/BasePageLayout';
import { Button } from '@/components/ui/button';
import { getAbsoluteImageUrl } from '@/lib/constants/api';


interface QuizAnswer {
  id: number;
  questionNumber: number;
  questionText: string;
  questionType: string;
  questionOptions: string[];
  answerText: string;
  correctAnswer: string;
  isCorrect: boolean;
  points?: number;
  feedback?: string;
  images?: Array<{
    id: number;
    sequence: number;
    fileName: string;
    downloadUrl: string;
    originalName: string;
    mimeType?: string;
    fileSize?: number;
    altText?: string;
  }>;
}

interface QuizResultDetail {
  id: number;
  participantName: string;
  email: string;
  nij: string;
  servoNumber?: string;
  serviceKey?: string;
  quiz: {
    id: number;
    title: string;
    description?: string;
    serviceKey?: string;
    serviceName: string;
    locationKey?: string;
    locationName: string;
    passingScore?: number;
    createdAt?: string;
  };
  score: number;
  grade?: string;
  passed: boolean;
  startedAt: string;
  completedAt?: string;
  submittedAt?: string;
  answers: QuizAnswer[];
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    skippedAnswers?: number;
    scorePercentage: number;
    grade?: string;
  };
}

export default function QuizResultDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = parseInt(params.id as string);

  const [result, setResult] = useState<QuizResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceConfigs, setServiceConfigs] = useState<Array<{key: string, value: string}>>([]);

  const [isDeleting, setIsDeleting] = useState(false);

  // Load service configs for name lookup
  useEffect(() => {
    const loadServiceConfigs = async () => {
      try {
        const response = await API.config.getServiceConfigs();
        if (response?.data) {
          setServiceConfigs(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Failed to load service configs:', err);
      }
    };
    loadServiceConfigs();
  }, []);

  useEffect(() => {
    if (id) {
      loadResultDetail();
    }
  }, [id]);

  const loadResultDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await API.attempts.getAttemptWithAnswers(id);
      
      if (response.success && response.data) {
        // Handle potential snake_case from API for timestamps
        const data = response.data as any;
        if (!data.completedAt && data.completed_at) {
          data.completedAt = data.completed_at;
        }
        if (!data.submittedAt && data.submitted_at) {
          data.submittedAt = data.submitted_at;
        }
        
        setResult(data);
      } else {
        setError(response.message || 'Quiz result not found');
      }
    } catch (err: any) {
      console.error('Error loading quiz result:', err);
      setError(err.message || 'Failed to load quiz result');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this quiz result? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await API.attempts.deleteAttempt(id);
      if (response.success) {
        router.push('/admin/quiz-results');
      } else {
        setError(response.message || 'Failed to delete quiz result');
      }
    } catch (err: any) {
      console.error('Error deleting quiz result:', err);
      setError(err.message || 'Failed to delete quiz result');
    } finally {
      setIsDeleting(false);
    }
  };



  const getAnswerBadgeColor = (isCorrect: boolean) => {
    return isCorrect
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getServiceName = (serviceKey: string) => {
    const service = serviceConfigs.find(s => s.key === serviceKey);
    return service?.value || serviceKey;
  };

  if (!result && !loading) {
    return (
      <BasePageLayout
        title="Quiz Result Details"
        subtitle="Quiz result not found"
      >
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        <div className="text-center py-8">
          <p className="text-gray-500">No quiz result data available</p>
        </div>
      </BasePageLayout>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {result ? `Quiz Result: ${result.participantName}` : 'Loading...'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {result ? `Detailed view of quiz attempt for ${result.quiz.title}` : 'Loading quiz result details...'}
          </p>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Header Actions */}
          {result && (
            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                ← Back to Results
              </Button>
              <div className="flex space-x-3">
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isDeleting ? 'Deleting...' : 'Delete Result'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading quiz result...</p>
            </div>
          ) : result ? (
            <div>

      {/* Result Overview */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participant Info - Compact (Left) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Participant
            </h3>
            <div className="pl-6 space-y-1.5">
              <div className="text-sm">
                <span className="text-gray-600">Name: </span>
                <span className="font-medium text-gray-900">{result.participantName}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Email: </span>
                <span className="text-gray-900">{result.email}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">NIJ: </span>
                <span className="text-gray-900">{result.nij}</span>
              </div>
              {result.servoNumber && (
                <div className="text-sm">
                  <span className="text-gray-600">Servo: </span>
                  <span className="text-gray-900">{result.servoNumber}</span>
                </div>
              )}
              {result.serviceKey && (
                <div className="text-sm">
                  <span className="text-gray-600">Service: </span>
                  <span className="text-gray-900">{getServiceName(result.serviceKey)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quiz Info - Compact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Quiz
            </h3>
            <div className="pl-6 space-y-1.5">
              <div className="text-sm">
                <span className="text-gray-600">Title: </span>
                <span className="font-medium text-gray-900">{result.quiz.title}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Service: </span>
                <span className="text-gray-900">{result.quiz.serviceName}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Location: </span>
                <span className="text-gray-900">{result.quiz.locationName}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Mulai: </span>
                <span className="text-gray-900">{formatDateTime(result.startedAt)}</span>
              </div>
              {result.completedAt && (
                <div className="text-sm">
                  <span className="text-gray-600">Selesai: </span>
                  <span className="text-gray-900">{formatDateTime(result.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score Summary - Below Overview */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>{result.score}</span>
              {result.grade && (
                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{result.grade}</span>
              )}
            </div>
            {result.quiz.passingScore && (
              <span className="text-sm text-gray-600">Syarat: <span className="font-semibold text-blue-600">{result.quiz.passingScore}</span></span>
            )}
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-green-600">{result.summary.correctAnswers}</span> Benar
            </span>
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-red-600">{result.summary.wrongAnswers}</span> Salah
            </span>
            {result.summary.skippedAnswers !== undefined && (
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-yellow-600">{result.summary.skippedAnswers}</span> Dilewati
              </span>
            )}
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-700">{result.summary.totalQuestions}</span> Total
            </span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            result.passed
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <span>{result.passed ? '✅' : '❌'}</span>
            <span className="font-bold text-sm">{result.passed ? 'LULUS' : 'TIDAK LULUS'}</span>
          </div>
        </div>
      </div>

      {/* Detailed Answers */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Detailed Answers
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {result.answers.map((answer, index) => (
            <div key={answer.id || `answer-${index}`} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Question {answer.questionNumber}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  getAnswerBadgeColor(answer.isCorrect)
                }`}>
                  {answer.isCorrect ? '✓ Correct' : '✗ Wrong'}
                  {answer.points && ` (${answer.points} pts)`}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-gray-900 mb-3">{answer.questionText}</p>
                
                {/* Display images if available */}
                {answer.images && answer.images.length > 0 && (
                  <div className="mt-4 mb-4">
                    <div className={`grid gap-3 ${
                      answer.images.length === 1 
                        ? 'grid-cols-1' 
                        : answer.images.length === 2 
                          ? 'grid-cols-2' 
                          : 'grid-cols-2 sm:grid-cols-3'
                    }`}>
                      {answer.images
                        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                        .map((image, imgIndex) => (
                          <div key={image.id || imgIndex} className="relative">
                            <img 
                              src={getAbsoluteImageUrl(image.downloadUrl)} 
                              alt={image.altText || `Question ${answer.questionNumber} image ${imgIndex + 1}`}
                              className="rounded-lg shadow-md w-full h-auto max-h-64 object-contain bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                              loading="lazy"
                              onClick={() => {
                                const imageUrl = getAbsoluteImageUrl(image.downloadUrl);
                                if (imageUrl) {
                                  window.open(imageUrl, '_blank');
                                }
                              }}
                              title="Klik untuk memperbesar"
                            />
                            {image.altText && (
                              <p className="text-xs text-gray-500 mt-1 text-center">{image.altText}</p>
                            )}
                          </div>
                        ))}
                    </div>
                    {answer.images.length > 1 && (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        📷 {answer.images.length} gambar - klik untuk memperbesar
                      </p>
                    )}
                  </div>
                )}
                
                {/* Show options for multiple choice questions */}
                {(answer.questionType === 'multiple_choice' || answer.questionType === 'multiple-choice') && answer.questionOptions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                    <div className="grid grid-cols-1 gap-2">
                    {answer.questionOptions.map((option, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${
                        option === answer.correctAnswer 
                          ? 'bg-green-50 border-green-200 text-green-800' 
                          : option === answer.answerText 
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-white border-gray-200 text-gray-600'
                      }`}>
                        <span>{option}</span>
                        {option === answer.correctAnswer && (
                          <span className="text-xs font-semibold bg-green-200 text-green-800 px-2 py-0.5 rounded">Correct Answer</span>
                        )}
                        {option === answer.answerText && option !== answer.correctAnswer && (
                          <span className="text-xs font-semibold bg-red-200 text-red-800 px-2 py-0.5 rounded">Participant's Answer</span>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>
                )}
                
                {/* Show correct answer only for non-multiple choice questions */}
                {answer.questionType !== 'multiple_choice' && answer.questionType !== 'multiple-choice' && (
                  <div className="mt-4 mb-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-sm font-semibold text-blue-900 min-w-[120px]">Correct Answer:</span>
                        <span className="text-base font-medium text-blue-800">{answer.correctAnswer}</span>
                     </div>
                  </div>
                )}
              </div>

              {/* Participant's Answer Section - Moved to bottom */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-500">Participant's Answer</label>
                    <div className={`p-4 rounded-lg border-l-4 ${
                      answer.isCorrect 
                        ? 'bg-white border-green-500 shadow-sm'
                        : 'bg-white border-red-500 shadow-sm'
                    }`}>
                      <p className={`text-base font-medium ${
                         answer.isCorrect ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {answer.answerText || 'No answer provided'}
                      </p>
                    </div>
                 </div>
              </div>

              {answer.feedback && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-500">Feedback</label>
                  <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded p-2">
                    {answer.feedback}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}