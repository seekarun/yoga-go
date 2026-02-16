"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GalleryConfig, BrandFont } from "@/types/landing-page";

interface GallerySectionProps {
  gallery: GalleryConfig;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  brandFonts?: { headerFont?: BrandFont; bodyFont?: BrandFont };
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onAddImage?: () => void;
  onRemoveImage?: (imageId: string) => void;
}

/**
 * Shared Gallery Section Component
 * Horizontal image carousel with lightbox
 */
export default function GallerySection({
  gallery,
  isEditing = false,
  variant = "light",
  brandFonts,
  onHeadingChange,
  onSubheadingChange,
  onAddImage,
  onRemoveImage,
}: GallerySectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      captionText: "#4b5563",
      cardBg: "#f9fafb",
      cardBorder: "#e5e7eb",
      arrowBg: "rgba(255, 255, 255, 0.9)",
      arrowColor: "#374151",
      placeholderBg: "#f3f4f6",
      placeholderText: "#9ca3af",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      captionText: "#9ca3af",
      cardBg: "#262626",
      cardBorder: "#374151",
      arrowBg: "rgba(0, 0, 0, 0.7)",
      arrowColor: "#ffffff",
      placeholderBg: "#262626",
      placeholderText: "#6b7280",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      captionText: "#4b5563",
      cardBg: "#ffffff",
      cardBorder: "#e5e7eb",
      arrowBg: "rgba(255, 255, 255, 0.9)",
      arrowColor: "#374151",
      placeholderBg: "#e5e7eb",
      placeholderText: "#9ca3af",
    },
  };

  const theme = colors[variant];
  const images = gallery.images || [];

  // Close lightbox on Escape, navigate with arrow keys
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % images.length : null,
        );
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + images.length) % images.length : null,
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, images.length]);

  const scrollTo = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: theme.bg,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1440px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: brandFonts?.headerFont?.family || undefined,
    fontSize: brandFonts?.headerFont?.size
      ? `${brandFonts.headerFont.size}px`
      : "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: theme.heading,
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontFamily: brandFonts?.bodyFont?.family || undefined,
    fontSize: brandFonts?.bodyFont?.size
      ? `${brandFonts.bodyFont.size}px`
      : "1.1rem",
    color: theme.subheading,
    maxWidth: "600px",
    margin: "0 auto",
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "4px 8px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const editableClass =
    variant === "dark" ? "editable-field-light" : "editable-field-dark";

  const carouselWrapperStyle: React.CSSProperties = {
    position: "relative",
  };

  const carouselStyle: React.CSSProperties = {
    display: "flex",
    gap: "20px",
    overflowX: "auto",
    scrollSnapType: "x mandatory",
    scrollBehavior: "smooth",
    WebkitOverflowScrolling: "touch",
    // Hide scrollbar
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    padding: "4px 0",
  };

  const imageCardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    width: "320px",
    scrollSnapAlign: "start",
    borderRadius: "12px",
    overflow: "hidden",
    border: `1px solid ${theme.cardBorder}`,
    backgroundColor: theme.cardBg,
    cursor: isEditing ? "default" : "pointer",
    position: "relative",
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: "4/3",
    objectFit: "cover",
    display: "block",
  };

  const captionStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: "0.9rem",
    color: theme.captionText,
    lineHeight: 1.4,
  };

  const arrowBtnStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: "-16px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: theme.arrowBg,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 2,
    transition: "opacity 0.2s",
  });

  const placeholderStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "12px",
    padding: "60px 20px",
    backgroundColor: theme.placeholderBg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  };

  const addCardStyle: React.CSSProperties = {
    flex: "0 0 auto",
    width: "320px",
    scrollSnapAlign: "start",
    borderRadius: "12px",
    border: `2px dashed ${theme.cardBorder}`,
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    aspectRatio: "4/3",
    transition: "border-color 0.2s, background 0.2s",
  };

  const removeButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    left: "8px",
    width: "32px",
    height: "32px",
    backgroundColor: "#ef4444",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    zIndex: 1,
  };

  return (
    <section style={sectionStyle}>
      {isEditing && (
        <style>{`
          .editable-field-dark:focus {
            background: rgba(0, 0, 0, 0.05) !important;
            outline: 2px solid rgba(0, 0, 0, 0.3) !important;
          }
          .editable-field-dark:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.1) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.05);
          }
          .gallery-carousel::-webkit-scrollbar { display: none; }
          .gallery-add-btn:hover {
            border-color: #9ca3af;
            background: rgba(0, 0, 0, 0.02);
          }
        `}</style>
      )}
      <style>{`
        .gallery-carousel::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {isEditing ? (
            <>
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{
                  ...headingStyle,
                  ...editableStyle,
                  display: "inline-block",
                }}
                onBlur={(e) =>
                  onHeadingChange?.(e.currentTarget.textContent || "")
                }
              >
                {gallery.heading || "Gallery"}
              </div>
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  onSubheadingChange?.(e.currentTarget.textContent || "")
                }
              >
                {gallery.subheading || ""}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{gallery.heading || "Gallery"}</h2>
              {gallery.subheading && (
                <p style={subheadingStyle}>{gallery.subheading}</p>
              )}
            </>
          )}
        </div>

        {/* Carousel or Placeholder */}
        {images.length === 0 && !isEditing ? (
          <div style={placeholderStyle}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.placeholderText}
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p style={{ color: theme.placeholderText, fontSize: "0.95rem" }}>
              No images yet
            </p>
          </div>
        ) : (
          <div style={carouselWrapperStyle}>
            {/* Left arrow */}
            {images.length > 3 && (
              <button
                type="button"
                style={arrowBtnStyle("left")}
                onClick={() => scrollTo("left")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.arrowColor}
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            <div
              ref={scrollRef}
              className="gallery-carousel"
              style={carouselStyle}
            >
              {images.map((image, index) => (
                <div
                  key={image.id}
                  style={imageCardStyle}
                  onClick={() => {
                    if (!isEditing) setLightboxIndex(index);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- gallery images are user-uploaded with dynamic URLs */}
                  <img
                    src={image.url}
                    alt={image.caption || `Gallery image ${index + 1}`}
                    style={imageStyle}
                  />
                  {image.caption && (
                    <div style={captionStyle}>{image.caption}</div>
                  )}
                  {isEditing && (
                    <button
                      type="button"
                      style={removeButtonStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage?.(image.id);
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {/* Add Image button (edit mode only) */}
              {isEditing && (
                <button
                  type="button"
                  className="gallery-add-btn"
                  style={addCardStyle}
                  onClick={onAddImage}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.placeholderText}
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  <span
                    style={{
                      marginTop: "12px",
                      color: theme.placeholderText,
                      fontSize: "0.9rem",
                    }}
                  >
                    Add Image
                  </span>
                </button>
              )}
            </div>

            {/* Right arrow */}
            {images.length > 3 && (
              <button
                type="button"
                style={arrowBtnStyle("right")}
                onClick={() => scrollTo("right")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.arrowColor}
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "44px",
              height: "44px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 51,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Prev arrow */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (lightboxIndex - 1 + images.length) % images.length,
                );
              }}
              style={{
                position: "absolute",
                left: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 51,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- lightbox displays user-uploaded images */}
            <img
              src={images[lightboxIndex].url}
              alt={
                images[lightboxIndex].caption ||
                `Gallery image ${lightboxIndex + 1}`
              }
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: "4px",
              }}
            />
            {images[lightboxIndex].caption && (
              <p
                style={{
                  color: "#ffffff",
                  fontSize: "1rem",
                  marginTop: "16px",
                  textAlign: "center",
                }}
              >
                {images[lightboxIndex].caption}
              </p>
            )}
          </div>

          {/* Next arrow */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % images.length);
              }}
              style={{
                position: "absolute",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 51,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
