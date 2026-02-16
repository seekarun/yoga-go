"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface MobilePreviewFrameProps {
  children: ReactNode;
}

/**
 * Renders children into an iframe via React portal.
 * Creates a real 374px viewport so CSS media queries and vw units
 * resolve correctly for mobile responsive layouts.
 */
export default function MobilePreviewFrame({
  children,
}: MobilePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const style = doc.createElement("style");
      style.textContent = `
        *, *::before, *::after { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          scrollbar-width: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
        img { max-width: 100%; }
      `;
      doc.head.appendChild(style);

      setMountNode(doc.body);
    };

    iframe.addEventListener("load", handleLoad);

    return () => iframe.removeEventListener("load", handleLoad);
  }, []);

  return (
    <>
      <iframe
        ref={iframeRef}
        srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
        style={{
          width: "374px",
          height: "100%",
          border: "none",
          display: "block",
        }}
        title="Mobile preview"
      />
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}
