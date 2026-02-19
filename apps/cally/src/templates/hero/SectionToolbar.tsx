"use client";

import { useState } from "react";
import type { ColorPalette } from "@/lib/colorPalette";
import ColorPickerPopover from "./ColorPickerPopover";
import ToolbarContainer from "./ToolbarContainer";

type ActiveTab = "bg" | "position" | "layout" | null;

interface SectionToolbarProps {
  // Background tab
  bgColor: string;
  onBgColorChange: (v: string) => void;
  bgImage?: string;
  onBgImageClick?: () => void;
  onBgImageRemove?: () => void;
  bgImageBlur?: number;
  onBgImageBlurChange?: (v: number) => void;
  bgImageOpacity?: number;
  onBgImageOpacityChange?: (v: number) => void;
  hasBackgroundImage?: boolean;
  overlayOpacity?: number;
  onOverlayOpacityChange?: (v: number) => void;
  bgFilter?: string;
  onBgFilterChange?: (v: string) => void;
  onRemoveBgClick?: () => void;
  removingBg?: boolean;
  bgRemoved?: boolean;
  onUndoRemoveBg?: () => void;
  bgDragActive?: boolean;
  onBgDragToggle?: () => void;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;

  // Position tab
  paddingTop: number;
  paddingBottom: number;
  onPaddingTopChange: (v: number) => void;
  onPaddingBottomChange: (v: number) => void;
  paddingLeft?: number;
  paddingRight?: number;
  onPaddingLeftChange?: (v: number) => void;
  onPaddingRightChange?: (v: number) => void;
  sectionHeight?: number;
  onSectionHeightChange?: (v: number) => void;

  // Layout tab (hidden if no layoutOptions)
  layoutOptions?: { value: string; title: string; icon: React.ReactNode }[];
  currentLayout?: string;
  onLayoutChange?: (v: string) => void;

  placement?: "above" | "below";
}

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

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer",
        fontSize: "10px",
        fontWeight: 600,
        backgroundColor: active ? "rgba(59,130,246,0.1)" : "transparent",
        color: active ? "#3b82f6" : "#6b7280",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function SectionToolbar({
  // Background
  bgColor,
  onBgColorChange,
  bgImage,
  onBgImageClick,
  onBgImageRemove,
  bgImageBlur,
  onBgImageBlurChange,
  bgImageOpacity,
  onBgImageOpacityChange,
  hasBackgroundImage,
  overlayOpacity,
  onOverlayOpacityChange,
  bgFilter,
  onBgFilterChange,
  onRemoveBgClick,
  removingBg,
  bgRemoved,
  onUndoRemoveBg,
  bgDragActive,
  onBgDragToggle,
  palette,
  customColors,
  onCustomColorsChange,
  // Position
  paddingTop,
  paddingBottom,
  onPaddingTopChange,
  onPaddingBottomChange,
  paddingLeft,
  paddingRight,
  onPaddingLeftChange,
  onPaddingRightChange,
  sectionHeight,
  onSectionHeightChange,
  // Layout
  layoutOptions,
  currentLayout,
  onLayoutChange,
  // Placement
  placement = "below",
}: SectionToolbarProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);

  const toggleTab = (tab: ActiveTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const showLayoutTab =
    layoutOptions && layoutOptions.length > 0 && onLayoutChange;

  return (
    <ToolbarContainer placement={placement}>
      {removingBg && (
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: activeTab ? "6px" : 0,
          ...(removingBg ? { pointerEvents: "none", opacity: 0.5 } : {}),
        }}
      >
        {/* Tab bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <TabButton
            icon={
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
            label="BG"
            active={activeTab === "bg"}
            onClick={() => toggleTab("bg")}
          />
          <TabButton
            icon={
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="5 9 2 12 5 15" />
                <polyline points="9 5 12 2 15 5" />
                <polyline points="15 19 12 22 9 19" />
                <polyline points="19 9 22 12 19 15" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            }
            label="Position"
            active={activeTab === "position"}
            onClick={() => toggleTab("position")}
          />
          {showLayoutTab && (
            <TabButton
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              }
              label="Layout"
              active={activeTab === "layout"}
              onClick={() => toggleTab("layout")}
            />
          )}
        </div>

        {/* Submenu content */}
        {activeTab === "bg" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Color picker */}
            <ColorPickerPopover
              color={bgColor}
              onChange={onBgColorChange}
              palette={palette}
              customColors={customColors}
              onCustomColorsChange={onCustomColorsChange}
            />

            {/* BG image button */}
            {onBgImageClick && (
              <>
                <div style={dividerStyle} />
                <div style={groupStyle}>
                  <button
                    type="button"
                    onClick={onBgImageClick}
                    title={
                      bgImage
                        ? "Change background image"
                        : "Add background image"
                    }
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
                  {bgImage && onBgImageRemove && (
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
              </>
            )}

            {/* Drag / reposition button */}
            {(bgImage || hasBackgroundImage) && onBgDragToggle && (
              <>
                <div style={dividerStyle} />
                <button
                  type="button"
                  onClick={onBgDragToggle}
                  title={
                    bgDragActive
                      ? "Exit repositioning mode"
                      : "Drag to reposition, scroll to zoom"
                  }
                  style={{
                    background: bgDragActive ? "rgba(59,130,246,0.15)" : "none",
                    border: bgDragActive
                      ? "1px solid #3b82f6"
                      : "1px solid #e5e7eb",
                    borderRadius: "4px",
                    cursor: "pointer",
                    padding: "3px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    color: bgDragActive ? "#3b82f6" : "#374151",
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
                    <polyline points="5 9 2 12 5 15" />
                    <polyline points="9 5 12 2 15 5" />
                    <polyline points="15 19 12 22 9 19" />
                    <polyline points="19 9 22 12 19 15" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                  </svg>
                  {bgDragActive ? "Done" : "Move"}
                </button>
              </>
            )}

            {/* Overlay slider (hero-specific: dark overlay on bg image) */}
            {hasBackgroundImage && onOverlayOpacityChange && (
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
                    value={overlayOpacity ?? 50}
                    onChange={(e) =>
                      onOverlayOpacityChange(Number(e.target.value))
                    }
                    style={sliderStyle}
                  />
                  <span style={labelStyle}>{overlayOpacity ?? 50}</span>
                </div>
              </>
            )}

            {/* Blur slider (section bg image) */}
            {bgImage && onBgImageBlurChange && (
              <>
                <div style={dividerStyle} />
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
                    value={bgImageBlur ?? 0}
                    onChange={(e) =>
                      onBgImageBlurChange(Number(e.target.value))
                    }
                    style={sliderStyle}
                  />
                  <span style={labelStyle}>{bgImageBlur ?? 0}</span>
                </div>
              </>
            )}

            {/* Opacity slider (section bg image) */}
            {bgImage && onBgImageOpacityChange && (
              <>
                <div style={dividerStyle} />
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
                    value={bgImageOpacity ?? 100}
                    onChange={(e) =>
                      onBgImageOpacityChange(Number(e.target.value))
                    }
                    style={sliderStyle}
                  />
                  <span style={labelStyle}>{bgImageOpacity ?? 100}</span>
                </div>
              </>
            )}

            {/* Filter dropdown (when image present) */}
            {(bgImage || hasBackgroundImage) && onBgFilterChange && (
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
                    value={bgFilter || "none"}
                    onChange={(e) => onBgFilterChange(e.target.value)}
                    disabled={removingBg}
                    style={{
                      fontSize: "10px",
                      padding: "2px 4px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      background: "#fff",
                      color: "#374151",
                      cursor: removingBg ? "not-allowed" : "pointer",
                      outline: "none",
                      opacity: removingBg ? 0.5 : 1,
                    }}
                  >
                    <option value="none">No filter</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="sepia">Sepia</option>
                    <option value="saturate">Saturate</option>
                    <option value="contrast">High contrast</option>
                    <option value="brightness">Brighten</option>
                    <option value="invert">Invert</option>
                    <option value="hue-rotate">Hue rotate</option>
                  </select>
                </div>
              </>
            )}

            {/* Remove BG / Undo button */}
            {(bgImage || hasBackgroundImage) && onRemoveBgClick && (
              <>
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
                        style={{
                          animation: "spin 1s linear infinite",
                        }}
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
          </div>
        )}

        {activeTab === "position" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

            {/* Padding Left */}
            {onPaddingLeftChange && (
              <>
                <div style={dividerStyle} />
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
                    value={paddingLeft ?? 0}
                    onChange={(e) =>
                      onPaddingLeftChange(Number(e.target.value))
                    }
                    style={sliderStyle}
                  />
                  <span style={labelStyle}>{paddingLeft ?? 0}</span>
                </div>
              </>
            )}

            {/* Padding Right */}
            {onPaddingRightChange && (
              <>
                <div style={dividerStyle} />
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
                    value={paddingRight ?? 0}
                    onChange={(e) =>
                      onPaddingRightChange(Number(e.target.value))
                    }
                    style={sliderStyle}
                  />
                  <span style={labelStyle}>{paddingRight ?? 0}</span>
                </div>
              </>
            )}

            {/* Section Height */}
            {onSectionHeightChange && (
              <>
                <div style={dividerStyle} />
                <div style={groupStyle} title="Section height">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <polyline points="8 6 12 2 16 6" />
                    <polyline points="8 18 12 22 16 18" />
                  </svg>
                  <input
                    type="range"
                    min={300}
                    max={1200}
                    value={sectionHeight ?? 600}
                    onChange={(e) =>
                      onSectionHeightChange(Number(e.target.value))
                    }
                    style={sliderStyle}
                  />
                  <span style={labelStyle}>{sectionHeight ?? 600}</span>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "layout" && showLayoutTab && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {layoutOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onLayoutChange(opt.value)}
                style={{
                  background:
                    currentLayout === opt.value
                      ? "rgba(59,130,246,0.1)"
                      : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "3px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: currentLayout === opt.value ? "#3b82f6" : "#374151",
                  transition: "background 0.15s, color 0.15s",
                }}
                title={opt.title}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </ToolbarContainer>
  );
}
