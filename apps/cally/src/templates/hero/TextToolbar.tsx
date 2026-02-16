"use client";

import type { ColorPalette } from "@/lib/colorPalette";
import ColorPickerPopover from "./ColorPickerPopover";
import ToolbarContainer from "./ToolbarContainer";
import { FONT_OPTIONS, getGoogleFontsUrl } from "./fonts";

type TextAlign = "left" | "center" | "right";

interface TextToolbarProps {
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: TextAlign;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onFontSizeChange: (value: number) => void;
  onFontFamilyChange: (value: string) => void;
  onFontWeightChange: (value: "normal" | "bold") => void;
  onFontStyleChange: (value: "normal" | "italic") => void;
  onColorChange: (value: string) => void;
  onTextAlignChange: (value: TextAlign) => void;
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
}

const ALIGN_OPTIONS: { value: TextAlign; icon: React.ReactNode }[] = [
  {
    value: "left",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
  {
    value: "center",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="6" y1="12" x2="18" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    ),
  },
  {
    value: "right",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="9" y1="12" x2="21" y2="12" />
        <line x1="6" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
];

export default function TextToolbar({
  fontSize,
  fontFamily,
  fontWeight,
  fontStyle,
  color,
  textAlign,
  palette,
  customColors,
  onFontSizeChange,
  onFontFamilyChange,
  onFontWeightChange,
  onFontStyleChange,
  onColorChange,
  onTextAlignChange,
  onCustomColorsChange,
}: TextToolbarProps) {
  const googleFontsUrl = getGoogleFontsUrl(fontFamily);

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

  const selectStyle: React.CSSProperties = {
    fontSize: "11px",
    padding: "2px 4px",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    outline: "none",
    maxWidth: "140px",
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "rgba(59,130,246,0.1)" : "none",
    border: "none",
    cursor: "pointer",
    padding: "3px 5px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: active ? "#3b82f6" : "#374151",
    transition: "background 0.15s, color 0.15s",
    fontWeight: "bold",
    fontSize: "13px",
    lineHeight: 1,
  });

  return (
    <ToolbarContainer>
      {/* Load Google Font if needed */}
      {googleFontsUrl && <link rel="stylesheet" href={googleFontsUrl} />}

      {/* Font Size */}
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
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
        <input
          type="range"
          min={12}
          max={64}
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          style={sliderStyle}
        />
        <span style={labelStyle}>{fontSize}</span>
      </div>

      <div style={dividerStyle} />

      {/* Bold / Italic */}
      <div style={groupStyle}>
        <button
          type="button"
          onClick={() =>
            onFontWeightChange(fontWeight === "bold" ? "normal" : "bold")
          }
          style={toggleBtnStyle(fontWeight === "bold")}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() =>
            onFontStyleChange(fontStyle === "italic" ? "normal" : "italic")
          }
          style={{
            ...toggleBtnStyle(fontStyle === "italic"),
            fontStyle: "italic",
            fontWeight: "normal",
          }}
          title="Italic"
        >
          I
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Font Family */}
      <div style={groupStyle}>
        <select
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          style={selectStyle}
        >
          {FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={dividerStyle} />

      {/* Color */}
      <ColorPickerPopover
        color={color}
        onChange={onColorChange}
        palette={palette}
        customColors={customColors}
        onCustomColorsChange={onCustomColorsChange}
      />

      <div style={dividerStyle} />

      {/* Text Alignment */}
      <div style={groupStyle}>
        {ALIGN_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onTextAlignChange(opt.value)}
            style={{
              background:
                textAlign === opt.value ? "rgba(59,130,246,0.1)" : "none",
              border: "none",
              cursor: "pointer",
              padding: "3px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: textAlign === opt.value ? "#3b82f6" : "#374151",
              transition: "background 0.15s, color 0.15s",
            }}
            title={`Align ${opt.value}`}
          >
            {opt.icon}
          </button>
        ))}
      </div>
    </ToolbarContainer>
  );
}
