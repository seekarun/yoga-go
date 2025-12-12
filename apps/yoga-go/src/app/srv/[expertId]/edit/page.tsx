'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset, Expert } from '@/types';

export default function EditExpertPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [avatarAsset, setAvatarAsset] = useState<Asset | null>(null);
  const [selectedPromoFile, setSelectedPromoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: '',
    avatar: '',
    rating: '0',
    totalCourses: '0',
    totalStudents: '0',
    specializations: '',
    featured: false,
    certifications: '',
    experience: '',
    promoVideo: '',
    promoVideoCloudflareId: '',
    promoVideoStatus: '' as 'uploading' | 'processing' | 'ready' | 'error' | '',
    socialLinks: {
      instagram: '',
      youtube: '',
      facebook: '',
      twitter: '',
      website: '',
    },
  });

  useEffect(() => {
    fetchExpertData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchExpertData is stable, only runs on mount/expertId change
  }, [expertId]);

  // Poll video status for processing promo videos
  useEffect(() => {
    if (!pollingVideoId) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('[DBG][expert-edit] Polling video status for:', pollingVideoId);

        const response = await fetch(`/api/cloudflare/video-status/${pollingVideoId}`);
        const data = await response.json();

        if (data.success) {
          const videoStatus = data.data.status;
          const isReady = data.data.readyToStream;

          console.log('[DBG][expert-edit] Video status:', videoStatus, 'Ready:', isReady);

          if (formData.promoVideoCloudflareId === pollingVideoId) {
            const newStatus = isReady ? 'ready' : videoStatus === 'error' ? 'error' : 'processing';

            setFormData(prev => ({
              ...prev,
              promoVideoStatus: newStatus,
            }));

            if (isReady || videoStatus === 'error') {
              console.log('[DBG][expert-edit] Video processing complete, stopping poll');
              setPollingVideoId(null);
            }
          }
        }
      } catch (err) {
        console.error('[DBG][expert-edit] Error polling video status:', err);
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [pollingVideoId, formData.promoVideoCloudflareId]);

  const fetchExpertData = async () => {
    try {
      setLoading(true);
      console.log('[DBG][expert-edit] Fetching expert data:', expertId);

      const response = await fetch(`/data/experts/${expertId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load expert');
      }

      const expert: Expert = result.data;
      console.log('[DBG][expert-edit] Expert loaded:', expert);

      // Populate form with existing data
      setFormData({
        name: expert.name || '',
        title: expert.title || '',
        bio: expert.bio || '',
        avatar: expert.avatar || '',
        rating: expert.rating?.toString() || '0',
        totalCourses: expert.totalCourses?.toString() || '0',
        totalStudents: expert.totalStudents?.toString() || '0',
        specializations: expert.specializations?.join(', ') || '',
        featured: expert.featured || false,
        certifications: expert.certifications?.join(', ') || '',
        experience: expert.experience || '',
        promoVideo: expert.promoVideo || '',
        promoVideoCloudflareId: expert.promoVideoCloudflareId || '',
        promoVideoStatus: expert.promoVideoStatus || '',
        socialLinks: {
          instagram: expert.socialLinks?.instagram || '',
          youtube: expert.socialLinks?.youtube || '',
          facebook: expert.socialLinks?.facebook || '',
          twitter: expert.socialLinks?.twitter || '',
          website: expert.socialLinks?.website || '',
        },
      });
    } catch (err) {
      console.error('[DBG][expert-edit] Error loading expert:', err);
      setError(err instanceof Error ? err.message : 'Failed to load expert');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith('socialLinks.')) {
      const socialKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialKey]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleAvatarUpload = (asset: Asset) => {
    console.log('[DBG][expert-edit] Avatar uploaded:', asset);
    setAvatarAsset(asset);
    setFormData(prev => ({
      ...prev,
      avatar: asset.croppedUrl || asset.originalUrl,
    }));
    setUploadError('');
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][expert-edit] Upload error:', error);
    setUploadError(error);
  };

  const handlePromoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[DBG][expert-edit] Promo video file selected:', file.name, file.size);
      setSelectedPromoFile(file);
    }
  };

  const handlePromoVideoUpload = async () => {
    if (!selectedPromoFile) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      console.log('[DBG][expert-edit] Starting promo video upload');

      const uploadUrlResponse = await fetch('/api/cloudflare/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationSeconds: 300 }),
      });

      const uploadUrlData = await uploadUrlResponse.json();
      if (!uploadUrlData.success) {
        throw new Error(uploadUrlData.error || 'Failed to get upload URL');
      }

      const { uploadURL, uid } = uploadUrlData.data;
      console.log('[DBG][expert-edit] Got upload URL for promo video:', uid);

      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedPromoFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          console.log('[DBG][expert-edit] Upload progress:', percentComplete, '%');
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

      console.log('[DBG][expert-edit] Promo video uploaded successfully:', uid);

      setFormData(prev => ({
        ...prev,
        promoVideoCloudflareId: uid,
        promoVideoStatus: 'processing',
      }));

      setUploadProgress(100);
      setPollingVideoId(uid);

      alert('Promo video uploaded successfully! Processing status will update automatically.');
    } catch (err) {
      console.error('[DBG][expert-edit] Error uploading promo video:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload promo video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    console.log('[DBG][expert-edit] Submitting expert update form');

    // Validate avatar is present
    if (!formData.avatar) {
      setError('Please upload an avatar image');
      setSaving(false);
      return;
    }

    try {
      // Prepare data for API
      const expertData = {
        name: formData.name.trim(),
        title: formData.title.trim(),
        bio: formData.bio.trim(),
        avatar: formData.avatar,
        rating: parseFloat(formData.rating) || 0,
        totalCourses: parseInt(formData.totalCourses) || 0,
        totalStudents: parseInt(formData.totalStudents) || 0,
        specializations: formData.specializations
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        featured: formData.featured,
        certifications: formData.certifications
          .split(',')
          .map(c => c.trim())
          .filter(Boolean),
        experience: formData.experience.trim(),
        promoVideo: formData.promoVideo.trim() || undefined,
        promoVideoCloudflareId: formData.promoVideoCloudflareId || undefined,
        promoVideoStatus: formData.promoVideoStatus || undefined,
        socialLinks: {
          instagram: formData.socialLinks.instagram.trim() || undefined,
          youtube: formData.socialLinks.youtube.trim() || undefined,
          facebook: formData.socialLinks.facebook.trim() || undefined,
          twitter: formData.socialLinks.twitter.trim() || undefined,
          website: formData.socialLinks.website.trim() || undefined,
        },
      };

      console.log('[DBG][expert-edit] Sending data:', expertData);

      const response = await fetch(`/data/experts/${expertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expertData),
      });

      const result = await response.json();
      console.log('[DBG][expert-edit] Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update expert');
      }

      console.log('[DBG][expert-edit] Expert updated successfully');
      // Redirect to expert dashboard
      router.push(`/srv/${expertId}`);
    } catch (err) {
      console.error('[DBG][expert-edit] Error updating expert:', err);
      setError(err instanceof Error ? err.message : 'Failed to update expert');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading expert data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/srv"
            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            ← Back
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Expert Profile</h1>
          <p className="text-gray-600">Update your expert profile information</p>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        {uploadError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Upload Error</p>
            <p className="text-sm">{uploadError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {/* Basic Information */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Deepak Sharma"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Yoga Master & Wellness Coach"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Biography <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  required
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Write a compelling biography..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <ImageUploadCrop
                  width={500}
                  height={500}
                  category="avatar"
                  label="Profile Picture (500x500px) *"
                  onUploadComplete={handleAvatarUpload}
                  onError={handleUploadError}
                  relatedTo={{
                    type: 'expert',
                    id: expertId,
                  }}
                  currentImageUrl={formData.avatar}
                />
                {avatarAsset && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">✓ Avatar updated successfully</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (0-5)
                </label>
                <input
                  type="number"
                  id="rating"
                  name="rating"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="totalCourses"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Total Courses
                </label>
                <input
                  type="number"
                  id="totalCourses"
                  name="totalCourses"
                  min="0"
                  value={formData.totalCourses}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="totalStudents"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Total Students
                </label>
                <input
                  type="number"
                  id="totalStudents"
                  name="totalStudents"
                  min="0"
                  value={formData.totalStudents}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="specializations"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Specializations
                </label>
                <input
                  type="text"
                  id="specializations"
                  name="specializations"
                  value={formData.specializations}
                  onChange={handleChange}
                  placeholder="Vinyasa Flow, Power Yoga, Meditation (comma-separated)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple items with commas</p>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="certifications"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Certifications
                </label>
                <input
                  type="text"
                  id="certifications"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  placeholder="RYT-500, E-RYT 200 (comma-separated)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple items with commas</p>
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="experience"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Years of Experience
                </label>
                <input
                  type="text"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g., 15+ years"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Featured Expert</span>
                </label>
              </div>
            </div>
          </div>

          {/* Promo Video */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Promo Video</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload a short promotional video to introduce yourself to potential students. This
              will be displayed prominently on your expert profile page.
            </p>

            {formData.promoVideoCloudflareId ? (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm font-medium text-green-800">Promo video uploaded</span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Video ID: {formData.promoVideoCloudflareId}
                </p>
                {formData.promoVideoStatus && (
                  <p className="text-sm text-gray-600 mb-2">
                    Status: <span className="capitalize">{formData.promoVideoStatus}</span>
                  </p>
                )}
                {formData.promoVideoStatus === 'ready' && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${formData.promoVideoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com%2F${formData.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                        style={{
                          border: 'none',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: '100%',
                        }}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen={true}
                      />
                    </div>
                  </div>
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
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      Selected: {selectedPromoFile.name} (
                      {(selectedPromoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <button
                      type="button"
                      onClick={handlePromoVideoUpload}
                      disabled={isUploading}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isUploading ? 'Uploading...' : 'Upload Promo Video'}
                    </button>
                  </div>
                )}
                {isUploading && (
                  <div className="mt-3">
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
            <p className="text-xs text-gray-500 mt-3">
              Recommended: Keep your video under 2 minutes. Introduce yourself, share your
              expertise, and explain what makes your teaching unique. Max duration: 5 minutes.
            </p>
          </div>

          {/* Social Links */}
          <div className="pb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="socialLinks.instagram"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Instagram
                </label>
                <input
                  type="url"
                  id="socialLinks.instagram"
                  name="socialLinks.instagram"
                  value={formData.socialLinks.instagram}
                  onChange={handleChange}
                  placeholder="https://instagram.com/username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="socialLinks.youtube"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  YouTube
                </label>
                <input
                  type="url"
                  id="socialLinks.youtube"
                  name="socialLinks.youtube"
                  value={formData.socialLinks.youtube}
                  onChange={handleChange}
                  placeholder="https://youtube.com/@username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="socialLinks.facebook"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Facebook
                </label>
                <input
                  type="url"
                  id="socialLinks.facebook"
                  name="socialLinks.facebook"
                  value={formData.socialLinks.facebook}
                  onChange={handleChange}
                  placeholder="https://facebook.com/username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="socialLinks.twitter"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Twitter
                </label>
                <input
                  type="url"
                  id="socialLinks.twitter"
                  name="socialLinks.twitter"
                  value={formData.socialLinks.twitter}
                  onChange={handleChange}
                  placeholder="https://twitter.com/username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="socialLinks.website"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Website
                </label>
                <input
                  type="url"
                  id="socialLinks.website"
                  name="socialLinks.website"
                  value={formData.socialLinks.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href={`/srv/${expertId}`}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
