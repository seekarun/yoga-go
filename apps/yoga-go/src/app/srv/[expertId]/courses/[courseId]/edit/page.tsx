'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Course, Asset } from '@/types';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import VideoUpload from '@/components/VideoUpload';
import type { VideoUploadResult } from '@/components/VideoUpload';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const courseId = params.courseId as string;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coverImage: '',
    promoVideoCloudflareId: '',
    promoVideoStatus: '' as 'uploading' | 'processing' | 'ready' | 'error' | '',
    level: 'Beginner',
    duration: '',
    price: '',
    category: 'Yoga',
    requirements: '',
    whatYouWillLearn: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_coverImageAsset, setCoverImageAsset] = useState<Asset | null>(null);
  const [uploadError, setUploadError] = useState('');

  // Fetch existing course data on mount
  useEffect(() => {
    fetchCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      console.log('[DBG][edit-course] Fetching course data:', courseId);

      const response = await fetch(`/data/courses/${courseId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load course');
      }

      const course: Course = result.data;
      console.log('[DBG][edit-course] Course loaded:', course);

      // Populate form with existing data
      setFormData({
        title: course.title || '',
        description: course.description || '',
        coverImage: course.coverImage || '',
        promoVideoCloudflareId: course.promoVideoCloudflareId || '',
        promoVideoStatus: course.promoVideoStatus || '',
        level: course.level || 'Beginner',
        duration: course.duration || '',
        price: course.price?.toString() || '',
        category: course.category || 'Yoga',
        requirements: course.requirements?.join('\n') || '',
        whatYouWillLearn: course.whatYouWillLearn?.join('\n') || '',
      });
    } catch (err) {
      console.error('[DBG][edit-course] Error loading course:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoverImageUpload = (asset: Asset) => {
    console.log('[DBG][edit-course] Cover image uploaded:', asset);
    setCoverImageAsset(asset);
    setFormData(prev => ({
      ...prev,
      coverImage: asset.croppedUrl || asset.originalUrl,
    }));
    setUploadError('');
  };

  const handleImageUploadError = (errorMsg: string) => {
    console.error('[DBG][edit-course] Image upload error:', errorMsg);
    setUploadError(errorMsg);
  };

  const handlePromoVideoUploadComplete = (result: VideoUploadResult) => {
    console.log('[DBG][edit-course] Promo video upload complete:', result);
    setFormData(prev => ({
      ...prev,
      promoVideoCloudflareId: result.videoId,
      promoVideoStatus: result.status,
    }));
  };

  const handlePromoVideoClear = () => {
    setFormData(prev => ({
      ...prev,
      promoVideoCloudflareId: '',
      promoVideoStatus: '',
    }));
  };

  const handlePromoVideoError = (errorMsg: string) => {
    console.error('[DBG][edit-course] Promo video upload error:', errorMsg);
    setError(errorMsg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    console.log('[DBG][edit-course] Submitting course update form');

    try {
      // Prepare the data
      const courseData = {
        title: formData.title,
        description: formData.description,
        coverImage: formData.coverImage || undefined,
        promoVideoCloudflareId: formData.promoVideoCloudflareId || undefined,
        promoVideoStatus: formData.promoVideoStatus || undefined,
        level: formData.level,
        duration: formData.duration,
        price: parseFloat(formData.price),
        category: formData.category,
        requirements: formData.requirements
          ? formData.requirements.split('\n').filter(r => r.trim())
          : [],
        whatYouWillLearn: formData.whatYouWillLearn
          ? formData.whatYouWillLearn.split('\n').filter(w => w.trim())
          : [],
      };

      console.log('[DBG][edit-course] Course data:', courseData);

      // Call the PUT endpoint to update the course
      const response = await fetch(`/data/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update course');
      }

      console.log('[DBG][edit-course] Course updated successfully:', result.data);

      // Redirect back to expert dashboard
      router.push(`/srv/${expertId}`);
    } catch (err) {
      console.error('[DBG][edit-course] Error updating course:', err);
      setError(err instanceof Error ? err.message : 'Failed to update course');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading course..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/srv" className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Course</h1>
          <p className="text-gray-600 mt-2">Update the details of your course</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error updating course</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Advanced Hatha Yoga Practice"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Course Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what students will learn in this course"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                    Level *
                  </label>
                  <select
                    id="level"
                    name="level"
                    required
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Yoga">Yoga</option>
                    <option value="Meditation">Meditation</option>
                    <option value="Pranayama">Pranayama</option>
                    <option value="Philosophy">Philosophy</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Course Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Course Details</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Duration *
                  </label>
                  <input
                    type="text"
                    id="duration"
                    name="duration"
                    required
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 8 weeks, 3 months"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="99.99"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Media</h2>

            <div className="space-y-4">
              {/* Cover Image Upload */}
              <div>
                <ImageUploadCrop
                  width={1200}
                  height={600}
                  category="course"
                  tenantId={expertId}
                  label="Cover Image (1200x600px)"
                  onUploadComplete={handleCoverImageUpload}
                  onError={handleImageUploadError}
                  relatedTo={{
                    type: 'course',
                    id: courseId,
                  }}
                  currentImageUrl={formData.coverImage}
                />
                {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
                <p className="text-sm text-gray-500 mt-2">
                  Upload a cover image for your course (shown on course cards and as hero banner).
                  Recommended size: 1200x600px
                </p>
              </div>

              {/* Promo Video Upload */}
              <div>
                <VideoUpload
                  label="Promo Video Upload"
                  maxDurationSeconds={600}
                  videoId={formData.promoVideoCloudflareId}
                  videoStatus={formData.promoVideoStatus}
                  onUploadComplete={handlePromoVideoUploadComplete}
                  onClear={handlePromoVideoClear}
                  onError={handlePromoVideoError}
                  helpText="Upload a promo video file (MP4, MOV, etc.). Max duration: 10 minutes. This video will be shown to users to preview your course."
                />
              </div>
            </div>
          </div>

          {/* Learning Outcomes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Course Content</h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="requirements"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Requirements (one per line)
                </label>
                <textarea
                  id="requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Basic yoga knowledge&#10;Yoga mat&#10;Comfortable clothing"
                />
              </div>

              <div>
                <label
                  htmlFor="whatYouWillLearn"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  What You Will Learn (one per line)
                </label>
                <textarea
                  id="whatYouWillLearn"
                  name="whatYouWillLearn"
                  value={formData.whatYouWillLearn}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Advanced asana techniques&#10;Proper breathing methods&#10;Meditation practices"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/srv/${expertId}`}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
