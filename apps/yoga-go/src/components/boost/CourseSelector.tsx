'use client';

import type { Course } from '@/types';

interface CourseSelectorProps {
  courses: Course[];
  value: string | null;
  onChange: (courseId: string | null) => void;
  loading?: boolean;
}

export default function CourseSelector({ courses, value, onChange, loading }: CourseSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
        <svg
          className="w-8 h-8 text-yellow-500 mx-auto mb-2"
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
        <p className="text-yellow-800 font-medium">No courses available</p>
        <p className="text-sm text-yellow-600 mt-1">
          Create a course first to promote it with a boost campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {courses.map(course => (
        <button
          key={course.id}
          type="button"
          onClick={() => onChange(value === course.id ? null : course.id)}
          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
            value === course.id
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          {/* Course Thumbnail */}
          <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {course.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Course Info */}
          <div className="flex-1 min-w-0">
            <h4
              className={`font-medium truncate ${
                value === course.id ? 'text-indigo-900' : 'text-gray-900'
              }`}
            >
              {course.title}
            </h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="capitalize">{course.level}</span>
              <span>•</span>
              <span>{course.totalLessons} lessons</span>
              {course.price > 0 && (
                <>
                  <span>•</span>
                  <span>${(course.price / 100).toFixed(0)}</span>
                </>
              )}
            </div>
          </div>

          {/* Selection Indicator */}
          {value === course.id && (
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
