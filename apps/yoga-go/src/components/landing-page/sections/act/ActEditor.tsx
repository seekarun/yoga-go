'use client';

import { useState, useEffect } from 'react';
import UnsplashImagePicker, { type UnsplashAttribution } from '@/components/UnsplashImagePicker';
import CTAButtonConfig, { type CTAConfig } from '../../CTAButtonConfig';
import type { SectionEditorProps, ActFormData } from '../types';

export default function ActEditor({ data, onChange, expertId, onError }: SectionEditorProps) {
  const [formData, setFormData] = useState<ActFormData>({
    imageUrl: data.act?.imageUrl || '',
    imageAttribution: data.act?.imageAttribution,
    title: data.act?.title || '',
    text: data.act?.text || '',
    ctaText: data.act?.ctaText || '',
    ctaLink: data.act?.ctaLink || '',
  });

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      imageUrl: data.act?.imageUrl || '',
      imageAttribution: data.act?.imageAttribution,
      title: data.act?.title || '',
      text: data.act?.text || '',
      ctaText: data.act?.ctaText || '',
      ctaLink: data.act?.ctaLink || '',
    });
  }, [data.act]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    propagateChanges(updated);
  };

  const propagateChanges = (updated: ActFormData) => {
    // Don't trim during typing - only check if there's any content
    const hasContent =
      updated.imageUrl || updated.title || updated.text || updated.ctaText || updated.ctaLink;
    const actSection = hasContent
      ? {
          imageUrl: updated.imageUrl || undefined,
          imageAttribution: updated.imageAttribution,
          title: updated.title || undefined,
          text: updated.text || undefined,
          ctaText: updated.ctaText || undefined,
          ctaLink: updated.ctaLink || undefined,
        }
      : undefined;

    onChange({ act: actSection });
  };

  const handleImageSelect = (imageUrl: string, attribution?: UnsplashAttribution) => {
    console.log(
      '[DBG][ActEditor] Image selected:',
      imageUrl,
      attribution ? '(Unsplash)' : '(Upload)'
    );
    const updated = {
      ...formData,
      imageUrl,
      imageAttribution: attribution, // Will be undefined for uploaded images
    };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][ActEditor] Upload error:', error);
    onError?.(error);
  };

  const handleCTAChange = (config: CTAConfig) => {
    const updated = {
      ...formData,
      ctaText: config.ctaText,
      ctaLink: config.ctaLink,
    };
    setFormData(updated);
    propagateChanges(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Call to Action Section</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add a call-to-action section with an image and text. You can customize the CTA button or
          leave it blank to use your Hero section&apos;s CTA.
        </p>
      </div>

      {/* Act Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">CTA Section Image</label>
        <UnsplashImagePicker
          width={800}
          height={600}
          category="about"
          onImageSelect={handleImageSelect}
          onError={handleUploadError}
          relatedTo={{
            type: 'expert',
            id: expertId,
          }}
          currentImageUrl={formData.imageUrl}
          defaultSearchQuery="yoga practice"
        />
        {formData.imageAttribution && (
          <p className="mt-2 text-xs text-gray-500">
            Photo by{' '}
            <a
              href={formData.imageAttribution.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              {formData.imageAttribution.photographerName}
            </a>{' '}
            on{' '}
            <a
              href={formData.imageAttribution.unsplashUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Unsplash
            </a>
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Act Section Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Let's uncover the power of your brand."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">Main heading for the act section</p>
      </div>

      {/* Text */}
      <div>
        <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
          Act Section Text
        </label>
        <textarea
          id="text"
          name="text"
          rows={4}
          value={formData.text}
          onChange={handleChange}
          placeholder="e.g., Take the guesswork out of your branding and marketing..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          Description text for the call-to-action section
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
          showFallbackHint={true}
          fallbackText={data.hero?.ctaText}
          fallbackLink={data.hero?.ctaLink}
        />
      </div>
    </div>
  );
}
