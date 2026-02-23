"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { SectionStyleOverrides } from "@/types/landing-page";
import type { ColorPalette } from "@/lib/colorPalette";
import { bgFilterToCSS } from "./layoutOptions";
import { useDimOverlay } from "./useDimOverlay";

const BASE_HORIZONTAL_PADDING = 24;

interface UseSectionToolbarOptions {
  isEditing: boolean;
  overrides?: SectionStyleOverrides;
  onStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  defaultBg: string;
  onBgImageClick?: () => void;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
}

export function useSectionToolbar({
  isEditing,
  overrides,
  onStyleOverrideChange,
  defaultBg,
  onBgImageClick,
  palette,
  customColors,
  onCustomColorsChange,
}: UseSectionToolbarOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionSelected, setSectionSelected] = useState(false);

  // Background drag / remove-bg state
  const [bgDragActive, setBgDragActive] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [originalBgImage, setOriginalBgImage] = useState<string | null>(null);

  const showHandles = isEditing && !!onStyleOverrideChange;

  // Dim the rest of the page when section is selected
  useDimOverlay(isEditing && sectionSelected);

  // Auto-disable drag mode when section is deselected
  useEffect(() => {
    if (!sectionSelected) setBgDragActive(false);
  }, [sectionSelected]);

  // Click-outside listener to deselect section
  useEffect(() => {
    if (!sectionSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setSectionSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sectionSelected]);

  // Section click handler
  const sectionClickHandler = useCallback((e: React.MouseEvent) => {
    // Prevent re-selection if clicking inside nested selectable elements
    if ((e.target as HTMLElement).closest("[data-no-section-select]")) return;
    setSectionSelected(true);
  }, []);

  // --- Handlers ---
  const handleBgColorChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, bgColor: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgImageRemove = useCallback(() => {
    onStyleOverrideChange?.({
      ...overrides,
      bgImage: undefined,
      bgImageBlur: undefined,
      bgImageOpacity: undefined,
      overlayOpacity: undefined,
      bgFilter: undefined,
      bgImageOffsetX: undefined,
      bgImageOffsetY: undefined,
      bgImageZoom: undefined,
    });
    setBgRemoved(false);
    setOriginalBgImage(null);
  }, [overrides, onStyleOverrideChange]);

  const handleBgImageBlurChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, bgImageBlur: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgImageOpacityChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, bgImageOpacity: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleOverlayOpacityChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, overlayOpacity: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgFilterChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, bgFilter: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingTopChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingTop: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingBottomChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingBottom: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingLeftChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingLeft: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingRightChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingRight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleSectionHeightChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, sectionHeight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgImageOffsetChange = useCallback(
    (x: number, y: number) => {
      onStyleOverrideChange?.({
        ...overrides,
        bgImageOffsetX: x,
        bgImageOffsetY: y,
      });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgImageZoomChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, bgImageZoom: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const toggleBgDrag = useCallback(() => {
    setBgDragActive((prev) => !prev);
  }, []);

  const handleRemoveBgClick = useCallback(async () => {
    if (removingBg || !overrides?.bgImage) return;
    setOriginalBgImage(overrides.bgImage);
    setRemovingBg(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const response = await fetch(overrides.bgImage);
      if (!response.ok) throw new Error("Failed to fetch image");
      const imageBlob = await response.blob();
      const resultBlob = await removeBackground(imageBlob, {
        progress: (key: string, current: number, total: number) => {
          console.log(
            `[DBG][useSectionToolbar] Remove BG ${key}: ${current}/${total}`,
          );
        },
      });
      const formData = new FormData();
      formData.append(
        "file",
        new File([resultBlob], "bg-removed.png", { type: "image/png" }),
      );
      const uploadResponse = await fetch(
        "/api/data/app/tenant/landing-page/upload",
        { method: "POST", body: formData },
      );
      if (!uploadResponse.ok)
        throw new Error("Failed to upload processed image");
      const uploadData = await uploadResponse.json();
      onStyleOverrideChange?.({ ...overrides, bgImage: uploadData.data.url });
      setBgRemoved(true);
    } catch (err) {
      console.error("[DBG][useSectionToolbar] Remove bg failed:", err);
      setOriginalBgImage(null);
    } finally {
      setRemovingBg(false);
    }
  }, [removingBg, overrides, onStyleOverrideChange]);

  const handleUndoRemoveBg = useCallback(() => {
    if (!originalBgImage) return;
    onStyleOverrideChange?.({ ...overrides, bgImage: originalBgImage });
    setBgRemoved(false);
    setOriginalBgImage(null);
  }, [overrides, onStyleOverrideChange, originalBgImage]);

  // --- Resolved padding values ---
  const resolvedPaddingTop = overrides?.paddingTop ?? 80;
  const resolvedPaddingBottom = overrides?.paddingBottom ?? 80;
  const resolvedPaddingLeft = overrides?.paddingLeft ?? 0;
  const resolvedPaddingRight = overrides?.paddingRight ?? 0;

  // --- Computed styles ---
  const sectionStyle: React.CSSProperties = useMemo(
    () => ({
      width: "100%",
      paddingTop: `${resolvedPaddingTop}px`,
      paddingBottom: `${resolvedPaddingBottom}px`,
      paddingLeft: 0,
      paddingRight: 0,
      backgroundColor: overrides?.bgColor || defaultBg,
      position: "relative" as const,
      ...(overrides?.sectionHeight
        ? { minHeight: `${overrides.sectionHeight}px` }
        : {}),
      overflow: sectionSelected ? ("visible" as const) : ("hidden" as const),
      ...(showHandles
        ? {
            outline: "2px dashed rgba(59, 130, 246, 0.25)",
            outlineOffset: "-2px",
            zIndex: sectionSelected ? 10 : undefined,
          }
        : {}),
    }),
    [
      resolvedPaddingTop,
      resolvedPaddingBottom,
      overrides?.bgColor,
      overrides?.sectionHeight,
      defaultBg,
      sectionSelected,
      showHandles,
    ],
  );

  const bgLayerStyle: React.CSSProperties | null = useMemo(() => {
    if (!overrides?.bgImage) return null;
    return {
      position: "absolute" as const,
      inset: 0,
      backgroundImage: `url(${overrides.bgImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      filter:
        [
          (overrides.bgImageBlur ?? 0) > 0
            ? `blur(${overrides.bgImageBlur}px)`
            : "",
          bgFilterToCSS(overrides.bgFilter) || "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      opacity: (overrides.bgImageOpacity ?? 100) / 100,
      zIndex: 0,
      transform:
        [
          (overrides.bgImageBlur ?? 0) > 0 ? "scale(1.05)" : "",
          `translate(${overrides.bgImageOffsetX ?? 0}px, ${overrides.bgImageOffsetY ?? 0}px)`,
          (overrides.bgImageZoom ?? 100) !== 100
            ? `scale(${(overrides.bgImageZoom ?? 100) / 100})`
            : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
    };
  }, [overrides]);

  const overlayStyle: React.CSSProperties | null = useMemo(() => {
    if (!overrides?.bgImage || (overrides.overlayOpacity ?? 0) <= 0)
      return null;
    return {
      position: "absolute" as const,
      inset: 0,
      backgroundColor: `rgba(0, 0, 0, ${(overrides.overlayOpacity ?? 0) / 100})`,
      zIndex: 0,
    };
  }, [overrides?.bgImage, overrides?.overlayOpacity]);

  // Content container style (position relative, zIndex 1, padding)
  const contentContainerStyle: React.CSSProperties = useMemo(
    () => ({
      position: "relative" as const,
      zIndex: 1,
      paddingLeft: `${BASE_HORIZONTAL_PADDING + resolvedPaddingLeft}px`,
      paddingRight: `${BASE_HORIZONTAL_PADDING + resolvedPaddingRight}px`,
      boxSizing: "border-box" as const,
    }),
    [resolvedPaddingLeft, resolvedPaddingRight],
  );

  // --- Toolbar props (spread into <SectionToolbar />) ---
  const toolbarProps = useMemo(
    () => ({
      bgColor: overrides?.bgColor || defaultBg,
      bgImage: overrides?.bgImage,
      onBgImageClick,
      onBgImageRemove: handleBgImageRemove,
      bgImageBlur: overrides?.bgImageBlur ?? 0,
      onBgImageBlurChange: handleBgImageBlurChange,
      bgImageOpacity: overrides?.bgImageOpacity ?? 100,
      onBgImageOpacityChange: handleBgImageOpacityChange,
      paddingTop: resolvedPaddingTop,
      paddingBottom: resolvedPaddingBottom,
      paddingLeft: resolvedPaddingLeft,
      paddingRight: resolvedPaddingRight,
      onPaddingTopChange: handlePaddingTopChange,
      onPaddingBottomChange: handlePaddingBottomChange,
      onPaddingLeftChange: handlePaddingLeftChange,
      onPaddingRightChange: handlePaddingRightChange,
      palette,
      customColors,
      onBgColorChange: handleBgColorChange,
      onCustomColorsChange,
      hasBackgroundImage: !!overrides?.bgImage,
      overlayOpacity: overrides?.overlayOpacity ?? 0,
      onOverlayOpacityChange: handleOverlayOpacityChange,
      bgFilter: overrides?.bgFilter,
      onBgFilterChange: handleBgFilterChange,
      onRemoveBgClick: handleRemoveBgClick,
      removingBg,
      bgRemoved,
      onUndoRemoveBg: handleUndoRemoveBg,
      bgDragActive,
      onBgDragToggle: toggleBgDrag,
      sectionHeight: overrides?.sectionHeight,
      onSectionHeightChange: handleSectionHeightChange,
    }),
    [
      overrides,
      defaultBg,
      onBgImageClick,
      handleBgImageRemove,
      handleBgImageBlurChange,
      handleBgImageOpacityChange,
      resolvedPaddingTop,
      resolvedPaddingBottom,
      resolvedPaddingLeft,
      resolvedPaddingRight,
      handlePaddingTopChange,
      handlePaddingBottomChange,
      handlePaddingLeftChange,
      handlePaddingRightChange,
      palette,
      customColors,
      handleBgColorChange,
      onCustomColorsChange,
      handleOverlayOpacityChange,
      handleBgFilterChange,
      handleRemoveBgClick,
      removingBg,
      bgRemoved,
      handleUndoRemoveBg,
      bgDragActive,
      toggleBgDrag,
      handleSectionHeightChange,
    ],
  );

  // BgDragOverlay props
  const bgDragOverlayProps = useMemo(
    () => ({
      active: bgDragActive && isEditing,
      offsetX: overrides?.bgImageOffsetX ?? 0,
      offsetY: overrides?.bgImageOffsetY ?? 0,
      imageZoom: overrides?.bgImageZoom ?? 100,
      onOffsetChange: handleBgImageOffsetChange,
      onZoomChange: handleBgImageZoomChange,
    }),
    [
      bgDragActive,
      isEditing,
      overrides?.bgImageOffsetX,
      overrides?.bgImageOffsetY,
      overrides?.bgImageZoom,
      handleBgImageOffsetChange,
      handleBgImageZoomChange,
    ],
  );

  return {
    sectionRef,
    sectionSelected,
    setSectionSelected,
    showHandles,
    sectionClickHandler,
    bgDragActive,
    removingBg,
    bgRemoved,
    toolbarProps,
    bgLayerStyle,
    overlayStyle,
    bgDragOverlayProps,
    contentContainerStyle,
    sectionStyle,
  };
}
