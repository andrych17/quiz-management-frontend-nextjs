'use client';

import { SessionProvider } from '@/contexts/SessionContext';
import PublicQuizForm from '@/components/public/PublicQuizForm';
import { Quiz } from '@/types';

interface QuizSessionWrapperProps {
  quiz: Quiz;
}

export default function QuizSessionWrapper({ quiz }: QuizSessionWrapperProps) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Quiz Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Jumlah Soal:</span>
                  <span>{quiz.questions.length}</span>
                </div>
                {quiz.durationMinutes && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Durasi:</span>
                    <span>{quiz.durationMinutes} menit</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-medium">Passing Score:</span>
                  <span>{quiz.passingScore} dari {quiz.questions.length}</span>
                </div>
                {quiz.expiresAt && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Berakhir:</span>
                    <span>{new Date(quiz.expiresAt).toLocaleDateString('id-ID')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quiz Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <PublicQuizForm quiz={quiz} />
            </div>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
