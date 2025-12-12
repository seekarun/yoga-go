'use client';

import { useState, useEffect } from 'react';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset } from '@/types';
import type { SectionEditorProps, ActFormData } from '../types';

export default function ActEditor({ data, onChange, expertId, onError }: SectionEditorProps) {
  const [formData, setFormData] = useState<ActFormData>({
    imageUrl: data.act?.imageUrl || '',
    title: data.act?.title || '',
    text: data.act?.text || '',
  });

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      imageUrl: data.act?.imageUrl || '',
      title: data.act?.title || '',
      text: data.act?.text || '',
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
    const hasContent = updated.imageUrl || updated.title || updated.text;
    const actSection = hasContent
      ? {
          imageUrl: updated.imageUrl || undefined,
          title: updated.title || undefined,
          text: updated.text || undefined,
        }
      : undefined;

    onChange({ act: actSection });
  };

  const handleImageUpload = (asset: Asset) => {
    console.log('[DBG][ActEditor] Image uploaded:', asset);
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    const updated = { ...formData, imageUrl };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][ActEditor] Upload error:', error);
    onError?.(error);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Call to Action Section</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add a call-to-action section with an image and text. The CTA button will use the same text
          and link from your Hero section.
        </p>
      </div>

      {/* Act Image */}
      <div>
        <ImageUploadCrop
          width={800}
          height={600}
          category="about"
          label="Act Section Image (800x600px recommended)"
          onUploadComplete={handleImageUpload}
          onError={handleUploadError}
          relatedTo={{
            type: 'expert',
            id: expertId,
          }}
          currentImageUrl={formData.imageUrl}
        />
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
          Description text for the act section. The CTA button will use your Hero section&apos;s CTA
          text and link.
        </p>
      </div>
    </div>
  );
}
