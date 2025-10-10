'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Lesson } from '@/types';
import { mockLessons } from '@/data/mockData';
import { mockCourses } from '@/data/mockData';

export default function CourseManagement() {
  const params = useParams();
  const expertId = params.expertId as string;
  const courseId = params.courseId as string;

  const [items, setItems] = useState<Lesson[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const courseData = mockCourses[courseId];
      const itemsData = mockLessons[courseId] || [];
      setCourse(courseData);
      setItems(itemsData);
      setLoading(false);
    }, 300);
  }, [courseId]);

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

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Course Not Found</h1>
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
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add New Item
            </button>
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
                <p className="text-gray-500 mb-4">No items added yet</p>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Your First Item
                </button>
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

      {/* Upload Form Modal */}
      {showUploadForm && (
        <UploadItemForm
          courseId={courseId}
          onClose={() => setShowUploadForm(false)}
          onSuccess={newItem => {
            setItems([...items, newItem]);
            setShowUploadForm(false);
          }}
        />
      )}
    </div>
  );
}

function UploadItemForm({
  courseId,
  onClose,
  onSuccess,
}: {
  courseId: string;
  onClose: () => void;
  onSuccess: (item: Lesson) => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    isFree: false,
    videoFile: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    // Simulate upload
    setTimeout(() => {
      const newItem: Lesson = {
        id: `${courseId}-item-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        duration: formData.duration,
        isFree: formData.isFree,
        videoUrl: formData.videoFile ? `/videos/${courseId}/${formData.videoFile.name}` : undefined,
      };

      setUploading(false);
      onSuccess(newItem);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Course Item</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Introduction to Sun Salutations"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of this lesson..."
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.duration}
              onChange={e => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 15 min"
            />
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept="video/*"
                required
                onChange={e => setFormData({ ...formData, videoFile: e.target.files?.[0] || null })}
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">🎥</div>
                {formData.videoFile ? (
                  <p className="text-sm text-gray-900 font-medium">{formData.videoFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Click to upload video</p>
                    <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI (max 500MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Free Access */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isFree"
              checked={formData.isFree}
              onChange={e => setFormData({ ...formData, isFree: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isFree" className="ml-2 text-sm text-gray-700">
              Make this item available for free (preview)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Uploading...</span>
                </>
              ) : (
                'Upload Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
