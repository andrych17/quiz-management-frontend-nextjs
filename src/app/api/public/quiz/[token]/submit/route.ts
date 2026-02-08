import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    
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
    if (!body.email) {
      const response: ApiResponse = {
        success: false,
        message: 'Email is required',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate NIJ length if provided
    if (body.nij && body.nij.length < 6) {
      const response: ApiResponse = {
        success: false,
        message: 'NIJ must be at least 6 digits',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }

    // TODO: Connect to real backend API
    // For now, return error that backend is not connected
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