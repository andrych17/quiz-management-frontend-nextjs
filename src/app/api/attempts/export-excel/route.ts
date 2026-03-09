import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdminAuth } from '@/lib/auth';

/**
 * GET /api/attempts/export-excel
 * 
 * Export quiz results to Excel file with optional filters
 * Accessible by: superadmin only
 * 
 * Query params:
 * - quizId: Filter by quiz ID
 * - serviceKey: Filter by service
 * - locationKey: Filter by location
 */
export async function GET(request: NextRequest) {
  return withSuperAdminAuth(request, async (req, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const quizName = searchParams.get('quizName');
      const serviceKey = searchParams.get('serviceKey');
      const locationKey = searchParams.get('locationKey');
      const submissionStatus = searchParams.get('submissionStatus');
      const passStatus = searchParams.get('passStatus');
      const sortField = searchParams.get('sortField');
      const sortDirection = searchParams.get('sortDirection');
      const search = searchParams.get('search');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (quizName) queryParams.append('quizName', quizName);
      if (serviceKey) queryParams.append('serviceKey', serviceKey);
      if (locationKey) queryParams.append('locationKey', locationKey);
      if (submissionStatus) queryParams.append('submissionStatus', submissionStatus);
      if (passStatus) queryParams.append('passStatus', passStatus);
      if (sortField) queryParams.append('sortField', sortField);
      if (sortDirection) queryParams.append('sortDirection', sortDirection);
      if (search) queryParams.append('search', search);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const queryString = queryParams.toString();
      const url = `${backendUrl}/api/attempts/export-excel${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to export quiz results';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not JSON, use default message
        }

        return NextResponse.json(
          {
            success: false,
            message: errorMessage,
            statusCode: response.status,
            timestamp: new Date().toISOString(),
          },
          { status: response.status }
        );
      }

      // Get the blob from backend response
      const blob = await response.blob();
      
      // Create response with blob
      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      headers.set('Content-Disposition', `attachment; filename="quiz-results-${new Date().toISOString().split('T')[0]}.xlsx"`);
      headers.set('Cache-Control', 'no-cache');

      return new NextResponse(blob, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error('Error exporting quiz results:', error);
      
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  });
}
