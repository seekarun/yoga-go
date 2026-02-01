'use client';

import ImageSelector from '@/components/ImageSelector';
import InfoTooltip from '@/components/InfoTooltip';
import { useEffect, useState } from 'react';
import CTAButtonConfig, { type CTAConfig } from '../../CTAButtonConfig';
import type { HeroFormData, SectionEditorProps } from '../types';

export default function HeroEditor({ data, onChange, expertId }: SectionEditorProps) {
  const [formData, setFormData] = useState<HeroFormData>({
    heroImage: data.hero?.heroImage || '',
    headline: data.hero?.headline || '',
    description: data.hero?.description || '',
    ctaText: data.hero?.ctaText || 'Explore Courses',
    ctaLink: data.hero?.ctaLink || '#courses',
    alignment: data.hero?.alignment || 'center',
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

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

  const handleImageChange = (imageData: {
    imageUrl?: string;
    imagePosition?: string;
    imageZoom?: number;
  }) => {
    const updated = { ...formData, heroImage: imageData.imageUrl || '' };
    setFormData(updated);

    onChange({
      hero: {
        ...data.hero,
        heroImage: imageData.imageUrl,
        heroImagePosition: imageData.imagePosition,
        heroImageZoom: imageData.imageZoom,
        heroImageAttribution: undefined,
        headline: formData.headline || undefined,
        description: formData.description || undefined,
        ctaText: formData.ctaText || 'Explore Courses',
        ctaLink: formData.ctaLink || undefined,
        alignment: formData.alignment,
      },
    });
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

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    const updated = { ...formData, alignment };
    setFormData(updated);

    onChange({
      hero: {
        ...data.hero,
        heroImage: updated.heroImage || undefined,
        headline: updated.headline || undefined,
        description: updated.description || undefined,
        ctaText: updated.ctaText || 'Explore Courses',
        ctaLink: updated.ctaLink || undefined,
        alignment,
      },
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Create a powerful first impression with a custom hero image and compelling copy
      </p>

      {/* Hero Image */}
      <ImageSelector
        imageUrl={data.hero?.heroImage}
        imagePosition={data.hero?.heroImagePosition}
        imageZoom={data.hero?.heroImageZoom}
        tenantId={expertId}
        onChange={handleImageChange}
        label="Hero Background Image"
        defaultSearchQuery="yoga meditation"
      />

      {/* Text Alignment */}
      <div>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              type="button"
              onClick={() => handleAlignmentChange(align)}
              className={`p-2 rounded border transition-colors ${
                formData.alignment === align
                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title={`Align ${align}`}
            >
              {align === 'left' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.5A.5.5 0 012.5 4h11a.5.5 0 010 1h-11A.5.5 0 012 4.5zm0 4A.5.5 0 012.5 8h7a.5.5 0 010 1h-7A.5.5 0 012 8.5zm0 4a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5z" />
                </svg>
              )}
              {align === 'center' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4.5A.5.5 0 014.5 4h11a.5.5 0 010 1h-11A.5.5 0 014 4.5zm2 4A.5.5 0 016.5 8h7a.5.5 0 010 1h-7A.5.5 0 016 8.5zm-2 4a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm2 4a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5z" />
                </svg>
              )}
              {align === 'right' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6 4.5A.5.5 0 016.5 4h11a.5.5 0 010 1h-11A.5.5 0 016 4.5zm4 4a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm-4 4a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm4 4a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Problem Hook (Headline) */}
      <div>
        <label
          htmlFor="headline"
          className="text-sm font-medium text-gray-700 mb-2 flex items-center"
        >
          Problem hook
          <InfoTooltip text="Start with a question or statement that addresses your audience's main struggle or pain point. This creates an immediate connection with visitors who share that problem." />
        </label>
        <textarea
          id="headline"
          name="headline"
          rows={3}
          value={formData.headline}
          onChange={handleChange}
          placeholder="e.g., Struggling with chronic back pain?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Results Hook (Description) */}
      <div>
        <label
          htmlFor="description"
          className="text-sm font-medium text-gray-700 mb-2 flex items-center"
        >
          Results hook
          <InfoTooltip text="Describe the transformation or outcome your students will experience. Focus on the benefits and results they can expect, not just features of your offering." />
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
      </div>

      {/* CTA Button Configuration */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          Button (call-to-action)
          <InfoTooltip text="Your call-to-action button guides visitors to take the next step. Use action-oriented text like 'Start Learning' or 'Join Now' and link to your primary offering" />
        </h4>
        <CTAButtonConfig
          ctaText={formData.ctaText}
          ctaLink={formData.ctaLink}
          onChange={handleCTAChange}
          expertId={expertId}
        />
      </div>
    </div>
  );
}
