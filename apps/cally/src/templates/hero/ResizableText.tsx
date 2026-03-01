"use client";

import { forwardRef, useRef, useCallback, useState } from "react";
import type { ColorPalette } from "@/lib/colorPalette";
import type { TextSpan } from "@/types/landing-page";
import TextToolbar from "./TextToolbar";
import WidthResizeHandles from "./WidthResizeHandles";
import { renderSpans, mergeSpan, getStyleAtRange } from "./spanUtils";
import type { SpanStyle } from "./spanUtils";
import { getSpanFontUrls } from "./fonts";

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
  /** Called when focus leaves the text + toolbar area (blur-based deselect). */
  onDeselect?: () => void;
  // Extra wrapper styling
  wrapperStyle?: React.CSSProperties;
  // Inline span styling (title only)
  spans?: TextSpan[];
  onSpansChange?: (spans: TextSpan[]) => void;
  /** Enables inline span editing — only true for titles */
  isTitle?: boolean;
}

/** Selection within the text as character offsets. */
interface CharSelection {
  offset: number;
  length: number;
}

const SELECTED_OUTLINE: React.CSSProperties = {
  outline: "2px solid #3b82f6",
  outlineOffset: "4px",
  borderRadius: "6px",
};

/**
 * Get the character offset of a point within a contentEditable element's
 * plain text content.
 */
function getCharOffset(
  container: HTMLElement,
  node: Node,
  nodeOffset: number,
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  while (walker.nextNode()) {
    if (walker.currentNode === node) {
      return offset + nodeOffset;
    }
    offset += (walker.currentNode.textContent || "").length;
  }
  return offset;
}

/** Render styled <span> elements for segments. */
function SpannedText({
  text,
  spans,
  globalStyle,
}: {
  text: string;
  spans: TextSpan[] | undefined;
  globalStyle: React.CSSProperties;
}) {
  const segments = renderSpans(text, spans, globalStyle);
  return (
    <>
      {segments.map((seg) => (
        <span key={seg.startIndex} style={seg.style}>
          {seg.text}
        </span>
      ))}
    </>
  );
}

/** Render <link> tags for Google Fonts used in spans so they persist
 *  even when the toolbar is hidden. */
function SpanFontLinks({ spans }: { spans?: TextSpan[] }) {
  const urls = getSpanFontUrls(spans);
  if (urls.length === 0) return null;
  return (
    <>
      {urls.map((url) => (
        <link key={url} rel="stylesheet" href={url} />
      ))}
    </>
  );
}

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
      onDeselect,
      wrapperStyle,
      spans,
      onSpansChange,
      isTitle,
    },
    ref,
  ) {
    const baseWidthRef = useRef(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const editableRef = useRef<HTMLDivElement>(null);
    const [charSelection, setCharSelection] = useState<CharSelection | null>(
      null,
    );
    // Keep a ref in sync so toolbar callbacks always see the latest selection
    const charSelectionRef = useRef<CharSelection | null>(null);

    const spanEnabled = isTitle && !!onSpansChange;

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

    /** Update both state and ref for charSelection. */
    const setCharSel = useCallback((sel: CharSelection | null) => {
      charSelectionRef.current = sel;
      setCharSelection(sel);
    }, []);

    /** Read browser selection and convert to character offsets. */
    const updateCharSelection = useCallback(() => {
      if (!spanEnabled) return;
      const el = editableRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setCharSel(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // Make sure selection is within our editable element
      if (
        !el.contains(range.startContainer) ||
        !el.contains(range.endContainer)
      )
        return;
      const start = getCharOffset(el, range.startContainer, range.startOffset);
      const end = getCharOffset(el, range.endContainer, range.endOffset);
      if (end > start) {
        setCharSel({ offset: start, length: end - start });
      } else {
        setCharSel(null);
      }
    }, [spanEnabled, setCharSel]);

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
          setCharSel(null);
          onDeselect();
        });
      },
      [onDeselect, selected, setCharSel],
    );

    // Build toolbar props — when a text selection exists and spans are enabled,
    // show span-specific values and route changes to span operations.
    const effectiveToolbarProps = useCallback(() => {
      if (!toolbarProps) return undefined;
      // Read from ref so toolbar callbacks always have the latest selection
      const sel = charSelectionRef.current;
      if (!spanEnabled || !sel || sel.length === 0) {
        return toolbarProps;
      }

      // Get common style across selection
      const rangeStyle: SpanStyle = spans
        ? getStyleAtRange(spans, sel.offset, sel.length)
        : {};

      const applySpanStyle = (patch: Partial<TextSpan>) => {
        // Read from ref at call time — ensures we use the selection that was
        // active when the user started interacting with the toolbar
        const currentSel = charSelectionRef.current;
        if (!currentSel || currentSel.length === 0) return;
        const newSpan: TextSpan = {
          offset: currentSel.offset,
          length: currentSel.length,
          ...patch,
        };
        const updated = mergeSpan(spans || [], newSpan);
        onSpansChange?.(updated);
      };

      return {
        fontSize: rangeStyle.fontSize ?? toolbarProps.fontSize,
        fontFamily: rangeStyle.fontFamily ?? toolbarProps.fontFamily,
        fontWeight: rangeStyle.fontWeight ?? toolbarProps.fontWeight,
        fontStyle: rangeStyle.fontStyle ?? toolbarProps.fontStyle,
        color: rangeStyle.color ?? toolbarProps.color,
        textAlign: toolbarProps.textAlign, // alignment is always global
        onFontSizeChange: (v: number) => applySpanStyle({ fontSize: v }),
        onFontFamilyChange: (v: string) => applySpanStyle({ fontFamily: v }),
        onFontWeightChange: (v: "normal" | "bold") =>
          applySpanStyle({ fontWeight: v }),
        onFontStyleChange: (v: "normal" | "italic") =>
          applySpanStyle({ fontStyle: v }),
        onColorChange: (v: string) => applySpanStyle({ color: v }),
        onTextAlignChange: toolbarProps.onTextAlignChange, // alignment is always global
      };
      // charSelection in deps triggers re-render so toolbar shows updated values;
      // applySpanStyle reads from charSelectionRef for the latest value at call time
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toolbarProps, spanEnabled, charSelection, spans, onSpansChange]);

    // --- Non-editing (display) ---
    if (!isEditing) {
      const hasSpans = isTitle && spans && spans.length > 0;
      return (
        <div
          style={{
            ...textStyle,
            whiteSpace: "pre-line",
            ...(maxWidth ? { maxWidth: `${maxWidth}px` } : {}),
            ...wrapperStyle,
          }}
        >
          {hasSpans && <SpanFontLinks spans={spans} />}
          {hasSpans ? (
            <SpannedText text={text} spans={spans} globalStyle={textStyle} />
          ) : (
            text
          )}
        </div>
      );
    }

    // --- Editing ---
    const resolvedToolbar = effectiveToolbarProps();

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
        {spanEnabled && <SpanFontLinks spans={spans} />}
        {selected && resolvedToolbar && (
          <TextToolbar
            fontSize={resolvedToolbar.fontSize}
            fontFamily={resolvedToolbar.fontFamily}
            fontWeight={resolvedToolbar.fontWeight}
            fontStyle={resolvedToolbar.fontStyle}
            color={resolvedToolbar.color}
            textAlign={resolvedToolbar.textAlign}
            palette={palette}
            customColors={customColors}
            onFontSizeChange={resolvedToolbar.onFontSizeChange}
            onFontFamilyChange={resolvedToolbar.onFontFamilyChange}
            onFontWeightChange={resolvedToolbar.onFontWeightChange}
            onFontStyleChange={resolvedToolbar.onFontStyleChange}
            onColorChange={resolvedToolbar.onColorChange}
            onTextAlignChange={resolvedToolbar.onTextAlignChange}
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
          ref={editableRef}
          className={[editableClassName, innerClassName]
            .filter(Boolean)
            .join(" ")}
          contentEditable
          suppressContentEditableWarning
          style={{ ...textStyle, whiteSpace: "pre-line", ...editableBaseStyle }}
          onMouseUp={spanEnabled ? updateCharSelection : undefined}
          onKeyUp={spanEnabled ? updateCharSelection : undefined}
          onBlur={(e) => {
            onTextChange?.(
              (e.currentTarget.innerText || "").replace(/\n$/, ""),
            );
            // Only clear char selection if focus is leaving the wrapper entirely.
            // When focus moves to toolbar controls (inside the wrapper), keep
            // the selection so toolbar changes apply to the selected range.
            if (spanEnabled) {
              const wrapper = wrapperRef.current;
              const movingToToolbar =
                wrapper &&
                e.relatedTarget instanceof Node &&
                wrapper.contains(e.relatedTarget);
              if (!movingToToolbar) {
                // Use rAF to let focus settle (some toolbar elements like
                // color pickers may not be the immediate relatedTarget)
                requestAnimationFrame(() => {
                  if (
                    wrapper &&
                    (wrapper.contains(document.activeElement) ||
                      document.activeElement === wrapper)
                  ) {
                    return;
                  }
                  setCharSel(null);
                });
              }
            }
          }}
        >
          {spanEnabled && spans && spans.length > 0 ? (
            <SpannedText text={text} spans={spans} globalStyle={textStyle} />
          ) : (
            text
          )}
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
