'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset } from '@/types';

export default function CreateCoursePage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    longDescription: '',
    thumbnail: '',
    coverImage: '',
    promoVideo: '',
    promoVideoCloudflareId: '',
    promoVideoStatus: '' as 'uploading' | 'processing' | 'ready' | 'error' | '',
    level: 'Beginner',
    duration: '',
    totalLessons: 0,
    freeLessons: 0,
    price: '',
    category: 'Yoga',
    tags: '',
    featured: false,
    requirements: '',
    whatYouWillLearn: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [coverImageAsset, setCoverImageAsset] = useState<Asset | null>(null);
  const [selectedPromoFile, setSelectedPromoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(null);

  // Poll video status for processing promo videos
  useEffect(() => {
    if (!pollingVideoId) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('[DBG][create-course] Polling video status for:', pollingVideoId);

        const response = await fetch(`/api/cloudflare/video-status/${pollingVideoId}`);
        const data = await response.json();

        if (data.success) {
          const videoStatus = data.data.status;
          const isReady = data.data.readyToStream;

          console.log('[DBG][create-course] Video status:', videoStatus, 'Ready:', isReady);

          // Update formData if this is the currently uploading video
          if (formData.promoVideoCloudflareId === pollingVideoId) {
            const newStatus = isReady ? 'ready' : videoStatus === 'error' ? 'error' : 'processing';

            setFormData(prev => ({
              ...prev,
              promoVideoStatus: newStatus,
            }));

            // If ready or error, stop polling
            if (isReady || videoStatus === 'error') {
              console.log('[DBG][create-course] Video processing complete, stopping poll');
              setPollingVideoId(null);
            }
          }
        }
      } catch (err) {
        console.error('[DBG][create-course] Error polling video status:', err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [pollingVideoId, formData.promoVideoCloudflareId]);

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

  const handlePromoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[DBG][create-course] Promo video file selected:', file.name, file.size);
      setSelectedPromoFile(file);
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

  const handleImageUploadError = (error: string) => {
    console.error('[DBG][create-course] Image upload error:', error);
    setUploadError(error);
  };

  const handlePromoVideoUpload = async () => {
    if (!selectedPromoFile) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('[DBG][create-course] Starting promo video upload');

      // Step 1: Get upload URL from our API
      const uploadUrlResponse = await fetch('/api/cloudflare/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationSeconds: 600 }), // 10 minutes max for promo
      });

      const uploadUrlData = await uploadUrlResponse.json();
      if (!uploadUrlData.success) {
        throw new Error(uploadUrlData.error || 'Failed to get upload URL');
      }

      const { uploadURL, uid } = uploadUrlData.data;
      console.log('[DBG][create-course] Got upload URL for promo video:', uid);

      // Step 2: Upload video to Cloudflare using tus protocol
      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedPromoFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          console.log('[DBG][create-course] Upload progress:', percentComplete, '%');
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', uploadURL);
        xhr.send(formDataUpload);
      });

      console.log('[DBG][create-course] Promo video uploaded successfully:', uid);

      // Step 3: Update form data with video ID
      setFormData(prev => ({
        ...prev,
        promoVideoCloudflareId: uid,
        promoVideoStatus: 'processing',
      }));

      setUploadProgress(100);

      // Start polling for video status
      console.log('[DBG][create-course] Starting status polling for:', uid);
      setPollingVideoId(uid);

      alert('Promo video uploaded successfully! Processing status will update automatically.');
    } catch (err) {
      console.error('[DBG][create-course] Error uploading promo video:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload promo video');
    } finally {
      setIsUploading(false);
    }
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
        longDescription: formData.longDescription || formData.description,
        instructor: {
          id: expertId,
          name: expertId.charAt(0).toUpperCase() + expertId.slice(1), // Capitalize first letter
          title: 'Yoga Expert',
        },
        thumbnail: formData.thumbnail || '/images/default-course.jpg',
        coverImage: formData.coverImage || undefined,
        promoVideo: formData.promoVideo || undefined,
        promoVideoCloudflareId: formData.promoVideoCloudflareId || undefined,
        promoVideoStatus: formData.promoVideoStatus || undefined,
        level: formData.level,
        duration: formData.duration,
        totalLessons: formData.totalLessons,
        freeLessons: formData.freeLessons,
        price: parseFloat(formData.price),
        rating: 5.0,
        totalStudents: 0,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        featured: formData.featured,
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

      // Redirect to lesson management page to add course items
      router.push(`/srv/${expertId}/courses/${result.data.id}/lessons`);
    } catch (err) {
      console.error('[DBG][create-course] Error creating course:', err);
      setError(err instanceof Error ? err.message : 'Failed to create course');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/srv/${expertId}`}
            className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block"
          >
            ← Back to Dashboard
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
                  Short Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your course (1-2 sentences)"
                />
              </div>

              <div>
                <label
                  htmlFor="longDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Detailed Description
                </label>
                <textarea
                  id="longDescription"
                  name="longDescription"
                  value={formData.longDescription}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detailed description of what students will learn"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="totalLessons"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Total Lessons
                  </label>
                  <input
                    type="number"
                    id="totalLessons"
                    name="totalLessons"
                    min="0"
                    value={formData.totalLessons}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0 (can add later)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="freeLessons"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Free Preview Lessons
                  </label>
                  <input
                    type="number"
                    id="freeLessons"
                    name="freeLessons"
                    min="0"
                    value={formData.freeLessons}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., yoga, meditation, flexibility"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                  Mark as featured course
                </label>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Media</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 mb-2">
                  Thumbnail URL
                </label>
                <input
                  type="text"
                  id="thumbnail"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="/images/courses/my-course.jpg"
                />
                <p className="text-sm text-gray-500 mt-1">Leave empty to use default image</p>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Video Upload
                </label>

                {formData.promoVideoCloudflareId ? (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm font-medium text-green-800">
                        Promo video uploaded
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Video ID: {formData.promoVideoCloudflareId}
                    </p>
                    {formData.promoVideoStatus && (
                      <p className="text-sm text-gray-600">Status: {formData.promoVideoStatus}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          promoVideoCloudflareId: '',
                          promoVideoStatus: '',
                        }));
                        setSelectedPromoFile(null);
                        setUploadProgress(0);
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Upload different video
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      id="promoVideoFile"
                      accept="video/*"
                      onChange={handlePromoFileSelect}
                      disabled={isUploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {selectedPromoFile && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Selected: {selectedPromoFile.name} (
                          {(selectedPromoFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                        <button
                          type="button"
                          onClick={handlePromoVideoUpload}
                          disabled={isUploading}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        >
                          {isUploading ? 'Uploading...' : 'Upload Promo Video'}
                        </button>
                      </div>
                    )}
                    {isUploading && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
                      </div>
                    )}
                  </>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Upload a promo video file (MP4, MOV, etc.). Max duration: 10 minutes. This video
                  will be shown to users to preview your course.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="promoVideo"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Or enter a Promo Video URL (YouTube, Vimeo, etc.)
                  </label>
                  <input
                    type="text"
                    id="promoVideo"
                    name="promoVideo"
                    value={formData.promoVideo}
                    onChange={handleChange}
                    disabled={!!formData.promoVideoCloudflareId}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Optional: Use this if you have a promo video hosted elsewhere
                  </p>
                </div>
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
