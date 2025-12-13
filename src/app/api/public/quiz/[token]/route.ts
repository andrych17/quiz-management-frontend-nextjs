import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    console.log('🔍 Public quiz API - Looking for token:', token);
    console.log('⚠️ Mock data removed - connect to real backend');
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Quiz token is required',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // TODO: Connect to real backend API
    // For now, return error that backend is not connected
    console.log('❌ Backend API not configured - mockdata removed');
    const response: ApiResponse = {
      success: false,
      message: 'Backend API not configured. Please connect to real backend endpoint.',
      statusCode: 503,
      timestamp: new Date().toISOString(),
      path: `/public/quiz/${token}`
    };
    return NextResponse.json(response, { status: 503 });

  } catch (error) {
    console.error('❌ Error in public quiz API:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: `/public/quiz/unknown`
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}