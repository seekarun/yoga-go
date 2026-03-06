"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  CustomFontType,
  HeroStyleOverrides,
  TypographyRole,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";
import { fontForRole } from "../../hero/fontUtils";

interface ThroughTheTearProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
  backgroundImage?: string;
  isEditing?: boolean;
  styleOverrides?: HeroStyleOverrides;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
  onAddCustomFontType?: (ft: CustomFontType) => void;
}

const SCOPE = "w-hr-ttt";

const PLACEHOLDER_IMAGE =
  "https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?auto=compress&cs=tinysrgb&w=1200";

/**
 * Hero: Through the Tear
 *
 * A torn-paper band at the top reveals a background image tinted with the brand
 * colour. Title, subtitle, and CTA sit in a clean white area below the tear.
 */
export default function ThroughTheTear({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
  backgroundImage,
  isEditing = false,
  styleOverrides: overrides,
  onTitleChange,
  onSubtitleChange,
  onStyleOverrideChange,
  onAddCustomFontType,
}: ThroughTheTearProps) {
  const primary = brand.primaryColor || "#e84233";
  const imgSrc = backgroundImage || PLACEHOLDER_IMAGE;

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

  const innerBody = fontForRole("body", brand);

  const titleStyle: React.CSSProperties = {
    fontSize: titleResolved.size,
    fontWeight: titleResolved.weight ?? 800,
    color: titleResolved.color ?? "#1a1a1a",
    textAlign: overrides?.titleTextAlign ?? "center",
    fontFamily: titleResolved.font || "inherit",
    lineHeight: 1.08,
    letterSpacing: "-0.02em",
    maxWidth: 800,
    margin: "0 0 16px",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: subtitleResolved.size,
    fontWeight: subtitleResolved.weight ?? "normal",
    color: subtitleResolved.color ?? "#6b7280",
    textAlign: overrides?.subtitleTextAlign ?? "center",
    fontFamily: subtitleResolved.font || "inherit",
    lineHeight: 1.65,
    maxWidth: 560,
    margin: "0 0 32px",
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} { width: 100%; }
        .${SCOPE}-band { position: relative; height: 420px; background: ${primary}; }
        .${SCOPE}-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
        .${SCOPE}-overlay { position: absolute; inset: 0; background: ${primary}; opacity: 0.3; z-index: 1; }
        .${SCOPE}-grain {
          position: absolute; inset: 0; z-index: 2; opacity: 0.12;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        .${SCOPE}-tear-top, .${SCOPE}-tear-bottom {
          position: absolute; left: 0; right: 0; top: 0; height: 100%; background: #fff; z-index: 4;
        }
        .${SCOPE}-shadow-wrap {
          position: absolute; left: 0; right: 0; top: 0; height: 100%; z-index: 3; filter: blur(6px); pointer-events: none;
        }
        .${SCOPE}-shadow-wrap-top { top: 4px; left: 4px; }
        .${SCOPE}-shadow-wrap-bottom { top: -10px; left: 4px; }
        .${SCOPE}-shadow-inner { width: 100%; height: 100%; background: rgba(0, 0, 0, 0.25); }
        .${SCOPE}-tear-top, .${SCOPE}-shadow-wrap-top .${SCOPE}-shadow-inner {
          clip-path: polygon(0% 0%,100% 0%,100% 22%,97% 24%,95% 22%,90% 19%,89% 21%,87% 20%,85% 18%,80% 21%,78% 22%,75% 22%,73% 26%,70% 24%,68% 27%,65% 28%,63% 26%,60% 21%,58% 22%,55% 18%,53% 20%,50% 18%,47% 21%,45% 24%,42% 22%,40% 25%,37% 26%,35% 24%,32% 22%,30% 25%,27% 27%,25% 28%,22% 29%,20% 32%,17% 30%,15% 31%,12% 28%,10% 27%,7% 28%,5% 25%,2% 22%,0% 24%);
        }
        .${SCOPE}-tear-bottom, .${SCOPE}-shadow-wrap-bottom .${SCOPE}-shadow-inner {
          clip-path: polygon(0% 86%,2% 86%,5% 83%,7% 81%,10% 82%,12% 87%,15% 87%,17% 85%,20% 85%,22% 84%,25% 87%,27% 86%,30% 88%,32% 92%,35% 90%,37% 90%,40% 84%,42% 83%,45% 83%,47% 81%,50% 82%,53% 87%,55% 89%,58% 87%,60% 88%,63% 90%,65% 89%,68% 90%,70% 91%,73% 90%,75% 84%,78% 85%,80% 84%,83% 88%,85% 89%,87% 88%,90% 92%,92% 91%,95% 90%,97% 84%,100% 82%,100% 100%,0% 100%);
        }
        .${SCOPE}-content {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 0px 24px 64px; background: #fff;
        }
        .${SCOPE}-btn {
          display: inline-block; padding: 14px 40px; border-radius: ${brand.primaryButton?.borderRadius ?? 50}px;
          font-weight: 700; font-size: 0.95rem; border: ${brand.primaryButton?.borderWidth ? `${brand.primaryButton.borderWidth}px solid ${brand.primaryButton.borderColor}` : `2px solid ${primary}`};
          cursor: pointer; transition: all 0.25s; color: ${brand.primaryButton?.textColor || primary};
          background: ${brand.primaryButton?.fillColor || "transparent"}; font-family: ${innerBody.font || "inherit"};
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .${SCOPE}-btn:hover { background: ${brand.primaryButton?.fillColor || primary}; color: ${brand.primaryButton?.textColor || "#fff"}; }
        @media (max-width: 768px) {
          .${SCOPE}-band { height: 320px; }
          .${SCOPE}-content { padding: 36px 16px 48px; }
        }
      `}</style>

      <div className={`${SCOPE}-band`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- hero background */}
        <img className={`${SCOPE}-bg`} src={imgSrc} alt="" />
        <div className={`${SCOPE}-overlay`} />
        <div className={`${SCOPE}-grain`} />
        <div className={`${SCOPE}-shadow-wrap ${SCOPE}-shadow-wrap-top`}>
          <div className={`${SCOPE}-shadow-inner`} />
        </div>
        <div className={`${SCOPE}-shadow-wrap ${SCOPE}-shadow-wrap-bottom`}>
          <div className={`${SCOPE}-shadow-inner`} />
        </div>
        <div className={`${SCOPE}-tear-top`} />
        <div className={`${SCOPE}-tear-bottom`} />
      </div>

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
    </section>
  );
}
