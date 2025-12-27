'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API } from '@/lib/api-client';
import BasePageLayout from '@/components/ui/layout/BasePageLayout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/common/Modal';

interface QuizAnswer {
  id: number;
  questionNumber: number;
  questionText: string;
  questionType: string;
  questionOptions: string[];
  userAnswer: string;
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
  quiz: {
    id: number;
    title: string;
    description?: string;
    serviceKey?: string;
    serviceName: string;
    locationKey?: string;
    locationName: string;
    passingScore?: number;
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
        setResult(response.data);
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
    setIsDeleting(true);
    try {
      const response = await API.attempts.deleteAttempt(id);
      if (response.success) {
        router.push('/admin/quiz-results');
      } else {
        setError(response.message || 'Failed to delete quiz result');
        setShowDeleteModal(false);
      }
    } catch (err: any) {
      console.error('Error deleting quiz result:', err);
      setError(err.message || 'Failed to delete quiz result');
      setShowDeleteModal(false);
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
    <BasePageLayout
      title={result ? `Quiz Result: ${result.participantName}` : 'Loading...'}
      subtitle={result ? `Detailed view of quiz attempt for ${result.quiz.title}` : 'Loading quiz result details...'}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading quiz result...</p>
        </div>
      ) : result ? (
        <div>
          {/* Header Actions */}
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          ← Back to Results
        </Button>
        <Button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Result
        </Button>
      </div>

      {/* Participant & Quiz Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Participant Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Participant Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{result.participantName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{result.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">NIJ</label>
              <p className="text-gray-900">{result.nij}</p>
            </div>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quiz Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="text-gray-900">{result.quiz.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Service</label>
              <p className="text-gray-900">{result.quiz.serviceName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Location</label>
              <p className="text-gray-900">{result.quiz.locationName}</p>
            </div>
            {result.quiz.passingScore && (
              <div>
                <label className="text-sm font-medium text-gray-500">Passing Score</label>
                <p className="text-gray-900">{result.quiz.passingScore}%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Score Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              result.passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {result.score}%
            </div>
            <p className="text-sm text-gray-500">Final Score</p>
            {result.grade && (
              <p className="text-sm font-medium text-gray-700">Grade: {result.grade}</p>
            )}
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">
              {result.summary.correctAnswers}
            </div>
            <p className="text-sm text-gray-500">Correct</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-600">
              {result.summary.wrongAnswers}
            </div>
            <p className="text-sm text-gray-500">Wrong</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-700">
              {result.summary.totalQuestions}
            </div>
            <p className="text-sm text-gray-500">Total Questions</p>
          </div>
        </div>
        
        <div className="mt-4 flex justify-center">
          <span className={`px-4 py-2 rounded-full font-medium ${
            result.passed
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {result.passed ? '✅ PASSED' : '❌ FAILED'}
          </span>
        </div>
      </div>

      {/* Timing Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Timing Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Started At</label>
            <p className="text-gray-900">
              {new Date(result.startedAt).toLocaleString()}
            </p>
          </div>
          {result.completedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">Completed At</label>
              <p className="text-gray-900">
                {new Date(result.completedAt).toLocaleString()}
              </p>
            </div>
          )}
          {result.submittedAt && (
            <div>
              <label className="text-sm font-medium text-gray-500">Submitted At</label>
              <p className="text-gray-900">
                {new Date(result.submittedAt).toLocaleString()}
              </p>
            </div>
          )}
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
            <div key={answer.id} className="p-6">
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
                {answer.questionType === 'multiple-choice' && answer.questionOptions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {answer.questionOptions.map((option, idx) => (
                        <li key={idx} className={`text-sm ${
                          option === answer.correctAnswer ? 'text-green-600 font-medium' :
                          option === answer.userAnswer ? 'text-red-600 font-medium' :
                          'text-gray-600'
                        }`}>
                          {option}
                          {option === answer.correctAnswer && ' (Correct Answer)'}
                          {option === answer.userAnswer && option !== answer.correctAnswer && ' (Your Answer)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Your Answer</label>
                  <p className={`text-sm p-2 rounded border ${
                    answer.isCorrect 
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    {answer.userAnswer || 'No answer provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Correct Answer</label>
                  <p className="text-sm p-2 rounded border bg-green-50 border-green-200 text-green-900">
                    {answer.correctAnswer}
                  </p>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Quiz Result"
        >
          <div className="p-4">
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this quiz result? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </BasePageLayout>
  );
}