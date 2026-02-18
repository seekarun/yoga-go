"use client";

import type { ColorPalette } from "@/lib/colorPalette";
import ColorPickerPopover from "./ColorPickerPopover";
import ToolbarContainer from "./ToolbarContainer";

interface HeroSectionToolbarProps {
  bgColor: string;
  hasBackgroundImage: boolean;
  overlayOpacity: number;
  paddingTop: number;
  paddingBottom: number;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onBgColorChange: (value: string) => void;
  onOverlayOpacityChange: (value: number) => void;
  onPaddingTopChange: (value: number) => void;
  onPaddingBottomChange: (value: number) => void;
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
}

export default function HeroSectionToolbar({
  bgColor,
  hasBackgroundImage,
  overlayOpacity,
  paddingTop,
  paddingBottom,
  palette,
  customColors,
  onBgColorChange,
  onOverlayOpacityChange,
  onPaddingTopChange,
  onPaddingBottomChange,
  onCustomColorsChange,
}: HeroSectionToolbarProps) {
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

      {/* Overlay Opacity (only when bg image exists) */}
      {hasBackgroundImage && (
        <>
          <div style={dividerStyle} />
          <div style={groupStyle} title="Overlay darkness">
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
              value={overlayOpacity}
              onChange={(e) => onOverlayOpacityChange(Number(e.target.value))}
              style={sliderStyle}
            />
            <span style={labelStyle}>{overlayOpacity}</span>
          </div>
        </>
      )}

      <div style={dividerStyle} />

      {/* Padding Top */}
      <div style={groupStyle} title="Top padding">
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
      <div style={groupStyle} title="Bottom padding">
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
    </ToolbarContainer>
  );
}
