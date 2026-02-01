'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { getCroppedImg, readFile } from '@/lib/cropImage';

interface UserAvatarUploadProps {
  currentAvatarUrl?: string;
  userName: string;
  onUploadComplete: (imageUrl: string) => void;
  onError?: (error: string) => void;
}

export default function UserAvatarUpload({
  currentAvatarUrl,
  userName,
  onUploadComplete,
  onError,
}: UserAvatarUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        onError?.('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onError?.('Image must be less than 5MB');
        return;
      }

      setOriginalFile(file);
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !originalFile) {
      onError?.('Please select and position your image first');
      return;
    }

    setUploading(true);

    try {
      console.log('[DBG][UserAvatarUpload] Starting upload...');

      // Create cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      if (!croppedBlob) {
        throw new Error('Failed to create cropped image');
      }

      // Create cropped file
      const croppedFile = new File([croppedBlob], `avatar_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload to direct upload endpoint
      const formData = new FormData();
      formData.append('file', croppedFile);

      console.log('[DBG][UserAvatarUpload] Uploading to API...');

      const response = await fetch('/api/cloudflare/images/direct-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('[DBG][UserAvatarUpload] Upload successful:', result.data);

      // Reset state
      setImageSrc(null);
      setOriginalFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);

      // Call success callback with image URL
      onUploadComplete(result.data.url);
    } catch (error) {
      console.error('[DBG][UserAvatarUpload] Upload error:', error);
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

  // Not in crop mode - show current avatar and upload button
  if (!imageSrc) {
    return (
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Profile Picture
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Current avatar preview */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: currentAvatarUrl ? `url(${currentAvatarUrl}) center/cover` : '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#888',
              border: '2px solid #e9ecef',
              flexShrink: 0,
            }}
          >
            {!currentAvatarUrl && userName.charAt(0).toUpperCase()}
          </div>

          <div>
            <label
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </label>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Crop mode - show cropper with circular preview
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Position Your Photo
      </label>

      <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        Drag to reposition. The circular area shows what will be visible as your profile picture.
      </p>

      {/* Crop area */}
      <div
        style={{
          position: 'relative',
          height: '300px',
          background: '#1a1a1a',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      {/* Zoom slider */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>Zoom</label>
          <span style={{ fontSize: '12px', color: '#888' }}>{Math.round(zoom * 100)}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            marginTop: '8px',
            background: '#e5e7eb',
            borderRadius: '3px',
            appearance: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button
          type="button"
          onClick={handleCancel}
          disabled={uploading}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#fff',
            background: uploading ? '#9ca3af' : 'var(--color-primary, #2563eb)',
            border: 'none',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Saving...' : 'Save Photo'}
        </button>
      </div>
    </div>
  );
}
