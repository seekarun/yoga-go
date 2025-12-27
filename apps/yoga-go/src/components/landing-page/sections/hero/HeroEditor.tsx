'use client';

import { useState, useEffect } from 'react';
import ImageSelector from '@/components/ImageSelector';
import CTAButtonConfig, { type CTAConfig } from '../../CTAButtonConfig';
import type { SectionEditorProps, HeroFormData } from '../types';

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Hero Section</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a powerful first impression with a custom hero image and compelling copy
        </p>
      </div>

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
