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
import ImageToolbar from "../../hero/ImageToolbar";
import { fontForRole } from "../../hero/fontUtils";
import { bgFilterToCSS } from "../../hero/layoutOptions";
import { getSectionTheme } from "../sectionTheme";

interface DoctorProfileProps {
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
  onPortraitImageClick?: () => void;
}

const SCOPE = "w-hr-dp";

/**
 * Hero: Doctor Profile
 *
 * Clean 2x2 grid layout. Left column spans both rows (text card with title,
 * subtitle, CTA, social proof). Right column: portrait image on top, name
 * card on bottom.
 */
export default function DoctorProfile({
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
  onPortraitImageClick,
}: DoctorProfileProps) {
  const t = getSectionTheme(brand.colorMode);
  const primary = brand.primaryColor || "#2a7a6f";

  const [titleSelected, setTitleSelected] = useState(false);
  const [subtitleSelected, setSubtitleSelected] = useState(false);
  const [nameSelected, setNameSelected] = useState(false);
  const [roleSelected, setRoleSelected] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);
  const [proofSelected, setProofSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const deselectAll = useCallback(() => {
    setTitleSelected(false);
    setSubtitleSelected(false);
    setNameSelected(false);
    setRoleSelected(false);
    setImageSelected(false);
    setProofSelected(false);
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        deselectAll();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing, deselectAll]);

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

  const nameRole: TypographyRole =
    overrides?.namecardNameTypography || "sub-header";
  const nameResolved = fontForRole(nameRole, brand);
  const roleRole: TypographyRole = overrides?.namecardRoleTypography || "body";
  const roleResolved = fontForRole(roleRole, brand);

  const nameStyle: React.CSSProperties = {
    fontSize: nameResolved.size,
    fontWeight: nameResolved.weight ?? 700,
    color: nameResolved.color ?? t.heading,
    textAlign: overrides?.namecardNameTextAlign ?? "left",
    fontFamily: nameResolved.font || "inherit",
    lineHeight: 1.2,
    margin: 0,
  };

  const roleStyle: React.CSSProperties = {
    fontSize: roleResolved.size,
    fontWeight: roleResolved.weight ?? "normal",
    color: roleResolved.color ?? t.body,
    textAlign: overrides?.namecardRoleTextAlign ?? "left",
    fontFamily: roleResolved.font || "inherit",
    lineHeight: 1.4,
    margin: "4px 0 0",
  };

  const proofRole: TypographyRole = overrides?.proofTextTypography || "body";
  const proofResolved = fontForRole(proofRole, brand);
  const proofStyle: React.CSSProperties = {
    fontSize: proofResolved.size,
    fontWeight: proofResolved.weight ?? "normal",
    color: proofResolved.color ?? t.heading,
    textAlign: overrides?.proofTextTextAlign ?? "left",
    fontFamily: proofResolved.font || "inherit",
    lineHeight: 1.4,
    margin: 0,
  };

  // Portrait image
  const portraitSrc =
    overrides?.portraitImage ||
    "https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=800";
  const portraitPos = (() => {
    const pos = overrides?.portraitPosition;
    if (!pos) return { x: 50, y: 50 };
    const parts = pos.split(/\s+/).map((p) => parseInt(p, 10));
    return { x: parts[0] ?? 50, y: parts[1] ?? 50 };
  })();
  const portraitZoom = (overrides?.portraitZoom || 100) / 100;
  const portraitScale = Math.max(1.05, portraitZoom);
  const portraitImgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${portraitSrc})`,
    backgroundPosition: `${portraitPos.x}% ${portraitPos.y}%`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: `scale(${portraitScale})`,
    transformOrigin: `${portraitPos.x}% ${portraitPos.y}%`,
    filter: bgFilterToCSS(overrides?.portraitFilter) || "none",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: titleResolved.size,
    fontWeight: titleResolved.weight ?? 700,
    color: titleResolved.color ?? t.heading,
    textAlign: overrides?.titleTextAlign ?? "left",
    fontFamily: titleResolved.font || "inherit",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: subtitleResolved.size,
    fontWeight: subtitleResolved.weight ?? "normal",
    color: subtitleResolved.color ?? t.body,
    textAlign: overrides?.subtitleTextAlign ?? "left",
    fontFamily: subtitleResolved.font || "inherit",
    lineHeight: 1.65,
    margin: 0,
    maxWidth: 520,
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr auto;
          gap: 16px;
        }
        .${SCOPE}-left {
          grid-row: 1 / 3;
          background: ${t.surfaceAlt};
          border-radius: 24px;
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          justify-content: center;
        }
        .${SCOPE}-title em { font-style: italic; color: ${primary}; display: block; }
        .${SCOPE}-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .${SCOPE}-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px 16px 28px;
          border-radius: ${brand.primaryButton?.borderRadius ?? 50}px;
          font-weight: 600;
          font-size: 1rem;
          border: ${brand.primaryButton?.borderWidth ? `${brand.primaryButton.borderWidth}px solid ${brand.primaryButton.borderColor}` : "none"};
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${brand.primaryButton?.textColor || getContrastColor(primary)};
          background: ${brand.primaryButton?.fillColor || primary};
          font-family: ${innerBody.font || "inherit"};
        }
        .${SCOPE}-btn-primary:hover { opacity: 0.9; transform: scale(1.02); }
        .${SCOPE}-btn-arrow {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .${SCOPE}-btn-arrow svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        .${SCOPE}-proof { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
        .${SCOPE}-avatars { display: flex; }
        .${SCOPE}-avatars img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid ${t.surfaceAlt}; margin-left: -10px; }
        .${SCOPE}-avatars img:first-child { margin-left: 0; }
        .${SCOPE}-proof-text { font-size: ${innerBody.size}px; color: ${innerBody.color || t.heading}; font-family: ${innerBody.font || "inherit"}; font-weight: ${innerBody.weight ?? "normal"}; }
        .${SCOPE}-proof-text strong { font-weight: 700; }
        .${SCOPE}-portrait { grid-row: 1 / 2; border-radius: ${overrides?.portraitBorderRadius ?? 24}px; position: relative; }
        .${SCOPE}-portrait--selected { outline: 2px solid #3b82f6; outline-offset: -2px; }
        .${SCOPE}-portrait-inner { width: 100%; height: 100%; overflow: hidden; border-radius: inherit; }
        .${SCOPE}-namecard {
          grid-row: 2 / 3; background: ${t.surfaceAlt}; border-radius: 24px;
          padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;
        }
        .${SCOPE}-namecard-info h3 { font-size: ${nameResolved.size}px; font-weight: ${nameResolved.weight ?? 700}; color: ${nameResolved.color || t.heading}; margin: 0; font-family: ${nameResolved.font || "inherit"}; }
        .${SCOPE}-namecard-info p { font-size: ${roleResolved.size}px; color: ${roleResolved.color || t.body}; margin: 4px 0 0; font-family: ${roleResolved.font || "inherit"}; font-weight: ${roleResolved.weight ?? "normal"}; }
        .${SCOPE}-namecard-link {
          width: 44px; height: 44px; border-radius: 50%;
          background: ${primary}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .${SCOPE}-namecard-link svg { width: 18px; height: 18px; fill: none; stroke: ${getContrastColor(primary)}; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
        @media (max-width: 900px) {
          .${SCOPE} { grid-template-columns: 1fr; grid-template-rows: auto auto auto; padding: 16px; }
          .${SCOPE}-left { grid-row: auto; padding: 40px 28px; }
          .${SCOPE}-portrait { grid-row: auto; aspect-ratio: 4 / 3; }
          .${SCOPE}-namecard { grid-row: auto; }
        }
        @media (max-width: 520px) { .${SCOPE}-left { padding: 32px 20px; } }
      `}</style>

      <div className={`${SCOPE}-left`}>
        {isEditing ? (
          <ResizableText
            text={title || "Your Heading"}
            isEditing
            onTextChange={onTitleChange}
            textStyle={titleStyle}
            selected={titleSelected}
            onSelect={() => {
              deselectAll();
              setTitleSelected(true);
            }}
            onDeselect={() => setTitleSelected(false)}
            toolbarProps={{
              typographyRole: overrides?.titleTypography || "header",
              onTypographyRoleChange: (v) =>
                emitOverride({ titleTypography: v }),
              textAlign: overrides?.titleTextAlign ?? "left",
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
              deselectAll();
              setSubtitleSelected(true);
            }}
            onDeselect={() => setSubtitleSelected(false)}
            toolbarProps={{
              typographyRole: overrides?.subtitleTypography || "sub-header",
              onTypographyRoleChange: (v) =>
                emitOverride({ subtitleTypography: v }),
              textAlign: overrides?.subtitleTextAlign ?? "left",
              onTextAlignChange: (v) => emitOverride({ subtitleTextAlign: v }),
              customFontTypes: brand.customFontTypes,
              onAddCustomFontType,
            }}
          />
        ) : (
          subtitle && <p style={subtitleStyle}>{subtitle}</p>
        )}

        <div className={`${SCOPE}-actions`}>
          {buttonLabel && (
            <button
              type="button"
              className={`${SCOPE}-btn-primary`}
              onClick={onButtonClick}
            >
              {buttonLabel}
              <span className={`${SCOPE}-btn-arrow`}>
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <div className={`${SCOPE}-proof`}>
          <div className={`${SCOPE}-avatars`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder */}
            <img
              src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=80"
              alt=""
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder */}
            <img
              src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80"
              alt=""
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder */}
            <img
              src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=80"
              alt=""
            />
          </div>
          {isEditing ? (
            <ResizableText
              text={overrides?.proofText || "300+ Certified Experts"}
              isEditing
              onTextChange={(v) => emitOverride({ proofText: v })}
              textStyle={proofStyle}
              selected={proofSelected}
              onSelect={() => {
                deselectAll();
                setProofSelected(true);
              }}
              onDeselect={() => setProofSelected(false)}
              toolbarProps={{
                typographyRole: overrides?.proofTextTypography || "body",
                onTypographyRoleChange: (v) =>
                  emitOverride({ proofTextTypography: v }),
                textAlign: overrides?.proofTextTextAlign ?? "left",
                onTextAlignChange: (v) =>
                  emitOverride({ proofTextTextAlign: v }),
                customFontTypes: brand.customFontTypes,
                onAddCustomFontType,
              }}
            />
          ) : (
            <p className={`${SCOPE}-proof-text`}>
              {overrides?.proofText || "300+ Certified Experts"}
            </p>
          )}
        </div>
      </div>

      <div
        className={`${SCOPE}-portrait${imageSelected ? ` ${SCOPE}-portrait--selected` : ""}`}
        onClick={
          isEditing
            ? () => {
                deselectAll();
                setImageSelected(true);
              }
            : undefined
        }
        style={{ cursor: isEditing ? "pointer" : "default" }}
      >
        <div className={`${SCOPE}-portrait-inner`}>
          <div
            role="img"
            aria-label="Professional portrait"
            style={portraitImgStyle}
          />
        </div>
        {isEditing && imageSelected && (
          <ImageToolbar
            borderRadius={overrides?.portraitBorderRadius ?? 24}
            positionX={portraitPos.x}
            positionY={portraitPos.y}
            zoom={overrides?.portraitZoom || 100}
            filter={overrides?.portraitFilter}
            onBorderRadiusChange={(v) =>
              emitOverride({ portraitBorderRadius: v })
            }
            onPositionChange={(x, y) =>
              emitOverride({ portraitPosition: `${x}% ${y}%` })
            }
            onZoomChange={(v) => emitOverride({ portraitZoom: v })}
            onFilterChange={(v) =>
              emitOverride({ portraitFilter: v === "none" ? undefined : v })
            }
            onReplaceImage={() => onPortraitImageClick?.()}
            placement="below"
          />
        )}
      </div>

      <div className={`${SCOPE}-namecard`}>
        <div className={`${SCOPE}-namecard-info`}>
          {isEditing ? (
            <ResizableText
              text={overrides?.namecardName || "Dr. James Cart"}
              isEditing
              onTextChange={(v) => emitOverride({ namecardName: v })}
              textStyle={nameStyle}
              selected={nameSelected}
              onSelect={() => {
                deselectAll();
                setNameSelected(true);
              }}
              onDeselect={() => setNameSelected(false)}
              toolbarProps={{
                typographyRole:
                  overrides?.namecardNameTypography || "sub-header",
                onTypographyRoleChange: (v) =>
                  emitOverride({ namecardNameTypography: v }),
                textAlign: overrides?.namecardNameTextAlign ?? "left",
                onTextAlignChange: (v) =>
                  emitOverride({ namecardNameTextAlign: v }),
                customFontTypes: brand.customFontTypes,
                onAddCustomFontType,
              }}
            />
          ) : (
            <h3 style={nameStyle}>
              {overrides?.namecardName || "Dr. James Cart"}
            </h3>
          )}
          {isEditing ? (
            <ResizableText
              text={overrides?.namecardRole || "Neurologist"}
              isEditing
              onTextChange={(v) => emitOverride({ namecardRole: v })}
              textStyle={roleStyle}
              selected={roleSelected}
              onSelect={() => {
                deselectAll();
                setRoleSelected(true);
              }}
              onDeselect={() => setRoleSelected(false)}
              toolbarProps={{
                typographyRole: overrides?.namecardRoleTypography || "body",
                onTypographyRoleChange: (v) =>
                  emitOverride({ namecardRoleTypography: v }),
                textAlign: overrides?.namecardRoleTextAlign ?? "left",
                onTextAlignChange: (v) =>
                  emitOverride({ namecardRoleTextAlign: v }),
                customFontTypes: brand.customFontTypes,
                onAddCustomFontType,
              }}
            />
          ) : (
            <p style={roleStyle}>{overrides?.namecardRole || "Neurologist"}</p>
          )}
        </div>
        <span className={`${SCOPE}-namecard-link`}>
          <svg viewBox="0 0 24 24">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </span>
      </div>
    </section>
  );
}
