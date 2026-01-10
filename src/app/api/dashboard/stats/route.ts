import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth';
import { ApiResponse, DashboardStats } from '@/types/api';

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics including active quizzes, admin users, 
 * today's activities, and participant counts.
 * 
 * @requires Admin or Superadmin role
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, auth) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      
      // Forward request to backend with Authorization header
      const response = await fetch(`${backendUrl}/api/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Failed to fetch dashboard statistics',
        }));

        return NextResponse.json(
          {
            success: false,
            message: errorData.message || 'Failed to fetch dashboard statistics',
            statusCode: response.status,
            timestamp: new Date().toISOString(),
          } as ApiResponse,
          { status: response.status }
        );
      }

      const stats: DashboardStats = await response.json();

      return NextResponse.json(
        {
          success: true,
          message: 'Dashboard statistics retrieved successfully',
          data: stats,
          statusCode: 200,
          timestamp: new Date().toISOString(),
        } as ApiResponse<DashboardStats>,
        { status: 200 }
      );
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);

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
