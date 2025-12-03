'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Course, Lesson } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';

// Helper function to format duration from seconds to MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function CourseManagement() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Form state for adding/editing lessons
  const [formData, setFormData] = useState({
    title: '',
    duration: '',
    description: '',
    cloudflareVideoId: '',
    cloudflareVideoStatus: '' as 'uploading' | 'processing' | 'ready' | 'error' | '',
  });
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  useEffect(() => {
    fetchCourseAndLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Poll video status for processing videos
  useEffect(() => {
    if (!pollingVideoId) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('[DBG][course-management] Polling video status for:', pollingVideoId);

        const response = await fetch(`/api/cloudflare/video-status/${pollingVideoId}`);
        const data = await response.json();

        if (data.success) {
          const videoStatus = data.data.status;
          const isReady = data.data.readyToStream;
          const videoDuration = data.data.duration; // Duration in seconds

          console.log(
            '[DBG][course-management] Video status:',
            videoStatus,
            'Ready:',
            isReady,
            'Duration:',
            videoDuration
          );

          // Update formData if this is the currently uploading video
          if (formData.cloudflareVideoId === pollingVideoId) {
            const newStatus = isReady ? 'ready' : videoStatus === 'error' ? 'error' : 'processing';

            setFormData(prev => ({
              ...prev,
              cloudflareVideoStatus: newStatus,
              // Auto-populate duration if available and not already set
              duration:
                videoDuration && !prev.duration ? formatDuration(videoDuration) : prev.duration,
            }));

            // If ready or error, stop polling and update the lesson in DB
            if (isReady || videoStatus === 'error') {
              console.log('[DBG][course-management] Video processing complete, stopping poll');
              setPollingVideoId(null);

              // Update the lesson in the database with new status
              if (editingLessonId) {
                await fetch(`/data/courses/${courseId}/items/${editingLessonId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cloudflareVideoStatus: newStatus,
                  }),
                });
              }
            }
          }

          // Also update lessons list if any lesson has this video
          const lessonToUpdate = lessons.find(l => l.cloudflareVideoId === pollingVideoId);
          if (lessonToUpdate) {
            const newStatus = isReady ? 'ready' : videoStatus === 'error' ? 'error' : 'processing';

            // If status changed, update the lesson
            if (lessonToUpdate.cloudflareVideoStatus !== newStatus) {
              console.log('[DBG][course-management] Updating lesson status in DB');

              await fetch(`/data/courses/${courseId}/items/${lessonToUpdate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cloudflareVideoStatus: newStatus,
                }),
              });

              // Refresh lessons list
              await fetchCourseAndLessons();

              // If ready or error, stop polling
              if (isReady || videoStatus === 'error') {
                setPollingVideoId(null);
              }
            }
          }
        }
      } catch (err) {
        console.error('[DBG][course-management] Error polling video status:', err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingVideoId, formData.cloudflareVideoId, editingLessonId, lessons, courseId]);

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);
      console.log('[DBG][course-management] Fetching course and lessons:', courseId);

      // Fetch course details
      const courseRes = await fetch(`/data/courses/${courseId}`);
      const courseData = await courseRes.json();

      if (courseData.success) {
        setCourse(courseData.data);
        console.log('[DBG][course-management] Course loaded:', courseData.data);
      } else {
        setError('Failed to load course');
        return;
      }

      // Fetch lessons
      const lessonsRes = await fetch(`/data/courses/${courseId}/items`);
      const lessonsData = await lessonsRes.json();

      if (lessonsData.success) {
        setLessons(lessonsData.data || []);
        console.log('[DBG][course-management] Lessons loaded:', lessonsData.data);

        // Check if any lesson has a video in processing state and start polling
        const processingLesson = lessonsData.data?.find(
          (l: Lesson) => l.cloudflareVideoId && l.cloudflareVideoStatus === 'processing'
        );
        if (processingLesson && !pollingVideoId) {
          console.log(
            '[DBG][course-management] Found processing video, starting poll:',
            processingLesson.cloudflareVideoId
          );
          setPollingVideoId(processingLesson.cloudflareVideoId);
        }
      }
    } catch (err) {
      console.error('[DBG][course-management] Error fetching data:', err);
      setError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddLesson = () => {
    setFormData({
      title: '',
      duration: '',
      description: '',
      cloudflareVideoId: '',
      cloudflareVideoStatus: '',
    });
    setEditingLessonId(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setShowAddForm(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setFormData({
      title: lesson.title,
      duration: lesson.duration,
      description: lesson.description || '',
      cloudflareVideoId: lesson.cloudflareVideoId || '',
      cloudflareVideoStatus: lesson.cloudflareVideoStatus || '',
    });
    setEditingLessonId(lesson.id);
    setSelectedFile(null);
    setUploadProgress(0);
    setShowAddForm(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[DBG][course-management] File selected:', file.name, file.size);
      setSelectedFile(file);
    }
  };

  const handleVideoUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('[DBG][course-management] Starting video upload');

      // Step 1: Get upload URL from our API
      const uploadUrlResponse = await fetch('/api/cloudflare/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationSeconds: 7200 }), // 2 hours max
      });

      const uploadUrlData = await uploadUrlResponse.json();
      if (!uploadUrlData.success) {
        throw new Error(uploadUrlData.error || 'Failed to get upload URL');
      }

      const { uploadURL, uid } = uploadUrlData.data;
      console.log('[DBG][course-management] Got upload URL for video:', uid);

      // Step 2: Upload video to Cloudflare using tus protocol
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          console.log('[DBG][course-management] Upload progress:', percentComplete, '%');
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
        xhr.send(formData);
      });

      console.log('[DBG][course-management] Video uploaded successfully:', uid);

      // Step 3: Fetch video status immediately to get duration
      try {
        const statusResponse = await fetch(`/api/cloudflare/video-status/${uid}`);
        const statusData = await statusResponse.json();

        if (statusData.success && statusData.data.duration) {
          const videoDuration = statusData.data.duration;
          const formattedDuration = formatDuration(videoDuration);

          console.log(
            '[DBG][course-management] Video duration:',
            videoDuration,
            'seconds =',
            formattedDuration
          );

          // Update form data with video ID, status, and duration
          setFormData(prev => ({
            ...prev,
            cloudflareVideoId: uid,
            cloudflareVideoStatus: 'processing',
            duration: formattedDuration,
          }));
        } else {
          // If duration not available yet, just set the video ID and status
          setFormData(prev => ({
            ...prev,
            cloudflareVideoId: uid,
            cloudflareVideoStatus: 'processing',
          }));
        }
      } catch (statusErr) {
        console.error('[DBG][course-management] Error fetching video status:', statusErr);
        // Continue anyway, just set the video ID and status
        setFormData(prev => ({
          ...prev,
          cloudflareVideoId: uid,
          cloudflareVideoStatus: 'processing',
        }));
      }

      setUploadProgress(100);

      // Start polling for video status
      console.log('[DBG][course-management] Starting status polling for:', uid);
      setPollingVideoId(uid);

      // Show notification overlay
      setNotificationMessage('Video uploaded successfully! Duration auto-detected from video.');
      setShowNotification(true);
    } catch (err) {
      console.error('[DBG][course-management] Error uploading video:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLesson(true);
    setError(null);

    try {
      const lessonData = {
        title: formData.title,
        duration: formData.duration,
        description: formData.description,
        cloudflareVideoId: formData.cloudflareVideoId,
        cloudflareVideoStatus: formData.cloudflareVideoStatus,
        courseId: courseId,
      };

      if (editingLessonId) {
        // Update existing lesson
        const response = await fetch(`/data/courses/${courseId}/items/${editingLessonId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonData),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update lesson');
        }

        console.log('[DBG][course-management] Lesson updated:', result.data);
      } else {
        // Create new lesson
        const response = await fetch(`/data/courses/${courseId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonData),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create lesson');
        }

        console.log('[DBG][course-management] Lesson created:', result.data);
      }

      // Refresh lessons
      await fetchCourseAndLessons();
      setShowAddForm(false);
      setEditingLessonId(null);
    } catch (err) {
      console.error('[DBG][course-management] Error saving lesson:', err);
      setError(err instanceof Error ? err.message : 'Failed to save lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      const response = await fetch(`/data/courses/${courseId}/items/${lessonId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete lesson');
      }

      console.log('[DBG][course-management] Lesson deleted:', lessonId);

      // Refresh lessons
      await fetchCourseAndLessons();
    } catch (err) {
      console.error('[DBG][course-management] Error deleting lesson:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete lesson');
    }
  };

  const handlePublishCourse = () => {
    if (lessons.length === 0) {
      setError('Please add at least one lesson before publishing the course');
      return;
    }

    // Show confirmation overlay
    setShowPublishConfirm(true);
  };

  const confirmPublishCourse = async () => {
    setPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/data/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PUBLISHED',
          totalLessons: lessons.length,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish course');
      }

      console.log('[DBG][course-management] Course published successfully');

      // Redirect to expert dashboard
      router.push(`/srv/${expertId}`);
    } catch (err) {
      console.error('[DBG][course-management] Error publishing course:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish course');
    } finally {
      setPublishing(false);
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

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <Link
            href={`/srv/${expertId}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            ← Back to Home
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
            className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block"
          >
            ← Back to Home
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-600 mt-2">Add and manage course lessons</p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    course.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-800'
                      : course.status === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {course.status || 'IN_PROGRESS'}
                </span>
                <span className="text-sm text-gray-600">{lessons.length} lessons</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/srv/${expertId}/courses/${courseId}/reviews`}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                ⭐ Reviews
              </Link>
              {course.status !== 'PUBLISHED' && (
                <button
                  onClick={handlePublishCourse}
                  disabled={publishing || lessons.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  {publishing ? 'Publishing...' : 'Publish Course'}
                </button>
              )}
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

        {/* Add Lesson Button */}
        {!showAddForm && (
          <div className="mb-6">
            <button
              onClick={handleAddLesson}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="text-xl mr-2">+</span>
              Add New Lesson
            </button>
          </div>
        )}

        {/* Add/Edit Lesson Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}
            </h2>
            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Sun Salutation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Upload</label>

                {formData.cloudflareVideoId ? (
                  <div
                    className={`mb-4 p-4 rounded-lg ${
                      formData.cloudflareVideoStatus === 'ready'
                        ? 'bg-green-50 border border-green-200'
                        : formData.cloudflareVideoStatus === 'processing'
                          ? 'bg-orange-50 border border-orange-200'
                          : formData.cloudflareVideoStatus === 'error'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-blue-50 border border-blue-200'
                    } ${formData.cloudflareVideoStatus === 'processing' ? 'video-processing-pulse' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`${
                          formData.cloudflareVideoStatus === 'ready'
                            ? 'text-green-600'
                            : formData.cloudflareVideoStatus === 'processing'
                              ? 'text-orange-600'
                              : formData.cloudflareVideoStatus === 'error'
                                ? 'text-red-600'
                                : 'text-blue-600'
                        }`}
                      >
                        {formData.cloudflareVideoStatus === 'ready'
                          ? '✓'
                          : formData.cloudflareVideoStatus === 'processing'
                            ? '⟳'
                            : formData.cloudflareVideoStatus === 'error'
                              ? '⚠'
                              : '↑'}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          formData.cloudflareVideoStatus === 'ready'
                            ? 'text-green-800'
                            : formData.cloudflareVideoStatus === 'processing'
                              ? 'text-orange-800'
                              : formData.cloudflareVideoStatus === 'error'
                                ? 'text-red-800'
                                : 'text-blue-800'
                        }`}
                      >
                        {formData.cloudflareVideoStatus === 'ready'
                          ? 'Video ready'
                          : formData.cloudflareVideoStatus === 'processing'
                            ? 'Processing video...'
                            : formData.cloudflareVideoStatus === 'error'
                              ? 'Upload error'
                              : 'Video uploaded'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Video ID: {formData.cloudflareVideoId}</p>
                    {formData.cloudflareVideoStatus && (
                      <p
                        className={`text-sm font-medium ${
                          formData.cloudflareVideoStatus === 'ready'
                            ? 'text-green-700'
                            : formData.cloudflareVideoStatus === 'processing'
                              ? 'text-orange-700'
                              : formData.cloudflareVideoStatus === 'error'
                                ? 'text-red-700'
                                : 'text-gray-600'
                        }`}
                      >
                        Status: {formData.cloudflareVideoStatus}
                      </p>
                    )}
                    {formData.duration && (
                      <p className="text-sm font-medium text-blue-700 mt-2">
                        ⏱️ Duration: {formData.duration}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          cloudflareVideoId: '',
                          cloudflareVideoStatus: '',
                          duration: '',
                        }));
                        setSelectedFile(null);
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
                      id="videoFile"
                      accept="video/*"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {selectedFile && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Selected: {selectedFile.name} (
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                        <button
                          type="button"
                          onClick={handleVideoUpload}
                          disabled={isUploading}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        >
                          {isUploading ? 'Uploading...' : 'Upload Video'}
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
                  Upload a video file (MP4, MOV, etc.). Max duration: 2 hours
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what students will learn in this lesson"
                />
              </div>

              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingLessonId(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLesson}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {savingLesson ? 'Saving...' : editingLessonId ? 'Update Lesson' : 'Add Lesson'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lessons List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Course Lessons</h2>
          </div>
          <div className="p-6">
            {lessons.length > 0 ? (
              <div className="space-y-4">
                {lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-500 font-medium">#{idx + 1}</span>
                          <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>⏱️ {lesson.duration}</span>
                          {lesson.cloudflareVideoId && (
                            <span>
                              🎥 Video
                              {lesson.cloudflareVideoStatus && (
                                <span
                                  className={`ml-2 px-2 py-1 rounded text-xs ${
                                    lesson.cloudflareVideoStatus === 'ready'
                                      ? 'bg-green-100 text-green-800'
                                      : lesson.cloudflareVideoStatus === 'processing'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : lesson.cloudflareVideoStatus === 'error'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {lesson.cloudflareVideoStatus}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mt-2">{lesson.description}</p>
                        )}

                        {/* Video Preview */}
                        {lesson.cloudflareVideoId && (
                          <div className="mt-4">
                            {expandedVideoId === lesson.id ? (
                              <div className="space-y-2">
                                <iframe
                                  src={`https://customer-iq7mgkvtb3bwxqf5.cloudflarestream.com/${lesson.cloudflareVideoId}/iframe?preload=true&poster=https%3A%2F%2Fcustomer-iq7mgkvtb3bwxqf5.cloudflarestream.com%2F${lesson.cloudflareVideoId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D0s%26height%3D600`}
                                  className="w-full aspect-video rounded-lg border border-gray-300"
                                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                  allowFullScreen
                                  title={lesson.title}
                                />
                                <button
                                  onClick={() => setExpandedVideoId(null)}
                                  className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                  Hide preview
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setExpandedVideoId(lesson.id)}
                                className="relative group w-full max-w-md"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`https://customer-iq7mgkvtb3bwxqf5.cloudflarestream.com/${lesson.cloudflareVideoId}/thumbnails/thumbnail.jpg?time=0s&height=300`}
                                  alt={lesson.title}
                                  className="w-full rounded-lg border border-gray-300 group-hover:border-blue-500 transition-colors"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black bg-opacity-60 rounded-full p-4 group-hover:bg-opacity-80 transition-all">
                                    <svg
                                      className="w-8 h-8 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                    </svg>
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditLesson(lesson)}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No lessons yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first lesson to get started with this course
                </p>
                {!showAddForm && (
                  <button
                    onClick={handleAddLesson}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span className="text-xl mr-2">+</span>
                    Add First Lesson
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        message={notificationMessage}
        type="success"
        duration={4000}
      />

      {/* Publish Confirmation Overlay */}
      <NotificationOverlay
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        message="Are you sure you want to publish this course? It will become visible to all users."
        type="warning"
        onConfirm={confirmPublishCourse}
        confirmText="Publish Course"
        cancelText="Cancel"
      />

      {/* Pulsing Animation for Processing Status */}
      <style jsx>{`
        @keyframes gentle-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(0.995);
          }
        }

        .video-processing-pulse {
          animation: gentle-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
