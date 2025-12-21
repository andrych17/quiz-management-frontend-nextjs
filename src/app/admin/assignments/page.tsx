'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API } from '@/lib/api-client';
import { User, Quiz, UserQuizAssignment, ApiError } from '@/types/api';

export default function QuizAssignmentsPage() {
  const { isSuperadmin } = useAuth();
  const [assignments, setAssignments] = useState<UserQuizAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for creating new assignments
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) {
      setError('Access denied. This page is only available to superadmins.');
      setLoading(false);
      return;
    }

    loadData();
  }, [isSuperadmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [assignmentsRes, usersRes, quizzesRes] = await Promise.all([
        API.userQuizAssignments.getAssignments(),
        API.users.getUsers(),
        API.quizzes.getQuizzes()
      ]);

      if (assignmentsRes.success && assignmentsRes.data) {
        const assignmentsData = Array.isArray(assignmentsRes.data) 
          ? assignmentsRes.data 
          : assignmentsRes.data.items || [];
        setAssignments(assignmentsData);
      }

      if (usersRes.success && usersRes.data) {
        const usersData = Array.isArray(usersRes.data) 
          ? usersRes.data 
          : usersRes.data.items || [];
        // Filter to only show admin users
        const adminUsers = usersData.filter((user: User) => user.role === 'admin');
        setUsers(adminUsers);
      }

      if (quizzesRes.success && quizzesRes.data) {
        const quizzesData = Array.isArray(quizzesRes.data) 
          ? quizzesRes.data 
          : (quizzesRes.data as any)?.items || [];
        setQuizzes(quizzesData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (!selectedUser || !selectedQuiz) {
      alert('Please select both a user and a quiz');
      return;
    }

    try {
      setIsCreating(true);
      
      const response = await API.userQuizAssignments.createAssignment({
        userId: selectedUser,
        quizId: selectedQuiz,
        isActive: true
      });

      if (response.success) {
        alert('Assignment created successfully');
        setSelectedUser(null);
        setSelectedQuiz(null);
        setShowCreateForm(false);
        loadData(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to create assignment:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to create assignment');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const removeAssignment = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const response = await API.userQuizAssignments.removeAssignment(assignmentId);
      
      if (response.success) {
        alert('Assignment removed successfully');
        loadData(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to remove assignment:', err);
      if (err instanceof ApiError) {
        alert(err.message);
      } else {
        alert('Failed to remove assignment');
      }
    }
  };

  const getUserAssignedQuizzes = async (userId: number) => {
    try {
      const response = await API.userQuizAssignments.getUserQuizzes(userId);
      if (response.success && response.data) {
        const quizzes = (response.data as any)?.items || [];
        const user = users.find(u => u.id === userId);
        alert(`${user?.name} is assigned to ${quizzes.length} quiz(es)`);
      }
    } catch (err) {
      console.error('Failed to fetch user quizzes:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">⚠️ {error}</p>
          {isSuperadmin && (
            <button 
              onClick={loadData} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Assignment Management</h1>
          <p className="text-gray-600 mt-1">
            Manage which admin users have access to which quizzes
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'New Assignment'}
        </button>
      </div>

      {/* Create Assignment Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-lg font-semibold mb-4">Create New Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Admin User
              </label>
              <select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose an admin user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Quiz
              </label>
              <select
                value={selectedQuiz || ''}
                onChange={(e) => setSelectedQuiz(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a quiz...</option>
                {quizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title} ({quiz.serviceType || 'No category'})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={createAssignment}
              disabled={!selectedUser || !selectedQuiz || isCreating}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Assignment'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setSelectedUser(null);
                setSelectedQuiz(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Current Assignments ({assignments.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No assignments found</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-2 text-blue-600 hover:underline"
              >
                Create the first assignment
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quiz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.user?.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assignment.user?.email || 'No email'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {assignment.quiz?.title || 'Unknown Quiz'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {assignment.quiz?.serviceType || 'No category'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button 
                        onClick={() => getUserAssignedQuizzes(assignment.userId)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View All
                      </button>
                      <button 
                        onClick={() => removeAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-800 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Total Admin Users</h3>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Total Quizzes</h3>
          <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Active Assignments</h3>
          <p className="text-2xl font-bold text-gray-900">
            {assignments.filter(a => a.isActive).length}
          </p>
        </div>
      </div>
    </div>
  );
}
