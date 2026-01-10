import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { ApiResponse, RecentActivity } from '@/types/api';

/**
 * GET /api/dashboard/recent-activity
 * Get a list of recent quiz attempts with participant and quiz details.
 * 
 * @query limit (optional, default: 10) - Number of recent activities to return
 * @requires Admin or Superadmin role
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = searchParams.get('limit') || '10';

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      
      // Forward request to backend with Authorization header
      const response = await fetch(
        `${backendUrl}/api/dashboard/recent-activity?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Failed to fetch recent activity',
        }));

        return NextResponse.json(
          {
            success: false,
            message: errorData.message || 'Failed to fetch recent activity',
            statusCode: response.status,
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: response.status }
        );
      }

      const activities: RecentActivity[] = await response.json();

      return NextResponse.json(
        {
          success: true,
          message: 'Recent activity retrieved successfully',
          data: activities,
          statusCode: 200,
          timestamp: new Date().toISOString(),
        } as ApiResponse<RecentActivity[]>,
        { status: 200 }
      );
    } catch (error) {
      console.error('Error fetching recent activity:', error);

      return NextResponse.json(
        {
          success: false,
          message: 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        } as ApiResponse,
        { status: 500 }
      );
    }
  });
}
