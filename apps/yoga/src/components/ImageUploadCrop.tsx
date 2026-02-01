'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { getCroppedImg, readFile } from '@/lib/cropImage';
import type { Asset, AssetCategory } from '@/types';

interface ImageUploadCropProps {
  width: number;
  height: number;
  category: AssetCategory;
  tenantId: string; // Required: expert ID for asset isolation
  onUploadComplete: (asset: Asset) => void;
  onError?: (error: string) => void;
  relatedTo?: {
    type: 'expert' | 'user' | 'course' | 'lesson';
    id: string;
  };
  uploadedBy?: string;
  label?: string;
  currentImageUrl?: string;
}

export default function ImageUploadCrop({
  width,
  height,
  category,
  tenantId,
  onUploadComplete,
  onError,
  relatedTo,
  uploadedBy,
  label = 'Upload Image',
  currentImageUrl,
}: ImageUploadCropProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const aspectRatio = width / height;

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOriginalFile(file);

      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !originalFile) {
      onError?.('Please select and crop an image first');
      return;
    }

    setUploading(true);

    try {
      console.log('[DBG][ImageUploadCrop] Starting upload...');

      // Create cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (!croppedBlob) {
        throw new Error('Failed to create cropped image');
      }

      // Create cropped file
      const croppedFile = new File([croppedBlob], `cropped_${originalFile.name}`, {
        type: 'image/jpeg',
      });

      // Prepare form data
      const formData = new FormData();
      formData.append('original', originalFile);
      formData.append('cropped', croppedFile);
      formData.append('category', category);
      formData.append('tenantId', tenantId);

      if (relatedTo) {
        formData.append('relatedToType', relatedTo.type);
        formData.append('relatedToId', relatedTo.id);
      }

      if (uploadedBy) {
        formData.append('uploadedBy', uploadedBy);
      }

      // Add crop data
      formData.append(
        'cropData',
        JSON.stringify({
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
          zoom,
        })
      );

      console.log('[DBG][ImageUploadCrop] Uploading to API...');

      // Upload to API
      const response = await fetch('/api/cloudflare/images/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('[DBG][ImageUploadCrop] Upload successful:', result.data);

      // Reset state
      setImageSrc(null);
      setOriginalFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);

      // Call success callback
      onUploadComplete(result.data);
    } catch (error) {
      console.error('[DBG][ImageUploadCrop] Upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    setOriginalFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div className="space-y-4">
      {/* Display current image if exists */}
      {currentImageUrl && !imageSrc && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Current Image</p>
          <img
            src={currentImageUrl}
            alt="Current"
            className="rounded-lg border border-gray-300"
            style={{ maxWidth: '200px' }}
          />
        </div>
      )}

      {/* File input */}
      {!imageSrc && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
          <input
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Recommended size: {width}x{height}px
          </p>
        </div>
      )}

      {/* Crop interface */}
      {imageSrc && (
        <div className="space-y-4">
          <div
            className="relative bg-gray-100 rounded-lg overflow-hidden"
            style={{ height: '400px' }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* Zoom slider */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={uploading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? 'Uploading...' : 'Save Image'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
