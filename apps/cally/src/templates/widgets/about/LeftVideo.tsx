"use client";

import { useRef, useState, useCallback } from "react";
import type { WidgetBrandConfig } from "../types";

interface LeftVideoProps {
  title?: string;
  paragraph?: string;
  videoUrl?: string;
  brand: WidgetBrandConfig;
}

const SCOPE = "w-ab-lv";

const PLACEHOLDER_VIDEO =
  "https://videos.pexels.com/video-files/3982856/3982856-uhd_2560_1440_30fps.mp4";

/**
 * About: Left Video
 *
 * Two-column layout with a user-controlled video on the left (play/pause,
 * volume, progress bar) and the about title + paragraph on the right.
 * Designed for intro/about-me videos uploaded by the tenant.
 */
export default function LeftVideo({
  title,
  paragraph,
  videoUrl,
  brand,
}: LeftVideoProps) {
  const primary = brand.primaryColor || "#1a1a1a";
  const src = videoUrl || PLACEHOLDER_VIDEO;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

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

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 480px;
          background: #faf6f1;
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

        .${SCOPE}-title {
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 700;
          color: ${primary};
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.15;
        }

        .${SCOPE}-dot {
          color: ${primary};
        }

        .${SCOPE}-paragraph {
          font-size: 1rem;
          color: #4a4a4a;
          line-height: 1.8;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
          white-space: pre-line;
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
        {title && (
          <h2 className={`${SCOPE}-title`}>
            {title}
            <span className={`${SCOPE}-dot`}>.</span>
          </h2>
        )}
        {paragraph && <p className={`${SCOPE}-paragraph`}>{paragraph}</p>}
      </div>
    </section>
  );
}
