"use client";

import type { GallerySection, GalleryImage } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type GalleryProps = SectionComponentProps<GallerySection>;

/**
 * Gallery Section Component
 *
 * Image grid to showcase work or photos.
 */
export default function GallerySectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onImageClick,
}: GalleryProps) {
  const { heading, subheading, images, columns = 3 } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleCaptionChange = (imageId: string, caption: string) => {
    const updated = images.map((img) =>
      img.id === imageId ? { ...img, caption } : img,
    );
    onUpdate?.({ images: updated });
  };

  const handleAddImage = () => {
    const newImage: GalleryImage = {
      id: `gallery-${Date.now()}`,
      src: "",
      alt: "Gallery image",
      caption: "",
    };
    onUpdate?.({ images: [...images, newImage] });
  };

  const handleRemoveImage = (id: string) => {
    onUpdate?.({ images: images.filter((img) => img.id !== id) });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: "#f9fafb",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: "#6b7280",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: "16px",
  };

  const imageContainerStyle: React.CSSProperties = {
    position: "relative",
    paddingTop: "100%", // 1:1 aspect ratio
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  };

  const imageStyle = (src?: string): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backgroundImage: src ? `url(${src})` : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const captionStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "12px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    color: "#ffffff",
    fontSize: "0.9rem",
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

  const addImageStyle: React.CSSProperties = {
    position: "relative",
    paddingTop: "100%",
    borderRadius: "12px",
    border: "2px dashed #e5e7eb",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  };

  const addImageContentStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
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
          .gallery-item:hover .delete-btn {
            opacity: 1;
          }
          .add-image-btn:hover {
            border-color: #9ca3af;
            background: rgba(0, 0, 0, 0.02);
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {isEditing ? (
            <>
              <div
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{
                  ...headingStyle,
                  ...editableStyle,
                  display: "inline-block",
                }}
                onBlur={(e) =>
                  handleHeadingChange(e.currentTarget.textContent || "")
                }
              >
                {heading || "Gallery"}
              </div>
              <div
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  handleSubheadingChange(e.currentTarget.textContent || "")
                }
              >
                {subheading || "See my work"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{heading || "Gallery"}</h2>
              <p style={subheadingStyle}>{subheading || "See my work"}</p>
            </>
          )}
        </div>

        {/* Image Grid */}
        <div style={gridStyle}>
          {images.map((image) => (
            <div
              key={image.id}
              className="gallery-item"
              style={imageContainerStyle}
            >
              <div style={imageStyle(image.src)}>
                {!image.src && (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>

              {/* Caption */}
              {(image.caption || isEditing) && (
                <div style={captionStyle}>
                  {isEditing ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        outline: "none",
                        borderRadius: "2px",
                        padding: "2px 4px",
                      }}
                      onBlur={(e) =>
                        handleCaptionChange(
                          image.id,
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {image.caption || "Add caption..."}
                    </div>
                  ) : (
                    <span>{image.caption}</span>
                  )}
                </div>
              )}

              {isEditing && (
                <>
                  {/* Edit image button */}
                  <button
                    type="button"
                    onClick={() => onImageClick?.(`gallery-${image.id}`)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "32px",
                      height: "32px",
                      backgroundColor: "white",
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      zIndex: 1,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleRemoveImage(image.id)}
                    style={{
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
                      opacity: 0,
                      transition: "opacity 0.2s",
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
                </>
              )}
            </div>
          ))}

          {/* Add Image Button */}
          {isEditing && images.length < 12 && (
            <button
              type="button"
              className="add-image-btn"
              style={addImageStyle}
              onClick={handleAddImage}
            >
              <div style={addImageContentStyle}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span
                  style={{
                    marginTop: "12px",
                    color: "#6b7280",
                    fontSize: "0.9rem",
                  }}
                >
                  Add Image
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Empty state */}
        {images.length === 0 && !isEditing && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#9ca3af",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: "0 auto 16px" }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>No images yet</p>
          </div>
        )}
      </div>
    </section>
  );
}
