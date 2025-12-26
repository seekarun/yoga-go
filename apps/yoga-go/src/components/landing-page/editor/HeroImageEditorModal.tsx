'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import PexelsImagePicker from '@/components/PexelsImagePicker';

interface HeroImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage?: string;
  currentPosition?: string; // "x% y%" format
  currentZoom?: number; // 100-200
  expertId: string;
  onSave: (data: {
    heroImage?: string;
    heroImagePosition?: string;
    heroImageZoom?: number;
  }) => void;
}

export default function HeroImageEditorModal({
  isOpen,
  onClose,
  currentImage,
  currentPosition = '50% 50%',
  currentZoom = 100,
  expertId,
  onSave,
}: HeroImageEditorModalProps) {
  // Parse initial position
  const parsePosition = (pos: string) => {
    const match = pos.match(/(\d+)%\s+(\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  const [imageUrl, setImageUrl] = useState(currentImage || '');
  const [position, setPosition] = useState(parsePosition(currentPosition));
  const [zoom, setZoom] = useState(currentZoom);
  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageUrl(currentImage || '');
      setPosition(parsePosition(currentPosition));
      setZoom(currentZoom);
      setShowPicker(false);
    }
  }, [isOpen, currentImage, currentPosition, currentZoom]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!imageUrl) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [imageUrl, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragRef.current) return;

      const rect = dragRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // Convert pixel delta to percentage (inverted for natural feel)
      const percentX = (deltaX / rect.width) * 100;
      const percentY = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStartRef.current.posX - percentX));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.posY - percentY));

      setPosition({ x: Math.round(newX), y: Math.round(newY) });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImageSelect = (url: string) => {
    setImageUrl(url);
    setShowPicker(false);
    // Reset position and zoom for new image
    setPosition({ x: 50, y: 50 });
    setZoom(100);
  };

  const handleSave = () => {
    onSave({
      heroImage: imageUrl || undefined,
      heroImagePosition: `${position.x}% ${position.y}%`,
      heroImageZoom: zoom,
    });
    onClose();
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setPosition({ x: 50, y: 50 });
    setZoom(100);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Hero Image</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {showPicker ? (
            /* Image Picker View */
            <div>
              <button
                onClick={() => setShowPicker(false)}
                className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 14L4 8l6-6" />
                </svg>
                Back to editor
              </button>
              <PexelsImagePicker
                width={1920}
                height={1080}
                category="banner"
                tenantId={expertId}
                onImageSelect={handleImageSelect}
                currentImageUrl={imageUrl}
                defaultSearchQuery="yoga meditation"
              />
            </div>
          ) : (
            /* Editor View */
            <div className="space-y-6">
              {/* Preview Area */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Preview</label>
                <div
                  ref={dragRef}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
                  style={{
                    cursor: imageUrl ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {imageUrl ? (
                    <>
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                          backgroundPosition: `${position.x}% ${position.y}%`,
                          backgroundSize: `${zoom}%`,
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                      {/* Drag hint */}
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
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <svg
                        width="48"
                        height="48"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect x="4" y="4" width="40" height="40" rx="4" />
                        <circle cx="16" cy="16" r="4" />
                        <path d="M44 32l-12-12-16 16" />
                      </svg>
                      <p className="mt-2">No image selected</p>
                    </div>
                  )}
                </div>
                {imageUrl && (
                  <p className="text-xs text-gray-500 text-center">Drag to reposition the image</p>
                )}
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                {/* Change Image Button */}
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="14" height="14" rx="2" />
                    <circle cx="7" cy="7" r="1.5" />
                    <path d="M17 10l-4-4-8 8" />
                  </svg>
                  {imageUrl ? 'Change Image' : 'Select Image'}
                </button>

                {/* Remove Image Button */}
                {imageUrl && (
                  <button
                    onClick={handleRemoveImage}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M6 6v12a2 2 0 002 2h8a2 2 0 002-2V6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                    Remove Image
                  </button>
                )}
              </div>

              {/* Zoom Slider */}
              {imageUrl && (
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
              )}

              {/* Position Display */}
              {imageUrl && (
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
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showPicker && (
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
              Apply Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
