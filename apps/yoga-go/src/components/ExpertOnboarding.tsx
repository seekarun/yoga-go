'use client';

import { useState } from 'react';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import VideoUpload from '@/components/VideoUpload';
import PlatformPreferencesStep from '@/components/onboarding/PlatformPreferencesStep';
import type { VideoUploadResult } from '@/components/VideoUpload';
import type { Asset } from '@/types';

interface ExpertOnboardingProps {
  userEmail: string;
  userName: string;
}

export default function ExpertOnboarding({ userEmail, userName }: ExpertOnboardingProps) {
  // Suppress unused variable warning - used for future functionality
  void userEmail;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [avatarAsset, setAvatarAsset] = useState<Asset | null>(null);

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
    featuredOnPlatform: true, // Default to visible on platform
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

  const handlePromoVideoUpload = (result: VideoUploadResult) => {
    console.log('[DBG][ExpertOnboarding] Promo video upload result:', result);
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

  const handleFeaturedOnPlatformChange = (featured: boolean) => {
    setFormData(prev => ({
      ...prev,
      featuredOnPlatform: featured,
    }));
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
      const expertId = formData.id.trim();
      const expertData = {
        id: expertId,
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
        platformPreferences: {
          featuredOnPlatform: formData.featuredOnPlatform,
          defaultEmail: `${expertId}@myyoga.guru`,
        },
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
          {[1, 2, 3, 4, 5, 6].map(num => (
            <div
              key={num}
              style={{
                width: '15.5%',
                height: '4px',
                background: num <= step ? 'var(--color-primary)' : '#e2e8f0',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>Step {step} of 6</div>
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

          <VideoUpload
            label="Upload Your Promo Video"
            maxDurationSeconds={300}
            videoId={formData.promoVideoCloudflareId}
            videoStatus={formData.promoVideoStatus}
            onUploadComplete={handlePromoVideoUpload}
            onClear={handlePromoVideoClear}
            onError={handleUploadError}
            helpText="Recommended: Keep your video under 2 minutes. Introduce yourself, share your expertise, and explain what makes your teaching unique."
          />
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

      {/* Step 5: Platform Preferences */}
      {step === 5 && (
        <PlatformPreferencesStep
          expertId={formData.id}
          featuredOnPlatform={formData.featuredOnPlatform}
          onFeaturedChange={handleFeaturedOnPlatformChange}
        />
      )}

      {/* Step 6: Social Links */}
      {step === 6 && (
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

        {step < 6 ? (
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
