'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Lesson, Course } from '@/types';

export default function CourseManagement() {
  const params = useParams();
  const expertId = params.expertId as string;
  const courseId = params.courseId as string;

  const [items, setItems] = useState<Lesson[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourseAndItems();
  }, [courseId]);

  const fetchCourseAndItems = async () => {
    try {
      setLoading(true);
      console.log('[DBG][course-management] Fetching course:', courseId);

      // Fetch course details
      const courseRes = await fetch(`/data/courses/${courseId}`);
      const courseData = await courseRes.json();

      if (!courseData.success) {
        setError('Course not found');
        setLoading(false);
        return;
      }

      setCourse(courseData.data);

      // Fetch course items/lessons
      const itemsRes = await fetch(`/data/courses/${courseId}/items`);
      const itemsData = await itemsRes.json();

      if (itemsData.success) {
        setItems(itemsData.data || []);
        console.log('[DBG][course-management] Items loaded:', itemsData.data?.length || 0);
      }

      setLoading(false);
    } catch (err) {
      console.error('[DBG][course-management] Error fetching data:', err);
      setError('Failed to load course data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{error || 'Course Not Found'}</h1>
          <Link
            href={`/srv/${expertId}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/srv/${expertId}`}
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-600 mt-1">{course.description}</p>
            </div>
            <Link
              href={`/srv/${expertId}/courses/${courseId}/lessons`}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Manage Lessons
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Items</p>
            <p className="text-3xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Free Items</p>
            <p className="text-3xl font-bold text-gray-900">
              {items.filter(item => item.isFree).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Duration</p>
            <p className="text-3xl font-bold text-gray-900">
              {items.reduce((acc, item) => acc + parseInt(item.duration), 0)} min
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Course Price</p>
            <p className="text-3xl font-bold text-gray-900">${course.price}</p>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Course Items</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {items.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 mb-4">No lessons added yet</p>
                <Link
                  href={`/srv/${expertId}/courses/${courseId}/lessons`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Your First Lesson
                </Link>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                          {item.isFree && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Free
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>⏱️ {item.duration}</span>
                          {item.videoUrl && <span>🎥 Video uploaded</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        Edit
                      </button>
                      <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        Delete
                      </button>
                    </div>
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
