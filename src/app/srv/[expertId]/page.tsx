'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Course } from '@/types';

export default function ExpertDashboard() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExpertCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const fetchExpertCourses = async () => {
    try {
      setLoading(true);
      console.log('[DBG][expert-dashboard] Fetching courses for expert:', expertId);

      // Fetch all courses for this instructor (both IN_PROGRESS and PUBLISHED)
      const response = await fetch(`/data/courses?instructorId=${expertId}&includeAll=true`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data || []);
        console.log('[DBG][expert-dashboard] Courses loaded:', data.data);
      } else {
        setError('Failed to load courses');
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics from courses
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED');
  const inProgressCourses = courses.filter(c => c.status === 'IN_PROGRESS');
  const totalStudents = courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
  const averageRating =
    courses.length > 0 ? courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/srv" className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block">
            ← Back to Expert Portal
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Expert Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link
                href={`/srv/${expertId}/edit`}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Profile
              </Link>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Students</p>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStudents.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Across all courses</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Courses</p>
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {publishedCourses.length} published, {inProgressCourses.length} in progress
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Published</p>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{publishedCourses.length}</p>
            <p className="text-sm text-gray-500 mt-1">Live courses</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average Rating</p>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {courses.length > 0 ? averageRating.toFixed(1) : '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Across all courses</p>
          </div>
        </div>

        {/* Add New Course Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow mb-8 border border-blue-200">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create New Course</h2>
                <p className="text-gray-600">
                  Share your expertise by creating a new course for your students
                </p>
              </div>
              <Link
                href={`/srv/${expertId}/courses/create`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <span className="text-xl mr-2">+</span>
                Add New Course
              </Link>
            </div>
          </div>
        </div>

        {/* My Courses */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
            <span className="text-sm text-gray-500">{courses.length} courses</span>
          </div>
          <div className="p-6">
            {courses.length > 0 ? (
              <div className="space-y-6">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              course.status === 'PUBLISHED'
                                ? 'bg-green-100 text-green-800'
                                : course.status === 'IN_PROGRESS'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {course.status || 'DRAFT'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span>⭐ {course.rating.toFixed(1)}</span>
                          <span>•</span>
                          <span>👥 {course.totalStudents.toLocaleString()} students</span>
                          <span>•</span>
                          <span>📚 {course.totalLessons} lessons</span>
                          <span>•</span>
                          <span>💰 ${course.price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {course.status === 'IN_PROGRESS' ? (
                        <Link
                          href={`/srv/${expertId}/courses/${course.id}/lessons`}
                          className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                        >
                          Continue Setup
                        </Link>
                      ) : (
                        <Link
                          href={`/srv/${expertId}/courses/${course.id}`}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Manage Course
                        </Link>
                      )}
                      <Link
                        href={`/srv/${expertId}/courses/${course.id}/edit`}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/courses/${course.id}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        View as Student
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first course to start sharing your expertise
                </p>
                <Link
                  href={`/srv/${expertId}/courses/create`}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span className="text-xl mr-2">+</span>
                  Create First Course
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
