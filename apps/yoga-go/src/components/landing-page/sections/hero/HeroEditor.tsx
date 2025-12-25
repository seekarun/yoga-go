'use client';

import { useState, useEffect } from 'react';
import UnsplashImagePicker from '@/components/UnsplashImagePicker';
import type { UnsplashAttribution } from '@/components/UnsplashImagePicker';
import CTAButtonConfig, { type CTAConfig } from '../../CTAButtonConfig';
import type { SectionEditorProps, HeroFormData } from '../types';

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

  const handleImageSelect = (imageUrl: string, attribution?: UnsplashAttribution) => {
    console.log('[DBG][HeroEditor] Image selected:', imageUrl);
    if (attribution) {
      console.log('[DBG][HeroEditor] Attribution:', attribution.photographerName);
    }

    const updated = { ...formData, heroImage: imageUrl };
    setFormData(updated);
    setShowImageUpload(false);

    onChange({
      hero: {
        ...data.hero,
        heroImage: imageUrl,
        heroImageAttribution: attribution
          ? {
              photographerName: attribution.photographerName,
              photographerUsername: attribution.photographerUsername,
              photographerUrl: attribution.photographerUrl,
              unsplashUrl: attribution.unsplashUrl,
            }
          : undefined,
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

  const handleCTAChange = (config: CTAConfig) => {
    const updated = {
      ...formData,
      ctaText: config.ctaText,
      ctaLink: config.ctaLink,
    };
    setFormData(updated);

    onChange({
      hero: {
        ...data.hero,
        heroImage: updated.heroImage || undefined,
        headline: updated.headline || undefined,
        description: updated.description || undefined,
        ctaText: config.ctaText || 'Explore Courses',
        ctaLink: config.ctaLink || '#courses',
        alignment: updated.alignment,
      },
    });
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
          /* Show image picker when editing */
          <div className="space-y-3">
            <UnsplashImagePicker
              width={1920}
              height={600}
              category="banner"
              tenantId={expertId}
              defaultSearchQuery="yoga meditation"
              onImageSelect={handleImageSelect}
              onError={handleUploadError}
              relatedTo={{
                type: 'expert',
                id: expertId,
              }}
              currentImageUrl={formData.heroImage}
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

      {/* CTA Button Configuration */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Call-to-Action Button</h4>
        <CTAButtonConfig
          ctaText={formData.ctaText}
          ctaLink={formData.ctaLink}
          onChange={handleCTAChange}
          expertId={expertId}
        />
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
