'use client';

import { useState, useEffect } from 'react';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset, Survey } from '@/types';
import type { SectionEditorProps, HeroFormData } from '../types';

interface CtaLinkOption {
  value: string;
  label: string;
}

export default function HeroEditor({ data, onChange, expertId, onError }: SectionEditorProps) {
  const [formData, setFormData] = useState<HeroFormData>({
    heroImage: data.hero?.heroImage || '',
    headline: data.hero?.headline || '',
    description: data.hero?.description || '',
    ctaText: data.hero?.ctaText || 'Explore Courses',
    ctaLink: data.hero?.ctaLink || '#courses',
    alignment: data.hero?.alignment || 'center',
  });
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [ctaOptions, setCtaOptions] = useState<CtaLinkOption[]>([
    { value: '#courses', label: 'Courses Section' },
  ]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Fetch published surveys for CTA dropdown
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        console.log('[DBG][HeroEditor] Fetching surveys for expert:', expertId);
        const response = await fetch(`/api/srv/experts/${expertId}/survey`);
        const result = await response.json();

        if (result.success && result.data) {
          const surveys: Survey[] = result.data;
          const activeSurveys = surveys.filter(s => s.status === 'active');

          const surveyOptions: CtaLinkOption[] = activeSurveys.map(survey => ({
            value: `/survey/${survey.id}`,
            label: `Survey: ${survey.title}`,
          }));
          // Note: The actual URL will be relative to the expert's page
          // e.g., on arun.myyoga.guru, /survey/123 becomes /experts/arun/survey/123

          setCtaOptions([{ value: '#courses', label: 'Courses Section' }, ...surveyOptions]);
          console.log('[DBG][HeroEditor] Loaded', activeSurveys.length, 'active surveys');
        }
      } catch (err) {
        console.error('[DBG][HeroEditor] Error fetching surveys:', err);
      } finally {
        setLoadingSurveys(false);
      }
    };

    if (expertId) {
      fetchSurveys();
    }
  }, [expertId]);

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      heroImage: data.hero?.heroImage || '',
      headline: data.hero?.headline || '',
      description: data.hero?.description || '',
      ctaText: data.hero?.ctaText || 'Explore Courses',
      ctaLink: data.hero?.ctaLink || '#courses',
      alignment: data.hero?.alignment || 'center',
    });
  }, [data.hero]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Propagate changes to parent
    onChange({
      hero: {
        ...data.hero,
        heroImage: updated.heroImage || undefined,
        headline: updated.headline || undefined,
        description: updated.description || undefined,
        ctaText: updated.ctaText || 'Explore Courses',
        ctaLink: updated.ctaLink || undefined,
        alignment: updated.alignment,
      },
    });
  };

  const handleHeroImageUpload = (asset: Asset) => {
    console.log('[DBG][HeroEditor] Hero image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    const updated = { ...formData, heroImage: imageUrl };
    setFormData(updated);
    setShowImageUpload(false);

    onChange({
      hero: {
        ...data.hero,
        heroImage: imageUrl,
        headline: updated.headline || undefined,
        description: updated.description || undefined,
        ctaText: updated.ctaText || 'Explore Courses',
        ctaLink: updated.ctaLink || undefined,
        alignment: updated.alignment,
      },
    });
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][HeroEditor] Upload error:', error);
    onError?.(error);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Hero Section</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a powerful first impression with a custom hero image and compelling copy
        </p>
      </div>

      {/* Hero Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hero Background Image
        </label>

        {/* Show thumbnail with edit icon when image exists and not editing */}
        {formData.heroImage && !showImageUpload ? (
          <div className="relative inline-block group">
            <img
              src={formData.heroImage}
              alt="Hero background"
              className="rounded-lg border border-gray-300 object-cover"
              style={{ width: '240px', height: '75px' }}
            />
            <button
              type="button"
              onClick={() => setShowImageUpload(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
              title="Change image"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        ) : !formData.heroImage && !showImageUpload ? (
          /* Show add button when no image exists */
          <button
            type="button"
            onClick={() => setShowImageUpload(true)}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm font-medium">Add hero image</span>
          </button>
        ) : (
          /* Show upload component when editing */
          <div className="space-y-3">
            <ImageUploadCrop
              width={1920}
              height={600}
              category="banner"
              label="Select new image (1920x600px)"
              onUploadComplete={handleHeroImageUpload}
              onError={handleUploadError}
              relatedTo={{
                type: 'expert',
                id: expertId,
              }}
            />
            <button
              type="button"
              onClick={() => setShowImageUpload(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description (Results Hook)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Transform your life with gentle, therapeutic yoga designed specifically for back pain relief."
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
        <select
          id="ctaLink"
          name="ctaLink"
          value={formData.ctaLink}
          onChange={handleChange}
          disabled={loadingSurveys}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        >
          {ctaOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Where the CTA button should link to (used in both Hero and Act sections)
        </p>
        {ctaOptions.length === 1 && !loadingSurveys && (
          <p className="mt-2 text-xs text-amber-600">
            No active surveys available. Publish a survey to add it as a CTA option.
          </p>
        )}
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
  );
}
