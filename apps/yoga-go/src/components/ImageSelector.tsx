'use client';

import { useState, useRef } from 'react';
import PexelsImagePicker from '@/components/PexelsImagePicker';

interface ImageSelectorProps {
  /** Current image URL */
  imageUrl?: string;
  /** Current image position (e.g., "50% 50%") */
  imagePosition?: string;
  /** Current image zoom level (100-200) */
  imageZoom?: number;
  /** Tenant ID for uploads */
  tenantId: string;
  /** Callback when image or position/zoom changes */
  onChange: (data: { imageUrl?: string; imagePosition?: string; imageZoom?: number }) => void;
  /** Label for the field */
  label?: string;
  /** Help text shown below the field */
  helpText?: string;
  /** Preview height in pixels */
  previewHeight?: number;
  /** Default search query for Pexels */
  defaultSearchQuery?: string;
}

export default function ImageSelector({
  imageUrl,
  imagePosition = '50% 50%',
  imageZoom = 100,
  tenantId,
  onChange,
  label = 'Image',
  helpText,
  previewHeight = 120,
  defaultSearchQuery = 'yoga meditation',
}: ImageSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);

  const handleImageSelect = (url: string, _attribution?: unknown, source?: 'pexels' | 'upload') => {
    onChange({
      imageUrl: url,
      imagePosition: '50% 50%',
      imageZoom: 100,
    });

    // Only close panel when uploading
    if (source === 'upload') {
      setShowPicker(false);
    }
  };

  const handleRemoveImage = () => {
    onChange({
      imageUrl: undefined,
      imagePosition: undefined,
      imageZoom: undefined,
    });
  };

  const handlePositionSave = (data: {
    heroImage?: string;
    heroImagePosition?: string;
    heroImageZoom?: number;
  }) => {
    onChange({
      imageUrl: data.heroImage,
      imagePosition: data.heroImagePosition,
      imageZoom: data.heroImageZoom,
    });
  };

  // Parse position for display
  const parsePosition = (pos: string) => {
    const match = pos.match(/(\d+)%\s+(\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

      {imageUrl ? (
        <div className="space-y-2">
          {/* Image Preview */}
          <div
            className="relative rounded-lg border border-gray-300 overflow-hidden cursor-pointer group"
            style={{ width: '100%', height: `${previewHeight}px` }}
            onClick={() => setShowPicker(true)}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: imagePosition,
                backgroundSize: `${imageZoom}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-white text-sm font-medium flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Image
              </div>
            </div>
          </div>

          {/* Action Links */}
          <button
            type="button"
            onClick={() => setShowPositionEditor(true)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 9l-3 3 3 3" />
              <path d="M9 5l3-3 3 3" />
              <path d="M15 19l3 3 3-3" />
              <path d="M19 9l3 3-3 3" />
              <path d="M2 12h20" />
              <path d="M12 2v20" />
            </svg>
            Reposition
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
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
          <span className="text-sm font-medium">Add image</span>
        </button>
      )}

      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}

      {/* Image Picker Panel */}
      {showPicker && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Select Image</h4>

          <PexelsImagePicker
            width={1920}
            height={1080}
            category="banner"
            tenantId={tenantId}
            onImageSelect={(url, attr, source) => {
              handleImageSelect(url, attr, source);
            }}
            currentImageUrl={imageUrl}
            defaultSearchQuery={defaultSearchQuery}
          />

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="w-full py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Done
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
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
          </div>
        </div>
      )}

      {/* Position Editor Modal */}
      {showPositionEditor && (
        <PositionEditorModal
          isOpen={showPositionEditor}
          onClose={() => setShowPositionEditor(false)}
          currentImage={imageUrl}
          currentPosition={imagePosition}
          currentZoom={imageZoom}
          onSave={handlePositionSave}
        />
      )}
    </div>
  );
}

// Inline Position Editor Modal (simplified version without image picker)
interface PositionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage?: string;
  currentPosition?: string;
  currentZoom?: number;
  onSave: (data: {
    heroImage?: string;
    heroImagePosition?: string;
    heroImageZoom?: number;
  }) => void;
}

function PositionEditorModal({
  isOpen,
  onClose,
  currentImage,
  currentPosition = '50% 50%',
  currentZoom = 100,
  onSave,
}: PositionEditorModalProps) {
  const parsePosition = (pos: string) => {
    const match = pos.match(/(\d+)%\s+(\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  const [position, setPosition] = useState(parsePosition(currentPosition));
  const [zoom, setZoom] = useState(currentZoom);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentImage) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current.x = e.clientX;
    dragStartRef.current.y = e.clientY;
    dragStartRef.current.posX = position.x;
    dragStartRef.current.posY = position.y;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, dragStartRef.current.posX - percentX));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.posY - percentY));

    setPosition({ x: Math.round(newX), y: Math.round(newY) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSave({
      heroImage: currentImage,
      heroImagePosition: `${position.x}% ${position.y}%`,
      heroImageZoom: zoom,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reposition Image</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preview */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Drag to reposition</label>
            <div
              className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
            >
              {currentImage && (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${currentImage})`,
                      backgroundPosition: `${position.x}% ${position.y}%`,
                      backgroundSize: `${zoom}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`bg-black/50 text-white text-sm px-3 py-1.5 rounded-full transition-opacity ${
                        isDragging ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {position.x}% {position.y}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Zoom</label>
              <span className="text-sm text-gray-500">{zoom}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="200"
              value={zoom}
              onChange={e => setZoom(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          {/* Position Display */}
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span>
              Position: {position.x}% horizontal, {position.y}% vertical
            </span>
            <button
              onClick={() => setPosition({ x: 50, y: 50 })}
              className="text-blue-600 hover:text-blue-800"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
