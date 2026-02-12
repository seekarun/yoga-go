"use client";

/**
 * Public Live Meeting Page for CallyGo
 * Route: /{tenantId}/live/{eventId}
 *
 * Public page accessible without authentication.
 * - Guests see a "Enter your name" prompt, then join the video room.
 * - Authenticated tenant owners skip the name prompt and auto-join as host.
 */

import { useEffect, useState, useCallback, use } from "react";
import dynamic from "next/dynamic";

const HmsVideoRoomWithProvider = dynamic(
  () => import("@/components/HmsVideoRoomWrapper"),
  {
    ssr: false,
    loading: () => (
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
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #333",
            borderTop: "3px solid var(--color-primary, #6366f1)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#fff", marginTop: "16px" }}>
          Loading video room...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  },
);

interface JoinResponse {
  authToken: string;
  roomId: string;
  role: "host" | "guest";
  userName: string;
  event: {
    title: string;
    description?: string;
  };
}

interface PageProps {
  params: Promise<{
    tenantId: string;
    eventId: string;
  }>;
}

export default function PublicLiveMeetingPage({ params }: PageProps) {
  const { tenantId, eventId } = use(params);

  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [autoJoinChecked, setAutoJoinChecked] = useState(false);

  // Try auto-join for authenticated tenant owner on mount
  useEffect(() => {
    const tryAutoJoin = async () => {
      try {
        console.log("[DBG][public-live] Checking if authenticated host...");
        const res = await fetch(
          `/api/data/tenants/${tenantId}/calendar/events/${eventId}/join`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          },
        );
        const data = await res.json();

        if (data.success && data.data.role === "host") {
          console.log("[DBG][public-live] Auto-joining as host");
          setJoinData(data.data);
          return;
        }
      } catch (err) {
        console.log("[DBG][public-live] Auto-join check failed:", err);
      }
      setAutoJoinChecked(true);
    };

    tryAutoJoin();
  }, [tenantId, eventId]);

  const handleJoin = useCallback(async () => {
    if (!name.trim()) return;

    setJoining(true);
    setError(null);

    try {
      console.log("[DBG][public-live] Joining as guest:", name.trim());
      const res = await fetch(
        `/api/data/tenants/${tenantId}/calendar/events/${eventId}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        },
      );
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to join meeting");
        setJoining(false);
        return;
      }

      setJoinData(data.data);
    } catch (err) {
      console.error("[DBG][public-live] Join error:", err);
      setError("Failed to join meeting. Please try again.");
      setJoining(false);
    }
  }, [name, tenantId, eventId]);

  const handleLeave = () => {
    window.close();
    // If window.close() doesn't work (not opened via script), reload to reset
    window.location.reload();
  };

  // Loading: checking auto-join
  if (!autoJoinChecked && !joinData) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#1a1a1a",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #333",
            borderTop: "3px solid var(--color-primary, #6366f1)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#fff", marginTop: "16px" }}>Preparing meeting...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Name prompt for guests
  if (!joinData) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f8f8f8",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            textAlign: "center",
            background: "#fff",
            padding: "40px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "8px",
              color: "#111",
            }}
          >
            Join Meeting
          </h1>
          <p
            style={{
              color: "#666",
              marginBottom: "24px",
              fontSize: "14px",
            }}
          >
            Enter your name to join the video call
          </p>

          {error && (
            <p
              style={{
                color: "#dc2626",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "16px",
                marginBottom: "16px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="submit"
              disabled={!name.trim() || joining}
              style={{
                width: "100%",
                padding: "12px 24px",
                background:
                  !name.trim() || joining
                    ? "#9ca3af"
                    : "var(--color-primary, #6366f1)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: !name.trim() || joining ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {joining ? "Joining..." : "Join Meeting"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Video room
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "12px 20px",
          background: "#262626",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333",
        }}
      >
        <div>
          <h1
            style={{
              color: "#fff",
              fontSize: "16px",
              fontWeight: "600",
              margin: 0,
            }}
          >
            {joinData.event.title || "Meeting"}
          </h1>
          {joinData.event.description && (
            <p
              style={{
                color: "#9ca3af",
                fontSize: "13px",
                margin: "4px 0 0 0",
              }}
            >
              {joinData.event.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {joinData.role === "host" && (
            <span
              style={{
                padding: "4px 10px",
                background: "var(--color-primary, #6366f1)",
                color: "#fff",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              Host
            </span>
          )}
          <button
            onClick={handleLeave}
            style={{
              padding: "8px 16px",
              background: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* Video Room */}
      <main
        style={{
          flex: 1,
          padding: "16px",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        <HmsVideoRoomWithProvider
          authToken={joinData.authToken}
          userName={joinData.userName}
          onLeave={handleLeave}
        />
      </main>
    </div>
  );
}
