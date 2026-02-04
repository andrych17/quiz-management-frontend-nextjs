"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { QuizzesAPI } from "@/lib/api-client";
import { DashboardStats, RecentActivity } from "@/types/api";
import { format } from "date-fns";
import { logger } from "@/lib/logger";
import { DEFAULT_DASHBOARD_ACTIVITY_LIMIT } from '@/lib/constants/config';

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
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get admin token
        const token = localStorage.getItem('admin_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        logger.debug('Loading dashboard data...');
        logger.debug('User:', user);
        logger.debug('Is Superadmin:', isSuperadmin);
        logger.debug('Is Admin:', isAdmin);

        // Fetch dashboard stats
        const statsEndpoint = '/api/dashboard/stats';
        logger.api('GET', statsEndpoint);
        
        const statsResponse = await fetch(statsEndpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        logger.apiResponse(statsEndpoint, statsResponse.status);
        logger.debug('Stats Response Status:', statsResponse.status);
        logger.debug('Stats Response OK:', statsResponse.ok);

        if (!statsResponse.ok) {
          const errorText = await statsResponse.text();
          logger.error('Stats API Error:', errorText);
          throw new Error('Failed to fetch dashboard statistics');
        }

        const statsData = await statsResponse.json();
        logger.debug('Stats Data Received:', statsData);
        
        if (statsData.success) {
          // Backend returns nested structure: { success, data: { data: {...} } }
          // Extract the actual stats from nested structure
          let actualStats: DashboardStats | null = null;
          
          if (statsData.data) {
            // Check if data.data exists (nested structure from backend wrapper)
            if (statsData.data.data) {
              actualStats = statsData.data.data;
              logger.debug('Using nested data.data object');
            }
            // Check if data directly has the stats properties
            else if (statsData.data.activeQuizzes !== undefined) {
              actualStats = statsData.data;
              logger.debug('Using direct data object');
            }
            else {
              logger.warn('Unexpected stats data structure:', statsData.data);
            }
          }
          
          if (actualStats) {
            logger.debug('Setting stats:', actualStats);
            setStats(actualStats);
          }
        }

        // Fetch recent activity
        const activityEndpoint = `/api/dashboard/recent-activity?limit=${DEFAULT_DASHBOARD_ACTIVITY_LIMIT}`;
        logger.api('GET', activityEndpoint);
        
        const activityResponse = await fetch(activityEndpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        logger.apiResponse(activityEndpoint, activityResponse.status);
        logger.debug('Activity Response Status:', activityResponse.status);
        logger.debug('Activity Response OK:', activityResponse.ok);

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          logger.debug('Activity Data Received:', activityData);
          
          if (activityData.success) {
            // Backend returns nested structure: { success, data: { data: [...] } }
            // We need to extract the inner data array
            let activities: RecentActivity[] = [];
            
            if (activityData.data) {
              // Check if data.data exists (nested structure)
              if (activityData.data.data && Array.isArray(activityData.data.data)) {
                activities = activityData.data.data;
                logger.debug('Using nested data.data array');
              } 
              // Check if data is directly an array
              else if (Array.isArray(activityData.data)) {
                activities = activityData.data;
                logger.debug('Using direct data array');
              }
              // Otherwise empty array
              else {
                logger.warn('Unexpected activity data structure:', activityData.data);
              }
            }
            
            logger.debug('Setting activities count:', activities.length);
            logger.debug('Activities:', activities);
            setRecentActivity(activities);
          }
        }
        
      } catch (err) {
        logger.error('Failed to load dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
        {/* Active Quizzes */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0">
              <span className="text-blue-600 text-xl sm:text-2xl">📝</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                Active Quizzes
              </h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats?.activeQuizzes ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-green-600">Published & Active</p>
            </div>
          </div>
        </div>

        {/* Admin Users - Only show for superadmin */}
        {canManageUsers && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0">
                <span className="text-purple-600 text-xl sm:text-2xl">👥</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-medium text-gray-600">Admin Users</h3>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stats?.adminUsers ?? 0}
                </p>
                <p className="text-xs sm:text-sm text-blue-600">System wide</p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Participants */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0">
              <span className="text-green-600 text-xl sm:text-2xl">💁</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Today's Participants</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats?.todayParticipants ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-green-600">Unique participants</p>
            </div>
          </div>
        </div>

        {/* Today's Active Quizzes Count */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0">
              <span className="text-orange-600 text-xl sm:text-2xl">📈</span>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Active Today</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats?.todayActiveQuizzes?.length ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-blue-600">Quizzes with attempts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Active Quizzes - Detail List */}
      {stats?.todayActiveQuizzes && stats.todayActiveQuizzes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-8">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900">🎯 Today's Active Quizzes</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              {stats.todayActiveQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{quiz.title}</h4>
                    <p className="text-xs text-gray-500">Quiz ID: {quiz.id}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-blue-600">
                      {quiz.attemptCount}
                    </p>
                    <p className="text-xs text-gray-500">attempts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900">📋 Recent Activity</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-1">Activity will appear here when participants take quizzes</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start sm:items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <span className={`text-xl ${activity.passed ? 'text-green-500' : 'text-red-500'}`}>
                      {activity.passed ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.participantName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {activity.quizTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.email} • NIJ: {activity.nij}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${activity.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.score}%
                    </p>
                    <p className="text-xs text-gray-400">
                      {activity.completedAt ? format(new Date(activity.completedAt), 'HH:mm') : 'In progress'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
