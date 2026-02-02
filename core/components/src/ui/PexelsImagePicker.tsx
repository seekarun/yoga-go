"use client";

import { useState, useCallback } from "react";

export interface PexelsImageResult {
  id: number;
  width: number;
  height: number;
  avgColor: string;
  description: string | null;
  urls: {
    thumb: string;
    preview: string;
    hero: string;
  };
  attribution: {
    photographerName: string;
    photographerUrl: string;
    pexelsUrl: string;
  };
}

export interface PexelsImagePickerProps {
  onImageSelect: (imageUrl: string) => void;
  onError?: (error: string) => void;
  defaultSearchQuery?: string;
  /** API endpoint for Pexels search (default: /api/pexels/search) */
  apiEndpoint?: string;
}

/**
 * PexelsImagePicker - A reusable component for searching and selecting images from Pexels
 * Uses inline styles for framework-agnostic styling
 */
export function PexelsImagePicker({
  onImageSelect,
  onError,
  defaultSearchQuery = "nature",
  apiEndpoint = "/api/pexels/search",
}: PexelsImagePickerProps) {
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [searchResults, setSearchResults] = useState<PexelsImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [hoveredImageId, setHoveredImageId] = useState<number | null>(null);

  const searchPexels = useCallback(
    async (query: string, pageNum: number = 1) => {
      if (!query.trim()) {
        onError?.("Please enter a search query");
        return;
      }

      setLoading(true);
      setHasSearched(true);

      try {
        console.log(
          "[DBG][PexelsImagePicker] Searching:",
          query,
          "page:",
          pageNum,
        );

        const response = await fetch(
          `${apiEndpoint}?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=9`,
        );
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Search failed");
        }

        setSearchResults(result.data.results);
        setTotalPages(result.data.totalPages);
        setPage(result.data.page);

        console.log(
          "[DBG][PexelsImagePicker] Found",
          result.data.total,
          "results",
        );
      } catch (error) {
        console.error("[DBG][PexelsImagePicker] Search error:", error);
        onError?.(error instanceof Error ? error.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [apiEndpoint, onError],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPexels(searchQuery, 1);
  };

  const handlePageChange = (newPage: number) => {
    searchPexels(searchQuery, newPage);
  };

  const handleImageSelect = (image: PexelsImageResult) => {
    setSelectedImageId(image.id);
    onImageSelect(image.urls.hero);
    console.log("[DBG][PexelsImagePicker] Image selected:", image.urls.hero);
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const searchFormStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
  };

  const searchInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 40px 10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const searchButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: "8px",
    padding: "6px",
    background: "none",
    border: "none",
    cursor: loading ? "not-allowed" : "pointer",
    color: loading ? "#d1d5db" : "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  };

  const loadingStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    padding: "32px 0",
  };

  const spinnerStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  const emptyStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "32px 0",
    color: "#6b7280",
    fontSize: "14px",
  };

  const paginationStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    paddingTop: "8px",
  };

  const pageButtonStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "6px",
    background: "none",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? "#d1d5db" : "#6b7280",
    opacity: disabled ? 0.5 : 1,
  });

  const getImageCardStyle = (
    image: PexelsImageResult,
  ): React.CSSProperties => ({
    position: "relative",
    overflow: "hidden",
    borderRadius: "8px",
    border:
      selectedImageId === image.id
        ? "2px solid #2563eb"
        : "2px solid transparent",
    cursor: "pointer",
    transition: "border-color 0.2s",
  });

  const getImageStyle = (image: PexelsImageResult): React.CSSProperties => ({
    width: "100%",
    aspectRatio: "16/9",
    backgroundImage: `url(${image.urls.thumb})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: image.avgColor,
  });

  const getOverlayStyle = (image: PexelsImageResult): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity:
      hoveredImageId === image.id || selectedImageId === image.id ? 1 : 0,
    transition: "opacity 0.2s",
  });

  const attributionStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
    padding: "16px 8px 8px",
    opacity: 0,
    transition: "opacity 0.2s",
  };

  const getAttributionStyle = (
    image: PexelsImageResult,
  ): React.CSSProperties => ({
    ...attributionStyle,
    opacity: hoveredImageId === image.id ? 1 : 0,
  });

  return (
    <div style={containerStyle}>
      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={searchFormStyle}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for images..."
          style={searchInputStyle}
        />
        <button type="submit" disabled={loading} style={searchButtonStyle}>
          {loading ? (
            <div
              style={{
                ...spinnerStyle,
                width: "20px",
                height: "20px",
                borderWidth: "2px",
              }}
            />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
        </div>
      )}

      {/* Results Grid */}
      {!loading && searchResults.length > 0 && (
        <>
          <div style={gridStyle}>
            {searchResults.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleImageSelect(image)}
                onMouseEnter={() => setHoveredImageId(image.id)}
                onMouseLeave={() => setHoveredImageId(null)}
                style={{
                  ...getImageCardStyle(image),
                  background: "none",
                  padding: 0,
                }}
              >
                <div style={getImageStyle(image)} />
                <div style={getOverlayStyle(image)}>
                  {selectedImageId === image.id ? (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span
                      style={{
                        color: "white",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Select
                    </span>
                  )}
                </div>
                <div style={getAttributionStyle(image)}>
                  <p
                    style={{
                      color: "white",
                      fontSize: "11px",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    by {image.attribution.photographerName}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
                style={pageButtonStyle(page === 1 || loading)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span style={{ fontSize: "14px", color: "#6b7280" }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || loading}
                style={pageButtonStyle(page === totalPages || loading)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State - No Results */}
      {!loading && hasSearched && searchResults.length === 0 && (
        <div style={emptyStyle}>
          No images found. Try a different search term.
        </div>
      )}

      {/* Empty State - Initial */}
      {!hasSearched && !loading && (
        <div style={emptyStyle}>
          Search for beautiful, free photos from Pexels.
        </div>
      )}

      {/* Pexels Attribution */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
        Photos provided by{" "}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb", textDecoration: "none" }}
        >
          Pexels
        </a>
      </div>
    </div>
  );
}

export default PexelsImagePicker;
