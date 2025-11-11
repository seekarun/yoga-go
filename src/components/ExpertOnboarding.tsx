'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset } from '@/types';

interface ExpertOnboardingProps {
  userEmail: string;
  userName: string;
}

export default function ExpertOnboarding({ userEmail, userName }: ExpertOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [avatarAsset, setAvatarAsset] = useState<Asset | null>(null);
  const [selectedPromoFile, setSelectedPromoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: userName || '',
    title: '',
    bio: '',
    avatar: '',
    specializations: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

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
        [name]: value,
      }));
    }
  };

  const handleAvatarUpload = (asset: Asset) => {
    console.log('[DBG][ExpertOnboarding] Avatar uploaded:', asset);
    setAvatarAsset(asset);
    setFormData(prev => ({
      ...prev,
      avatar: asset.croppedUrl || asset.originalUrl,
    }));
    setUploadError('');
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][ExpertOnboarding] Upload error:', error);
    setUploadError(error);
  };

  // Poll video status for processing promo videos
  useEffect(() => {
    if (!pollingVideoId) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('[DBG][ExpertOnboarding] Polling video status for:', pollingVideoId);

        const response = await fetch(`/api/cloudflare/video-status/${pollingVideoId}`);
        const data = await response.json();

        if (data.success) {
          const videoStatus = data.data.status;
          const isReady = data.data.readyToStream;

          console.log('[DBG][ExpertOnboarding] Video status:', videoStatus, 'Ready:', isReady);

          if (formData.promoVideoCloudflareId === pollingVideoId) {
            const newStatus = isReady ? 'ready' : videoStatus === 'error' ? 'error' : 'processing';

            setFormData(prev => ({
              ...prev,
              promoVideoStatus: newStatus,
            }));

            if (isReady || videoStatus === 'error') {
              console.log('[DBG][ExpertOnboarding] Video processing complete, stopping poll');
              setPollingVideoId(null);
            }
          }
        }
      } catch (err) {
        console.error('[DBG][ExpertOnboarding] Error polling video status:', err);
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [pollingVideoId, formData.promoVideoCloudflareId]);

  const handlePromoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[DBG][ExpertOnboarding] Promo video file selected:', file.name, file.size);
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
      console.log('[DBG][ExpertOnboarding] Starting promo video upload');

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
      console.log('[DBG][ExpertOnboarding] Got upload URL for promo video:', uid);

      const formDataUpload = new FormData();
      formDataUpload.append('file', selectedPromoFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          console.log('[DBG][ExpertOnboarding] Upload progress:', percentComplete, '%');
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

      console.log('[DBG][ExpertOnboarding] Promo video uploaded successfully:', uid);

      setFormData(prev => ({
        ...prev,
        promoVideoCloudflareId: uid,
        promoVideoStatus: 'processing',
      }));

      setUploadProgress(100);
      setPollingVideoId(uid);

      alert('Promo video uploaded successfully! Processing status will update automatically.');
    } catch (err) {
      console.error('[DBG][ExpertOnboarding] Error uploading promo video:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload promo video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!formData.id || !formData.name || !formData.title || !formData.bio) {
        setError('Please fill in all required fields');
        return;
      }
    } else if (step === 2) {
      if (!formData.avatar) {
        setError('Please upload a profile picture');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    console.log('[DBG][ExpertOnboarding] Submitting expert profile');

    try {
      // Prepare data for API
      const expertData = {
        id: formData.id.trim(),
        name: formData.name.trim(),
        title: formData.title.trim(),
        bio: formData.bio.trim(),
        avatar: formData.avatar,
        rating: 0,
        totalCourses: 0,
        totalStudents: 0,
        specializations: formData.specializations
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        featured: false,
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

      console.log('[DBG][ExpertOnboarding] Sending data:', expertData);

      const response = await fetch('/data/experts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expertData),
      });

      const result = await response.json();
      console.log('[DBG][ExpertOnboarding] Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create expert profile');
      }

      console.log('[DBG][ExpertOnboarding] Expert profile created successfully');
      // Redirect to dashboard (same page will reload and show dashboard)
      window.location.href = '/srv';
    } catch (err) {
      console.error('[DBG][ExpertOnboarding] Error creating expert profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to create expert profile');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Progress Indicator */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          {[1, 2, 3, 4, 5].map(num => (
            <div
              key={num}
              style={{
                width: '19%',
                height: '4px',
                background: num <= step ? 'var(--color-primary)' : '#e2e8f0',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>Step {step} of 5</div>
      </div>

      {/* Welcome Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '12px' }}>
          Welcome to Yoga-GO Expert Platform
        </h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          Let&apos;s set up your expert profile to start sharing your knowledge
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      )}

      {uploadError && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
          }}
        >
          Upload Error: {uploadError}
        </div>
      )}

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            Basic Information
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Expert ID (URL-friendly) *
            </label>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              placeholder="e.g., john-doe"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              This will be your unique URL: yogago.com/experts/{formData.id || 'your-id'}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Professional Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Certified Yoga Instructor & Wellness Coach"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Bio *
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about your yoga journey and expertise..."
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      )}

      {/* Step 2: Profile Picture */}
      {step === 2 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            Profile Picture
          </h2>

          <ImageUploadCrop
            width={500}
            height={500}
            category="avatar"
            label="Upload Your Profile Picture (500x500px) *"
            onUploadComplete={handleAvatarUpload}
            onError={handleUploadError}
            relatedTo={
              formData.id
                ? {
                    type: 'expert',
                    id: formData.id,
                  }
                : undefined
            }
            currentImageUrl={formData.avatar}
          />

          {avatarAsset && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                color: '#166534',
              }}
            >
              ✓ Profile picture uploaded successfully
            </div>
          )}
        </div>
      )}

      {/* Step 3: Promo Video (Optional) */}
      {step === 3 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
            Promo Video (Optional)
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            Upload a short promotional video to introduce yourself to potential students. This will
            be displayed prominently on your expert profile page.
          </p>

          {formData.promoVideoCloudflareId ? (
            <div
              style={{
                marginBottom: '16px',
                padding: '16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
              >
                <span style={{ color: '#166534' }}>✓</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#166534' }}>
                  Promo video uploaded
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Video ID: {formData.promoVideoCloudflareId}
              </p>
              {formData.promoVideoStatus && (
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Status: {formData.promoVideoStatus}
                </p>
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
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: 'var(--color-primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
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
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              {selectedPromoFile && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    Selected: {selectedPromoFile.name} (
                    {(selectedPromoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <button
                    type="button"
                    onClick={handlePromoVideoUpload}
                    disabled={isUploading}
                    style={{
                      marginTop: '12px',
                      padding: '12px 24px',
                      background: isUploading ? '#ccc' : 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Promo Video'}
                  </button>
                </div>
              )}
              {isUploading && (
                <div style={{ marginTop: '12px' }}>
                  <div
                    style={{
                      width: '100%',
                      background: '#e2e8f0',
                      borderRadius: '4px',
                      height: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        background: 'var(--color-primary)',
                        height: '8px',
                        borderRadius: '4px',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {uploadProgress}% uploaded
                  </p>
                </div>
              )}
            </>
          )}
          <p style={{ fontSize: '12px', color: '#999', marginTop: '16px' }}>
            Recommended: Keep your video under 2 minutes. Introduce yourself, share your expertise,
            and explain what makes your teaching unique.
          </p>
        </div>
      )}

      {/* Step 4: Professional Details */}
      {step === 4 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            Professional Details
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Specializations
            </label>
            <input
              type="text"
              name="specializations"
              value={formData.specializations}
              onChange={handleChange}
              placeholder="Vinyasa Flow, Power Yoga, Meditation (comma-separated)"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Certifications
            </label>
            <input
              type="text"
              name="certifications"
              value={formData.certifications}
              onChange={handleChange}
              placeholder="RYT-500, E-RYT 200 (comma-separated)"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Years of Experience
            </label>
            <input
              type="text"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="e.g., 15+ years"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      )}

      {/* Step 5: Social Links */}
      {step === 5 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            Social Links (Optional)
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Instagram
            </label>
            <input
              type="url"
              name="socialLinks.instagram"
              value={formData.socialLinks.instagram}
              onChange={handleChange}
              placeholder="https://instagram.com/username"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              YouTube
            </label>
            <input
              type="url"
              name="socialLinks.youtube"
              value={formData.socialLinks.youtube}
              onChange={handleChange}
              placeholder="https://youtube.com/@username"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Website
            </label>
            <input
              type="url"
              name="socialLinks.website"
              value={formData.socialLinks.website}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <button
          onClick={handleBack}
          disabled={step === 1 || loading}
          style={{
            padding: '12px 24px',
            background: step === 1 ? '#e2e8f0' : '#fff',
            color: step === 1 ? '#999' : '#333',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: step === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          Back
        </button>

        {step < 5 ? (
          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              padding: '12px 32px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 32px',
              background: loading ? '#ccc' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating Profile...' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}
