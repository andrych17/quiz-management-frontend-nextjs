'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/date';
import { API } from '@/lib/api-client';
import BasePageLayout from '@/components/ui/layout/BasePageLayout';
import { Button } from '@/components/ui/button';


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
  };
}

export default function QuizResultDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = parseInt(params.id as string);

  const [result, setResult] = useState<QuizResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);


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
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
           <h2 className="text-lg font-semibold text-gray-900 mb-6">Result Overview</h2>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
             {/* Participant Info */}
             <div>
               <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                 <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                 </svg>
                 Participant Information
               </h3>
               <div className="space-y-4 pl-7">
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Name</label>
                    <p className="text-gray-900 font-medium">{result.participantName}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Email</label>
                    <p className="text-gray-900">{result.email}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">NIJ</label>
                    <p className="text-gray-900">{result.nij}</p>
                 </div>
                 {result.servoNumber && (
                   <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Servo Number</label>
                      <p className="text-gray-900">{result.servoNumber}</p>
                   </div>
                 )}
                 {result.serviceKey && (
                   <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Service Key</label>
                      <p className="text-gray-900">{result.serviceKey}</p>
                   </div>
                 )}
               </div>
             </div>
             
             {/* Quiz Info */}
             <div>
               <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                 <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
                 Quiz Information
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                 <div className="col-span-full">
                    <label className="text-sm font-medium text-gray-500 block mb-1">Title</label>
                    <p className="text-gray-900 font-medium">{result.quiz.title}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Service</label>
                    <p className="text-gray-900">{result.quiz.serviceName}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Location</label>
                    <p className="text-gray-900">{result.quiz.locationName}</p>
                 </div>
                 {result.quiz.passingScore && (
                   <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Syarat Lulus</label>
                      <p className="text-gray-900">{result.quiz.passingScore}</p>
                   </div>
                 )}
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Created At</label>
                    <p className="text-gray-900">{formatDateTime(result.quiz.createdAt)}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Started At</label>
                    <p className="text-gray-900">{formatDateTime(result.startedAt)}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Completed At</label>
                    <p className="text-gray-900">{result.completedAt ? new Date(result.completedAt).toLocaleString() : '-'}</p>
                 </div>
               </div>
             </div>
           </div>
        </div>

        {/* Score Summary Section */}
        <div className="p-6 bg-gray-50 rounded-b-lg">
             <h3 className="text-md font-medium text-gray-900 mb-6 text-center">Score Summary</h3>
             <div className="grid grid-cols-2 md:grid-cols-6 gap-4 max-w-6xl mx-auto">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className={`text-4xl font-bold mb-1 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>{result.score}</div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Nilai Akhir</p>
                </div>
                {result.quiz.passingScore && (
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm border-2 border-blue-200">
                    <div className="text-3xl font-semibold text-blue-600 mb-1">{result.quiz.passingScore}</div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Syarat Lulus</p>
                  </div>
                )}
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-3xl font-semibold text-green-600 mb-1">{result.summary.correctAnswers}</div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Benar</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                   <div className="text-3xl font-semibold text-red-600 mb-1">{result.summary.wrongAnswers}</div>
                   <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Salah</p>
                </div>
                {result.summary.skippedAnswers !== undefined && (
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                     <div className="text-3xl font-semibold text-yellow-600 mb-1">{result.summary.skippedAnswers}</div>
                     <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dilewati</p>
                  </div>
                )}
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                   <div className="text-3xl font-semibold text-gray-700 mb-1">{result.summary.totalQuestions}</div>
                   <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Soal</p>
                </div>
             </div>
             
             <div className="mt-8 flex justify-center">
               <div className={`flex items-center space-x-2 px-6 py-3 rounded-full border-2 ${
                 result.passed 
                   ? 'bg-green-50 border-green-200 text-green-700' 
                   : 'bg-red-50 border-red-200 text-red-700'
               }`}>
                 <span className="text-xl">{result.passed ? '✅' : '❌'}</span>
                 <span className="font-bold text-lg tracking-wide">{result.passed ? 'LULUS' : 'TIDAK LULUS'}</span>
               </div>
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
                          <span className="text-xs font-semibold bg-red-200 text-red-800 px-2 py-0.5 rounded">Your Answer</span>
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

              {/* Your Answer Section - Moved to bottom */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-500">Your Answer</label>
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