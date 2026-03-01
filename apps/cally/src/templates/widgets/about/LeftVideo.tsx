"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { AboutStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";

interface LeftVideoProps {
  title?: string;
  paragraph?: string;
  videoUrl?: string;
  styleOverrides?: AboutStyleOverrides;
  brand: WidgetBrandConfig;
  /** Enable inline editing. */
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onParagraphChange?: (paragraph: string) => void;
  onStyleOverrideChange?: (overrides: AboutStyleOverrides) => void;
}

const SCOPE = "w-ab-lv";

const PLACEHOLDER_VIDEO =
  "https://videos.pexels.com/video-files/3982856/3982856-uhd_2560_1440_30fps.mp4";

/**
 * About: Left Video
 *
 * Two-column layout with a user-controlled video on the left (play/pause,
 * volume, progress bar) and the about title + paragraph on the right.
 *
 * In edit mode, uses ResizableText for title/paragraph (with TextToolbar).
 */
export default function LeftVideo({
  title,
  paragraph,
  videoUrl,
  styleOverrides: overrides,
  brand,
  isEditing = false,
  onTitleChange,
  onParagraphChange,
  onStyleOverrideChange,
}: LeftVideoProps) {
  const primary = brand.primaryColor || "#1a1a1a";
  const src = videoUrl || PLACEHOLDER_VIDEO;

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Selection state for editing
  const [titleSelected, setTitleSelected] = useState(false);
  const [paragraphSelected, setParagraphSelected] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);

  // Click-outside listener: deselect everything when clicking outside
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sectionRef.current && !sectionRef.current.contains(target)) {
        setTitleSelected(false);
        setParagraphSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  // Style override helpers
  const emitOverride = useCallback(
    (patch: Partial<AboutStyleOverrides>) => {
      onStyleOverrideChange?.({ ...overrides, ...patch });
    },
    [overrides, onStyleOverrideChange],
  );

  // Video controls
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      v.currentTime = pct * duration;
      setProgress(pct);
    },
    [duration],
  );

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setShowControls(true);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Title toolbar style
  const titleStyle: React.CSSProperties = {
    fontSize: overrides?.titleFontSize ?? "clamp(1.8rem, 3.5vw, 2.6rem)",
    fontWeight: overrides?.titleFontWeight ?? 700,
    fontStyle: overrides?.titleFontStyle ?? "normal",
    color: overrides?.titleTextColor ?? primary,
    textAlign: overrides?.titleTextAlign ?? "left",
    fontFamily: overrides?.titleFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: 0,
  };

  // Paragraph toolbar style
  const paragraphStyle: React.CSSProperties = {
    fontSize: overrides?.fontSize ?? 16,
    fontWeight: overrides?.fontWeight ?? "normal",
    fontStyle: overrides?.fontStyle ?? "normal",
    color: overrides?.textColor ?? "#4a4a4a",
    textAlign: overrides?.textAlign ?? "left",
    fontFamily: overrides?.fontFamily || brand.bodyFont || "inherit",
    lineHeight: 1.8,
    margin: 0,
    whiteSpace: "pre-line",
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 480px;
          background: ${brand.secondaryColor || "#faf6f1"};
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Left — video wrapper */
        .${SCOPE}-wrap {
          position: relative;
          min-height: 480px;
          background: #111;
          cursor: pointer;
          overflow: hidden;
        }

        .${SCOPE}-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          position: absolute;
          inset: 0;
        }

        /* Big centered play button (shown when paused) */
        .${SCOPE}-play-big {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          background: rgba(0, 0, 0, 0.25);
          transition: opacity 0.3s;
        }
        .${SCOPE}-play-big--hidden {
          opacity: 0;
          pointer-events: none;
        }
        .${SCOPE}-play-icon {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          transition: transform 0.2s;
        }
        .${SCOPE}-play-icon:hover {
          transform: scale(1.08);
        }
        .${SCOPE}-play-icon svg {
          margin-left: 3px;
        }

        /* Bottom control bar */
        .${SCOPE}-controls {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
          opacity: 0;
          transition: opacity 0.3s;
        }
        .${SCOPE}-wrap:hover .${SCOPE}-controls,
        .${SCOPE}-controls--visible {
          opacity: 1;
        }

        /* Play/pause small button */
        .${SCOPE}-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          color: #fff;
          flex-shrink: 0;
        }

        /* Progress bar */
        .${SCOPE}-progress {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          cursor: pointer;
          position: relative;
        }
        .${SCOPE}-progress-fill {
          height: 100%;
          background: #fff;
          border-radius: 2px;
          pointer-events: none;
        }

        /* Time label */
        .${SCOPE}-time {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.8);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          min-width: 36px;
        }

        /* Right — text */
        .${SCOPE}-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 56px;
          gap: 24px;
        }

        .${SCOPE}-dot {
          color: ${primary};
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            grid-template-columns: 1fr;
          }
          .${SCOPE}-wrap {
            min-height: 280px;
            max-height: 360px;
          }
          .${SCOPE}-text {
            padding: 40px 24px;
          }
        }
      `}</style>

      {/* Left — video with controls */}
      <div
        className={`${SCOPE}-wrap`}
        onMouseEnter={() => playing && setShowControls(true)}
        onMouseLeave={() => playing && setShowControls(false)}
      >
        <video
          ref={videoRef}
          className={`${SCOPE}-video`}
          src={src}
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        {/* Big play button overlay */}
        <div
          className={`${SCOPE}-play-big${playing ? ` ${SCOPE}-play-big--hidden` : ""}`}
          onClick={togglePlay}
        >
          <div className={`${SCOPE}-play-icon`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1a1a1a">
              <polygon points="8,5 20,12 8,19" />
            </svg>
          </div>
        </div>

        {/* Bottom controls */}
        <div
          className={`${SCOPE}-controls${showControls && playing ? ` ${SCOPE}-controls--visible` : ""}`}
        >
          {/* Play / Pause */}
          <button type="button" className={`${SCOPE}-btn`} onClick={togglePlay}>
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <polygon points="8,5 20,12 8,19" />
              </svg>
            )}
          </button>

          {/* Progress bar */}
          <div className={`${SCOPE}-progress`} onClick={handleSeek}>
            <div
              className={`${SCOPE}-progress-fill`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Time */}
          <span className={`${SCOPE}-time`}>
            {formatTime(progress * duration)}
          </span>

          {/* Mute / Unmute */}
          <button type="button" className={`${SCOPE}-btn`} onClick={toggleMute}>
            {muted ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Right — text */}
      <div className={`${SCOPE}-text`}>
        {isEditing ? (
          <ResizableText
            text={title || "About Me"}
            isEditing
            onTextChange={onTitleChange}
            textStyle={titleStyle}
            selected={titleSelected}
            onSelect={() => {
              setTitleSelected(true);
              setParagraphSelected(false);
            }}
            onDeselect={() => setTitleSelected(false)}
            toolbarProps={{
              fontSize: overrides?.titleFontSize ?? 28,
              fontFamily: overrides?.titleFontFamily ?? "",
              fontWeight: overrides?.titleFontWeight ?? "bold",
              fontStyle: overrides?.titleFontStyle ?? "normal",
              color: overrides?.titleTextColor ?? primary,
              textAlign: overrides?.titleTextAlign ?? "left",
              onFontSizeChange: (v) => emitOverride({ titleFontSize: v }),
              onFontFamilyChange: (v) => emitOverride({ titleFontFamily: v }),
              onFontWeightChange: (v) => emitOverride({ titleFontWeight: v }),
              onFontStyleChange: (v) => emitOverride({ titleFontStyle: v }),
              onColorChange: (v) => emitOverride({ titleTextColor: v }),
              onTextAlignChange: (v) => emitOverride({ titleTextAlign: v }),
            }}
          />
        ) : (
          title && (
            <h2 style={titleStyle}>
              {title}
              <span className={`${SCOPE}-dot`}>.</span>
            </h2>
          )
        )}

        {isEditing ? (
          <ResizableText
            text={paragraph || ""}
            isEditing
            onTextChange={onParagraphChange}
            textStyle={paragraphStyle}
            selected={paragraphSelected}
            onSelect={() => {
              setParagraphSelected(true);
              setTitleSelected(false);
            }}
            onDeselect={() => setParagraphSelected(false)}
            toolbarProps={{
              fontSize: overrides?.fontSize ?? 16,
              fontFamily: overrides?.fontFamily ?? "",
              fontWeight: overrides?.fontWeight ?? "normal",
              fontStyle: overrides?.fontStyle ?? "normal",
              color: overrides?.textColor ?? "#4a4a4a",
              textAlign: overrides?.textAlign ?? "left",
              onFontSizeChange: (v) => emitOverride({ fontSize: v }),
              onFontFamilyChange: (v) => emitOverride({ fontFamily: v }),
              onFontWeightChange: (v) => emitOverride({ fontWeight: v }),
              onFontStyleChange: (v) => emitOverride({ fontStyle: v }),
              onColorChange: (v) => emitOverride({ textColor: v }),
              onTextAlignChange: (v) => emitOverride({ textAlign: v }),
            }}
          />
        ) : (
          paragraph && <p style={paragraphStyle}>{paragraph}</p>
        )}
      </div>
    </section>
  );
}
