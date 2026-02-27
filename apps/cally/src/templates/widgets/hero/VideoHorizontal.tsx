"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface VideoHorizontalProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
}

const SCOPE = "w-hr-vh";

/**
 * Default Pexels videos — free to use (Pexels license).
 * Landscape HD, played one at a time in sequence.
 */
const DEFAULT_VIDEOS = [
  "https://videos.pexels.com/video-files/3982856/3982856-uhd_2560_1440_30fps.mp4",
  "https://videos.pexels.com/video-files/8760113/8760113-hd_1920_1080_30fps.mp4",
  "https://videos.pexels.com/video-files/8524222/8524222-hd_1920_1080_25fps.mp4",
  "https://videos.pexels.com/video-files/4769802/4769802-hd_1920_1080_25fps.mp4",
];

/**
 * Hero: Video Horizontal
 *
 * Full-width hero background that plays videos one at a time, full landscape.
 * When one video ends it crossfades to the next, looping back to the first
 * after the last. Dark overlay for text contrast.
 * Title, subtitle, and CTA button are centered over the video.
 */
export default function VideoHorizontal({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
}: VideoHorizontalProps) {
  const primary = brand.primaryColor || "#6366f1";
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  /** When the active video ends, advance to the next. */
  const handleEnded = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % DEFAULT_VIDEOS.length);
  }, []);

  /** Play the newly active video, pause the rest. */
  useEffect(() => {
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === activeIndex) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [activeIndex]);

  /** Kick-start the first video on mount. */
  useEffect(() => {
    const first = videoRefs.current[0];
    if (first) first.play().catch(() => {});
  }, []);

  const setRef = useCallback(
    (index: number) => (el: HTMLVideoElement | null) => {
      videoRefs.current[index] = el;
    },
    [],
  );

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          position: relative;
          width: 100%;
          min-height: 520px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        /* ---- stacked full-size videos ---- */
        .${SCOPE}-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 1.2s ease;
        }
        .${SCOPE}-video--active {
          opacity: 1;
        }

        /* ---- overlay ---- */
        .${SCOPE}-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1;
        }

        /* ---- content ---- */
        .${SCOPE}-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 60px 24px;
          max-width: 800px;
        }
        .${SCOPE}-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 700;
          color: #fff;
          margin: 0 0 16px;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.15;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }
        .${SCOPE}-subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: rgba(255, 255, 255, 0.85);
          max-width: 600px;
          margin: 0 auto 36px;
          font-family: ${brand.bodyFont || "inherit"};
          line-height: 1.6;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
        }
        .${SCOPE}-btn {
          display: inline-block;
          padding: 14px 40px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)};
          background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        .${SCOPE}-btn:hover {
          opacity: 0.9;
          transform: scale(1.03);
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            min-height: 420px;
          }
          .${SCOPE}-content {
            padding: 40px 16px;
          }
        }
      `}</style>

      {/* Stacked videos — only the active one is visible */}
      {DEFAULT_VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={setRef(i)}
          className={`${SCOPE}-video${i === activeIndex ? ` ${SCOPE}-video--active` : ""}`}
          src={src}
          muted
          playsInline
          preload={i === 0 ? "auto" : "metadata"}
          onEnded={i === activeIndex ? handleEnded : undefined}
        />
      ))}

      {/* Dark overlay */}
      <div className={`${SCOPE}-overlay`} />

      {/* Text content */}
      <div className={`${SCOPE}-content`}>
        {title && <h1 className={`${SCOPE}-title`}>{title}</h1>}
        {subtitle && <p className={`${SCOPE}-subtitle`}>{subtitle}</p>}
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
