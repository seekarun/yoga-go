"use client";

import { forwardRef, useRef, useCallback } from "react";
import TextToolbar from "./TextToolbar";
import type { TextToolbarProps } from "./TextToolbar";
import WidthResizeHandles from "./WidthResizeHandles";

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
  // Selection (externally controlled)
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  /** Called when focus leaves the text + toolbar area (blur-based deselect). */
  onDeselect?: () => void;
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
      selected,
      onSelect,
      onDeselect,
      wrapperStyle,
    },
    ref,
  ) {
    const baseWidthRef = useRef(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

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

    /** Deselect when focus leaves the wrapper (text + toolbar area). */
    const handleWrapperBlur = useCallback(
      (e: React.FocusEvent) => {
        if (!onDeselect || !selected) return;
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        if (
          e.relatedTarget instanceof Node &&
          wrapper.contains(e.relatedTarget)
        ) {
          return;
        }
        requestAnimationFrame(() => {
          if (
            wrapper.contains(document.activeElement) ||
            document.activeElement === wrapper
          ) {
            return;
          }
          onDeselect();
        });
      },
      [onDeselect, selected],
    );

    // --- Non-editing (display) ---
    if (!isEditing) {
      return (
        <div
          style={{
            ...textStyle,
            whiteSpace: "pre-line",
            ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
            ...wrapperStyle,
          }}
        >
          {text}
        </div>
      );
    }

    // --- Editing ---
    return (
      <div
        ref={(node) => {
          wrapperRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onClick={onSelect}
        onBlur={handleWrapperBlur}
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
            typographyRole={toolbarProps.typographyRole}
            textAlign={toolbarProps.textAlign}
            onTypographyRoleChange={toolbarProps.onTypographyRoleChange}
            onTextAlignChange={toolbarProps.onTextAlignChange}
            customFontTypes={toolbarProps.customFontTypes}
            onAddCustomFontType={toolbarProps.onAddCustomFontType}
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
          ref={innerRef}
          className={[editableClassName, innerClassName]
            .filter(Boolean)
            .join(" ")}
          contentEditable
          suppressContentEditableWarning
          style={{ ...textStyle, whiteSpace: "pre-line", ...editableBaseStyle }}
          onBlur={(e) => {
            onTextChange?.(
              (e.currentTarget.innerText || "").replace(/\n$/, ""),
            );
          }}
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
