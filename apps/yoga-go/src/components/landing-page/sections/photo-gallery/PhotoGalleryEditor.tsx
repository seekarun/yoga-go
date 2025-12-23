'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import UnsplashImagePicker from '@/components/UnsplashImagePicker';
import type { UnsplashAttribution } from '@/components/UnsplashImagePicker';
import type { SectionEditorProps } from '../types';

interface GalleryImage {
  id: string;
  url: string;
  thumbUrl?: string;
  caption?: string;
  attribution?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
}

interface PhotoGalleryFormData {
  title: string;
  description: string;
  images: GalleryImage[];
}

export default function PhotoGalleryEditor({
  data,
  onChange,
  expertId,
  onError,
}: SectionEditorProps) {
  const [formData, setFormData] = useState<PhotoGalleryFormData>({
    title: data.photoGallery?.title || 'Gallery',
    description: data.photoGallery?.description || '',
    images: data.photoGallery?.images || [],
  });
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);

  // Sync with parent data when it changes externally
  useEffect(() => {
    setFormData({
      title: data.photoGallery?.title || 'Gallery',
      description: data.photoGallery?.description || '',
      images: data.photoGallery?.images || [],
    });
  }, [data.photoGallery]);

  // Auto-fetch Unsplash suggestions when no images exist
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Only fetch if no images and we have a hero description
      if (formData.images.length > 0 || hasFetchedSuggestions || !data.hero?.description) {
        return;
      }

      setLoadingSuggestions(true);
      setHasFetchedSuggestions(true);

      try {
        console.log(
          '[DBG][PhotoGalleryEditor] Fetching Unsplash suggestions from hero description'
        );

        const response = await fetch('/api/unsplash/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: data.hero.description,
            count: 5,
          }),
        });

        const result = await response.json();

        if (result.success && result.data.suggestions.length > 0) {
          console.log(
            '[DBG][PhotoGalleryEditor] Got',
            result.data.suggestions.length,
            'suggestions'
          );

          // Track downloads for all suggested images
          for (const suggestion of result.data.suggestions) {
            fetch('/api/unsplash/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ downloadLocation: suggestion.downloadLocation }),
            }).catch(() => {});
          }

          // Convert suggestions to gallery images
          const newImages: GalleryImage[] = result.data.suggestions.map(
            (s: {
              id: string;
              url: string;
              thumbUrl: string;
              caption: string;
              attribution: UnsplashAttribution;
            }) => ({
              id: s.id,
              url: s.url,
              thumbUrl: s.thumbUrl,
              caption: s.caption,
              attribution: s.attribution,
            })
          );

          const updated = { ...formData, images: newImages };
          setFormData(updated);
          propagateChanges(updated);
        }
      } catch (error) {
        console.error('[DBG][PhotoGalleryEditor] Error fetching suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.hero?.description, hasFetchedSuggestions]);

  const propagateChanges = useCallback(
    (updated: PhotoGalleryFormData) => {
      onChange({
        photoGallery: {
          title: updated.title || 'Gallery',
          description: updated.description || undefined,
          images: updated.images.length > 0 ? updated.images : undefined,
        },
      });
    },
    [onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleImageSelect = (
    imageId: string,
    imageUrl: string,
    attribution?: UnsplashAttribution
  ) => {
    console.log('[DBG][PhotoGalleryEditor] Image selected for', imageId);

    const updated = {
      ...formData,
      images: formData.images.map(img =>
        img.id === imageId
          ? {
              ...img,
              url: imageUrl,
              thumbUrl: attribution
                ? `${imageUrl.split('&w=')[0]}&w=200&h=150&fit=crop&q=80`
                : undefined,
              attribution: attribution || undefined,
            }
          : img
      ),
    };
    setFormData(updated);
    setEditingImageId(null);
    propagateChanges(updated);
  };

  const handleAddNewImage = (imageUrl: string, attribution?: UnsplashAttribution) => {
    console.log('[DBG][PhotoGalleryEditor] New image added');

    const newImage: GalleryImage = {
      id: uuidv4(),
      url: imageUrl,
      thumbUrl: attribution ? `${imageUrl.split('&w=')[0]}&w=200&h=150&fit=crop&q=80` : undefined,
      caption: '',
      attribution: attribution || undefined,
    };

    const updated = {
      ...formData,
      images: [...formData.images, newImage],
    };
    setFormData(updated);
    setEditingImageId(null);
    propagateChanges(updated);
  };

  const handleRemoveImage = (imageId: string) => {
    const updated = {
      ...formData,
      images: formData.images.filter(img => img.id !== imageId),
    };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleCaptionChange = (imageId: string, caption: string) => {
    const updated = {
      ...formData,
      images: formData.images.map(img => (img.id === imageId ? { ...img, caption } : img)),
    };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleMoveImage = (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = formData.images.findIndex(img => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= formData.images.length) return;

    const newImages = [...formData.images];
    const [movedImage] = newImages.splice(currentIndex, 1);
    newImages.splice(newIndex, 0, movedImage);

    const updated = { ...formData, images: newImages };
    setFormData(updated);
    propagateChanges(updated);
  };

  const handleUploadError = (error: string) => {
    console.error('[DBG][PhotoGalleryEditor] Upload error:', error);
    onError?.(error);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Photo Gallery</h3>
        <p className="text-sm text-gray-600 mb-4">
          Showcase your photos in a horizontal carousel. Click any image to replace it.
        </p>
      </div>

      {/* Section Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Section Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Gallery"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Section Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Section Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Moments from our yoga sessions"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Gallery Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Images ({formData.images.length})
        </label>

        {/* Loading state */}
        {loadingSuggestions && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Finding images based on your content...
          </div>
        )}

        {/* Image Grid */}
        {!loadingSuggestions && formData.images.length > 0 && (
          <div className="space-y-3 mb-4">
            {formData.images.map((image, index) => (
              <div
                key={image.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Thumbnail - clickable to edit */}
                {editingImageId === image.id ? (
                  <div className="w-full">
                    <UnsplashImagePicker
                      width={800}
                      height={600}
                      category="other"
                      defaultSearchQuery="yoga"
                      onImageSelect={(url, attr) => handleImageSelect(image.id, url, attr)}
                      onError={handleUploadError}
                      relatedTo={{ type: 'expert', id: expertId }}
                      currentImageUrl={image.url}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingImageId(null)}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingImageId(image.id)}
                      className="relative group flex-shrink-0"
                      title="Click to replace image"
                    >
                      <img
                        src={image.thumbUrl || image.url}
                        alt={image.caption || `Gallery image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </div>
                    </button>

                    {/* Caption and Controls */}
                    <div className="flex-1 min-w-0">
                      {editingCaptionId === image.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={image.caption || ''}
                            onChange={e => handleCaptionChange(image.id, e.target.value)}
                            placeholder="Add a caption..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setEditingCaptionId(null)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-700 truncate">
                            {image.caption || (
                              <span className="text-gray-400 italic">No caption</span>
                            )}
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditingCaptionId(image.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            {image.caption ? 'Edit caption' : 'Add caption'}
                          </button>
                          {image.attribution && (
                            <p className="text-xs text-gray-400 mt-1">
                              Photo by {image.attribution.photographerName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Move and Delete Controls */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveImage(image.id, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(image.id, 'down')}
                        disabled={index === formData.images.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Remove image"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Image Button / Upload Component */}
        {editingImageId === 'new' ? (
          <div className="space-y-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <UnsplashImagePicker
              width={800}
              height={600}
              category="other"
              defaultSearchQuery="yoga"
              onImageSelect={(url, attr) => handleAddNewImage(url, attr)}
              onError={handleUploadError}
              relatedTo={{ type: 'expert', id: expertId }}
            />
            <button
              type="button"
              onClick={() => setEditingImageId(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingImageId('new')}
            className="flex items-center gap-2 px-4 py-3 w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors justify-center"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="text-sm font-medium">Add Image</span>
          </button>
        )}

        <p className="mt-2 text-xs text-gray-500">
          Add up to 20 images. Search Unsplash for free photos or upload your own.
        </p>
      </div>
    </div>
  );
}
