"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { QuizzesAPI, UsersAPI } from "@/lib/api-client";

export default function AdminDashboard() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isSuperadmin, 
    isAdmin,
    canAccessAllQuizzes,
    canManageUsers 
  } = useAuth();
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalUsers: 0,
    totalParticipants: 0,
    completedToday: 0,
    activeQuizzes: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        
        // Get admin stats (role-based)
        const promises: Promise<any>[] = [
          QuizzesAPI.getQuizzes(), // This will be filtered by backend based on user role
        ];
        
        // Only superadmin can see user management stats
        if (canManageUsers) {
          promises.push(UsersAPI.getUsers({ page: 1, limit: 1 })); // Just get count
        }
        
        const results = await Promise.all(promises);
        const [quizzes, users] = results;
        
        if (quizzes.success && quizzes.data) {
          const quizzesData = Array.isArray(quizzes.data) 
            ? quizzes.data 
            : (quizzes.data as any)?.items || [];
            
          const activeQuizzes = quizzesData.filter((q: any) => q.isPublished).length;
            
          setStats(prev => ({
            ...prev,
            totalQuizzes: quizzesData.length,
            activeQuizzes
          }));
        }
        
        if (users && users.success && users.data) {
          setStats(prev => ({
            ...prev,
            totalUsers: (users.data as any).pagination?.totalItems || (users.data as any).length || 0
          }));
        }
        
        // Note: Admin stats (participants, daily completions, avg scores) 
        // will be implemented when backend endpoints are ready
        
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated]);

  // TODO: Load from real backend API
  const [recentActivity] = useState<any[]>([]);

  // Show loading state
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">⚠️ Error loading dashboard</p>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show authentication required state
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl mb-4">🔒 Authentication Required</p>
          <p className="text-gray-600">Please log in to access the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          Welcome back, {user?.name || user?.email || 'Admin'}! 
          {isSuperadmin && " You have full system access."}
          {isAdmin && " Here are your assigned quizzes."}
        </p>
        <div className="mt-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isSuperadmin 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user?.role?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Key Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        {/* Total Quizzes */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0">
              <span className="text-blue-600 text-xl sm:text-2xl">📝</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                {canAccessAllQuizzes ? 'All Quizzes' : 'My Assigned Quizzes'}
              </h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
              <p className="text-xs sm:text-sm text-green-600">{stats.activeQuizzes} active</p>
            </div>
          </div>
        </div>

        {/* Total Users - Only show for superadmin */}
        {canManageUsers && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0">
                <span className="text-purple-600 text-xl sm:text-2xl">👥</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-medium text-gray-600">Admin Users</h3>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-xs sm:text-sm text-blue-600">System wide</p>
              </div>
            </div>
          </div>
        )}

        {/* Total Participants */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0">
              <span className="text-green-600 text-xl sm:text-2xl">💁</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Participants</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalParticipants}</p>
              <p className="text-xs sm:text-sm text-green-600">{stats.completedToday} today</p>
            </div>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-full flex-shrink-0">
              <span className="text-yellow-600 text-xl sm:text-2xl">⭐</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Average Score</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.avgScore}%</p>
              <p className="text-xs sm:text-sm text-blue-600">Across all tests</p>
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0">
              <span className="text-orange-600 text-xl sm:text-2xl">📈</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Completed Today</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              <p className="text-xs sm:text-sm text-green-600">+25% from yesterday</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-indigo-100 rounded-full flex-shrink-0">
              <span className="text-indigo-600 text-xl sm:text-2xl">⚡</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Quick Actions</h3>
              <div className="mt-2 space-y-1">
                <a href="/admin/quizzes" className="text-xs sm:text-sm text-blue-600 hover:underline block">
                  {canAccessAllQuizzes ? 'Manage All Quizzes' : 'View My Quizzes'}
                </a>
                {canManageUsers && (
                  <a href="/admin/users" className="text-xs sm:text-sm text-green-600 hover:underline block">
                    Manage Users
                  </a>
                )}
                {isSuperadmin && (
                  <a href="/admin/assignments" className="text-xs sm:text-sm text-purple-600 hover:underline block">
                    Quiz Assignments
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900">📋 Recent Activity</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Tidak ada aktivitas terkini</p>
                  <p className="text-xs mt-1">Data akan muncul di sini</p>
                </div>
              ) : recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start sm:items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.type === 'quiz_completed' && (
                      <span className="text-green-500 text-base sm:text-xl">✅</span>
                    )}
                    {activity.type === 'new_participant' && (
                      <span className="text-blue-500 text-base sm:text-xl">👤</span>
                    )}
                    {activity.type === 'quiz_created' && (
                      <span className="text-purple-500 text-base sm:text-xl">➕</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {activity.user}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {activity.type === 'quiz_completed' && `Completed "${activity.quiz}"`}
                      {activity.type === 'new_participant' && `Joined "${activity.quiz}"`}
                      {activity.type === 'quiz_created' && `Created "${activity.quiz}"`}
                      {activity.score && ` - Score: ${activity.score}%`}
                    </p>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performing Quizzes */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900">🏆 Top Performing Quizzes</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-4">
              {[].length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Tidak ada data quiz</p>
                  <p className="text-xs mt-1">Data akan muncul setelah ada peserta</p>
                </div>
              ) : [].map((quiz: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{quiz.name}</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">{quiz.participants} participants</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm sm:text-base font-bold text-${quiz.color}-600`}>
                      {quiz.avgScore}%
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
