import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attemptId = parseInt(id);
    
    if (!attemptId || isNaN(attemptId)) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid attempt ID',
        statusCode: 400,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // For demo purposes, always return success
    // In real implementation, this would delete from database
    const response: ApiResponse = {
      success: true,
      message: 'Attempt deleted successfully',
      statusCode: 200,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Error in delete attempt API:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}