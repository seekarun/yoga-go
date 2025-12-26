'use client';

import { useState, useCallback } from 'react';
import ImageUploadCrop from '@/components/ImageUploadCrop';
import type { Asset, AssetCategory } from '@/types';
import type { PexelsImageResult } from '@/app/api/pexels/search/route';

interface PexelsImagePickerProps {
  width: number;
  height: number;
  category: AssetCategory;
  tenantId: string;
  onImageSelect: (imageUrl: string, attribution?: PexelsAttribution) => void;
  onError?: (error: string) => void;
  relatedTo?: {
    type: 'expert' | 'user' | 'course' | 'lesson';
    id: string;
  };
  uploadedBy?: string;
  currentImageUrl?: string;
  defaultSearchQuery?: string;
}

export interface PexelsAttribution {
  photographerName: string;
  photographerUrl: string;
  pexelsUrl: string;
}

type TabType = 'pexels' | 'upload';

export default function PexelsImagePicker({
  width,
  height,
  category,
  tenantId,
  onImageSelect,
  onError,
  relatedTo,
  uploadedBy,
  currentImageUrl,
  defaultSearchQuery = 'yoga',
}: PexelsImagePickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pexels');
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [searchResults, setSearchResults] = useState<PexelsImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PexelsImageResult | null>(null);
  const [selecting, setSelecting] = useState(false);

  const searchPexels = useCallback(
    async (query: string, pageNum: number = 1) => {
      if (!query.trim()) {
        onError?.('Please enter a search query');
        return;
      }

      setLoading(true);
      setHasSearched(true);

      try {
        console.log('[DBG][PexelsImagePicker] Searching:', query, 'page:', pageNum);

        const response = await fetch(
          `/api/pexels/search?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=12`
        );
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Search failed');
        }

        setSearchResults(result.data.results);
        setTotalPages(result.data.totalPages);
        setPage(result.data.page);

        console.log('[DBG][PexelsImagePicker] Found', result.data.total, 'results');
      } catch (error) {
        console.error('[DBG][PexelsImagePicker] Search error:', error);
        onError?.(error instanceof Error ? error.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPexels(searchQuery, 1);
  };

  const handlePageChange = (newPage: number) => {
    searchPexels(searchQuery, newPage);
  };

  const handleImageSelect = async (image: PexelsImageResult) => {
    setSelectedImage(image);
    setSelecting(true);

    try {
      // Return the hero-optimized URL (no attribution needed - Pexels license doesn't require it)
      onImageSelect(image.urls.hero);
      console.log('[DBG][PexelsImagePicker] Image selected:', image.urls.hero);
    } catch (error) {
      console.error('[DBG][PexelsImagePicker] Selection error:', error);
      onImageSelect(image.urls.hero);
    } finally {
      setSelecting(false);
      setSelectedImage(null);
    }
  };

  const handleUploadComplete = (asset: Asset) => {
    const imageUrl = asset.croppedUrl || asset.originalUrl;
    console.log('[DBG][PexelsImagePicker] Upload complete:', imageUrl);
    onImageSelect(imageUrl);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('pexels')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pexels'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
              <path
                d="M2 0h28a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"
                fillOpacity="0.1"
              />
              <path d="M13 21V11h3.3a4.2 4.2 0 0 1 0 8.4H13V21h-2.5v-10H13m0-1.5v0" />
            </svg>
            Search Pexels
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Your Own
          </span>
        </button>
      </div>

      {/* Pexels Search Tab */}
      {activeTab === 'pexels' && (
        <div className="space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for images..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results Grid */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {searchResults.map(image => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => handleImageSelect(image)}
                    disabled={selecting && selectedImage?.id === image.id}
                    className={`relative group overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage?.id === image.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-transparent hover:border-blue-300'
                    }`}
                  >
                    {/* Image */}
                    <div
                      className="aspect-video bg-gray-100"
                      style={{
                        backgroundImage: `url(${image.urls.thumb})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: image.avgColor,
                      }}
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {selecting && selectedImage?.id === image.id ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                      ) : (
                        <span className="text-white text-sm font-medium">Select</span>
                      )}
                    </div>

                    {/* Attribution */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">
                        by {image.attribution.photographerName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Pexels Attribution */}
              <p className="text-xs text-gray-400 text-center">
                Photos provided by{' '}
                <a
                  href="https://www.pexels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  Pexels
                </a>
              </p>
            </>
          )}

          {!loading && hasSearched && searchResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No images found. Try a different search term.
            </div>
          )}

          {!hasSearched && !loading && (
            <div className="text-center py-8 text-gray-500">
              Search for beautiful, free photos to use as your hero background.
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <ImageUploadCrop
          width={width}
          height={height}
          category={category}
          tenantId={tenantId}
          label={`Upload image (${width}x${height}px)`}
          onUploadComplete={handleUploadComplete}
          onError={onError}
          relatedTo={relatedTo}
          uploadedBy={uploadedBy}
          currentImageUrl={currentImageUrl}
        />
      )}
    </div>
  );
}
