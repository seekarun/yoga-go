"use client";

import type { ColorPalette } from "@/lib/colorPalette";
import ColorPickerPopover from "./ColorPickerPopover";
import ToolbarContainer from "./ToolbarContainer";

interface ProductsSectionToolbarProps {
  bgColor: string;
  bgImage?: string;
  bgImageBlur: number;
  bgImageOpacity: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onBgColorChange: (value: string) => void;
  onBgImageClick?: () => void;
  onBgImageRemove?: () => void;
  onBgImageBlurChange: (value: number) => void;
  onBgImageOpacityChange: (value: number) => void;
  onPaddingTopChange: (value: number) => void;
  onPaddingBottomChange: (value: number) => void;
  onPaddingLeftChange: (value: number) => void;
  onPaddingRightChange: (value: number) => void;
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
}

export default function ProductsSectionToolbar({
  bgColor,
  bgImage,
  bgImageBlur,
  bgImageOpacity,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  palette,
  customColors,
  onBgColorChange,
  onBgImageClick,
  onBgImageRemove,
  onBgImageBlurChange,
  onBgImageOpacityChange,
  onPaddingTopChange,
  onPaddingBottomChange,
  onPaddingLeftChange,
  onPaddingRightChange,
  onCustomColorsChange,
}: ProductsSectionToolbarProps) {
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

  return (
    <ToolbarContainer>
      {/* Background Color */}
      <ColorPickerPopover
        color={bgColor}
        onChange={onBgColorChange}
        palette={palette}
        customColors={customColors}
        onCustomColorsChange={onCustomColorsChange}
      />

      <div style={dividerStyle} />

      {/* Background Image */}
      <div style={groupStyle}>
        <button
          type="button"
          onClick={onBgImageClick}
          title={bgImage ? "Change background image" : "Add background image"}
          style={{
            background: bgImage ? "rgba(59,130,246,0.1)" : "none",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "3px 6px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            color: bgImage ? "#3b82f6" : "#374151",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {bgImage ? "BG" : "+BG"}
        </button>
        {bgImage && (
          <button
            type="button"
            onClick={onBgImageRemove}
            title="Remove background image"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              color: "#ef4444",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Blur + Opacity (only shown when bg image exists) */}
      {bgImage && (
        <>
          <div style={dividerStyle} />

          {/* Blur */}
          <div style={groupStyle} title="Background image blur">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" opacity="0.3" />
              <circle cx="12" cy="12" r="6" opacity="0.6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <input
              type="range"
              min={0}
              max={20}
              value={bgImageBlur}
              onChange={(e) => onBgImageBlurChange(Number(e.target.value))}
              style={sliderStyle}
            />
            <span style={labelStyle}>{bgImageBlur}</span>
          </div>

          <div style={dividerStyle} />

          {/* Opacity */}
          <div style={groupStyle} title="Background image opacity">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                d="M12 2a10 10 0 0 1 0 20"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
            <input
              type="range"
              min={0}
              max={100}
              value={bgImageOpacity}
              onChange={(e) => onBgImageOpacityChange(Number(e.target.value))}
              style={sliderStyle}
            />
            <span style={labelStyle}>{bgImageOpacity}</span>
          </div>
        </>
      )}

      <div style={dividerStyle} />

      {/* Padding Top */}
      <div style={groupStyle} title="Top padding (gap above section)">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="4" y1="4" x2="20" y2="4" />
          <line x1="12" y1="8" x2="12" y2="20" />
          <polyline points="8 12 12 8 16 12" />
        </svg>
        <input
          type="range"
          min={0}
          max={200}
          value={paddingTop}
          onChange={(e) => onPaddingTopChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{paddingTop}</span>
      </div>

      <div style={dividerStyle} />

      {/* Padding Bottom */}
      <div style={groupStyle} title="Bottom padding (gap below section)">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="4" y1="20" x2="20" y2="20" />
          <line x1="12" y1="4" x2="12" y2="16" />
          <polyline points="8 12 12 16 16 12" />
        </svg>
        <input
          type="range"
          min={0}
          max={200}
          value={paddingBottom}
          onChange={(e) => onPaddingBottomChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{paddingBottom}</span>
      </div>

      <div style={dividerStyle} />

      {/* Padding Left */}
      <div style={groupStyle} title="Left padding">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="4" y1="4" x2="4" y2="20" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <polyline points="12 8 8 12 12 16" />
        </svg>
        <input
          type="range"
          min={0}
          max={400}
          value={paddingLeft}
          onChange={(e) => onPaddingLeftChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{paddingLeft}</span>
      </div>

      <div style={dividerStyle} />

      {/* Padding Right */}
      <div style={groupStyle} title="Right padding">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="20" y1="4" x2="20" y2="20" />
          <line x1="4" y1="12" x2="16" y2="12" />
          <polyline points="12 8 16 12 12 16" />
        </svg>
        <input
          type="range"
          min={0}
          max={400}
          value={paddingRight}
          onChange={(e) => onPaddingRightChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{paddingRight}</span>
      </div>
    </ToolbarContainer>
  );
}
