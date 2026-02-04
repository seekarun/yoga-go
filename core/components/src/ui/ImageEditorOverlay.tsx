"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { readFile } from "@core/lib";
import { PexelsImagePicker } from "./PexelsImagePicker";

export interface ImageEditorData {
  imageUrl: string;
  imagePosition: string;
  imageZoom: number;
}

export interface ImageEditorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ImageEditorData) => void;
  currentImage?: string;
  currentPosition?: string;
  currentZoom?: number;
  title?: string;
  /** Aspect ratio for the preview (e.g., "16/9", "1/1", "4/3", "3/4"). Default: "16/9" */
  aspectRatio?: string;
  /** Upload endpoint for file uploads (optional - if not provided, returns base64) */
  uploadEndpoint?: string;
  /** Additional form data to send with upload */
  uploadFormData?: Record<string, string>;
  /** Pexels API endpoint (default: /api/pexels/search) */
  pexelsApiEndpoint?: string;
  /** Default search query for Pexels */
  defaultSearchQuery?: string;
}

/**
 * Get a human-readable name for an aspect ratio
 */
function getAspectRatioName(ratio: string): string {
  const names: Record<string, string> = {
    "16/9": "Landscape (16:9)",
    "4/3": "Standard (4:3)",
    "1/1": "Square (1:1)",
    "3/4": "Portrait (3:4)",
    "9/16": "Vertical (9:16)",
    "2/1": "Wide (2:1)",
    "21/9": "Ultra Wide (21:9)",
  };
  return names[ratio] || ratio;
}

/**
 * ImageEditorOverlay - A reusable overlay component for image editing
 * Supports:
 * - Upload from file or Pexels
 * - Zoom control (100-300%)
 * - Drag to reposition
 * - Configurable aspect ratio preview
 */
export function ImageEditorOverlay({
  isOpen,
  onClose,
  onSave,
  currentImage,
  currentPosition = "50% 50%",
  currentZoom = 100,
  title = "Edit Background Image",
  aspectRatio = "16/9",
  uploadEndpoint,
  uploadFormData,
  pexelsApiEndpoint = "/api/pexels/search",
  defaultSearchQuery = "nature",
}: ImageEditorOverlayProps) {
  // Parse position string to x/y object
  const parsePosition = (pos: string) => {
    const match = pos.match(/(\d+)%\s+(\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  const [imageUrl, setImageUrl] = useState(currentImage || "");
  const [position, setPosition] = useState(parsePosition(currentPosition));
  const [zoom, setZoom] = useState(currentZoom);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "pexels">("upload");

  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageUrl(currentImage || "");
      setPosition(parsePosition(currentPosition));
      setZoom(currentZoom);
      setError("");
    }
  }, [isOpen, currentImage, currentPosition, currentZoom]);

  // Handle file selection
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      setError("");
      setIsUploading(true);

      try {
        if (uploadEndpoint) {
          // Upload to server
          const formData = new FormData();
          formData.append("file", file);
          if (uploadFormData) {
            Object.entries(uploadFormData).forEach(([key, value]) => {
              formData.append(key, value);
            });
          }

          const response = await fetch(uploadEndpoint, {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || "Upload failed");
          }

          setImageUrl(result.data?.url || result.url);
        } else {
          // Convert to base64
          const base64 = await readFile(file);
          setImageUrl(base64);
        }

        // Reset position and zoom for new image
        setPosition({ x: 50, y: 50 });
        setZoom(100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        // Reset the input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [uploadEndpoint, uploadFormData],
  );

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    const newX = Math.max(
      0,
      Math.min(100, dragStartRef.current.posX - percentX),
    );
    const newY = Math.max(
      0,
      Math.min(100, dragStartRef.current.posY - percentY),
    );

    setPosition({ x: Math.round(newX), y: Math.round(newY) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Save handler
  const handleSave = () => {
    if (!imageUrl) {
      setError("Please select an image");
      return;
    }

    onSave({
      imageUrl,
      imagePosition: `${position.x}% ${position.y}%`,
      imageZoom: zoom,
    });
    onClose();
  };

  // Remove image
  const handleRemove = () => {
    setImageUrl("");
    setPosition({ x: 50, y: 50 });
    setZoom(100);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          maxWidth: "640px",
          width: "100%",
          margin: "0 16px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#111827",
                margin: 0,
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "4px 0 0 0",
              }}
            >
              {getAspectRatioName(aspectRatio)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px",
              color: "#9ca3af",
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 5L5 15M5 5l10 10" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
          }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              {error}
            </div>
          )}

          {/* Image Preview / Editor */}
          {imageUrl ? (
            <div>
              {/* Preview with drag */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Drag to reposition, use zoom to resize
                </label>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: aspectRatio,
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "2px solid #e5e7eb",
                    backgroundColor: "#f3f4f6",
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${imageUrl})`,
                      backgroundPosition: `${position.x}% ${position.y}%`,
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      transform: `scale(${zoom / 100})`,
                    }}
                  />
                  {/* Position indicator */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        color: "white",
                        fontSize: "13px",
                        padding: "6px 12px",
                        borderRadius: "9999px",
                        opacity: isDragging ? 1 : 0,
                        transition: "opacity 0.2s",
                      }}
                    >
                      Position: {position.x}%, {position.y}%
                    </div>
                  </div>
                  {/* Corner indicators to show crop area */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: "2px dashed rgba(255,255,255,0.3)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              {/* Zoom Slider */}
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                      <path d="M11 8v6M8 11h6" />
                    </svg>
                    Zoom
                  </label>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      fontWeight: 500,
                    }}
                  >
                    {zoom}%
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="300"
                  value={zoom}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    height: "8px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    accentColor: "#2563eb",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginTop: "4px",
                  }}
                >
                  <span>Fit</span>
                  <span>Zoomed</span>
                </div>
              </div>

              {/* Reset & Info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Tip: Zoom in and drag to frame your image perfectly
                </span>
                <button
                  onClick={() => {
                    setPosition({ x: 50, y: 50 });
                    setZoom(100);
                  }}
                  style={{
                    color: "#2563eb",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Reset
                </button>
              </div>

              {/* Change/Remove Image */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    fontSize: "14px",
                    color: "#2563eb",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Change Image
                </button>
                <span style={{ color: "#d1d5db" }}>|</span>
                <button
                  onClick={handleRemove}
                  style={{
                    fontSize: "14px",
                    color: "#dc2626",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Remove Image
                </button>
              </div>
            </div>
          ) : (
            /* Upload Interface */
            <div>
              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #e5e7eb",
                  marginBottom: "16px",
                }}
              >
                <button
                  onClick={() => setActiveTab("upload")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    borderBottom:
                      activeTab === "upload"
                        ? "2px solid #2563eb"
                        : "2px solid transparent",
                    marginBottom: "-1px",
                    color: activeTab === "upload" ? "#2563eb" : "#6b7280",
                    background: "none",
                    border: "none",
                    borderBottomWidth: "2px",
                    borderBottomStyle: "solid",
                    cursor: "pointer",
                  }}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab("pexels")}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    borderBottom:
                      activeTab === "pexels"
                        ? "2px solid #2563eb"
                        : "2px solid transparent",
                    marginBottom: "-1px",
                    color: activeTab === "pexels" ? "#2563eb" : "#6b7280",
                    background: "none",
                    border: "none",
                    borderBottomWidth: "2px",
                    borderBottomStyle: "solid",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 32 32"
                      fill="currentColor"
                    >
                      <path
                        d="M2 0h28a2 2 0 0 1 2 2v28a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"
                        fillOpacity="0.1"
                      />
                      <path d="M13 21V11h3.3a4.2 4.2 0 0 1 0 8.4H13V21h-2.5v-10H13m0-1.5v0" />
                    </svg>
                    Search Pexels
                  </span>
                </button>
              </div>

              {activeTab === "upload" ? (
                /* File Upload */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #d1d5db",
                    borderRadius: "8px",
                    padding: "32px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    style={{
                      margin: "0 auto",
                      height: "48px",
                      width: "48px",
                      color: "#9ca3af",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p
                    style={{
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#4b5563",
                    }}
                  >
                    {isUploading ? "Uploading..." : "Click to upload an image"}
                  </p>
                  <p
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              ) : (
                /* Pexels Search */
                <PexelsImagePicker
                  onImageSelect={(url) => {
                    setImageUrl(url);
                    setPosition({ x: 50, y: 50 });
                    setZoom(100);
                  }}
                  onError={(err) => setError(err)}
                  defaultSearchQuery={defaultSearchQuery}
                  apiEndpoint={pexelsApiEndpoint}
                />
              )}
            </div>
          )}

          {/* Hidden file input - using inline style to ensure it's hidden */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              color: "#374151",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!imageUrl || isUploading}
            style={{
              padding: "8px 24px",
              backgroundColor: !imageUrl || isUploading ? "#d1d5db" : "#2563eb",
              color: "white",
              borderRadius: "8px",
              fontWeight: 500,
              border: "none",
              cursor: !imageUrl || isUploading ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageEditorOverlay;
