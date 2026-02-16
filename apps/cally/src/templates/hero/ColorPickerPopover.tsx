"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ColorPalette } from "@/lib/colorPalette";

interface CustomColor {
  name: string;
  hex: string;
}

interface ColorPickerPopoverProps {
  color: string;
  onChange: (value: string) => void;
  palette?: ColorPalette;
  customColors?: CustomColor[];
  onCustomColorsChange?: (colors: CustomColor[]) => void;
}

export default function ColorPickerPopover({
  color,
  onChange,
  palette,
  customColors = [],
  onCustomColorsChange,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newHex, setNewHex] = useState("#6b7280");
  const [newName, setNewName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSwatchClick = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange],
  );

  const handleAddColor = useCallback(() => {
    if (!newName.trim()) return;
    onCustomColorsChange?.([
      ...customColors,
      { name: newName.trim(), hex: newHex },
    ]);
    setNewName("");
    setNewHex("#6b7280");
    setAdding(false);
  }, [newName, newHex, customColors, onCustomColorsChange]);

  const handleRemoveColor = useCallback(
    (index: number) => {
      onCustomColorsChange?.(customColors.filter((_, i) => i !== index));
    },
    [customColors, onCustomColorsChange],
  );

  // Brand swatches: Primary (500), Secondary, Highlight
  const brandColors: { label: string; hex: string }[] = [];
  if (palette) {
    brandColors.push({ label: "Primary", hex: palette[500] });
    if (palette.secondary)
      brandColors.push({ label: "Secondary", hex: palette.secondary });
    if (palette.highlight)
      brandColors.push({ label: "Highlight", hex: palette.highlight });
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  };

  const swatchBtnStyle = (
    hex: string,
    isActive: boolean,
  ): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 8px",
    borderRadius: "6px",
    border: isActive ? "2px solid #3b82f6" : "1px solid #e5e7eb",
    background: "none",
    cursor: "pointer",
    fontSize: "11px",
    color: "#374151",
    width: "100%",
    textAlign: "left",
  });

  return (
    <div ref={popoverRef} style={{ position: "relative" }}>
      {/* Single clickable swatch */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "4px",
          backgroundColor: color,
          border: "1px solid #e5e7eb",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          display: "block",
        }}
        title="Pick color"
      />

      {/* Popover */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            zIndex: 100,
            padding: "12px",
            width: "180px",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Brand Colors */}
          {brandColors.length > 0 && (
            <>
              <div style={sectionLabelStyle}>Brand</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginBottom: "10px",
                }}
              >
                {brandColors.map((bc) => (
                  <button
                    key={bc.label}
                    type="button"
                    onClick={() => handleSwatchClick(bc.hex)}
                    style={swatchBtnStyle(
                      bc.hex,
                      color.toLowerCase() === bc.hex.toLowerCase(),
                    )}
                    title={bc.hex}
                  >
                    <span
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "3px",
                        backgroundColor: bc.hex,
                        flexShrink: 0,
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                    />
                    {bc.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Additional Colors */}
          <div style={sectionLabelStyle}>Additional</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginBottom: "8px",
            }}
          >
            {customColors.map((cc, i) => (
              <div
                key={`${cc.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSwatchClick(cc.hex)}
                  style={{
                    ...swatchBtnStyle(
                      cc.hex,
                      color.toLowerCase() === cc.hex.toLowerCase(),
                    ),
                    flex: 1,
                  }}
                  title={cc.hex}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "3px",
                      backgroundColor: cc.hex,
                      flexShrink: 0,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                  />
                  {cc.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                    color: "#9ca3af",
                    fontSize: "14px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add new color form */}
            {adding ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "6px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <input
                    type="color"
                    value={newHex}
                    onChange={(e) => setNewHex(e.target.value)}
                    style={{
                      width: "24px",
                      height: "24px",
                      padding: 0,
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColor();
                      if (e.key === "Escape") setAdding(false);
                    }}
                    style={{
                      flex: 1,
                      fontSize: "11px",
                      padding: "3px 6px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      outline: "none",
                      minWidth: 0,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      background: "none",
                      cursor: "pointer",
                      color: "#6b7280",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddColor}
                    style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      border: "none",
                      borderRadius: "4px",
                      background: "#3b82f6",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "1px dashed #d1d5db",
                  borderRadius: "6px",
                  padding: "5px 8px",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "#9ca3af",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add color
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
