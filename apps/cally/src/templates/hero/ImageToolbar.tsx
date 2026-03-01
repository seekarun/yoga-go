"use client";

import ToolbarContainer from "./ToolbarContainer";

const FILTER_OPTIONS = [
  { value: "none", label: "No filter" },
  { value: "grayscale", label: "Grayscale" },
  { value: "sepia", label: "Sepia" },
  { value: "saturate", label: "Saturate" },
  { value: "contrast", label: "High contrast" },
  { value: "brightness", label: "Brighten" },
  { value: "invert", label: "Invert" },
  { value: "hue-rotate", label: "Hue rotate" },
];

interface ImageToolbarProps {
  borderRadius: number;
  positionX: number;
  positionY: number;
  zoom: number;
  offsetY?: number;
  filter?: string;
  onBorderRadiusChange: (value: number) => void;
  onPositionChange: (x: number, y: number) => void;
  onZoomChange: (value: number) => void;
  onOffsetYChange?: (value: number) => void;
  onFilterChange?: (value: string) => void;
  onReplaceImage: () => void;
  onRemoveBgClick?: () => void;
  removingBg?: boolean;
  bgRemoved?: boolean;
  onUndoRemoveBg?: () => void;
}

export default function ImageToolbar({
  borderRadius,
  positionX,
  positionY,
  zoom,
  offsetY = 0,
  filter,
  onBorderRadiusChange,
  onPositionChange,
  onZoomChange,
  onOffsetYChange,
  onFilterChange,
  onReplaceImage,
  onRemoveBgClick,
  removingBg = false,
  bgRemoved = false,
  onUndoRemoveBg,
}: ImageToolbarProps) {
  const dividerStyle: React.CSSProperties = {
    width: "1px",
    height: "20px",
    backgroundColor: "#e5e7eb",
    flexShrink: 0,
  };

  const groupStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const sliderStyle: React.CSSProperties = {
    width: "60px",
    height: "4px",
    cursor: "pointer",
    accentColor: "#3b82f6",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    color: "#9ca3af",
    minWidth: "18px",
    textAlign: "center",
  };

  const iconButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#374151",
    transition: "background 0.15s",
  };

  return (
    <ToolbarContainer>
      {/* Border Radius */}
      <div style={groupStyle}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3h7a2 2 0 0 1 2 2v7" />
          <path d="M3 12v7a2 2 0 0 0 2 2h7" />
        </svg>
        <input
          type="range"
          min={0}
          max={50}
          value={borderRadius}
          onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{borderRadius}</span>
      </div>

      <div style={dividerStyle} />

      {/* Position */}
      <div style={groupStyle}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
        <span style={{ ...labelStyle, minWidth: "8px" }}>X</span>
        <input
          type="range"
          min={0}
          max={100}
          value={positionX}
          onChange={(e) => onPositionChange(Number(e.target.value), positionY)}
          style={sliderStyle}
        />
        <span style={{ ...labelStyle, minWidth: "8px" }}>Y</span>
        <input
          type="range"
          min={0}
          max={100}
          value={positionY}
          onChange={(e) => onPositionChange(positionX, Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={dividerStyle} />

      {/* Zoom */}
      <div style={groupStyle}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <input
          type="range"
          min={100}
          max={200}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{zoom}%</span>
      </div>

      {/* Offset Y — only shown when callback is provided */}
      {onOffsetYChange && (
        <>
          <div style={dividerStyle} />
          <div style={groupStyle}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="2" x2="12" y2="22" />
              <polyline points="8 6 12 2 16 6" />
              <polyline points="8 18 12 22 16 18" />
            </svg>
            <input
              type="range"
              min={-200}
              max={0}
              value={offsetY}
              onChange={(e) => onOffsetYChange(Number(e.target.value))}
              style={sliderStyle}
            />
            <span style={labelStyle}>{offsetY}</span>
          </div>
        </>
      )}

      {/* Filter dropdown */}
      {onFilterChange && (
        <>
          <div style={dividerStyle} />
          <div style={groupStyle} title="Image filter">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <select
              value={filter || "none"}
              onChange={(e) => onFilterChange(e.target.value)}
              style={{
                fontSize: "10px",
                padding: "2px 4px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                background: "#fff",
                color: "#374151",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div style={dividerStyle} />

      {/* Replace Image */}
      <button
        type="button"
        style={iconButtonStyle}
        onClick={onReplaceImage}
        title="Replace image"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(0,0,0,0.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        <svg
          width="16"
          height="16"
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
      </button>

      {/* Remove BG / Undo button */}
      {onRemoveBgClick && (
        <>
          {removingBg && (
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          )}
          <div style={dividerStyle} />
          {bgRemoved && onUndoRemoveBg ? (
            <button
              type="button"
              onClick={onUndoRemoveBg}
              title="Undo background removal"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid #fbbf24",
                borderRadius: "4px",
                cursor: "pointer",
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: "#d97706",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={onRemoveBgClick}
              disabled={removingBg}
              title="Remove image background"
              style={{
                background: removingBg ? "rgba(59,130,246,0.1)" : "none",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                cursor: removingBg ? "not-allowed" : "pointer",
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                color: removingBg ? "#3b82f6" : "#374151",
              }}
            >
              {removingBg ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 3l14 18" />
                  <path d="M3 7h1.5l2.7 3.2" />
                  <path d="M17.8 7H21l-5 6" />
                  <rect x="2" y="17" width="20" height="4" rx="1" />
                </svg>
              )}
              {removingBg ? "Removing..." : "Remove BG"}
            </button>
          )}
        </>
      )}
    </ToolbarContainer>
  );
}
