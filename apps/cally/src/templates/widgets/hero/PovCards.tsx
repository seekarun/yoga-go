"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  CustomFontType,
  HeroStyleOverrides,
  TypographyRole,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";
import { fontForRole } from "../../hero/fontUtils";
import { getSectionTheme } from "../sectionTheme";

interface PovCardsProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
  isEditing?: boolean;
  styleOverrides?: HeroStyleOverrides;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
  onAddCustomFontType?: (ft: CustomFontType) => void;
}

const SCOPE = "w-hr-pc";

const CARDS = [
  {
    question: "Why do I feel exhausted even after a full night's sleep?",
    answers: 24,
    views: "40k",
    avatar:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120",
  },
  {
    question: "How do you stop overthinking small social interactions?",
    answers: 16,
    views: "400",
    avatar:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=120",
  },
  {
    question: "Is it normal to lose motivation for everything at once?",
    answers: 31,
    views: "12k",
    avatar:
      "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=120",
  },
];

/**
 * Hero: POV Cards
 *
 * Centered hero with title, subtitle, and CTA over a soft lavender-to-cream
 * gradient. Three question cards fan out at the bottom.
 */
export default function PovCards({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
  isEditing = false,
  styleOverrides: overrides,
  onTitleChange,
  onSubtitleChange,
  onStyleOverrideChange,
  onAddCustomFontType,
}: PovCardsProps) {
  const t = getSectionTheme(brand.colorMode);
  const primary = brand.primaryColor || "#6366f1";

  const [titleSelected, setTitleSelected] = useState(false);
  const [subtitleSelected, setSubtitleSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setTitleSelected(false);
        setSubtitleSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const emitOverride = useCallback(
    (patch: Partial<HeroStyleOverrides>) => {
      onStyleOverrideChange?.({ ...overrides, ...patch });
    },
    [overrides, onStyleOverrideChange],
  );

  const titleRole: TypographyRole = overrides?.titleTypography || "header";
  const titleResolved = fontForRole(titleRole, brand);
  const subtitleRole: TypographyRole =
    overrides?.subtitleTypography || "sub-header";
  const subtitleResolved = fontForRole(subtitleRole, brand);

  const innerSubHeader = fontForRole("sub-header", brand);
  const innerBody = fontForRole("body", brand);

  const titleStyle: React.CSSProperties = {
    fontSize: titleResolved.size,
    fontWeight: titleResolved.weight ?? 700,
    color: titleResolved.color ?? t.heading,
    textAlign: overrides?.titleTextAlign ?? "center",
    fontFamily: titleResolved.font || "inherit",
    lineHeight: 1.1,
    letterSpacing: "-0.025em",
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: subtitleResolved.size,
    fontWeight: subtitleResolved.weight ?? "normal",
    color: subtitleResolved.color ?? t.body,
    textAlign: overrides?.subtitleTextAlign ?? "center",
    fontFamily: subtitleResolved.font || "inherit",
    lineHeight: 1.65,
    margin: 0,
    maxWidth: 580,
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          position: relative;
          overflow: hidden;
          padding: 80px 24px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(160deg, #eae6f2 0%, #f0ecf4 20%, #f5f2f0 45%, #f3edd8 100%);
          border-bottom: 1px solid ${t.border};
        }
        .${SCOPE}::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .${SCOPE}-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .${SCOPE}-btn {
          display: inline-block;
          padding: 16px 40px;
          border-radius: ${brand.primaryButton?.borderRadius ?? 50}px;
          font-weight: 600;
          font-size: 1rem;
          border: ${brand.primaryButton?.borderWidth ? `${brand.primaryButton.borderWidth}px solid ${brand.primaryButton.borderColor}` : "none"};
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${brand.primaryButton?.textColor || getContrastColor(primary)};
          background: ${brand.primaryButton?.fillColor || primary};
          font-family: ${innerBody.font || "inherit"};
          margin-top: 4px;
        }
        .${SCOPE}-btn:hover { opacity: 0.9; transform: scale(1.03); }
        .${SCOPE}-cards {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 0;
          margin-top: 48px;
          width: 100%;
          max-width: 650px;
          height: 260px;
        }
        .${SCOPE}-card {
          width: 240px;
          aspect-ratio: 5 / 7;
          flex-shrink: 0;
          background: ${t.bg};
          border-radius: 20px;
          padding: 32px 24px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: normal;
          gap: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
          position: absolute;
          bottom: -140px;
          transform-origin: bottom center;
        }
        .${SCOPE}-card:nth-child(1) { left: 0; transform: rotate(-8deg); z-index: 2; }
        .${SCOPE}-card:nth-child(2) { left: 50%; transform: translateX(-50%) translateY(-30px); z-index: 1; background: ${t.surfaceAlt}; }
        .${SCOPE}-card:nth-child(3) { right: 0; transform: rotate(8deg); z-index: 2; }
        .${SCOPE}-card-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ${t.bg}; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
        .${SCOPE}-card-question { font-size: ${innerSubHeader.size}px; font-weight: ${innerSubHeader.weight ?? 600}; color: ${innerSubHeader.color || t.heading}; text-align: center; line-height: 1.35; margin: 0; font-family: ${innerSubHeader.font || "inherit"}; }
        .${SCOPE}-card-stats { display: flex; gap: 16px; align-items: center; font-size: ${innerBody.size}px; color: ${innerBody.color || t.muted}; font-family: ${innerBody.font || "inherit"}; font-weight: ${innerBody.weight ?? "normal"}; }
        .${SCOPE}-card-stats span { display: flex; align-items: center; gap: 6px; }
        .${SCOPE}-card-dot { width: 8px; height: 8px; border-radius: 50%; background: ${primary}; opacity: 0.6; }
        @media (max-width: 768px) {
          .${SCOPE} { padding: 56px 16px 0; }
          .${SCOPE}-cards { height: 280px; max-width: 100%; }
          .${SCOPE}-card { width: 200px; padding: 24px 16px 20px; }
          .${SCOPE}-card-question { font-size: 0.95rem; }
        }
        @media (max-width: 520px) {
          .${SCOPE}-cards { height: 220px; }
          .${SCOPE}-card { width: 180px; padding: 20px 14px 16px; border-radius: 14px; }
          .${SCOPE}-card:nth-child(1) { transform: rotate(-6deg) translateY(16px); }
          .${SCOPE}-card:nth-child(3) { transform: rotate(6deg) translateY(16px); }
          .${SCOPE}-card-avatar { width: 36px; height: 36px; }
          .${SCOPE}-card-question { font-size: 0.85rem; }
          .${SCOPE}-card-stats { font-size: 0.75rem; }
        }
      `}</style>

      <div className={`${SCOPE}-content`}>
        {isEditing ? (
          <ResizableText
            text={title || "Your Heading"}
            isEditing
            onTextChange={onTitleChange}
            textStyle={titleStyle}
            selected={titleSelected}
            onSelect={() => {
              setTitleSelected(true);
              setSubtitleSelected(false);
            }}
            onDeselect={() => setTitleSelected(false)}
            toolbarProps={{
              typographyRole: overrides?.titleTypography || "header",
              onTypographyRoleChange: (v) =>
                emitOverride({ titleTypography: v }),
              textAlign: overrides?.titleTextAlign ?? "center",
              onTextAlignChange: (v) => emitOverride({ titleTextAlign: v }),
              customFontTypes: brand.customFontTypes,
              onAddCustomFontType,
            }}
          />
        ) : (
          title && <h1 style={titleStyle}>{title}</h1>
        )}

        {isEditing ? (
          <ResizableText
            text={subtitle || ""}
            isEditing
            onTextChange={onSubtitleChange}
            textStyle={subtitleStyle}
            selected={subtitleSelected}
            onSelect={() => {
              setSubtitleSelected(true);
              setTitleSelected(false);
            }}
            onDeselect={() => setSubtitleSelected(false)}
            toolbarProps={{
              typographyRole: overrides?.subtitleTypography || "sub-header",
              onTypographyRoleChange: (v) =>
                emitOverride({ subtitleTypography: v }),
              textAlign: overrides?.subtitleTextAlign ?? "center",
              onTextAlignChange: (v) => emitOverride({ subtitleTextAlign: v }),
              customFontTypes: brand.customFontTypes,
              onAddCustomFontType,
            }}
          />
        ) : (
          subtitle && <p style={subtitleStyle}>{subtitle}</p>
        )}

        {buttonLabel && (
          <button
            type="button"
            className={`${SCOPE}-btn`}
            onClick={onButtonClick}
          >
            {buttonLabel}
          </button>
        )}
      </div>

      <div className={`${SCOPE}-cards`}>
        {CARDS.map((card) => (
          <div key={card.question} className={`${SCOPE}-card`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder avatar */}
            <img
              className={`${SCOPE}-card-avatar`}
              src={card.avatar}
              alt="Avatar"
            />
            <p className={`${SCOPE}-card-question`}>{card.question}</p>
            <div className={`${SCOPE}-card-stats`}>
              <span>{card.answers} answers</span>
              <span>
                <span className={`${SCOPE}-card-dot`} />
                {card.views} views
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
