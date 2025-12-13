import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

// TODO: Connect to real backend API
const mockDetailedAttempt: any = null;

const _REMOVED_MOCKDATA = {
  id: 1,
  participantName: 'John Doe',
  email: 'john.doe@example.com',
  nij: '12345',
  quiz: {
    id: 1,
    title: 'Test Masuk Service Management Batch 1',
    description: 'Test masuk untuk posisi Service Management - mengukur pemahaman dasar tentang prinsip-prinsip ITIL dan manajemen layanan IT',
    serviceKey: 'service-management',
    serviceName: 'Service Management',
    locationKey: 'jakarta',
    locationName: 'Jakarta',
    passingScore: 70,
  },
  score: 85,
  grade: 'A',
  passed: true,
  startedAt: '2025-12-03T10:00:00Z',
  completedAt: '2025-12-03T10:45:00Z',
  submittedAt: '2025-12-03T10:45:00Z',
  answers: [
    {
      id: 1,
      questionNumber: 1,
      questionText: 'Apa yang dimaksud dengan Service Management dalam konteks IT?',
      questionType: 'multiple-choice',
      questionOptions: [
        'Pengelolaan perangkat keras komputer',
        'Proses mengelola dan memberikan layanan IT yang berkualitas kepada pengguna',
        'Instalasi software aplikasi',
        'Pemeliharaan jaringan komputer'
      ],
      userAnswer: 'Proses mengelola dan memberikan layanan IT yang berkualitas kepada pengguna',
      correctAnswer: 'Proses mengelola dan memberikan layanan IT yang berkualitas kepada pengguna',
      isCorrect: true,
      points: 10,
    },
    {
      id: 2,
      questionNumber: 2,
      questionText: 'Apa kepanjangan dari ITIL?',
      questionType: 'multiple-choice',
      questionOptions: [
        'Information Technology Infrastructure Library',
        'International Technology Integration Level',
        'Internet Technology Implementation Library',
        'Information Technology Innovation Laboratory'
      ],
      userAnswer: 'Information Technology Infrastructure Library',
      correctAnswer: 'Information Technology Infrastructure Library',
      isCorrect: true,
      points: 10,
    },
    {
      id: 3,
      questionNumber: 3,
      questionText: 'Manakah yang bukan termasuk tahap dalam Service Lifecycle ITIL?',
      questionType: 'multiple-choice',
      questionOptions: [
        'Service Strategy',
        'Service Design',
        'Service Transition',
        'Service Development'
      ],
      userAnswer: 'Service Development',
      correctAnswer: 'Service Development',
      isCorrect: true,
      points: 10,
    },
    {
      id: 4,
      questionNumber: 4,
      questionText: 'Apa tujuan utama dari Incident Management?',
      questionType: 'multiple-choice',
      questionOptions: [
        'Mencegah terjadinya insiden',
        'Memulihkan layanan normal secepat mungkin',
        'Menganalisis penyebab insiden',
        'Membuat dokumentasi insiden'
      ],
      userAnswer: 'Mencegah terjadinya insiden',
      correctAnswer: 'Memulihkan layanan normal secepat mungkin',
      isCorrect: false,
      points: 0,
    },
    {
      id: 5,
      questionNumber: 5,
      questionText: 'Dalam ITIL, apa yang dimaksud dengan SLA?',
      questionType: 'multiple-choice',
      questionOptions: [
        'Service Level Agreement',
        'System Level Access',
        'Service Link Application',
        'Standard Level Analysis'
      ],
      userAnswer: 'Service Level Agreement',
      correctAnswer: 'Service Level Agreement',
      isCorrect: true,
      points: 10,
    },
  ],
  summary: {
    totalQuestions: 5,
    correctAnswers: 4,
    wrongAnswers: 1,
    scorePercentage: 80,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attemptId = parseInt(id);
    
    console.log('📊 Getting detailed attempt:', attemptId);
    
    if (!attemptId || isNaN(attemptId)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid attempt ID',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // TODO: Connect to real backend API
    console.log('⚠️ Mock data removed - connect to real backend');
    const response: ApiResponse = {
      success: false,
      message: 'Backend API not configured. Please connect to real backend endpoint.',
      statusCode: 503,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Error in attempt detail API:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}