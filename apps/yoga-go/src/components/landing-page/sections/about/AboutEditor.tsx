'use client';

import { useState, useEffect } from 'react';
import ImageSelector from '@/components/ImageSelector';
import VideoUpload from '@/components/VideoUpload';
import type { VideoUploadResult } from '@/components/VideoUpload';
import type { SectionEditorProps, AboutFormData } from '../types';

export default function AboutEditor({ data, onChange, expertId, onError }: SectionEditorProps) {
  const [formData, setFormData] = useState<AboutFormData>({
    layoutType: data.about?.layoutType || '',
    videoCloudflareId: data.about?.videoCloudflareId || '',
    videoStatus: data.about?.videoStatus || '',
    imageUrl: data.about?.imageUrl || '',
    text: data.about?.text || '',
  });

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      layoutType: data.about?.layoutType || '',
      videoCloudflareId: data.about?.videoCloudflareId || '',
      videoStatus: data.about?.videoStatus || '',
      imageUrl: data.about?.imageUrl || '',
      text: data.about?.text || '',
    });
  }, [data.about]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    propagateChanges(updated);
  };

  const propagateChanges = (updated: AboutFormData, imagePosition?: string, imageZoom?: number) => {
    const aboutSection =
      updated.layoutType === 'video' && updated.videoCloudflareId
        ? {
            layoutType: 'video' as const,
            videoCloudflareId: updated.videoCloudflareId,
            videoStatus: updated.videoStatus || undefined,
          }
        : updated.layoutType === 'image-text'
          ? {
              layoutType: 'image-text' as const,
              imageUrl: updated.imageUrl || undefined,
              imagePosition: imagePosition ?? data.about?.imagePosition,
              imageZoom: imageZoom ?? data.about?.imageZoom,
              text: updated.text || undefined,
            }
          : undefined;

    onChange({ about: aboutSection });
  };

  const handleVideoUploadComplete = (result: VideoUploadResult) => {
    console.log('[DBG][AboutEditor] Video upload complete:', result);
    const updated = {
      ...formData,
      videoCloudflareId: result.videoId,
      videoStatus: result.status as AboutFormData['videoStatus'],
    };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleVideoClear = () => {
    const updated = {
      ...formData,
      videoCloudflareId: '',
      videoStatus: '' as const,
    };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleVideoError = (errorMsg: string) => {
    console.error('[DBG][AboutEditor] Video upload error:', errorMsg);
    onError?.(errorMsg);
  };

  const handleImageChange = (imageData: {
    imageUrl?: string;
    imagePosition?: string;
    imageZoom?: number;
  }) => {
    console.log('[DBG][AboutEditor] Image changed:', imageData);
    const updated = { ...formData, imageUrl: imageData.imageUrl || '' };
    setFormData(updated);
    propagateChanges(updated, imageData.imagePosition, imageData.imageZoom);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">About Section</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add an about section with either a video or image + text layout
        </p>
      </div>

      {/* Layout Type Selection */}
      <div>
        <label htmlFor="layoutType" className="block text-sm font-medium text-gray-700 mb-2">
          Layout Type
        </label>
        <select
          id="layoutType"
          name="layoutType"
          value={formData.layoutType}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">None - Don&apos;t show about section</option>
          <option value="video">Video (centered)</option>
          <option value="image-text">Image + Text (side by side)</option>
        </select>
      </div>

      {/* Video Layout Fields */}
      {formData.layoutType === 'video' && (
        <VideoUpload
          label="About Video"
          maxDurationSeconds={300}
          videoId={formData.videoCloudflareId}
          videoStatus={formData.videoStatus}
          onUploadComplete={handleVideoUploadComplete}
          onClear={handleVideoClear}
          onError={handleVideoError}
          helpText="Upload a video to display in your about section (max 5 minutes)"
        />
      )}

      {/* Image + Text Layout Fields */}
      {formData.layoutType === 'image-text' && (
        <>
          <ImageSelector
            imageUrl={data.about?.imageUrl}
            imagePosition={data.about?.imagePosition}
            imageZoom={data.about?.imageZoom}
            tenantId={expertId}
            onChange={handleImageChange}
            label="About Image"
            defaultSearchQuery="yoga portrait"
          />
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
              About Text
            </label>
            <textarea
              id="text"
              name="text"
              rows={6}
              value={formData.text}
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
  );
}
