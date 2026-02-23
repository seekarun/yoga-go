"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { HeroStyleOverrides } from "@/types/landing-page";
import { useDimOverlay } from "./useDimOverlay";

interface UseHeroToolbarStateOptions {
  isEditing: boolean;
  heroStyleOverrides?: HeroStyleOverrides;
  onHeroStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
}

export default function useHeroToolbarState({
  isEditing,
  heroStyleOverrides,
  onHeroStyleOverrideChange,
}: UseHeroToolbarStateOptions) {
  const [titleSelected, setTitleSelected] = useState(false);
  const [subtitleSelected, setSubtitleSelected] = useState(false);
  const [sectionSelected, setSectionSelected] = useState(false);
  const [bgDragActive, setBgDragActive] = useState(false);

  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Click-outside deselect for title
  useEffect(() => {
    if (!titleSelected) return;
    const handler = (e: MouseEvent) => {
      if (titleRef.current && !titleRef.current.contains(e.target as Node)) {
        setTitleSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [titleSelected]);

  // Click-outside deselect for subtitle
  useEffect(() => {
    if (!subtitleSelected) return;
    const handler = (e: MouseEvent) => {
      if (
        subtitleRef.current &&
        !subtitleRef.current.contains(e.target as Node)
      ) {
        setSubtitleSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [subtitleSelected]);

  // Click-outside deselect for section
  useEffect(() => {
    if (!sectionSelected) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setSectionSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sectionSelected]);

  // Auto-disable drag mode when section is deselected
  useEffect(() => {
    if (!sectionSelected) setBgDragActive(false);
  }, [sectionSelected]);

  const anySelected = titleSelected || subtitleSelected || sectionSelected;

  // Dim the rest of the page when any element in the hero is selected
  useDimOverlay(isEditing && anySelected);

  const toggleBgDrag = useCallback(() => setBgDragActive((prev) => !prev), []);

  const handleTitleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing) return;
      e.stopPropagation();
      setTitleSelected(true);
      setSubtitleSelected(false);
      setSectionSelected(false);
    },
    [isEditing],
  );

  const handleSubtitleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing) return;
      e.stopPropagation();
      setSubtitleSelected(true);
      setTitleSelected(false);
      setSectionSelected(false);
    },
    [isEditing],
  );

  const handleSectionClick = useCallback(() => {
    if (!isEditing) return;
    setSectionSelected(true);
    setTitleSelected(false);
    setSubtitleSelected(false);
  }, [isEditing]);

  // Helper to merge a partial override
  const mergeOverride = useCallback(
    (partial: Partial<HeroStyleOverrides>) => {
      if (!onHeroStyleOverrideChange) return;
      onHeroStyleOverrideChange({ ...heroStyleOverrides, ...partial });
    },
    [heroStyleOverrides, onHeroStyleOverrideChange],
  );

  // Title style callbacks
  const onTitleMaxWidthChange = useCallback(
    (v: number) => mergeOverride({ titleMaxWidth: v }),
    [mergeOverride],
  );
  const onSubtitleMaxWidthChange = useCallback(
    (v: number) => mergeOverride({ subtitleMaxWidth: v }),
    [mergeOverride],
  );

  const onTitleFontSizeChange = useCallback(
    (v: number) => mergeOverride({ titleFontSize: v }),
    [mergeOverride],
  );
  const onTitleFontFamilyChange = useCallback(
    (v: string) => mergeOverride({ titleFontFamily: v }),
    [mergeOverride],
  );
  const onTitleFontWeightChange = useCallback(
    (v: "normal" | "bold") => mergeOverride({ titleFontWeight: v }),
    [mergeOverride],
  );
  const onTitleFontStyleChange = useCallback(
    (v: "normal" | "italic") => mergeOverride({ titleFontStyle: v }),
    [mergeOverride],
  );
  const onTitleTextColorChange = useCallback(
    (v: string) => mergeOverride({ titleTextColor: v }),
    [mergeOverride],
  );
  const onTitleTextAlignChange = useCallback(
    (v: "left" | "center" | "right") => mergeOverride({ titleTextAlign: v }),
    [mergeOverride],
  );

  // Subtitle style callbacks
  const onSubtitleFontSizeChange = useCallback(
    (v: number) => mergeOverride({ subtitleFontSize: v }),
    [mergeOverride],
  );
  const onSubtitleFontFamilyChange = useCallback(
    (v: string) => mergeOverride({ subtitleFontFamily: v }),
    [mergeOverride],
  );
  const onSubtitleFontWeightChange = useCallback(
    (v: "normal" | "bold") => mergeOverride({ subtitleFontWeight: v }),
    [mergeOverride],
  );
  const onSubtitleFontStyleChange = useCallback(
    (v: "normal" | "italic") => mergeOverride({ subtitleFontStyle: v }),
    [mergeOverride],
  );
  const onSubtitleTextColorChange = useCallback(
    (v: string) => mergeOverride({ subtitleTextColor: v }),
    [mergeOverride],
  );
  const onSubtitleTextAlignChange = useCallback(
    (v: "left" | "center" | "right") => mergeOverride({ subtitleTextAlign: v }),
    [mergeOverride],
  );

  // Section-level callbacks
  const onOverlayOpacityChange = useCallback(
    (v: number) => mergeOverride({ overlayOpacity: v }),
    [mergeOverride],
  );
  const onPaddingTopChange = useCallback(
    (v: number) => mergeOverride({ paddingTop: v }),
    [mergeOverride],
  );
  const onPaddingBottomChange = useCallback(
    (v: number) => mergeOverride({ paddingBottom: v }),
    [mergeOverride],
  );
  const onBgColorChange = useCallback(
    (v: string) => mergeOverride({ bgColor: v }),
    [mergeOverride],
  );
  const onPaddingLeftChange = useCallback(
    (v: number) => mergeOverride({ paddingLeft: v }),
    [mergeOverride],
  );
  const onPaddingRightChange = useCallback(
    (v: number) => mergeOverride({ paddingRight: v }),
    [mergeOverride],
  );
  const onContentAlignChange = useCallback(
    (v: string) =>
      mergeOverride({ contentAlign: v as "left" | "center" | "right" }),
    [mergeOverride],
  );
  const onBgBlurChange = useCallback(
    (v: number) => mergeOverride({ bgBlur: v }),
    [mergeOverride],
  );
  const onBgOpacityChange = useCallback(
    (v: number) => mergeOverride({ bgOpacity: v }),
    [mergeOverride],
  );
  const onBgFilterChange = useCallback(
    (v: string) => mergeOverride({ bgFilter: v }),
    [mergeOverride],
  );

  // Freeform position callbacks
  const onTitlePositionChange = useCallback(
    (px: number, py: number) => mergeOverride({ titleX: px, titleY: py }),
    [mergeOverride],
  );
  const onSubtitlePositionChange = useCallback(
    (px: number, py: number) => mergeOverride({ subtitleX: px, subtitleY: py }),
    [mergeOverride],
  );
  const onButtonPositionChange = useCallback(
    (px: number, py: number) => mergeOverride({ buttonX: px, buttonY: py }),
    [mergeOverride],
  );
  const onSectionHeightChange = useCallback(
    (v: number) => mergeOverride({ sectionHeight: v }),
    [mergeOverride],
  );

  // Mobile freeform position callbacks
  const onMobileTitlePositionChange = useCallback(
    (px: number, py: number) =>
      mergeOverride({ mobileTitleX: px, mobileTitleY: py }),
    [mergeOverride],
  );
  const onMobileSubtitlePositionChange = useCallback(
    (px: number, py: number) =>
      mergeOverride({ mobileSubtitleX: px, mobileSubtitleY: py }),
    [mergeOverride],
  );
  const onMobileButtonPositionChange = useCallback(
    (px: number, py: number) =>
      mergeOverride({ mobileButtonX: px, mobileButtonY: py }),
    [mergeOverride],
  );
  const onMobileSectionHeightChange = useCallback(
    (v: number) => mergeOverride({ mobileSectionHeight: v }),
    [mergeOverride],
  );

  return {
    // Selection state
    titleSelected,
    subtitleSelected,
    sectionSelected,
    anySelected,
    // Refs
    titleRef,
    subtitleRef,
    sectionRef,
    // Click handlers
    handleTitleClick,
    handleSubtitleClick,
    handleSectionClick,
    // MaxWidth callbacks
    onTitleMaxWidthChange,
    onSubtitleMaxWidthChange,
    // Title callbacks
    onTitleFontSizeChange,
    onTitleFontFamilyChange,
    onTitleFontWeightChange,
    onTitleFontStyleChange,
    onTitleTextColorChange,
    onTitleTextAlignChange,
    // Subtitle callbacks
    onSubtitleFontSizeChange,
    onSubtitleFontFamilyChange,
    onSubtitleFontWeightChange,
    onSubtitleFontStyleChange,
    onSubtitleTextColorChange,
    onSubtitleTextAlignChange,
    // BG drag mode
    bgDragActive,
    toggleBgDrag,
    // Section callbacks
    onOverlayOpacityChange,
    onPaddingTopChange,
    onPaddingBottomChange,
    onBgColorChange,
    onPaddingLeftChange,
    onPaddingRightChange,
    onContentAlignChange,
    onBgBlurChange,
    onBgOpacityChange,
    onBgFilterChange,
    // Freeform position callbacks
    onTitlePositionChange,
    onSubtitlePositionChange,
    onButtonPositionChange,
    onSectionHeightChange,
    // Mobile freeform position callbacks
    onMobileTitlePositionChange,
    onMobileSubtitlePositionChange,
    onMobileButtonPositionChange,
    onMobileSectionHeightChange,
  };
}
