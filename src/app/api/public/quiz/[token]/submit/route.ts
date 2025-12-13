import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
    console.log('🔍 Public quiz submit API - Token:', token);
    console.log('📝 Submit payload:', body);
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

    // Validate required fields
    if (!body.participantName || !body.email || !body.nij) {
      const response: ApiResponse = {
        success: false,
        message: 'Participant name, email, and NIJ are required',
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
      message: 'Backend API not configured. Please connect to real backend endpoint to submit quiz.',
      statusCode: 503,
      timestamp: new Date().toISOString(),
      path: `/public/quiz/${token}/submit`
    };
    return NextResponse.json(response, { status: 503 });

  } catch (error) {
    console.error('❌ Error in public quiz submit API:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: `/public/quiz/unknown/submit`
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}