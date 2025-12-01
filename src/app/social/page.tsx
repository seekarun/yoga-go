'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Course, Asset } from '@/types';
import ImageUploadCrop from '@/components/ImageUploadCrop';

interface InstagramStatus {
  connected: boolean;
  instagramUsername?: string;
  instagramUserId?: string;
  facebookPageName?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  connectedAt?: string;
  error?: string;
}

function SocialPageContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message: string;
    permalink?: string;
  } | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState(
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1080&h=1080&fit=crop'
  );
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Check for OAuth callback messages
  const successParam = searchParams.get('success');
  const errorParam = searchParams.get('error');
  const usernameParam = searchParams.get('username');

  // Fetch Instagram connection status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        console.log('[DBG][social] Fetching Instagram status...');
        const response = await fetch('/api/instagram/status');
        const data = await response.json();

        if (data.success) {
          setStatus(data.data);
          console.log('[DBG][social] Status:', data.data);
        }
      } catch (error) {
        console.error('[DBG][social] Error fetching status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [successParam]); // Refetch when coming back from OAuth

  // Fetch courses for post generation
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('[DBG][social] Fetching courses...');
        const response = await fetch('/data/courses');
        const data = await response.json();

        if (data.success) {
          setCourses(data.data || []);
          console.log('[DBG][social] Courses loaded:', data.data?.length);
        }
      } catch (error) {
        console.error('[DBG][social] Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, []);

  // Generate caption from selected course
  const generateCaption = (course: Course) => {
    const templates = [
      `Ready to transform your practice? Check out "${course.title}" \n\n${course.description.slice(0, 150)}...\n\n`,
      `New on MyYoga.Guru: "${course.title}" \n\nPerfect for ${course.level} practitioners. ${course.totalLessons} lessons to help you grow.\n\n`,
      `Level up your yoga journey with "${course.title}" by ${course.instructor.name}.\n\n${course.whatYouWillLearn?.[0] || 'Start your transformation today!'}\n\n`,
    ];

    const hashtags = [
      '#yoga',
      '#yogapractice',
      '#yogalife',
      '#yogainspiration',
      '#myyogaguru',
      '#yogaonline',
      '#yogacourse',
      course.category ? `#${course.category.toLowerCase().replace(' ', '')}` : '',
      course.level ? `#${course.level.toLowerCase().replace(' ', '')}yoga` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template + hashtags;
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCaption(generateCaption(course));
    setPublishResult(null);
  };

  // Handle image upload completion
  const handleImageUpload = (asset: Asset) => {
    const url = asset.croppedUrl || asset.originalUrl;
    setCustomImageUrl(url);
    setUploadError(null);
    console.log('[DBG][social] Image uploaded:', url);
  };

  // Handle image upload error
  const handleImageUploadError = (error: string) => {
    setUploadError(error);
    console.error('[DBG][social] Image upload error:', error);
  };

  const handleConnect = () => {
    window.location.href = '/api/instagram/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Instagram account?')) {
      return;
    }

    try {
      const response = await fetch('/api/instagram/disconnect', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setStatus({ connected: false });
      }
    } catch (error) {
      console.error('[DBG][social] Disconnect error:', error);
    }
  };

  // Helper to check if URL is a valid public URL
  const isValidPublicUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // Get the effective image URL (custom or from course)
  const getEffectiveImageUrl = (): string | null => {
    if (customImageUrl && isValidPublicUrl(customImageUrl)) {
      return customImageUrl;
    }
    if (selectedCourse) {
      const courseImage = selectedCourse.coverImage || selectedCourse.thumbnail;
      if (isValidPublicUrl(courseImage)) {
        return courseImage;
      }
    }
    return null;
  };

  const handlePublish = async () => {
    if (!caption) {
      alert('Please enter a caption');
      return;
    }

    const imageUrl = getEffectiveImageUrl();

    if (!imageUrl) {
      alert('Please provide a valid public image URL (must start with http:// or https://)');
      return;
    }

    setPublishing(true);
    setPublishResult(null);

    try {
      console.log('[DBG][social] Publishing post...');
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          caption,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPublishResult({
          success: true,
          message: `Posted successfully to @${data.data.instagramUsername}!`,
          permalink: data.data.permalink,
        });
        console.log('[DBG][social] Published:', data.data);
      } else {
        setPublishResult({
          success: false,
          message: data.error || 'Failed to publish',
        });
      }
    } catch (error) {
      console.error('[DBG][social] Publish error:', error);
      setPublishResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <section
        style={{
          padding: '60px 20px',
          background: '#fff',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <h1 style={{ fontSize: '36px', fontWeight: '600', marginBottom: '16px' }}>
          Instagram Integration
        </h1>
        <p style={{ fontSize: '18px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
          Connect your Instagram Business account to post course promotions directly from
          MyYoga.Guru
        </p>
      </section>

      {/* OAuth Callback Messages */}
      {(successParam || errorParam) && (
        <div
          style={{
            maxWidth: '800px',
            margin: '20px auto',
            padding: '16px 24px',
            borderRadius: '8px',
            background: successParam ? '#d4edda' : '#f8d7da',
            color: successParam ? '#155724' : '#721c24',
            border: `1px solid ${successParam ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {successParam ? `Successfully connected @${usernameParam}!` : `Error: ${errorParam}`}
        </div>
      )}

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Connection Status Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Instagram Connection</h2>

          {loading ? (
            <p style={{ color: '#666' }}>Checking connection status...</p>
          ) : status?.connected ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                {status.profilePictureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={status.profilePictureUrl}
                    alt={status.instagramUsername}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                )}
                <div>
                  <p style={{ fontWeight: '600', fontSize: '18px' }}>@{status.instagramUsername}</p>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Connected via {status.facebookPageName}
                  </p>
                  {status.followersCount && (
                    <p style={{ color: '#888', fontSize: '14px' }}>
                      {status.followersCount.toLocaleString()} followers
                    </p>
                  )}
                </div>
                <div
                  style={{
                    marginLeft: 'auto',
                    background: '#d4edda',
                    color: '#155724',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                  }}
                >
                  Connected
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Disconnect Account
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Connect your Instagram Business account to start posting.
              </p>
              <button
                onClick={handleConnect}
                style={{
                  background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Connect Instagram
              </button>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '12px' }}>
                Requires an Instagram Business or Creator account linked to a Facebook Page
              </p>
            </div>
          )}
        </div>

        {/* Post Creator - Only show if connected */}
        {status?.connected && (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Create Post</h2>

            {/* Course Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select a Course
              </label>
              <select
                value={selectedCourse?.id || ''}
                onChange={e => {
                  const course = courses.find(c => c.id === e.target.value);
                  if (course) handleCourseSelect(course);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                }}
              >
                <option value="">Choose a course to promote...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} - {course.instructor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview and Editor */}
            {selectedCourse && (
              <>
                {/* Image Input Section */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                    Post Image
                  </label>

                  {/* Tab Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: imageInputMode === 'upload' ? '#0095f6' : '#e4e6eb',
                        color: imageInputMode === 'upload' ? '#fff' : '#333',
                      }}
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        background: imageInputMode === 'url' ? '#0095f6' : '#e4e6eb',
                        color: imageInputMode === 'url' ? '#fff' : '#333',
                      }}
                    >
                      Use URL
                    </button>
                  </div>

                  {/* Upload Mode */}
                  {imageInputMode === 'upload' && (
                    <div
                      style={{
                        padding: '20px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e4e6eb',
                      }}
                    >
                      <ImageUploadCrop
                        width={1080}
                        height={1080}
                        category="other"
                        label="Upload Image (1080x1080px - Instagram Square)"
                        onUploadComplete={handleImageUpload}
                        onError={handleImageUploadError}
                      />
                      {uploadError && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: '#f8d7da',
                            color: '#721c24',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {uploadError}
                        </div>
                      )}
                      <p style={{ color: '#888', fontSize: '13px', marginTop: '12px' }}>
                        Upload an image to automatically get a public URL. Images are cropped to 1:1
                        square format for Instagram.
                      </p>
                    </div>
                  )}

                  {/* URL Mode */}
                  {imageInputMode === 'url' && (
                    <div>
                      <input
                        type="url"
                        value={customImageUrl}
                        onChange={e => setCustomImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '14px',
                          marginBottom: '12px',
                        }}
                      />
                      <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
                        Enter a publicly accessible image URL. Instagram requires square images
                        (1:1) or aspect ratio between 4:5 and 1.91:1.
                      </p>
                    </div>
                  )}

                  {/* Image Preview */}
                  {getEffectiveImageUrl() && (
                    <div style={{ marginTop: '16px' }}>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#666',
                          marginBottom: '8px',
                          fontWeight: '500',
                        }}
                      >
                        Preview:
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getEffectiveImageUrl() || ''}
                        alt="Post preview"
                        style={{
                          maxWidth: '400px',
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                        }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Caption Editor */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                    placeholder="Write your caption here..."
                  />
                  <p style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
                    {caption.length} / 2,200 characters
                  </p>
                </div>

                {/* Publish Button */}
                <button
                  onClick={handlePublish}
                  disabled={publishing || !caption}
                  style={{
                    background: publishing ? '#ccc' : '#0095f6',
                    color: '#fff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    cursor: publishing ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    width: '100%',
                  }}
                >
                  {publishing ? 'Publishing...' : 'Post to Instagram'}
                </button>

                {/* Publish Result */}
                {publishResult && (
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '16px',
                      borderRadius: '8px',
                      background: publishResult.success ? '#d4edda' : '#f8d7da',
                      color: publishResult.success ? '#155724' : '#721c24',
                    }}
                  >
                    <p style={{ fontWeight: '500' }}>{publishResult.message}</p>
                    {publishResult.permalink && (
                      <a
                        href={publishResult.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#155724',
                          textDecoration: 'underline',
                          marginTop: '8px',
                          display: 'inline-block',
                        }}
                      >
                        View post on Instagram →
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function SocialPage() {
  return (
    <Suspense
      fallback={
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <p style={{ color: '#666' }}>Loading...</p>
          </div>
        </div>
      }
    >
      <SocialPageContent />
    </Suspense>
  );
}
