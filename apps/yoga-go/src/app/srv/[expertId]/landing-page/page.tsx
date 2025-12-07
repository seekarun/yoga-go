'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import VideoUpload from '@/components/VideoUpload';
import type { VideoUploadResult } from '@/components/VideoUpload';
import type { Asset, Expert } from '@/types';

export default function EditLandingPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [_logoImageAsset, setLogoImageAsset] = useState<Asset | null>(null);
  const [heroImageAsset, setHeroImageAsset] = useState<Asset | null>(null);
  const [_aboutImageAsset, setAboutImageAsset] = useState<Asset | null>(null);
  const [_actImageAsset, setActImageAsset] = useState<Asset | null>(null);

  const [formData, setFormData] = useState({
    logo: '',
    heroImage: '',
    headline: '',
    description: '',
    ctaText: '',
    ctaLink: '',
    alignment: 'center' as 'center' | 'left' | 'right',
    valueType: 'list' as 'paragraph' | 'list',
    valueContent: '',
    valueItem1: '',
    valueItem2: '',
    valueItem3: '',
    aboutLayoutType: '' as '' | 'video' | 'image-text',
    aboutVideoCloudflareId: '',
    aboutVideoStatus: '' as '' | 'uploading' | 'processing' | 'ready' | 'error',
    aboutImageUrl: '',
    aboutText: '',
    actImageUrl: '',
    actTitle: '',
    actText: '',
  });

  useEffect(() => {
    fetchExpertData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchExpertData is stable, only runs on mount/expertId change
  }, [expertId]);

  const fetchExpertData = async () => {
    try {
      setLoading(true);
      console.log('[DBG][landing-page-edit] Fetching expert data:', expertId);

      const response = await fetch(`/data/experts/${expertId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load expert');
      }

      const expert: Expert = result.data;
      console.log('[DBG][landing-page-edit] Expert loaded:', expert);
      console.log('[DBG][landing-page-edit] Custom landing page data:', expert.customLandingPage);
      console.log('[DBG][landing-page-edit] Hero data:', expert.customLandingPage?.hero);

      // Populate form with existing landing page data
      const brandingData = expert.customLandingPage?.branding;
      const valueProps = expert.customLandingPage?.valuePropositions;
      const aboutData = expert.customLandingPage?.about;
      const actData = expert.customLandingPage?.act;

      // Use about video if set, otherwise fall back to expert's promo video from onboarding
      const aboutVideoId =
        aboutData?.videoCloudflareId ||
        (expert.promoVideoCloudflareId && expert.promoVideoStatus === 'ready'
          ? expert.promoVideoCloudflareId
          : '');
      const aboutVideoStat =
        aboutData?.videoStatus ||
        (expert.promoVideoCloudflareId && expert.promoVideoStatus === 'ready'
          ? expert.promoVideoStatus
          : '');

      // Auto-set layout type to video if promo video exists but no layout was chosen
      const aboutLayout = aboutData?.layoutType || (aboutVideoId ? 'video' : '');

      const loadedData = {
        logo: brandingData?.logo || '',
        heroImage: expert.customLandingPage?.hero?.heroImage || '',
        headline: expert.customLandingPage?.hero?.headline || '',
        description: expert.customLandingPage?.hero?.description || '',
        ctaText: expert.customLandingPage?.hero?.ctaText || 'Explore Courses',
        ctaLink: expert.customLandingPage?.hero?.ctaLink || '',
        alignment: (expert.customLandingPage?.hero?.alignment || 'center') as
          | 'center'
          | 'left'
          | 'right',
        valueType: (valueProps?.type || 'list') as 'paragraph' | 'list',
        valueContent: valueProps?.content || '',
        valueItem1: valueProps?.items?.[0] || '',
        valueItem2: valueProps?.items?.[1] || '',
        valueItem3: valueProps?.items?.[2] || '',
        aboutLayoutType: aboutLayout as '' | 'video' | 'image-text',
        aboutVideoCloudflareId: aboutVideoId,
        aboutVideoStatus: aboutVideoStat as '' | 'uploading' | 'processing' | 'ready' | 'error',
        aboutImageUrl: aboutData?.imageUrl || '',
        aboutText: aboutData?.text || '',
        actImageUrl: actData?.imageUrl || '',
        actTitle: actData?.title || '',
        actText: actData?.text || '',
      };
      console.log('[DBG][landing-page-edit] Setting form data:', loadedData);
      setFormData(loadedData);
    } catch (err) {
      console.error('[DBG][landing-page-edit] Error loading expert:', err);
      setError(err instanceof Error ? err.message : 'Failed to load expert');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoImageUpload = (asset: Asset) => {
    console.log('[DBG][landing-page-edit] Logo image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    console.log('[DBG][landing-page-edit] Setting logo to:', imageUrl);
    setLogoImageAsset(asset);
    setFormData(prev => ({
      ...prev,
      logo: imageUrl,
    }));
    setUploadError('');
  };

  const handleHeroImageUpload = (asset: Asset) => {
    console.log('[DBG][landing-page-edit] Hero image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    console.log('[DBG][landing-page-edit] Setting heroImage to:', imageUrl);
    setHeroImageAsset(asset);
    setFormData(prev => {
      const updated = {
        ...prev,
        heroImage: imageUrl,
      };
      console.log('[DBG][landing-page-edit] Updated formData:', updated);
      return updated;
    });
    setUploadError('');
  };

  const handleAboutImageUpload = (asset: Asset) => {
    console.log('[DBG][landing-page-edit] About image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    console.log('[DBG][landing-page-edit] Setting aboutImageUrl to:', imageUrl);
    setAboutImageAsset(asset);
    setFormData(prev => ({
      ...prev,
      aboutImageUrl: imageUrl,
    }));
    setUploadError('');
  };

  const handleActImageUpload = (asset: Asset) => {
    console.log('[DBG][landing-page-edit] Act image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    console.log('[DBG][landing-page-edit] Setting actImageUrl to:', imageUrl);
    setActImageAsset(asset);
    setFormData(prev => ({
      ...prev,
      actImageUrl: imageUrl,
    }));
    setUploadError('');
  };

  const handleAboutVideoUploadComplete = (result: VideoUploadResult) => {
    console.log('[DBG][landing-page-edit] About video upload complete:', result);
    setFormData(prev => ({
      ...prev,
      aboutVideoCloudflareId: result.videoId,
      aboutVideoStatus: result.status,
    }));
  };

  const handleAboutVideoClear = () => {
    setFormData(prev => ({
      ...prev,
      aboutVideoCloudflareId: '',
      aboutVideoStatus: '',
    }));
  };

  const handleAboutVideoError = (errorMsg: string) => {
    console.error('[DBG][landing-page-edit] About video upload error:', errorMsg);
    setError(errorMsg);
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][landing-page-edit] Upload error:', error);
    setUploadError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    console.log('[DBG][landing-page-edit] Submitting landing page update');
    console.log('[DBG][landing-page-edit] Current formData:', formData);

    try {
      // Prepare value propositions data
      const valueItems = [formData.valueItem1, formData.valueItem2, formData.valueItem3].filter(
        item => item.trim() !== ''
      );

      const valuePropositions =
        formData.valueType === 'paragraph'
          ? { type: 'paragraph' as const, content: formData.valueContent.trim() || undefined }
          : { type: 'list' as const, items: valueItems.length > 0 ? valueItems : undefined };

      // Prepare about section data
      const aboutSection =
        formData.aboutLayoutType === 'video' && formData.aboutVideoCloudflareId.trim()
          ? {
              layoutType: 'video' as const,
              videoCloudflareId: formData.aboutVideoCloudflareId.trim(),
              videoStatus: formData.aboutVideoStatus || undefined,
            }
          : formData.aboutLayoutType === 'image-text' &&
              formData.aboutImageUrl.trim() &&
              formData.aboutText.trim()
            ? {
                layoutType: 'image-text' as const,
                imageUrl: formData.aboutImageUrl.trim(),
                text: formData.aboutText.trim(),
              }
            : undefined;

      // Prepare act section data
      const actSection =
        formData.actImageUrl.trim() || formData.actTitle.trim() || formData.actText.trim()
          ? {
              imageUrl: formData.actImageUrl.trim() || undefined,
              title: formData.actTitle.trim() || undefined,
              text: formData.actText.trim() || undefined,
            }
          : undefined;

      // Prepare landing page data
      // Prepare branding data
      const brandingSection = formData.logo.trim() ? { logo: formData.logo.trim() } : undefined;

      const landingPageData = {
        customLandingPage: {
          branding: brandingSection,
          hero: {
            heroImage: formData.heroImage.trim() || undefined,
            headline: formData.headline.trim() || undefined,
            description: formData.description.trim() || undefined,
            ctaText: formData.ctaText.trim() || 'Explore Courses',
            ctaLink: formData.ctaLink.trim() || undefined,
            alignment: formData.alignment || 'center',
          },
          valuePropositions:
            valuePropositions.content ||
            (valuePropositions.items && valuePropositions.items.length > 0)
              ? valuePropositions
              : undefined,
          about: aboutSection,
          act: actSection,
        },
      };

      console.log('[DBG][landing-page-edit] Sending data:', landingPageData);
      console.log('[DBG][landing-page-edit] heroImage value:', formData.heroImage);

      const response = await fetch(`/data/experts/${expertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(landingPageData),
      });

      const result = await response.json();
      console.log('[DBG][landing-page-edit] Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update landing page');
      }

      console.log('[DBG][landing-page-edit] Landing page updated successfully');
      console.log('[DBG][landing-page-edit] Updated expert data:', result.data);
      console.log(
        '[DBG][landing-page-edit] Saved customLandingPage:',
        result.data?.customLandingPage
      );

      // Redirect to expert dashboard
      router.push(`/srv/${expertId}`);
    } catch (err) {
      console.error('[DBG][landing-page-edit] Error updating landing page:', err);
      setError(err instanceof Error ? err.message : 'Failed to update landing page');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading landing page data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Landing Page</h1>
          <p className="text-gray-600">
            Customize your expert landing page to attract more students
          </p>
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
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Branding Section */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Branding</h2>
            <p className="text-sm text-gray-600 mb-6">
              Upload your logo to display in the header when visitors access your subdomain
            </p>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <ImageUploadCrop
                  width={300}
                  height={100}
                  category="logo"
                  label="Logo (300x100px recommended, transparent PNG works best)"
                  onUploadComplete={handleLogoImageUpload}
                  onError={handleUploadError}
                  relatedTo={{
                    type: 'expert',
                    id: expertId,
                  }}
                  currentImageUrl={formData.logo}
                />
                <p className="mt-2 text-sm text-gray-500">
                  This logo will be displayed in the header on your subdomain (e.g.,{' '}
                  <span className="font-mono text-blue-600">{expertId}.myyoga.guru</span>). If no
                  logo is uploaded, your name will be shown instead.
                </p>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Hero Section</h2>
            <p className="text-sm text-gray-600 mb-6">
              Create a powerful first impression with a custom hero image and compelling copy
            </p>

            <div className="space-y-6">
              {/* Hero Image */}
              <div>
                <ImageUploadCrop
                  width={1920}
                  height={600}
                  category="banner"
                  label="Hero Background Image (1920x600px)"
                  onUploadComplete={handleHeroImageUpload}
                  onError={handleUploadError}
                  relatedTo={{
                    type: 'expert',
                    id: expertId,
                  }}
                  currentImageUrl={formData.heroImage}
                />
                {heroImageAsset && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">✓ Hero image updated successfully</p>
                  </div>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  This image will be used as the background for your landing page hero section
                </p>
              </div>

              {/* Problem Hook (Headline) */}
              <div>
                <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-2">
                  Headline (Problem Hook)
                </label>
                <input
                  type="text"
                  id="headline"
                  name="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  placeholder="e.g., Struggling with chronic back pain?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Address your students&apos; main problem or pain point
                </p>
              </div>

              {/* Results Hook (Description) */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description (Results Hook)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g., Transform your life with gentle, therapeutic yoga designed specifically for back pain relief. Join thousands who have found lasting relief."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Describe the transformation or results students can expect
                </p>
              </div>

              {/* CTA Button Text */}
              <div>
                <label htmlFor="ctaText" className="block text-sm font-medium text-gray-700 mb-2">
                  Call-to-Action Button Text
                </label>
                <input
                  type="text"
                  id="ctaText"
                  name="ctaText"
                  value={formData.ctaText}
                  onChange={handleChange}
                  placeholder="e.g., Start Your Journey Today"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The text shown on the main action button (defaults to &quot;Explore Courses&quot;)
                </p>
              </div>

              {/* CTA Button Link */}
              <div>
                <label htmlFor="ctaLink" className="block text-sm font-medium text-gray-700 mb-2">
                  Call-to-Action Button Link
                </label>
                <input
                  type="text"
                  id="ctaLink"
                  name="ctaLink"
                  value={formData.ctaLink}
                  onChange={handleChange}
                  placeholder="e.g., /questionnaire or #courses"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Where the CTA button should link to (used in both Hero and Act sections)
                </p>
              </div>

              {/* Text Alignment */}
              <div>
                <label htmlFor="alignment" className="block text-sm font-medium text-gray-700 mb-2">
                  Text Alignment
                </label>
                <select
                  id="alignment"
                  name="alignment"
                  value={formData.alignment}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="center">Center (Default) - Text centered, full width</option>
                  <option value="left">Left - Text in left half, left aligned</option>
                  <option value="right">Right - Text in right half, right aligned</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose how to position and align your hero text
                </p>
              </div>
            </div>
          </div>

          {/* Value Propositions Section */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Value Propositions</h2>
            <p className="text-sm text-gray-600 mb-6">
              Highlight 1-3 key benefits or value propositions for your students
            </p>

            <div className="space-y-6">
              {/* Type Selection */}
              <div>
                <label htmlFor="valueType" className="block text-sm font-medium text-gray-700 mb-2">
                  Display Type
                </label>
                <select
                  id="valueType"
                  name="valueType"
                  value={formData.valueType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="list">List (2-3 items)</option>
                  <option value="paragraph">Paragraph</option>
                </select>
              </div>

              {/* Conditional Fields */}
              {formData.valueType === 'paragraph' ? (
                <div>
                  <label
                    htmlFor="valueContent"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Paragraph Text
                  </label>
                  <textarea
                    id="valueContent"
                    name="valueContent"
                    rows={4}
                    value={formData.valueContent}
                    onChange={handleChange}
                    placeholder="e.g., Our courses combine ancient wisdom with modern science to help you achieve lasting transformation..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="valueItem1"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Value Proposition 1
                    </label>
                    <input
                      type="text"
                      id="valueItem1"
                      name="valueItem1"
                      value={formData.valueItem1}
                      onChange={handleChange}
                      placeholder="e.g., Personalized guidance tailored to your needs"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="valueItem2"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Value Proposition 2
                    </label>
                    <input
                      type="text"
                      id="valueItem2"
                      name="valueItem2"
                      value={formData.valueItem2}
                      onChange={handleChange}
                      placeholder="e.g., Proven techniques for lasting results"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="valueItem3"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Value Proposition 3 (Optional)
                    </label>
                    <input
                      type="text"
                      id="valueItem3"
                      name="valueItem3"
                      value={formData.valueItem3}
                      onChange={handleChange}
                      placeholder="e.g., Ongoing support and community"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">About Section</h2>
            <p className="text-sm text-gray-600 mb-6">
              Add an about section with either a video or image + text layout
            </p>

            <div className="space-y-6">
              {/* Layout Type Selection */}
              <div>
                <label
                  htmlFor="aboutLayoutType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Layout Type
                </label>
                <select
                  id="aboutLayoutType"
                  name="aboutLayoutType"
                  value={formData.aboutLayoutType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None - Don&apos;t show about section</option>
                  <option value="video">Video (centered)</option>
                  <option value="image-text">Image + Text (side by side)</option>
                </select>
              </div>

              {/* Video Layout Fields */}
              {formData.aboutLayoutType === 'video' && (
                <VideoUpload
                  label="About Video"
                  maxDurationSeconds={300}
                  videoId={formData.aboutVideoCloudflareId}
                  videoStatus={formData.aboutVideoStatus}
                  onUploadComplete={handleAboutVideoUploadComplete}
                  onClear={handleAboutVideoClear}
                  onError={handleAboutVideoError}
                  helpText="Upload a video to display in your about section (max 5 minutes)"
                />
              )}

              {/* Image + Text Layout Fields */}
              {formData.aboutLayoutType === 'image-text' && (
                <>
                  <div>
                    <ImageUploadCrop
                      width={800}
                      height={600}
                      category="about"
                      label="About Image (800x600px recommended)"
                      onUploadComplete={handleAboutImageUpload}
                      onError={handleUploadError}
                      relatedTo={{
                        type: 'expert',
                        id: expertId,
                      }}
                      currentImageUrl={formData.aboutImageUrl}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="aboutText"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      About Text
                    </label>
                    <textarea
                      id="aboutText"
                      name="aboutText"
                      rows={6}
                      value={formData.aboutText}
                      onChange={handleChange}
                      placeholder="e.g., Share your story, expertise, philosophy, or what makes your approach unique..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Tell your story or describe what makes your approach unique
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Act Section */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Act Section</h2>
            <p className="text-gray-600 mb-6">
              Add a call-to-action section with an image and text. The CTA button will use the same
              text and link from your Hero section.
            </p>
            <div className="space-y-6">
              <div>
                <ImageUploadCrop
                  width={800}
                  height={600}
                  category="about"
                  label="Act Section Image (800x600px recommended)"
                  onUploadComplete={handleActImageUpload}
                  onError={handleUploadError}
                  relatedTo={{
                    type: 'expert',
                    id: expertId,
                  }}
                  currentImageUrl={formData.actImageUrl}
                />
              </div>
              <div>
                <label htmlFor="actTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Act Section Title
                </label>
                <input
                  type="text"
                  id="actTitle"
                  name="actTitle"
                  value={formData.actTitle}
                  onChange={handleChange}
                  placeholder="e.g., Let's uncover the power of your brand."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Main heading for the act section</p>
              </div>
              <div>
                <label htmlFor="actText" className="block text-sm font-medium text-gray-700 mb-2">
                  Act Section Text
                </label>
                <textarea
                  id="actText"
                  name="actText"
                  rows={4}
                  value={formData.actText}
                  onChange={handleChange}
                  placeholder="e.g., Take the guesswork out of your branding and marketing..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Description text for the act section. The CTA button will use your Hero
                  section&apos;s CTA text and link.
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Preview</h2>
            <div className="bg-gray-100 rounded-lg p-6">
              <div
                className="relative rounded-lg overflow-hidden"
                style={{
                  height: '300px',
                  backgroundImage: formData.heroImage
                    ? `url(${formData.heroImage})`
                    : 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems:
                      formData.alignment === 'left'
                        ? 'flex-start'
                        : formData.alignment === 'right'
                          ? 'flex-end'
                          : 'center',
                    textAlign: formData.alignment === 'center' ? 'center' : formData.alignment,
                    padding: '40px',
                  }}
                >
                  <div
                    style={{
                      maxWidth: formData.alignment === 'center' ? '600px' : '400px',
                      width: formData.alignment === 'center' ? '100%' : '50%',
                    }}
                  >
                    <h3 className="text-3xl font-bold text-white mb-4">
                      {formData.headline || 'Your Headline Here'}
                    </h3>
                    <p className="text-lg text-white/90 mb-6">
                      {formData.description || 'Your description here'}
                    </p>
                    <button className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold">
                      {formData.ctaText || 'Explore Courses'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6">
            <Link
              href={`/srv/${expertId}`}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
            >
              {saving ? 'Saving...' : 'Save Landing Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
