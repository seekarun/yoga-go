'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Course } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ExpertCoursesPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpertCourses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][expert-courses] Fetching courses for expert:', expertId);

      const response = await fetch(`/data/courses?instructorId=${expertId}&includeAll=true`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data || []);
        console.log('[DBG][expert-courses] Courses loaded:', data.data);
      } else {
        setError('Failed to load courses');
      }
    } catch (err) {
      console.error('[DBG][expert-courses] Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    fetchExpertCourses();
  }, [fetchExpertCourses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading courses..." />
      </div>
    );
  }

  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED');
  const inProgressCourses = courses.filter(c => c.status === 'IN_PROGRESS');

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
              <p className="text-sm text-gray-500 mt-1">
                {courses.length} courses ({publishedCourses.length} published,{' '}
                {inProgressCourses.length} in progress)
              </p>
            </div>
            <Link
              href={`/srv/${expertId}/courses/create`}
              className="px-4 py-2 text-white text-sm rounded-lg transition-colors font-medium inline-flex items-center"
              style={{ background: 'var(--color-primary)' }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Course
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">!</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Course List */}
        {courses.length > 0 ? (
          <div className="space-y-6">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:border-gray-400 transition-colors"
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
                      <span>👥 {course.totalStudents?.toLocaleString() || 0} students</span>
                      <span>-</span>
                      <span>📚 {course.totalLessons} lessons</span>
                      <span>-</span>
                      <span>💰 ${course.price}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {course.status === 'IN_PROGRESS' ? (
                    <Link
                      href={`/srv/${expertId}/courses/${course.id}`}
                      className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                    >
                      Continue Setup
                    </Link>
                  ) : (
                    <Link
                      href={`/srv/${expertId}/courses/${course.id}`}
                      className="px-4 py-2 text-white text-sm rounded-lg transition-colors font-medium"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Manage Course
                    </Link>
                  )}
                  <Link
                    href={`/srv/${expertId}/courses/${course.id}/edit`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Edit Details
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
          <div className="bg-white rounded-lg shadow text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first course to start sharing your expertise
            </p>
            <Link
              href={`/srv/${expertId}/courses/create`}
              className="inline-flex items-center px-6 py-3 text-white font-semibold rounded-lg transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              <span className="text-xl mr-2">+</span>
              Create First Course
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
