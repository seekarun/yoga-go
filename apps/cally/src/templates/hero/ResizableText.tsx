"use client";

import { forwardRef, useRef, useCallback } from "react";
import type { ColorPalette } from "@/lib/colorPalette";
import TextToolbar from "./TextToolbar";
import WidthResizeHandles from "./WidthResizeHandles";

interface TextToolbarProps {
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  onFontSizeChange: (value: number) => void;
  onFontFamilyChange: (value: string) => void;
  onFontWeightChange: (value: "normal" | "bold") => void;
  onFontStyleChange: (value: "normal" | "italic") => void;
  onColorChange: (value: string) => void;
  onTextAlignChange: (value: "left" | "center" | "right") => void;
}

interface ResizableTextProps {
  text: string;
  isEditing: boolean;
  onTextChange?: (value: string) => void;
  textStyle: React.CSSProperties;
  editableClassName?: string;
  /** Extra class names on the contentEditable inner div (e.g. animation classes) */
  innerClassName?: string;
  // Width resize (optional — omit for no resize handles)
  maxWidth?: number;
  onMaxWidthChange?: (value: number) => void;
  // TextToolbar (optional — omit for no toolbar)
  toolbarProps?: TextToolbarProps;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
  // Selection (externally controlled)
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  // Extra wrapper styling
  wrapperStyle?: React.CSSProperties;
}

const SELECTED_OUTLINE: React.CSSProperties = {
  outline: "2px solid #3b82f6",
  outlineOffset: "4px",
  borderRadius: "6px",
};

const ResizableText = forwardRef<HTMLDivElement, ResizableTextProps>(
  function ResizableText(
    {
      text,
      isEditing,
      onTextChange,
      textStyle,
      editableClassName,
      innerClassName,
      maxWidth,
      onMaxWidthChange,
      toolbarProps,
      palette,
      customColors,
      onCustomColorsChange,
      selected,
      onSelect,
      wrapperStyle,
    },
    ref,
  ) {
    const baseWidthRef = useRef(0);

    const editableBaseStyle: React.CSSProperties = isEditing
      ? {
          cursor: "text",
          outline: "none",
          border: "none",
          borderRadius: "4px",
          padding: "8px 12px",
          transition: "background 0.2s",
        }
      : {};

    const handleDragStart = useCallback(() => {
      baseWidthRef.current = maxWidth ?? 900;
    }, [maxWidth]);

    const handleDragLeft = useCallback(
      (dx: number, _dy: number) => {
        const clamped = Math.min(
          1200,
          Math.max(200, baseWidthRef.current - dx * 2),
        );
        onMaxWidthChange?.(clamped);
      },
      [onMaxWidthChange],
    );

    const handleDragRight = useCallback(
      (dx: number, _dy: number) => {
        const clamped = Math.min(
          1200,
          Math.max(200, baseWidthRef.current + dx * 2),
        );
        onMaxWidthChange?.(clamped);
      },
      [onMaxWidthChange],
    );

    const handleDragEnd = useCallback(() => {}, []);

    if (!isEditing) {
      return (
        <div
          style={{
            ...textStyle,
            ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
            ...wrapperStyle,
          }}
        >
          {text}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        onClick={onSelect}
        style={{
          position: "relative",
          width: "100%",
          ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
          ...(selected ? SELECTED_OUTLINE : {}),
          ...wrapperStyle,
        }}
      >
        {selected && toolbarProps && (
          <TextToolbar
            fontSize={toolbarProps.fontSize}
            fontFamily={toolbarProps.fontFamily}
            fontWeight={toolbarProps.fontWeight}
            fontStyle={toolbarProps.fontStyle}
            color={toolbarProps.color}
            textAlign={toolbarProps.textAlign}
            palette={palette}
            customColors={customColors}
            onFontSizeChange={toolbarProps.onFontSizeChange}
            onFontFamilyChange={toolbarProps.onFontFamilyChange}
            onFontWeightChange={toolbarProps.onFontWeightChange}
            onFontStyleChange={toolbarProps.onFontStyleChange}
            onColorChange={toolbarProps.onColorChange}
            onTextAlignChange={toolbarProps.onTextAlignChange}
            onCustomColorsChange={onCustomColorsChange}
          />
        )}
        {selected && maxWidth && onMaxWidthChange && (
          <WidthResizeHandles
            onDragStart={handleDragStart}
            onDragLeft={handleDragLeft}
            onDragRight={handleDragRight}
            onDragEnd={handleDragEnd}
          />
        )}
        <div
          className={[editableClassName, innerClassName]
            .filter(Boolean)
            .join(" ")}
          contentEditable
          suppressContentEditableWarning
          style={{ ...textStyle, ...editableBaseStyle }}
          onBlur={(e) => onTextChange?.(e.currentTarget.textContent || "")}
        >
          {text}
        </div>
      </div>
    );
  },
);

export default ResizableText;
export type {
  ResizableTextProps,
  TextToolbarProps as ResizableTextToolbarProps,
};
