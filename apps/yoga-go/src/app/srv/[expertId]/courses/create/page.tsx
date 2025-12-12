'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import VideoUpload from '@/components/VideoUpload';
import type { VideoUploadResult } from '@/components/VideoUpload';
import type { Asset } from '@/types';

export default function CreateCoursePage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [coverImageAsset, setCoverImageAsset] = useState<Asset | null>(null);

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
    console.log('[DBG][create-course] Cover image uploaded:', asset);
    setCoverImageAsset(asset);
    setFormData(prev => ({
      ...prev,
      coverImage: asset.croppedUrl || asset.originalUrl,
    }));
    setUploadError('');
  };

  const handleImageUploadError = (errorMsg: string) => {
    console.error('[DBG][create-course] Image upload error:', errorMsg);
    setUploadError(errorMsg);
  };

  const handlePromoVideoUploadComplete = (result: VideoUploadResult) => {
    console.log('[DBG][create-course] Promo video upload complete:', result);
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
    console.error('[DBG][create-course] Promo video upload error:', errorMsg);
    setError(errorMsg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('[DBG][create-course] Submitting course creation form');

    try {
      // Prepare the data
      const courseData = {
        title: formData.title,
        description: formData.description,
        instructor: {
          id: expertId,
          name: expertId.charAt(0).toUpperCase() + expertId.slice(1), // Capitalize first letter
          title: 'Yoga Expert',
        },
        thumbnail: '/images/default-course.jpg',
        coverImage: formData.coverImage || undefined,
        promoVideoCloudflareId: formData.promoVideoCloudflareId || undefined,
        promoVideoStatus: formData.promoVideoStatus || undefined,
        level: formData.level,
        duration: formData.duration,
        totalLessons: 0,
        freeLessons: 0,
        price: parseFloat(formData.price),
        rating: 5.0,
        totalStudents: 0,
        category: formData.category,
        tags: [],
        featured: false,
        isNew: true,
        requirements: formData.requirements
          ? formData.requirements.split('\n').filter(r => r.trim())
          : [],
        whatYouWillLearn: formData.whatYouWillLearn
          ? formData.whatYouWillLearn.split('\n').filter(w => w.trim())
          : [],
        curriculum: [],
      };

      console.log('[DBG][create-course] Course data:', courseData);

      // Call the POST endpoint
      const response = await fetch('/data/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create course');
      }

      console.log('[DBG][create-course] Course created successfully:', result.data);

      // Redirect to course management page to add lessons
      router.push(`/srv/${expertId}/courses/${result.data.id}`);
    } catch (err) {
      console.error('[DBG][create-course] Error creating course:', err);
      setError(err instanceof Error ? err.message : 'Failed to create course');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/srv" className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Course</h1>
          <p className="text-gray-600 mt-2">Fill in the details below to create your new course</p>
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
                <h3 className="text-sm font-medium text-red-800">Error creating course</h3>
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
                  label="Cover Image (1200x600px)"
                  onUploadComplete={handleCoverImageUpload}
                  onError={handleImageUploadError}
                  relatedTo={
                    formData.title
                      ? {
                          type: 'course',
                          id: formData.title.toLowerCase().replace(/\s+/g, '-'),
                        }
                      : undefined
                  }
                  currentImageUrl={formData.coverImage}
                />
                {coverImageAsset && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">✓ Cover image uploaded successfully</p>
                  </div>
                )}
                {uploadError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{uploadError}</p>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  This image will be displayed in course cards and as the hero banner on the course
                  page. Recommended size: 1200x600px (2:1 aspect ratio)
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
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating...
                </>
              ) : (
                <>
                  <span>Create Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
