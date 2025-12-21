'use client';

import React, { useState, useEffect } from 'react';
import { API } from '@/lib/api-client';
import { User, Quiz, UserQuizAssignment } from '@/types/api';

interface UserQuizAssignmentManagerProps {
  onAssignmentCreated?: () => void;
  className?: string;
}

export default function UserQuizAssignmentManager({ 
  onAssignmentCreated, 
  className = '' 
}: UserQuizAssignmentManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<UserQuizAssignment[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, quizzesRes, assignmentsRes] = await Promise.all([
        API.users.getUsers(),
        API.quizzes.getQuizzes(),
        API.userQuizAssignments.getAssignments()
      ]);

      if (usersRes.success && usersRes.data) {
        const adminUsers = (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data as any)?.items || [])
          .filter((user: User) => user.role === 'admin');
        setUsers(adminUsers);
      }

      if (quizzesRes.success && quizzesRes.data) {
        const quizzesData = Array.isArray(quizzesRes.data) ? usersRes.data : (quizzesRes.data as any)?.items || [];
        setQuizzes(quizzesData);
      }

      if (assignmentsRes.success && assignmentsRes.data) {
        const assignmentsData = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : (assignmentsRes.data as any)?.items || [];
        setAssignments(assignmentsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (!selectedUser || !selectedQuiz) return;

    try {
      setCreating(true);
      const response = await API.userQuizAssignments.createAssignment({
        userId: selectedUser,
        quizId: selectedQuiz,
        isActive: true
      });

      if (response.success) {
        setSelectedUser(null);
        setSelectedQuiz(null);
        await loadData(); // Refresh data
        onAssignmentCreated?.();
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setCreating(false);
    }
  };

  const removeAssignment = async (assignmentId: number) => {
    if (!confirm('Remove this assignment?')) return;

    try {
      const response = await API.userQuizAssignments.removeAssignment(assignmentId);
      if (response.success) {
        await loadData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to remove assignment:', error);
    }
  };

  if (loading) {
    return (
      <div className={`${className} text-center py-4`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Create Assignment Form */}
      <div className="bg-white p-4 rounded-lg border mb-4">
        <h3 className="font-medium text-gray-900 mb-3">Assign Quiz to Admin</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(Number(e.target.value) || null)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select Admin...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          
          <select
            value={selectedQuiz || ''}
            onChange={(e) => setSelectedQuiz(Number(e.target.value) || null)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Select Quiz...</option>
            {quizzes.map(quiz => (
              <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
            ))}
          </select>
          
          <button
            onClick={createAssignment}
            disabled={!selectedUser || !selectedQuiz || creating}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">Current Assignments ({assignments.length})</h3>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {assignments.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No assignments yet</p>
          ) : (
            <div className="divide-y">
              {assignments.map(assignment => (
                <div key={assignment.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{assignment.user?.name}</p>
                    <p className="text-xs text-gray-500">{assignment.quiz?.title}</p>
                  </div>
                  <button
                    onClick={() => removeAssignment(assignment.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
