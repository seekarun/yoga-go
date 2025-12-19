'use client';

import { useState, useEffect, useCallback } from 'react';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import type { Asset } from '@/types';

// URL-friendly validation: lowercase letters, numbers, and hyphens only
const isUrlFriendly = (value: string): boolean => {
  return /^[a-z0-9-]+$/.test(value);
};

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface ExpertOnboardingProps {
  userEmail: string;
  userName: string;
}

interface LandingPageContent {
  howYouHelp: string;
  valuesForLearners: string;
  aboutBio: string;
  aboutImage: string;
}

interface ExtractedContent {
  hero: {
    headline: string;
    description: string;
    ctaText: string;
  };
  valuePropositions: {
    type: 'list';
    items: string[];
  };
}

export default function ExpertOnboarding({ userEmail, userName }: ExpertOnboardingProps) {
  // Suppress unused variable warning - used for future functionality
  void userEmail;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Extracted content preview
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Expert ID validation state
  const [idValidation, setIdValidation] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
    message: string;
  }>({ status: 'idle', message: '' });

  // Track if user has manually edited the Expert ID
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);

  // Convert name to URL-friendly ID (first name only, lowercase, no special chars)
  const nameToExpertId = (name: string): string => {
    const firstName = name.trim().split(/\s+/)[0] || '';
    return firstName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 20); // Limit length
  };

  // Initialize Expert ID from userName if provided
  const initialExpertId = userName ? nameToExpertId(userName) : '';

  const [formData, setFormData] = useState({
    id: initialExpertId,
    name: userName || '',
  });

  // Landing page content for step 2
  const [landingContent, setLandingContent] = useState<LandingPageContent>({
    howYouHelp: '',
    valuesForLearners: '',
    aboutBio: '',
    aboutImage: '',
  });

  // Debounced expert ID for validation
  const debouncedExpertId = useDebounce(formData.id, 500);

  // Check expert ID availability
  const checkExpertIdAvailability = useCallback(async (expertId: string) => {
    if (!expertId) {
      setIdValidation({ status: 'idle', message: '' });
      return;
    }

    // First check URL-friendly format
    if (!isUrlFriendly(expertId)) {
      setIdValidation({
        status: 'invalid',
        message: 'Only lowercase letters, numbers, and hyphens are allowed',
      });
      return;
    }

    // Must be at least 3 characters
    if (expertId.length < 3) {
      setIdValidation({
        status: 'invalid',
        message: 'Must be at least 3 characters',
      });
      return;
    }

    // Cannot start or end with hyphen
    if (expertId.startsWith('-') || expertId.endsWith('-')) {
      setIdValidation({
        status: 'invalid',
        message: 'Cannot start or end with a hyphen',
      });
      return;
    }

    setIdValidation({ status: 'checking', message: 'Checking availability...' });

    try {
      const response = await fetch(`/data/experts/${expertId}`);
      if (response.status === 404) {
        setIdValidation({ status: 'available', message: 'This ID is available!' });
      } else if (response.ok) {
        setIdValidation({ status: 'taken', message: 'This ID is already taken' });
      } else {
        setIdValidation({ status: 'idle', message: '' });
      }
    } catch (err) {
      console.error('[DBG][ExpertOnboarding] Error checking expert ID:', err);
      setIdValidation({ status: 'idle', message: '' });
    }
  }, []);

  // Effect to check availability when debounced ID changes
  useEffect(() => {
    checkExpertIdAvailability(debouncedExpertId);
  }, [debouncedExpertId, checkExpertIdAvailability]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'name') {
      // When name changes, auto-populate Expert ID if not manually edited
      setFormData(prev => ({
        ...prev,
        name: value,
        ...(idManuallyEdited ? {} : { id: nameToExpertId(value) }),
      }));
    } else if (name === 'id') {
      // Mark as manually edited when user types in Expert ID field
      setIdManuallyEdited(true);
      setFormData(prev => ({
        ...prev,
        id: value,
      }));
    }
  };

  const handleLandingContentChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setLandingContent(prev => ({
      ...prev,
      [name]: value,
    }));
    // Reset preview when content changes
    setShowPreview(false);
    setExtractedContent(null);
  };

  const handleImageUpload = (asset: Asset) => {
    console.log('[DBG][ExpertOnboarding] Image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    setLandingContent(prev => ({
      ...prev,
      aboutImage: imageUrl,
    }));
    setUploadError('');
  };

  const handleUploadError = (errorMsg: string) => {
    console.error('[DBG][ExpertOnboarding] Upload error:', errorMsg);
    setUploadError(errorMsg);
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!formData.id || !formData.name) {
        setError('Please fill in all required fields');
        return;
      }
      // Check if expert ID is valid and available
      if (idValidation.status === 'invalid') {
        setError('Please fix the Expert ID: ' + idValidation.message);
        return;
      }
      if (idValidation.status === 'taken') {
        setError('This Expert ID is already taken. Please choose a different one.');
        return;
      }
      if (idValidation.status === 'checking') {
        setError('Please wait while we check the availability of your Expert ID.');
        return;
      }
      if (idValidation.status !== 'available') {
        setError('Please enter a valid Expert ID');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  // Preview extraction - calls AI API and shows results
  const handlePreviewExtraction = async () => {
    setExtracting(true);
    setError('');

    console.log('[DBG][ExpertOnboarding] Previewing extraction...');

    try {
      const aiResponse = await fetch('/api/ai/extract-landing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertName: formData.name,
          howYouHelp: landingContent.howYouHelp,
          valuesForLearners: landingContent.valuesForLearners,
          aboutBio: landingContent.aboutBio,
        }),
      });

      const aiResult = await aiResponse.json();
      console.log('[DBG][ExpertOnboarding] AI extraction result:', aiResult);

      if (aiResult.success && aiResult.data) {
        setExtractedContent(aiResult.data);
        setShowPreview(true);
      } else {
        setError(aiResult.error || 'Failed to extract content');
      }
    } catch (err) {
      console.error('[DBG][ExpertOnboarding] Error extracting content:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract content');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    console.log('[DBG][ExpertOnboarding] Submitting expert profile');

    try {
      // Use already extracted content or extract now
      let contentToUse = extractedContent;

      if (!contentToUse && (landingContent.howYouHelp || landingContent.valuesForLearners)) {
        const aiResponse = await fetch('/api/ai/extract-landing-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expertName: formData.name,
            howYouHelp: landingContent.howYouHelp,
            valuesForLearners: landingContent.valuesForLearners,
            aboutBio: landingContent.aboutBio,
          }),
        });

        const aiResult = await aiResponse.json();
        if (aiResult.success && aiResult.data) {
          contentToUse = aiResult.data;
        }
      }

      // Prepare expert data with landing page config
      const expertId = formData.id.trim();
      const expertData = {
        id: expertId,
        name: formData.name.trim(),
        title: '',
        bio: landingContent.aboutBio || '',
        avatar: landingContent.aboutImage || '',
        rating: 0,
        totalCourses: 0,
        totalStudents: 0,
        specializations: [],
        featured: false,
        certifications: [],
        experience: '',
        platformPreferences: {
          featuredOnPlatform: true,
          defaultEmail: `${expertId}@myyoga.guru`,
        },
        socialLinks: {},
        // Initial landing page configuration
        customLandingPage: {
          hero: contentToUse?.hero
            ? {
                headline: contentToUse.hero.headline,
                description: contentToUse.hero.description,
                ctaText: contentToUse.hero.ctaText,
                alignment: 'center' as const,
              }
            : undefined,
          valuePropositions: contentToUse?.valuePropositions
            ? {
                type: 'list' as const,
                items: contentToUse.valuePropositions.items,
              }
            : undefined,
          about: {
            layoutType: 'image-text' as const,
            imageUrl: landingContent.aboutImage || undefined,
            text: landingContent.aboutBio || undefined,
            bio: landingContent.aboutBio || undefined,
            highlights: [],
          },
          sectionOrder: ['hero', 'valuePropositions', 'about'],
        },
        onboardingCompleted: true,
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
      window.location.href = `/srv/${expertId}/landing-page`;
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
          {[1, 2].map(num => (
            <div
              key={num}
              style={{
                width: '48%',
                height: '4px',
                background: num <= step ? 'var(--color-primary)' : '#e2e8f0',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>Step {step} of 2</div>
      </div>

      {/* Welcome Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '12px' }}>
          {step === 1 ? "Welcome! Let's get started" : 'Create Your Landing Page'}
        </h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          {step === 1
            ? "First, let's set up your unique expert ID"
            : "Tell us about yourself and we'll create a beautiful landing page for you"}
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

          {/* Name - First field */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Expert ID - Auto-populated from name */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}
            >
              Expert ID (URL-friendly) *
            </label>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Use only lowercase letters, numbers, and hyphens (e.g., john-doe, yoga123)
            </div>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              placeholder="e.g., john-doe"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${
                  idValidation.status === 'invalid' || idValidation.status === 'taken'
                    ? '#ef4444'
                    : idValidation.status === 'available'
                      ? '#22c55e'
                      : '#e2e8f0'
                }`,
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            {/* Validation Status */}
            {idValidation.status !== 'idle' && (
              <div
                style={{
                  fontSize: '12px',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color:
                    idValidation.status === 'available'
                      ? '#22c55e'
                      : idValidation.status === 'invalid' || idValidation.status === 'taken'
                        ? '#ef4444'
                        : '#666',
                }}
              >
                {idValidation.status === 'checking' && (
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                    ⏳
                  </span>
                )}
                {idValidation.status === 'available' && '✓'}
                {(idValidation.status === 'invalid' || idValidation.status === 'taken') && '✗'}
                {idValidation.message}
              </div>
            )}
            {/* Dynamic Preview */}
            {formData.id && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              >
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#666' }}>Your URL: </span>
                  <span style={{ color: '#111', fontWeight: '500' }}>
                    {formData.id}.myyoga.guru
                  </span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#666' }}>Your email: </span>
                  <span style={{ color: '#111', fontWeight: '500' }}>
                    {formData.id}@myyoga.guru
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                  You can connect your own custom domain later in settings
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Landing Page Content */}
      {step === 2 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Tell Us About Your Teaching
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            We&apos;ll use AI to create a professional landing page from your answers
          </p>

          {/* Question 1: How you help students */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              How can you help your students? *
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Describe the problems you solve or the transformation you offer (used for Hero
              Section)
            </p>
            <textarea
              name="howYouHelp"
              value={landingContent.howYouHelp}
              onChange={handleLandingContentChange}
              placeholder="e.g., I help busy professionals find peace and balance through simple, effective yoga practices that can be done in just 15 minutes a day. Many of my students struggle with stress, back pain, and lack of energy..."
              rows={4}
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

          {/* Question 2: Values for learners */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              What can learners expect to gain? *
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              List the benefits and outcomes (used for Value Propositions - we&apos;ll extract 2 key
              benefits)
            </p>
            <textarea
              name="valuesForLearners"
              value={landingContent.valuesForLearners}
              onChange={handleLandingContentChange}
              placeholder="e.g., Reduced stress and anxiety, improved flexibility and strength, better sleep quality, increased energy levels, mindfulness skills they can use anywhere..."
              rows={4}
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

          {/* Question 3: About/Bio */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Tell us about yourself
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Share your background and experience (used as-is for About Section)
            </p>
            <textarea
              name="aboutBio"
              value={landingContent.aboutBio}
              onChange={handleLandingContentChange}
              placeholder="e.g., I'm a certified yoga instructor with 10 years of experience. I trained in India and have helped over 500 students transform their lives. My approach combines traditional yoga with modern science..."
              rows={4}
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

          {/* Profile Image Upload */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Your Photo
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Upload a professional photo (used for About Section - Image+Text layout)
            </p>
            {landingContent.aboutImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={landingContent.aboutImage}
                  alt="Profile"
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setLandingContent(prev => ({ ...prev, aboutImage: '' }))}
                  style={{
                    padding: '8px 16px',
                    background: '#fee',
                    color: '#c33',
                    border: '1px solid #fcc',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <ImageUploadCrop
                width={400}
                height={400}
                category="avatar"
                label="Upload your photo"
                onUploadComplete={handleImageUpload}
                onError={handleUploadError}
                relatedTo={{
                  type: 'expert',
                  id: formData.id,
                }}
              />
            )}
          </div>

          {/* Preview Button */}
          <div style={{ marginBottom: '24px' }}>
            <button
              type="button"
              onClick={handlePreviewExtraction}
              disabled={
                extracting || (!landingContent.howYouHelp && !landingContent.valuesForLearners)
              }
              style={{
                padding: '12px 24px',
                background:
                  extracting || (!landingContent.howYouHelp && !landingContent.valuesForLearners)
                    ? '#e2e8f0'
                    : '#f0f9ff',
                color:
                  extracting || (!landingContent.howYouHelp && !landingContent.valuesForLearners)
                    ? '#999'
                    : '#0369a1',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor:
                  extracting || (!landingContent.howYouHelp && !landingContent.valuesForLearners)
                    ? 'not-allowed'
                    : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {extracting ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid #0369a1',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Extracting...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Preview AI Extraction
                </>
              )}
            </button>
          </div>

          {/* Extraction Preview */}
          {showPreview && extractedContent && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '24px',
                border: '2px solid #22c55e',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                ✓ Extraction Preview
              </h3>

              {/* Hero Section Preview */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0369a1',
                    marginBottom: '12px',
                  }}
                >
                  HERO SECTION
                </h4>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>Headline (Problem Hook):</span>
                  <p
                    style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '4px 0' }}
                  >
                    {extractedContent.hero.headline || '(empty)'}
                  </p>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    Description (Result Hook):
                  </span>
                  <p style={{ fontSize: '14px', color: '#333', margin: '4px 0' }}>
                    {extractedContent.hero.description || '(empty)'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#666' }}>CTA Button:</span>
                  <p style={{ fontSize: '14px', color: '#333', margin: '4px 0' }}>
                    {extractedContent.hero.ctaText || 'Start Your Journey'}
                  </p>
                </div>
              </div>

              {/* Value Propositions Preview */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0369a1',
                    marginBottom: '12px',
                  }}
                >
                  VALUE PROPOSITIONS
                </h4>
                {extractedContent.valuePropositions.items.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {extractedContent.valuePropositions.items.map((item, index) => (
                      <li
                        key={index}
                        style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '14px', color: '#999', fontStyle: 'italic' }}>(empty)</p>
                )}
              </div>

              {/* About Section Preview */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0369a1',
                    marginBottom: '12px',
                  }}
                >
                  ABOUT SECTION (Image + Text Layout)
                </h4>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {landingContent.aboutImage && (
                    <img
                      src={landingContent.aboutImage}
                      alt="About"
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>
                    {landingContent.aboutBio || '(no bio provided)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <SecondaryButton onClick={handleBack} disabled={step === 1 || loading}>
          Back
        </SecondaryButton>

        {step < 2 ? (
          <PrimaryButton onClick={handleNext} disabled={loading}>
            Next
          </PrimaryButton>
        ) : (
          <PrimaryButton
            onClick={handleSubmit}
            disabled={loading || !showPreview}
            loading={loading}
          >
            {loading ? 'Creating Your Page...' : '✨ Create My Landing Page'}
          </PrimaryButton>
        )}
      </div>

      {/* Hint for Create button */}
      {step === 2 && !showPreview && (
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '12px' }}>
          Click &quot;Preview AI Extraction&quot; first to see how your landing page will look
        </p>
      )}
    </div>
  );
}
