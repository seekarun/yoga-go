"use client";

/**
 * HmsVideoRoomWrapper Component (Placeholder)
 *
 * Video conferencing feature is temporarily disabled due to
 * @100mslive/react-sdk incompatibility with React 19.
 *
 * TODO: Re-enable when 100ms SDK supports React 19 or switch to alternative.
 */

interface HmsVideoRoomWrapperProps {
  authToken: string;
  userName: string;
  onLeave?: () => void;
}

export default function HmsVideoRoomWrapper({
  onLeave,
}: HmsVideoRoomWrapperProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "400px",
        background: "#1a1a1a",
        borderRadius: "12px",
        padding: "40px",
      }}
    >
      <div
        style={{
          fontSize: "48px",
          marginBottom: "16px",
        }}
      >
        Video Coming Soon
      </div>
      <h2
        style={{
          color: "#fff",
          fontSize: "24px",
          fontWeight: "600",
          marginBottom: "12px",
        }}
      >
        Video Conferencing Coming Soon
      </h2>
      <p
        style={{
          color: "#9ca3af",
          fontSize: "16px",
          textAlign: "center",
          maxWidth: "400px",
          marginBottom: "24px",
        }}
      >
        We&apos;re updating our video platform for better performance. This
        feature will be available shortly.
      </p>
      {onLeave && (
        <button
          onClick={onLeave}
          style={{
            padding: "12px 24px",
            background: "var(--color-primary, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Return to Calendar
        </button>
      )}
    </div>
  );
}
