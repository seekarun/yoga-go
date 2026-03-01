/**
 * Pure utility functions for inline text span manipulation.
 *
 * Spans define character ranges within a title string with style overrides.
 * Unspanned regions inherit the global style.
 */

import type { TextSpan } from "@/types/landing-page";

/** A renderable segment produced by `renderSpans`. */
export interface TextSegment {
  text: string;
  style: React.CSSProperties;
  startIndex: number;
}

/** Style properties that a span can override. */
export interface SpanStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  color?: string;
}

// ---------------------------------------------------------------------------
// renderSpans
// ---------------------------------------------------------------------------

/**
 * Split `text` into renderable segments based on `spans`.
 * Unspanned regions get `globalStyle` only; spanned regions merge span
 * overrides on top of globalStyle.
 */
export function renderSpans(
  text: string,
  spans: TextSpan[] | undefined,
  globalStyle: React.CSSProperties,
): TextSegment[] {
  if (!spans || spans.length === 0) {
    return [{ text, style: globalStyle, startIndex: 0 }];
  }

  // Build a sorted list of boundaries (start, end) for every span.
  const sorted = [...spans]
    .filter((s) => s.offset < text.length && s.length > 0)
    .sort((a, b) => a.offset - b.offset);

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const span of sorted) {
    const start = Math.max(span.offset, cursor);
    const end = Math.min(span.offset + span.length, text.length);
    if (start > end) continue;

    // Gap before this span
    if (cursor < start) {
      segments.push({
        text: text.slice(cursor, start),
        style: globalStyle,
        startIndex: cursor,
      });
    }

    // The span itself — merge overrides on top of global
    const merged: React.CSSProperties = { ...globalStyle };
    if (span.fontSize != null) merged.fontSize = span.fontSize;
    if (span.fontFamily) merged.fontFamily = span.fontFamily;
    if (span.fontWeight) merged.fontWeight = span.fontWeight;
    if (span.fontStyle) merged.fontStyle = span.fontStyle;
    if (span.color) merged.color = span.color;

    segments.push({
      text: text.slice(start, end),
      style: merged,
      startIndex: start,
    });

    cursor = end;
  }

  // Trailing unspanned text
  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      style: globalStyle,
      startIndex: cursor,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// mergeSpan
// ---------------------------------------------------------------------------

/** Extract style-only keys from a span (no offset/length). */
function extractStyle(span: TextSpan): Partial<TextSpan> {
  const s: Partial<TextSpan> = {};
  if (span.fontSize != null) s.fontSize = span.fontSize;
  if (span.fontFamily) s.fontFamily = span.fontFamily;
  if (span.fontWeight) s.fontWeight = span.fontWeight;
  if (span.fontStyle) s.fontStyle = span.fontStyle;
  if (span.color) s.color = span.color;
  return s;
}

/**
 * Insert or merge a new span into the existing array.
 * Overlapping existing spans are split at boundaries; within the overlap
 * the new span's style is layered ON TOP of existing styles so previously
 * applied properties (e.g. color) are preserved when a different property
 * (e.g. fontSize) is applied to the same range.
 * Returns a new array (does not mutate input).
 */
export function mergeSpan(
  existingSpans: TextSpan[],
  newSpan: TextSpan,
): TextSpan[] {
  const newStyle = extractStyle(newSpan);
  if (Object.keys(newStyle).length === 0) return [...existingSpans];

  const result: TextSpan[] = [];
  const newEnd = newSpan.offset + newSpan.length;

  // Collect overlapping regions with their existing styles so we can merge
  const overlaps: {
    offset: number;
    length: number;
    style: Partial<TextSpan>;
  }[] = [];

  for (const span of existingSpans) {
    const spanEnd = span.offset + span.length;

    // Entirely before new span — keep as-is
    if (spanEnd <= newSpan.offset) {
      result.push(span);
      continue;
    }

    // Entirely after new span — keep as-is
    if (span.offset >= newEnd) {
      result.push(span);
      continue;
    }

    // Overlapping — trim / split
    // Left portion (before new span)
    if (span.offset < newSpan.offset) {
      result.push({ ...span, length: newSpan.offset - span.offset });
    }

    // Right portion (after new span)
    if (spanEnd > newEnd) {
      result.push({
        ...span,
        offset: newEnd,
        length: spanEnd - newEnd,
      });
    }

    // Track the overlapping region so we can merge its styles into the new span
    const overlapStart = Math.max(span.offset, newSpan.offset);
    const overlapEnd = Math.min(spanEnd, newEnd);
    if (overlapEnd > overlapStart) {
      overlaps.push({
        offset: overlapStart,
        length: overlapEnd - overlapStart,
        style: extractStyle(span),
      });
    }
  }

  // Build spans for the new span's range, merging existing styles underneath
  if (overlaps.length === 0) {
    result.push(newSpan);
  } else {
    overlaps.sort((a, b) => a.offset - b.offset);
    let cursor = newSpan.offset;

    for (const ov of overlaps) {
      // Gap before this overlap — new style only
      if (cursor < ov.offset) {
        result.push({
          offset: cursor,
          length: ov.offset - cursor,
          ...newStyle,
        });
      }
      // Overlap region — existing style + new style (new wins)
      result.push({
        offset: ov.offset,
        length: ov.length,
        ...ov.style,
        ...newStyle,
      });
      cursor = ov.offset + ov.length;
    }

    // Trailing gap — new style only
    if (cursor < newEnd) {
      result.push({ offset: cursor, length: newEnd - cursor, ...newStyle });
    }
  }

  // Sort by offset for consistency
  return result.sort((a, b) => a.offset - b.offset);
}

// ---------------------------------------------------------------------------
// adjustSpansForEdit
// ---------------------------------------------------------------------------

/**
 * Shift / trim spans after a text edit at `editOffset`.
 * `oldLength` characters were replaced by `newLength` characters.
 * Returns a new array (does not mutate input).
 */
export function adjustSpansForEdit(
  spans: TextSpan[],
  editOffset: number,
  oldLength: number,
  newLength: number,
): TextSpan[] {
  const delta = newLength - oldLength;
  const editEnd = editOffset + oldLength;

  return spans
    .map((span) => {
      const spanEnd = span.offset + span.length;

      // Span entirely before the edit — unchanged
      if (spanEnd <= editOffset) {
        return span;
      }

      // Span entirely after the edit — shift
      if (span.offset >= editEnd) {
        return { ...span, offset: span.offset + delta };
      }

      // Span overlaps the edit — adjust
      let newOffset = span.offset;
      let newLen = span.length;

      if (span.offset < editOffset) {
        // Span starts before edit — truncate to edit point + delta
        newLen = Math.max(0, editOffset - span.offset + Math.max(0, newLength));
      } else {
        // Span starts inside edit region — push to end of new text
        newOffset = editOffset + newLength;
        newLen = Math.max(0, spanEnd - editEnd);
      }

      return { ...span, offset: newOffset, length: newLen };
    })
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// getStyleAtRange
// ---------------------------------------------------------------------------

/**
 * Return the common style properties across all spans overlapping a range.
 * Properties that differ across spans are omitted (undefined).
 */
export function getStyleAtRange(
  spans: TextSpan[],
  offset: number,
  length: number,
): SpanStyle {
  const end = offset + length;
  const overlapping = spans.filter((s) => {
    const se = s.offset + s.length;
    return s.offset < end && se > offset;
  });

  if (overlapping.length === 0) return {};

  const result: SpanStyle = {
    fontSize: overlapping[0].fontSize,
    fontFamily: overlapping[0].fontFamily,
    fontWeight: overlapping[0].fontWeight,
    fontStyle: overlapping[0].fontStyle,
    color: overlapping[0].color,
  };

  for (let i = 1; i < overlapping.length; i++) {
    const s = overlapping[i];
    if (result.fontSize !== s.fontSize) result.fontSize = undefined;
    if (result.fontFamily !== s.fontFamily) result.fontFamily = undefined;
    if (result.fontWeight !== s.fontWeight) result.fontWeight = undefined;
    if (result.fontStyle !== s.fontStyle) result.fontStyle = undefined;
    if (result.color !== s.color) result.color = undefined;
  }

  return result;
}

// ---------------------------------------------------------------------------
// removeSpanStyle
// ---------------------------------------------------------------------------

/**
 * Remove a specific style property from all spans overlapping a range.
 * Returns a new array (does not mutate input).
 */
export function removeSpanStyle(
  spans: TextSpan[],
  offset: number,
  length: number,
  property: keyof SpanStyle,
): TextSpan[] {
  const end = offset + length;

  return spans
    .map((span) => {
      const spanEnd = span.offset + span.length;
      const overlaps = span.offset < end && spanEnd > offset;
      if (!overlaps) return span;

      const updated = { ...span };
      delete updated[property];

      // Check if span still has any style — if not, remove it
      const hasStyle =
        updated.fontSize != null ||
        !!updated.fontFamily ||
        !!updated.fontWeight ||
        !!updated.fontStyle ||
        !!updated.color;

      return hasStyle ? updated : null;
    })
    .filter((s): s is TextSpan => s !== null);
}
