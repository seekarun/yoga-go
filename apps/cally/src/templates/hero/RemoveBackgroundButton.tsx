"use client";

import { useState, useCallback } from "react";

interface RemoveBackgroundButtonProps {
  imageUrl: string;
  onComplete: (newUrl: string) => void;
  size?: number;
  style?: React.CSSProperties;
}

export default function RemoveBackgroundButton({
  imageUrl,
  onComplete,
  size = 36,
  style,
}: RemoveBackgroundButtonProps) {
  const [processing, setProcessing] = useState(false);

  const handleRemoveBackground = useCallback(async () => {
    if (processing || !imageUrl) return;
    setProcessing(true);

    try {
      // Dynamic import to avoid loading the large WASM module until needed
      const { removeBackground } = await import("@imgly/background-removal");

      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }
      const imageBlob = await response.blob();

      // Process background removal
      const resultBlob = await removeBackground(imageBlob, {
        progress: (key: string, current: number, total: number) => {
          console.log(
            `[DBG][RemoveBackgroundButton] ${key}: ${current}/${total}`,
          );
        },
      });

      // Upload the result to S3 via the existing upload endpoint
      const formData = new FormData();
      formData.append(
        "file",
        new File([resultBlob], "bg-removed.png", { type: "image/png" }),
      );

      const uploadResponse = await fetch(
        "/api/data/app/tenant/landing-page/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload processed image");
      }

      const uploadData = await uploadResponse.json();
      onComplete(uploadData.data.url);
    } catch (err) {
      console.error("[DBG][RemoveBackgroundButton] Error:", err);
    } finally {
      setProcessing(false);
    }
  }, [processing, imageUrl, onComplete]);

  return (
    <button
      type="button"
      onClick={handleRemoveBackground}
      disabled={processing || !imageUrl}
      title={processing ? "Removing background..." : "Remove background"}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: "white",
        borderRadius: "50%",
        border: "none",
        cursor: processing ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 5,
        opacity: processing ? 0.8 : 1,
        ...style,
      }}
    >
      {processing ? (
        <span
          style={{
            width: `${size * 0.5}px`,
            height: `${size * 0.5}px`,
            border: "2px solid #e5e7eb",
            borderTopColor: "#374151",
            borderRadius: "50%",
            display: "inline-block",
            animation: "removebg-spin 0.8s linear infinite",
          }}
        />
      ) : (
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Person silhouette with cut line */}
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <line x1="2" y1="2" x2="22" y2="22" strokeDasharray="3 3" />
        </svg>
      )}
      <style>{`
        @keyframes removebg-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
