import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Forward request to backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/admin/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Backend endpoint not available
      const emptyStats = {
        totalUsers: 0,
        totalAttempts: 0,
        passedAttempts: 0,
        passRate: 0,
        totalQuizzes: 0,
        publishedQuizzes: 0
      };
      return NextResponse.json(emptyStats);
    }

    const stats = await response.json();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    // Return empty stats on error
    const emptyStats = {
      totalUsers: 0,
      totalAttempts: 0,
      passedAttempts: 0,
      passRate: 0,
      totalQuizzes: 0,
      publishedQuizzes: 0
    };
    return NextResponse.json(emptyStats);
  }
}
