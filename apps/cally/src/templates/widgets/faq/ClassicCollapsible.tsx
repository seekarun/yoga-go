"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { FAQItem, SectionStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";

interface ClassicCollapsibleProps {
  heading?: string;
  subheading?: string;
  items: FAQItem[];
  brand: WidgetBrandConfig;
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: SectionStyleOverrides) => void;
  styleOverrides?: SectionStyleOverrides;
}

const SCOPE = "w-fq-cc";

/**
 * FAQ: Classic Collapsible
 *
 * Left-aligned heading + subheading, followed by native <details> accordion
 * items separated by subtle bottom borders. Clean, minimal design using
 * the browser's built-in disclosure triangle.
 */
export default function ClassicCollapsible({
  heading,
  subheading,
  items,
  brand,
  isEditing,
  onHeadingChange,
  onSubheadingChange,
  onStyleOverrideChange,
  styleOverrides,
}: ClassicCollapsibleProps) {
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setHeadingSelected(false);
        setSubheadingSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const emitOverride = useCallback(
    (patch: Partial<SectionStyleOverrides>) => {
      onStyleOverrideChange?.({ ...styleOverrides, ...patch });
    },
    [styleOverrides, onStyleOverrideChange],
  );

  const headingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.headingFontSize ?? "clamp(1.8rem, 3.5vw, 2.5rem)",
    fontWeight: styleOverrides?.headingFontWeight ?? 700,
    fontStyle: styleOverrides?.headingFontStyle ?? "normal",
    color: styleOverrides?.headingTextColor ?? "#1a1a1a",
    textAlign: styleOverrides?.headingTextAlign ?? "left",
    fontFamily:
      styleOverrides?.headingFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: "0 0 8px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.subheadingFontSize ?? "1rem",
    fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
    fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
    color: styleOverrides?.subheadingTextColor ?? "#9ca3af",
    textAlign: styleOverrides?.subheadingTextAlign ?? "left",
    fontFamily:
      styleOverrides?.subheadingFontFamily || brand.bodyFont || "inherit",
    margin: "0 0 48px",
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 64px 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .${SCOPE}-heading {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.15;
        }

        .${SCOPE}-subheading {
          font-size: 1rem;
          color: #9ca3af;
          margin: 0 0 48px;
          font-family: ${brand.bodyFont || "inherit"};
        }

        .${SCOPE}-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .${SCOPE}-item {
          border-bottom: 1px solid #e5e7eb;
          padding: 24px 0;
        }

        .${SCOPE}-item summary {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a1a;
          cursor: pointer;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.4;
          padding: 0;
        }

        .${SCOPE}-item summary::marker {
          color: #9ca3af;
        }

        .${SCOPE}-item[open] summary {
          margin-bottom: 12px;
        }

        .${SCOPE}-answer {
          font-size: 1rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 48px 16px;
          }
          .${SCOPE}-item summary {
            font-size: 1rem;
          }
        }
      `}</style>

      {isEditing ? (
        <ResizableText
          text={heading || "Section Heading"}
          isEditing
          onTextChange={onHeadingChange}
          textStyle={headingStyle}
          selected={headingSelected}
          onSelect={() => {
            setHeadingSelected(true);
            setSubheadingSelected(false);
          }}
          onDeselect={() => setHeadingSelected(false)}
          toolbarProps={{
            fontSize: styleOverrides?.headingFontSize ?? 28,
            fontFamily: styleOverrides?.headingFontFamily ?? "",
            fontWeight: styleOverrides?.headingFontWeight ?? "bold",
            fontStyle: styleOverrides?.headingFontStyle ?? "normal",
            color: styleOverrides?.headingTextColor ?? "#1a1a1a",
            textAlign: styleOverrides?.headingTextAlign ?? "left",
            onFontSizeChange: (v) => emitOverride({ headingFontSize: v }),
            onFontFamilyChange: (v) => emitOverride({ headingFontFamily: v }),
            onFontWeightChange: (v) => emitOverride({ headingFontWeight: v }),
            onFontStyleChange: (v) => emitOverride({ headingFontStyle: v }),
            onColorChange: (v) => emitOverride({ headingTextColor: v }),
            onTextAlignChange: (v) => emitOverride({ headingTextAlign: v }),
          }}
        />
      ) : (
        heading && <h2 className={`${SCOPE}-heading`}>{heading}</h2>
      )}
      {isEditing ? (
        <ResizableText
          text={subheading || "Section Subheading"}
          isEditing
          onTextChange={onSubheadingChange}
          textStyle={subheadingStyle}
          selected={subheadingSelected}
          onSelect={() => {
            setSubheadingSelected(true);
            setHeadingSelected(false);
          }}
          onDeselect={() => setSubheadingSelected(false)}
          toolbarProps={{
            fontSize: styleOverrides?.subheadingFontSize ?? 16,
            fontFamily: styleOverrides?.subheadingFontFamily ?? "",
            fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
            fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
            color: styleOverrides?.subheadingTextColor ?? "#9ca3af",
            textAlign: styleOverrides?.subheadingTextAlign ?? "left",
            onFontSizeChange: (v) => emitOverride({ subheadingFontSize: v }),
            onFontFamilyChange: (v) =>
              emitOverride({ subheadingFontFamily: v }),
            onFontWeightChange: (v) =>
              emitOverride({ subheadingFontWeight: v }),
            onFontStyleChange: (v) => emitOverride({ subheadingFontStyle: v }),
            onColorChange: (v) => emitOverride({ subheadingTextColor: v }),
            onTextAlignChange: (v) => emitOverride({ subheadingTextAlign: v }),
          }}
        />
      ) : (
        subheading && <p className={`${SCOPE}-subheading`}>{subheading}</p>
      )}

      <div className={`${SCOPE}-list`}>
        {items.map((item) => (
          <details key={item.id} className={`${SCOPE}-item`}>
            <summary>{item.question}</summary>
            <p className={`${SCOPE}-answer`}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
