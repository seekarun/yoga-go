'use client';

import { useState, useEffect, useCallback } from 'react';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import type { Asset, LandingPageTemplate, CustomLandingPageConfig } from '@/types';
import { templates, DEFAULT_TEMPLATE } from '@/components/landing-page/templates';
import HeroPreview from '@/components/landing-page/sections/hero/HeroPreview';
import ValuePropsPreview from '@/components/landing-page/sections/value-props/ValuePropsPreview';
import AboutPreview from '@/components/landing-page/sections/about/AboutPreview';
import PhotoGalleryPreview from '@/components/landing-page/sections/photo-gallery/PhotoGalleryPreview';
import ActPreview from '@/components/landing-page/sections/act/ActPreview';
import FooterPreview from '@/components/landing-page/sections/footer/FooterPreview';

// Dummy image for preview (will be replaced with proper images later)
const DUMMY_IMAGE = '/template/hero.jpg';

// Country options for location dropdown
const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

// Currency options with symbols
const CURRENCIES = [
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
];

// Map country codes to default currencies
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  AU: 'AUD',
  CA: 'CAD',
  DE: 'EUR',
  FR: 'EUR',
  IN: 'INR',
  SG: 'SGD',
  AE: 'AED',
  GB: 'GBP',
  US: 'USD',
};

// Lorem ipsum dummy content
const LOREM = {
  short: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  medium:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.',
  long: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
};

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
  teachingPlan: string;
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

  // Extracted content from AI
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);

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
    location: '',
    currency: 'USD',
  });

  // Geo-detection state
  const [geoDetected, setGeoDetected] = useState(false);

  // Auto-detect location and currency from IP on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        console.log('[DBG][ExpertOnboarding] Detecting location from IP...');
        // Using ip-api.com (free, no API key required, 45 requests/minute limit)
        const response = await fetch('http://ip-api.com/json/?fields=countryCode');
        const data = await response.json();

        if (data.countryCode) {
          const countryCode = data.countryCode;
          console.log('[DBG][ExpertOnboarding] Detected country:', countryCode);

          // Check if we support this country
          const supportedCountry = COUNTRIES.find(c => c.code === countryCode);
          if (supportedCountry) {
            const currency = COUNTRY_TO_CURRENCY[countryCode] || 'USD';
            setFormData(prev => ({
              ...prev,
              location: countryCode,
              currency: currency,
            }));
            setGeoDetected(true);
            console.log(
              '[DBG][ExpertOnboarding] Pre-populated location:',
              countryCode,
              'currency:',
              currency
            );
          }
        }
      } catch (err) {
        console.log('[DBG][ExpertOnboarding] Could not detect location:', err);
        // Silently fail - user can still select manually
      }
    };

    detectLocation();
  }, []);

  // Landing page content for step 2
  const [landingContent, setLandingContent] = useState<LandingPageContent>({
    teachingPlan: '',
    aboutBio: '',
    aboutImage: '',
  });

  // Template selection for step 3
  const [selectedTemplate, setSelectedTemplate] = useState<LandingPageTemplate>(DEFAULT_TEMPLATE);
  const [previewTemplateIndex, setPreviewTemplateIndex] = useState(0);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
    } else {
      // Handle other fields like location and currency
      setFormData(prev => ({
        ...prev,
        [name]: value,
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

  const handleNext = async () => {
    setError('');

    if (step === 1) {
      if (!formData.id || !formData.name || !formData.location) {
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

    // When moving from step 2 to step 3, run AI extraction
    if (step === 2) {
      if (!landingContent.teachingPlan) {
        setError('Please describe what you plan to teach');
        return;
      }

      setExtracting(true);
      console.log('[DBG][ExpertOnboarding] Running AI extraction...');

      try {
        const aiResponse = await fetch('/api/ai/extract-landing-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expertName: formData.name,
            teachingPlan: landingContent.teachingPlan,
            aboutBio: landingContent.aboutBio,
          }),
        });

        const aiResult = await aiResponse.json();
        console.log('[DBG][ExpertOnboarding] AI extraction result:', aiResult);

        if (aiResult.success && aiResult.data) {
          setExtractedContent(aiResult.data);
        } else {
          console.log(
            '[DBG][ExpertOnboarding] AI extraction failed, continuing without extracted content'
          );
        }
      } catch (err) {
        console.error('[DBG][ExpertOnboarding] Error extracting content:', err);
        // Continue anyway - we can still create the landing page without AI extraction
      } finally {
        setExtracting(false);
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
      // Use already extracted content or extract now
      let contentToUse = extractedContent;

      if (!contentToUse && landingContent.teachingPlan) {
        const aiResponse = await fetch('/api/ai/extract-landing-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expertName: formData.name,
            teachingPlan: landingContent.teachingPlan,
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
          location: formData.location,
          currency: formData.currency,
        },
        socialLinks: {},
        // Landing page starts as DRAFT (not published) - expert must explicitly publish
        isLandingPagePublished: false,
        // Save to draftLandingPage, NOT customLandingPage (published)
        draftLandingPage: {
          template: selectedTemplate,
          theme: {
            primaryColor: '#2A9D8F', // Default teal - user can customize in landing page editor
          },
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
          sectionOrder: [
            'hero',
            'valuePropositions',
            'about',
            'courses',
            'webinars',
            'photoGallery',
            'blog',
            'act',
            'footer',
          ],
          // Disable courses, webinars, and blog by default - expert can enable when ready
          disabledSections: ['courses', 'webinars', 'blog'],
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
            gap: '8px',
          }}
        >
          {[1, 2, 3].map(num => (
            <div
              key={num}
              style={{
                flex: 1,
                height: '4px',
                background: num <= step ? 'var(--color-primary)' : '#e2e8f0',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>Step {step} of 3</div>
      </div>

      {/* Welcome Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '12px' }}>
          {step === 1
            ? "Welcome! Let's get started"
            : step === 2
              ? 'Create Your Landing Page'
              : 'Choose Your Template'}
        </h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          {step === 1
            ? "First, let's set up your unique expert ID"
            : step === 2
              ? "Tell us about yourself and we'll create a beautiful landing page for you"
              : 'Select a template style for your landing page'}
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

          {/* Location and Currency Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            {/* Location */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                Location *
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Used for pricing your courses and services
              </div>
            </div>
          </div>

          {/* Auto-detected hint */}
          {geoDetected && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📍</span>
              <span>
                Location and currency auto-detected based on your IP. Feel free to change if needed.
              </span>
            </div>
          )}
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

          {/* Question 1: What do you plan to teach */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              What do you plan to teach? *
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Describe what you teach, who you help, and what outcomes students can expect
            </p>
            <textarea
              name="teachingPlan"
              value={landingContent.teachingPlan}
              onChange={handleLandingContentChange}
              placeholder="e.g., I teach yoga for busy professionals who struggle with stress, back pain, and low energy. Through simple 15-minute daily practices, my students achieve reduced anxiety, improved flexibility, better sleep, and lasting mindfulness skills..."
              rows={5}
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
        </div>
      )}

      {/* Step 3: Template Selection - Full Preview Carousel */}
      {step === 3 &&
        (() => {
          const currentTemplate = templates[previewTemplateIndex];
          const expertName = formData.name || 'Your Name';

          // Default brand color (same as used when creating expert profile)
          const defaultBrandColor = '#2A9D8F';

          // Build comprehensive preview data with dummy content where real data is missing
          const previewData: CustomLandingPageConfig = {
            template: currentTemplate.id,
            // Theme with default brand color
            theme: {
              primaryColor: defaultBrandColor,
            },
            // Hero section with dummy image
            hero: {
              headline:
                extractedContent?.hero?.headline || `Transform Your Life with ${expertName}`,
              description: extractedContent?.hero?.description || LOREM.medium,
              ctaText: extractedContent?.hero?.ctaText || 'Start Your Journey',
              alignment: 'center',
              heroImage: DUMMY_IMAGE,
            },
            // Value propositions with dummy items
            valuePropositions: extractedContent?.valuePropositions
              ? {
                  type: 'list',
                  items: extractedContent.valuePropositions.items,
                }
              : {
                  type: 'list',
                  items: [
                    'Lorem ipsum dolor sit amet consectetur',
                    'Sed do eiusmod tempor incididunt',
                    'Ut enim ad minim veniam quis nostrud',
                  ],
                },
            // About section with dummy content
            about: {
              layoutType: 'image-text',
              imageUrl: landingContent.aboutImage || DUMMY_IMAGE,
              text: landingContent.aboutBio || LOREM.long,
            },
            // Courses section header
            courses: {
              title: 'Featured Courses',
              description: `Start your learning journey with ${expertName}`,
            },
            // Photo gallery with dummy images
            photoGallery: {
              title: 'Gallery',
              description: 'A glimpse into our practice',
              images: [
                {
                  id: '1',
                  url: '/template/gallery1.jpg',
                  caption: 'Peaceful morning yoga session',
                },
                { id: '2', url: '/template/gallery2.jpg', caption: 'Group meditation practice' },
                { id: '3', url: '/template/gallery1.jpg', caption: 'Advanced pose workshop' },
                { id: '4', url: '/template/gallery2.jpg', caption: 'Sunset yoga by the beach' },
              ],
            },
            // Blog section header
            blog: {
              title: 'From the Blog',
              description: `Insights and articles from ${expertName}`,
            },
            // Act (CTA) section with dummy content
            act: {
              title: 'Ready to Transform Your Practice?',
              text: LOREM.medium,
              imageUrl: DUMMY_IMAGE,
            },
            // Footer with dummy links
            footer: {
              tagline: 'Namaste - The light in me honors the light in you',
              showSocialLinks: true,
              socialLinks: {
                instagram: '#',
                youtube: '#',
                facebook: '#',
              },
              showLegalLinks: true,
              legalLinks: {
                privacyPolicy: '#',
                termsOfService: '#',
              },
              showContactInfo: true,
              contactEmail: `hello@${formData.id || 'example'}.myyoga.guru`,
            },
          };

          return (
            <div>
              {/* Template Header with Navigation */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  background: '#fff',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {/* Prev Button */}
                <button
                  onClick={() =>
                    setPreviewTemplateIndex(
                      (previewTemplateIndex - 1 + templates.length) % templates.length
                    )
                  }
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#666',
                  }}
                >
                  ←
                </button>

                {/* Template Info */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    Template {previewTemplateIndex + 1} of {templates.length}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>
                    {currentTemplate.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    {currentTemplate.description}
                  </p>
                </div>

                {/* Next Button */}
                <button
                  onClick={() =>
                    setPreviewTemplateIndex((previewTemplateIndex + 1) % templates.length)
                  }
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#666',
                  }}
                >
                  →
                </button>
              </div>

              {/* Select Template Button */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                {selectedTemplate === currentTemplate.id ? (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '10px 24px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    ✓ Selected
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedTemplate(currentTemplate.id)}
                    style={{
                      padding: '10px 24px',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Select This Template
                  </button>
                )}
              </div>

              {/* Full Preview - All Sections */}
              <div
                style={{
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <HeroPreview
                  data={previewData}
                  expertName={expertName}
                  expertBio={landingContent.aboutBio || LOREM.medium}
                  template={currentTemplate.id}
                />
                <ValuePropsPreview data={previewData} template={currentTemplate.id} />
                <AboutPreview data={previewData} template={currentTemplate.id} />
                <PhotoGalleryPreview
                  data={previewData}
                  expertName={expertName}
                  template={currentTemplate.id}
                />
                <ActPreview data={previewData} template={currentTemplate.id} />
                <FooterPreview
                  data={previewData}
                  expertName={expertName}
                  template={currentTemplate.id}
                />
              </div>

              {/* Template Dots Indicator */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '16px',
                }}
              >
                {templates.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => setPreviewTemplateIndex(idx)}
                    style={{
                      width: idx === previewTemplateIndex ? '24px' : '10px',
                      height: '10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: idx === previewTemplateIndex ? 'var(--color-primary)' : '#e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>
          );
        })()}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
        <SecondaryButton onClick={handleBack} disabled={step === 1 || loading || extracting}>
          Back
        </SecondaryButton>

        {step < 3 ? (
          <PrimaryButton
            onClick={handleNext}
            disabled={loading || extracting || (step === 2 && !landingContent.teachingPlan)}
            loading={extracting}
          >
            {extracting ? 'Generating...' : 'Next'}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleSubmit} disabled={loading} loading={loading}>
            {loading ? 'Creating Your Page...' : '✨ Create My Landing Page'}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
