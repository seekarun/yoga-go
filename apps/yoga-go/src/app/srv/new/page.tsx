'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset } from '@/types';

export default function NewExpertPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [avatarAsset, setAvatarAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    id: '',
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
    socialLinks: {
      instagram: '',
      youtube: '',
      facebook: '',
      twitter: '',
      website: '',
    },
  });

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
    console.log('[DBG][srv/new/page.tsx] Avatar uploaded:', asset);
    setAvatarAsset(asset);
    setFormData(prev => ({
      ...prev,
      avatar: asset.croppedUrl || asset.originalUrl,
    }));
    setUploadError('');
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][srv/new/page.tsx] Upload error:', error);
    setUploadError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('[DBG][srv/new/page.tsx] Submitting expert form');

    // Validate avatar is uploaded
    if (!formData.avatar) {
      setError('Please upload an avatar image');
      setLoading(false);
      return;
    }

    try {
      // Prepare data for API
      const expertData = {
        id: formData.id.trim(),
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
        socialLinks: {
          instagram: formData.socialLinks.instagram.trim() || undefined,
          youtube: formData.socialLinks.youtube.trim() || undefined,
          facebook: formData.socialLinks.facebook.trim() || undefined,
          twitter: formData.socialLinks.twitter.trim() || undefined,
          website: formData.socialLinks.website.trim() || undefined,
        },
      };

      console.log('[DBG][srv/new/page.tsx] Sending data:', expertData);

      const response = await fetch('/data/experts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expertData),
      });

      const result = await response.json();
      console.log('[DBG][srv/new/page.tsx] Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create expert');
      }

      console.log('[DBG][srv/new/page.tsx] Expert created successfully');
      // Redirect to expert dashboard
      router.push(`/srv/${expertData.id}`);
    } catch (err) {
      console.error('[DBG][srv/new/page.tsx] Error creating expert:', err);
      setError(err instanceof Error ? err.message : 'Failed to create expert');
      setLoading(false);
    }
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Add New Expert</h1>
          <p className="text-gray-600">Create a new expert profile in the system</p>
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
                <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-2">
                  Expert ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  required
                  value={formData.id}
                  onChange={handleChange}
                  placeholder="e.g., deepak, kavitha"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Unique identifier (lowercase, no spaces)
                </p>
              </div>

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

              <div className="md:col-span-2">
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
                {formData.id ? (
                  <ImageUploadCrop
                    width={500}
                    height={500}
                    category="avatar"
                    tenantId={formData.id}
                    label="Profile Picture (500x500px) *"
                    onUploadComplete={handleAvatarUpload}
                    onError={handleUploadError}
                    relatedTo={{
                      type: 'expert',
                      id: formData.id,
                    }}
                    currentImageUrl={formData.avatar}
                  />
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500 text-sm">
                    Enter Expert ID above to enable profile picture upload
                  </div>
                )}
                {avatarAsset && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">✓ Avatar uploaded successfully</p>
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
              href="/srv"
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Create Expert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
