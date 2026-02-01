'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SectionEditorProps } from '../types';
import type { Course } from '@/types';

export default function CoursesEditor({ data, onChange, expertId }: SectionEditorProps) {
  const courses = data.courses || {};
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(`/data/courses?instructorId=${expertId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setCourseList(result.data);
        }
      } catch (err) {
        console.error('[DBG][CoursesEditor] Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [expertId]);

  const handleChange = (field: 'title' | 'description', value: string) => {
    onChange({
      courses: {
        ...courses,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-800">
              This section displays your courses in a carousel. Create and manage courses from your
              dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Course Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Course Status</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Courses</span>
              <span className="text-sm font-medium text-gray-900">{courseList.length}</span>
            </div>
            {courseList.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Your Courses</span>
                {courseList.slice(0, 3).map(course => (
                  <div key={course.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-700 truncate max-w-[200px]">{course.title}</span>
                    <span className="text-gray-500">
                      {course.price === 0 ? 'Free' : `$${course.price}`}
                    </span>
                  </div>
                ))}
                {courseList.length > 3 && (
                  <p className="text-xs text-gray-500">+{courseList.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Courses Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href={`/srv/${expertId}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Manage Courses
          </Link>
        </div>
      </div>

      {/* Section Customization */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Section Settings</h4>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Section Title</label>
          <input
            type="text"
            value={courses.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Courses"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
          <input
            type="text"
            value={courses.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Start your learning journey with our expert"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* No Courses Warning */}
      {!loading && courseList.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">No courses yet</p>
              <p className="text-sm text-amber-700 mt-1">
                Create your first course to show this section on your landing page.
              </p>
              <Link
                href={`/srv/${expertId}/courses/create`}
                className="inline-flex items-center gap-1 mt-2 text-sm text-amber-800 hover:text-amber-900 font-medium underline"
              >
                Create your first course
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
