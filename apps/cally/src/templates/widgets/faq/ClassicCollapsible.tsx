"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  FAQItem,
  SectionStyleOverrides,
  CustomFontType,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";
import { fontForRole } from "../../hero/fontUtils";

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
  onAddCustomFontType?: (ft: CustomFontType) => void;
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
  onAddCustomFontType,
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

  const headingRole = styleOverrides?.headingTypography || "header";
  const headingResolved = fontForRole(headingRole, brand);
  const headingStyle: React.CSSProperties = {
    fontSize: headingResolved.size,
    fontWeight: headingResolved.weight ?? 700,
    color: headingResolved.color ?? "#1a1a1a",
    textAlign: styleOverrides?.headingTextAlign ?? "left",
    fontFamily: headingResolved.font || "inherit",
    lineHeight: 1.15,
    margin: "0 0 8px",
  };

  const subheadingRole = styleOverrides?.subheadingTypography || "sub-header";
  const subheadingResolved = fontForRole(subheadingRole, brand);
  const subheadingStyle: React.CSSProperties = {
    fontSize: subheadingResolved.size,
    fontWeight: subheadingResolved.weight ?? "normal",
    color: subheadingResolved.color ?? "#9ca3af",
    textAlign: styleOverrides?.subheadingTextAlign ?? "left",
    fontFamily: subheadingResolved.font || "inherit",
    margin: "0 0 48px",
  };

  const innerSubHeader = fontForRole("sub-header", brand);
  const innerBody = fontForRole("body", brand);

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 64px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .${SCOPE}-heading {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 700;
          color: ${innerSubHeader.color || "#1a1a1a"};
          margin: 0 0 8px;
          font-family: ${innerSubHeader.font || "inherit"};
          line-height: 1.15;
        }

        .${SCOPE}-subheading {
          font-size: 1rem;
          color: ${innerBody.color || "#9ca3af"};
          margin: 0 0 48px;
          font-family: ${innerBody.font || "inherit"};
        }

        .${SCOPE}-list {
          list-style: none;
          margin: 0;
          padding: 0;
          max-width: 800px;
        }

        .${SCOPE}-item {
          border-bottom: 1px solid #e5e7eb;
          padding: 24px 0;
        }

        .${SCOPE}-item summary {
          font-size: ${innerSubHeader.size}px;
          font-weight: ${innerSubHeader.weight ?? 600};
          color: ${innerSubHeader.color || "#1a1a1a"};
          cursor: pointer;
          font-family: ${innerSubHeader.font || "inherit"};
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
          font-size: ${innerBody.size}px;
          color: ${innerBody.color || "#6b7280"};
          line-height: 1.7;
          margin: 0;
          font-family: ${innerBody.font || "inherit"};
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
            typographyRole: styleOverrides?.headingTypography || "header",
            onTypographyRoleChange: (v) =>
              emitOverride({ headingTypography: v }),
            textAlign: styleOverrides?.headingTextAlign ?? "left",
            onTextAlignChange: (v) => emitOverride({ headingTextAlign: v }),
            customFontTypes: brand.customFontTypes,
            onAddCustomFontType,
          }}
        />
      ) : (
        heading && (
          <h2 className={`${SCOPE}-heading`} style={headingStyle}>
            {heading}
          </h2>
        )
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
            typographyRole:
              styleOverrides?.subheadingTypography || "sub-header",
            onTypographyRoleChange: (v) =>
              emitOverride({ subheadingTypography: v }),
            textAlign: styleOverrides?.subheadingTextAlign ?? "left",
            onTextAlignChange: (v) => emitOverride({ subheadingTextAlign: v }),
            customFontTypes: brand.customFontTypes,
            onAddCustomFontType,
          }}
        />
      ) : (
        subheading && (
          <p className={`${SCOPE}-subheading`} style={subheadingStyle}>
            {subheading}
          </p>
        )
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
