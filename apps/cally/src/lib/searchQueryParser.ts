/**
 * Search query parser for advanced email search.
 *
 * Supports operators: from:, to:, has:attachment, before:YYYY-MM-DD, after:YYYY-MM-DD, label:
 * Quoted values: from:"John Doe"
 * Everything else becomes freeText.
 */

export interface ParsedSearchQuery {
  from?: string;
  to?: string;
  hasAttachment?: boolean;
  after?: string;
  before?: string;
  label?: string;
  freeText: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a raw search string into structured fields + remaining free text.
 */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = { freeText: "" };
  if (!raw || !raw.trim()) return result;

  const remaining: string[] = [];
  let i = 0;
  const s = raw.trim();

  while (i < s.length) {
    // Skip whitespace
    if (s[i] === " ") {
      i++;
      continue;
    }

    // Try to match an operator
    const operatorMatch = matchOperator(s, i);
    if (operatorMatch) {
      const { operator, value, end } = operatorMatch;
      switch (operator) {
        case "from":
          result.from = value;
          break;
        case "to":
          result.to = value;
          break;
        case "has":
          if (value.toLowerCase() === "attachment") {
            result.hasAttachment = true;
          } else {
            remaining.push(`has:${value}`);
          }
          break;
        case "before":
          if (DATE_RE.test(value)) {
            result.before = value;
          } else {
            remaining.push(`before:${value}`);
          }
          break;
        case "after":
          if (DATE_RE.test(value)) {
            result.after = value;
          } else {
            remaining.push(`after:${value}`);
          }
          break;
        case "label":
          result.label = value;
          break;
        default:
          remaining.push(`${operator}:${value}`);
      }
      i = end;
    } else {
      // Regular word
      const wordEnd = s.indexOf(" ", i);
      if (wordEnd === -1) {
        remaining.push(s.slice(i));
        break;
      } else {
        remaining.push(s.slice(i, wordEnd));
        i = wordEnd;
      }
    }
  }

  result.freeText = remaining.join(" ").trim();
  return result;
}

function matchOperator(
  s: string,
  start: number,
): { operator: string; value: string; end: number } | null {
  const operators = ["from", "to", "has", "before", "after", "label"];

  for (const op of operators) {
    const prefix = `${op}:`;
    if (
      s.slice(start, start + prefix.length).toLowerCase() === prefix &&
      start + prefix.length < s.length
    ) {
      const valueStart = start + prefix.length;

      // Quoted value
      if (s[valueStart] === '"') {
        const closeQuote = s.indexOf('"', valueStart + 1);
        if (closeQuote !== -1) {
          return {
            operator: op,
            value: s.slice(valueStart + 1, closeQuote),
            end: closeQuote + 1,
          };
        }
      }

      // Unquoted value (until next space)
      const spaceIdx = s.indexOf(" ", valueStart);
      const valueEnd = spaceIdx === -1 ? s.length : spaceIdx;
      const value = s.slice(valueStart, valueEnd);

      if (value.length > 0) {
        return { operator: op, value, end: valueEnd };
      }
    }
  }

  return null;
}

/**
 * Serialize structured search fields back to a search string.
 */
export function serializeSearchQuery(parsed: ParsedSearchQuery): string {
  const parts: string[] = [];

  if (parsed.from) {
    parts.push(
      parsed.from.includes(" ")
        ? `from:"${parsed.from}"`
        : `from:${parsed.from}`,
    );
  }
  if (parsed.to) {
    parts.push(
      parsed.to.includes(" ") ? `to:"${parsed.to}"` : `to:${parsed.to}`,
    );
  }
  if (parsed.hasAttachment) {
    parts.push("has:attachment");
  }
  if (parsed.after) {
    parts.push(`after:${parsed.after}`);
  }
  if (parsed.before) {
    parts.push(`before:${parsed.before}`);
  }
  if (parsed.label) {
    parts.push(
      parsed.label.includes(" ")
        ? `label:"${parsed.label}"`
        : `label:${parsed.label}`,
    );
  }
  if (parsed.freeText) {
    parts.push(parsed.freeText);
  }

  return parts.join(" ");
}
