"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ColorPalette } from "@/lib/colorPalette";
import ColorPickerPopover from "./ColorPickerPopover";
import ToolbarContainer from "./ToolbarContainer";
import { FONT_OPTIONS, getGoogleFontsUrl, getAllGoogleFontsUrl } from "./fonts";

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

/* ─── Custom Font Picker ─── */
function FontPicker({
  value,
  onChange,
  selectStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  selectStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentLabel =
    FONT_OPTIONS.find((o) => o.value === value)?.label || "System (sans-serif)";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlighted < 0 || !listRef.current) return;
    const item = listRef.current.children[highlighted] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          setHighlighted(
            Math.max(
              0,
              FONT_OPTIONS.findIndex((o) => o.value === value),
            ),
          );
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlighted((h) => Math.min(h + 1, FONT_OPTIONS.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlighted((h) => Math.max(h - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlighted >= 0) {
            onChange(FONT_OPTIONS[highlighted].value);
            setOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, highlighted, value, onChange],
  );

  const allFontsUrl = getAllGoogleFontsUrl();

  return (
    <div
      ref={containerRef}
      style={{ position: "relative" }}
      onKeyDown={handleKeyDown}
    >
      {/* Load all Google Fonts when dropdown is open */}
      {open && <link rel="stylesheet" href={allFontsUrl} />}

      {/* Trigger button styled like the old select */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            setHighlighted(
              Math.max(
                0,
                FONT_OPTIONS.findIndex((o) => o.value === value),
              ),
            );
          }
        }}
        style={{
          ...selectStyle,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: value || "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentLabel}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          // Prevent mousedown from moving focus away from the editable text,
          // which would clear the inline span selection in ResizableText.
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            width: "200px",
            maxHeight: "240px",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            zIndex: 9999,
            padding: "4px 0",
          }}
        >
          {FONT_OPTIONS.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlighted;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontFamily: opt.value || "system-ui, sans-serif",
                  cursor: "pointer",
                  background: isHighlighted
                    ? "rgba(59,130,246,0.08)"
                    : "transparent",
                  color: isSelected ? "#3b82f6" : "#374151",
                  fontWeight: isSelected ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
          max={128}
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
      <FontPicker
        value={fontFamily}
        onChange={onFontFamilyChange}
        selectStyle={selectStyle}
      />

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
