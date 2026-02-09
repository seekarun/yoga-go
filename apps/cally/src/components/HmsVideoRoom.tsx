"use client";

/**
 * HmsVideoRoom Component
 *
 * Video conferencing room using 100ms SDK
 * Handles video/audio toggle, peer grid, and leave functionality
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  useHMSActions,
  useHMSStore,
  useHMSNotifications,
  useRecordingStreaming,
  selectIsConnectedToRoom,
  selectLocalPeer,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectIsLocalScreenShared,
  selectPeersScreenSharing,
  selectScreenShareByPeerID,
  selectHMSMessages,
  selectRoomState,
  HMSRoomState,
  HMSNotificationTypes,
} from "@100mslive/react-sdk";
import type { BlurBackgroundPlugin } from "@/lib/blur-background-plugin";
import { getBlurPlugin, disposeBlurPlugin } from "@/lib/blur-background-plugin";
import { useAudioCapture } from "@/hooks/useAudioCapture";

interface HmsVideoRoomProps {
  authToken: string;
  userName: string;
  onLeave?: () => void;
}

export default function HmsVideoRoom({
  authToken,
  userName,
  onLeave,
}: HmsVideoRoomProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const localPeer = useHMSStore(selectLocalPeer);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const isLocalScreenShared = useHMSStore(selectIsLocalScreenShared);
  const peersSharing = useHMSStore(selectPeersScreenSharing);
  const messages = useHMSStore(selectHMSMessages);
  const roomState = useHMSStore(selectRoomState);
  const notification = useHMSNotifications();

  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

  // Blur background state
  const [isBlurEnabled, setIsBlurEnabled] = useState(false);
  const [isBlurSupported, setIsBlurSupported] = useState<boolean | null>(null);
  const [isBlurLoading, setIsBlurLoading] = useState(false);
  const [blurAmount, setBlurAmount] = useState(20); // Default blur intensity (0-30)
  const [showBlurSlider, setShowBlurSlider] = useState(false);
  const blurPluginRef = useRef<BlurBackgroundPlugin | null>(null);

  // Recording state
  const { isRecordingOn } = useRecordingStreaming();
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null,
  );
  const [recordingDuration, setRecordingDuration] = useState("00:00");

  // Original host tracking (for recording controls)
  const [originalHostId, setOriginalHostId] = useState<string | null>(null);
  const [showParticipantsMenu, setShowParticipantsMenu] = useState(false);
  const [promotingPeerId, setPromotingPeerId] = useState<string | null>(null);

  // Audio capture for transcription (host-only)
  const {
    isCapturing,
    audioBlob,
    durationSeconds: captureDuration,
    startCapture,
    stopCapture,
    stopAndGetBlob,
  } = useAudioCapture();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  // Handle 100ms notifications (errors, etc.)
  useEffect(() => {
    if (!notification) return;

    // Clone data to avoid "object is not extensible" error with Next.js console
    const notificationData = notification.data
      ? { ...notification.data }
      : null;
    console.log(
      "[DBG][HmsVideoRoom] Notification:",
      notification.type,
      notificationData,
    );

    if (notification.type === HMSNotificationTypes.ERROR) {
      const errorData = notificationData as {
        message?: string;
        description?: string;
      } | null;
      const errorMessage =
        errorData?.message || errorData?.description || "An error occurred";
      console.error("[DBG][HmsVideoRoom] HMS Error:", errorMessage);
      setError(errorMessage);
      setIsJoining(false);
    }
  }, [notification]);

  // Track room state changes
  useEffect(() => {
    console.log(
      "[DBG][HmsVideoRoom] Room state changed:",
      roomState,
      "isConnected:",
      isConnected,
    );

    if (roomState === HMSRoomState.Connected) {
      console.log("[DBG][HmsVideoRoom] Successfully connected to room");
      setIsJoining(false);
      setError(null);
    } else if (roomState === HMSRoomState.Failed) {
      console.error("[DBG][HmsVideoRoom] Room connection failed");
      setError("Failed to connect to room");
      setIsJoining(false);
    }
  }, [roomState, isConnected]);

  // Track original host - set once when local peer joins as host
  useEffect(() => {
    if (localPeer && localPeer.roleName === "host" && !originalHostId) {
      setOriginalHostId(localPeer.id);
      console.log("[DBG][HmsVideoRoom] Original host set:", localPeer.id);
    }
  }, [localPeer, originalHostId]);

  // Join room function
  const joinRoom = useCallback(async () => {
    if (hasAttemptedJoin) return;

    console.log(
      "[DBG][HmsVideoRoom] Joining room with token...",
      authToken?.slice(0, 20) + "...",
    );
    setIsJoining(true);
    setError(null);
    setHasAttemptedJoin(true);

    try {
      await hmsActions.join({
        authToken,
        userName,
        settings: {
          isAudioMuted: false,
          isVideoMuted: false,
        },
      });
      console.log("[DBG][HmsVideoRoom] Join call completed");
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to join room:", err);
      setError(err instanceof Error ? err.message : "Failed to join room");
      setIsJoining(false);
    }
  }, [authToken, userName, hmsActions, hasAttemptedJoin]);

  // Join room on mount
  useEffect(() => {
    if (authToken && !isConnected && !hasAttemptedJoin) {
      joinRoom();
    }

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        console.log("[DBG][HmsVideoRoom] Leaving room on unmount");
        hmsActions.leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // Timeout for connection
  useEffect(() => {
    if (!isJoining || isConnected || error) return;

    const timeout = setTimeout(() => {
      if (!isConnected && isJoining) {
        console.error("[DBG][HmsVideoRoom] Connection timeout");
        setError(
          "Connection timeout. Please check your internet connection and try again.",
        );
        setIsJoining(false);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [isJoining, isConnected, error]);

  // Upload audio blob to S3 and queue for transcription
  const uploadAudio = async (blob: Blob) => {
    setIsUploading(true);
    setUploadProgress("Getting upload URL...");

    try {
      // Get the eventId from URL (format: /srv/{expertId}/live/{eventId})
      const pathParts = window.location.pathname.split("/");
      const eventId = pathParts[pathParts.length - 1];

      // Step 1: Get presigned URL
      const uploadRes = await fetch(
        `/api/data/app/calendar/events/${eventId}/transcript/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileSizeBytes: blob.size,
            fileName: "recording.webm",
          }),
        },
      );
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        console.error(
          "[DBG][HmsVideoRoom] Upload init failed:",
          uploadData.error,
        );
        setUploadProgress(`Error: ${uploadData.error}`);
        return;
      }

      // Step 2: Upload to S3
      setUploadProgress("Uploading audio...");
      const s3Res = await fetch(uploadData.data.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });

      if (!s3Res.ok) {
        console.error("[DBG][HmsVideoRoom] S3 upload failed:", s3Res.status);
        setUploadProgress("Upload failed");
        return;
      }

      // Step 3: Queue for processing
      setUploadProgress("Starting transcription...");
      const queueRes = await fetch(
        `/api/data/app/calendar/events/${eventId}/transcript`,
        { method: "POST" },
      );
      const queueData = await queueRes.json();

      if (queueData.success) {
        setUploadProgress("Transcription queued!");
        console.log("[DBG][HmsVideoRoom] Transcription queued successfully");
      } else {
        setUploadProgress(`Error: ${queueData.error}`);
      }
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Upload error:", err);
      setUploadProgress("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Upload captured audio when blob is available (for manual stop, not leave)
  useEffect(() => {
    if (!audioBlob || isUploading || isLeaving) return;
    uploadAudio(audioBlob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const handleLeave = async () => {
    console.log("[DBG][HmsVideoRoom] Leaving room");
    setIsLeaving(true);

    // If capturing, stop and wait for blob, then upload before navigating away
    if (isCapturing) {
      setUploadProgress("Saving recording...");
      const blob = await stopAndGetBlob();
      if (blob) {
        console.log(
          "[DBG][HmsVideoRoom] Got audio blob, size:",
          blob.size,
          "uploading...",
        );
        await uploadAudio(blob);
      } else {
        console.warn("[DBG][HmsVideoRoom] No audio blob returned");
      }
    }

    await hmsActions.leave();
    onLeave?.();
  };

  const toggleTranscription = () => {
    if (isCapturing) {
      console.log("[DBG][HmsVideoRoom] Stopping transcription capture");
      stopCapture();
    } else {
      console.log("[DBG][HmsVideoRoom] Starting transcription capture");
      startCapture();
    }
  };

  // Format capture duration
  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleAudio = async () => {
    console.log(
      "[DBG][HmsVideoRoom] Toggle audio, current state:",
      isLocalAudioEnabled,
    );
    try {
      await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
      console.log("[DBG][HmsVideoRoom] Audio toggled successfully");
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to toggle audio:", err);
      // Try to get device permissions if toggle fails
      if (!isLocalAudioEnabled) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          await hmsActions.setLocalAudioEnabled(true);
        } catch (permErr) {
          console.error(
            "[DBG][HmsVideoRoom] Microphone permission error:",
            permErr,
          );
        }
      }
    }
  };

  const toggleVideo = async () => {
    console.log(
      "[DBG][HmsVideoRoom] Toggle video, current state:",
      isLocalVideoEnabled,
    );
    try {
      await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
      console.log("[DBG][HmsVideoRoom] Video toggled successfully");
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to toggle video:", err);
      // Try to get device permissions if toggle fails
      if (!isLocalVideoEnabled) {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          await hmsActions.setLocalVideoEnabled(true);
        } catch (permErr) {
          console.error(
            "[DBG][HmsVideoRoom] Camera permission error:",
            permErr,
          );
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    console.log(
      "[DBG][HmsVideoRoom] Toggle screen share, current state:",
      isLocalScreenShared,
    );
    try {
      if (isLocalScreenShared) {
        await hmsActions.setScreenShareEnabled(false);
        console.log("[DBG][HmsVideoRoom] Screen share stopped");
      } else {
        await hmsActions.setScreenShareEnabled(true);
        console.log("[DBG][HmsVideoRoom] Screen share started");
      }
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to toggle screen share:", err);
    }
  };

  // Check blur support on mount
  useEffect(() => {
    const checkBlurSupport = async () => {
      try {
        const plugin = await getBlurPlugin(blurAmount);
        if (plugin) {
          const support = plugin.checkSupport();
          setIsBlurSupported(support.isSupported);
          blurPluginRef.current = plugin;
          console.log("[DBG][HmsVideoRoom] Blur support:", support.isSupported);
        } else {
          setIsBlurSupported(false);
        }
      } catch (err) {
        console.error("[DBG][HmsVideoRoom] Blur support check failed:", err);
        setIsBlurSupported(false);
      }
    };

    if (isConnected && typeof window !== "undefined") {
      checkBlurSupport();
    }

    // Cleanup on unmount
    return () => {
      if (blurPluginRef.current && isBlurEnabled) {
        try {
          hmsActions.removePluginFromVideoTrack(blurPluginRef.current);
        } catch (_e) {
          // Ignore cleanup errors
        }
      }
      disposeBlurPlugin();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Handle blur amount change
  const handleBlurAmountChange = (newAmount: number) => {
    setBlurAmount(newAmount);
    if (blurPluginRef.current) {
      blurPluginRef.current.setBlurAmount(newAmount);
      console.log("[DBG][HmsVideoRoom] Blur amount changed to:", newAmount);
    }
  };

  const toggleBlurBackground = async () => {
    if (!isBlurSupported || isBlurLoading) return;

    console.log(
      "[DBG][HmsVideoRoom] Toggle blur, current state:",
      isBlurEnabled,
    );
    setIsBlurLoading(true);

    try {
      if (isBlurEnabled) {
        // Disable blur
        if (blurPluginRef.current) {
          await hmsActions.removePluginFromVideoTrack(blurPluginRef.current);
          console.log("[DBG][HmsVideoRoom] Blur disabled");
        }
        setIsBlurEnabled(false);
        setShowBlurSlider(false);
      } else {
        // Enable blur
        const plugin =
          blurPluginRef.current || (await getBlurPlugin(blurAmount));
        if (!plugin) {
          console.error("[DBG][HmsVideoRoom] Failed to get blur plugin");
          setIsBlurSupported(false);
          return;
        }

        blurPluginRef.current = plugin;
        // Set the current blur amount
        plugin.setBlurAmount(blurAmount);

        // Validate plugin support with HMS
        const validation = hmsActions.validateVideoPluginSupport(plugin);
        if (!validation.isSupported) {
          console.error(
            "[DBG][HmsVideoRoom] HMS validation failed:",
            validation,
          );
          setIsBlurSupported(false);
          return;
        }

        await hmsActions.addPluginToVideoTrack(plugin);
        setIsBlurEnabled(true);
        console.log(
          "[DBG][HmsVideoRoom] Blur enabled with amount:",
          blurAmount,
        );
      }
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to toggle blur:", err);
    } finally {
      setIsBlurLoading(false);
    }
  };

  // Recording duration timer
  useEffect(() => {
    if (isRecordingOn && !recordingStartTime) {
      setRecordingStartTime(Date.now());
    } else if (!isRecordingOn && recordingStartTime) {
      setRecordingStartTime(null);
      setRecordingDuration("00:00");
    }
  }, [isRecordingOn, recordingStartTime]);

  useEffect(() => {
    if (!recordingStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (elapsed % 60).toString().padStart(2, "0");
      setRecordingDuration(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStartTime]);

  // Check if current user is the original host (can control recording)
  const isOriginalHost = localPeer?.id === originalHostId;

  // Promote a guest to host role
  const promoteToHost = async (peerId: string) => {
    if (!isOriginalHost) {
      console.log("[DBG][HmsVideoRoom] Only original host can promote others");
      return;
    }

    setPromotingPeerId(peerId);
    console.log("[DBG][HmsVideoRoom] Promoting peer to host:", peerId);

    try {
      await hmsActions.changeRoleOfPeer(peerId, "host", true);
      console.log("[DBG][HmsVideoRoom] Peer promoted to host:", peerId);
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to promote peer:", err);
    } finally {
      setPromotingPeerId(null);
    }
  };

  // Demote a host back to guest role
  const demoteToGuest = async (peerId: string) => {
    if (!isOriginalHost) {
      console.log("[DBG][HmsVideoRoom] Only original host can demote others");
      return;
    }

    // Cannot demote the original host
    if (peerId === originalHostId) {
      console.log("[DBG][HmsVideoRoom] Cannot demote the original host");
      return;
    }

    setPromotingPeerId(peerId);
    console.log("[DBG][HmsVideoRoom] Demoting peer to guest:", peerId);

    try {
      await hmsActions.changeRoleOfPeer(peerId, "guest", true);
      console.log("[DBG][HmsVideoRoom] Peer demoted to guest:", peerId);
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to demote peer:", err);
    } finally {
      setPromotingPeerId(null);
    }
  };

  const toggleRecording = async () => {
    // Only original host can control recording
    if (!isOriginalHost) {
      console.log(
        "[DBG][HmsVideoRoom] Only original host can control recording",
      );
      return;
    }

    if (isRecordingLoading) return;

    console.log(
      "[DBG][HmsVideoRoom] Toggle recording, current state:",
      isRecordingOn,
    );
    setIsRecordingLoading(true);

    try {
      if (isRecordingOn) {
        await hmsActions.stopRTMPAndRecording();
        console.log("[DBG][HmsVideoRoom] Recording stopped");
      } else {
        await hmsActions.startRTMPOrRecording({
          record: true,
        });
        console.log("[DBG][HmsVideoRoom] Recording started");
      }
    } catch (err) {
      console.error("[DBG][HmsVideoRoom] Failed to toggle recording:", err);
    } finally {
      setIsRecordingLoading(false);
    }
  };

  if (isJoining) {
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
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #333",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#fff", marginTop: "16px" }}>Joining session...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  if (error) {
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
          padding: "24px",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>Error</div>
        <p style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            background: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isConnected) {
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
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #333",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "#fff", marginTop: "16px" }}>
          Connecting to room...
        </p>
        <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px" }}>
          Room state: {roomState}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "500px",
        background: "#1a1a1a",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "#262626",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              background: "#22c55e",
              borderRadius: "50%",
            }}
          />
          <span style={{ color: "#fff", fontSize: "14px" }}>
            {peers.length} participant{peers.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ color: "#9ca3af", fontSize: "13px" }}>
          {localPeer?.roleName === "host" ? "Host" : "Participant"}
        </span>
      </div>

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "8px",
          overflow: "auto",
        }}
      >
        {/* Screen Share Section - shown prominently at top when someone is sharing */}
        {peersSharing.length > 0 && (
          <div style={{ width: "100%" }}>
            {peersSharing.map((peer) => (
              <ScreenShareTile
                key={`screen-${peer.id}`}
                peerId={peer.id}
                peerName={peer.name || "Unknown"}
                hmsActions={hmsActions}
              />
            ))}
          </div>
        )}

        {/* Participant Videos */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              peersSharing.length > 0
                ? "repeat(auto-fill, minmax(150px, 1fr))"
                : peers.length === 1
                  ? "1fr"
                  : peers.length <= 4
                    ? "repeat(2, 1fr)"
                    : "repeat(3, 1fr)",
            gap: "8px",
            flex: peersSharing.length > 0 ? "0 0 auto" : 1,
          }}
        >
          {peers.map((peer) => (
            <div
              key={peer.id}
              style={{
                position: "relative",
                background: "#262626",
                borderRadius: "8px",
                overflow: "hidden",
                aspectRatio: "16/9",
                minHeight: "120px",
              }}
            >
              {peer.videoTrack ? (
                <video
                  autoPlay
                  playsInline
                  muted={peer.isLocal}
                  ref={(el) => {
                    if (el && peer.videoTrack) {
                      hmsActions.attachVideo(peer.videoTrack, el);
                    }
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: peer.isLocal ? "scaleX(-1)" : "none",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      color: "#fff",
                      fontWeight: "600",
                    }}
                  >
                    {(peer.name || "U").charAt(0).toUpperCase()}
                  </div>
                </div>
              )}

              {/* Name badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  left: "8px",
                  padding: "4px 8px",
                  background: "rgba(0,0,0,0.6)",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              >
                {peer.name || "Unknown"} {peer.isLocal && "(You)"}
                {!peer.audioTrack && " (muted)"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          padding: "16px",
          background: "#262626",
          borderTop: "1px solid #333",
        }}
      >
        <button
          onClick={toggleAudio}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "none",
            background: isLocalAudioEnabled ? "#374151" : "#ef4444",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isLocalAudioEnabled ? "Mute" : "Unmute"}
        >
          {isLocalAudioEnabled ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleVideo}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "none",
            background: isLocalVideoEnabled ? "#374151" : "#ef4444",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isLocalVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isLocalVideoEnabled ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleScreenShare}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "none",
            background: isLocalScreenShared ? "#16a34a" : "#374151",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isLocalScreenShared ? "Stop sharing" : "Share screen"}
        >
          {isLocalScreenShared ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9.41 15.95L12 13.36l2.59 2.59L16 14.54l-2.59-2.59L16 9.36l-1.41-1.41L12 10.54 9.41 7.95 8 9.36l2.59 2.59L8 14.54z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
            </svg>
          )}
        </button>

        {/* Recording Button - only show for original host */}
        {isOriginalHost && (
          <button
            onClick={toggleRecording}
            disabled={isRecordingLoading}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "none",
              background: isRecordingOn ? "#ef4444" : "#374151",
              color: "#fff",
              cursor: isRecordingLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isRecordingLoading ? 0.6 : 1,
              position: "relative",
            }}
            title={
              isRecordingOn
                ? `Recording ${recordingDuration}`
                : "Start recording"
            }
          >
            {isRecordingLoading ? (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #666",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : isRecordingOn ? (
              <>
                {/* Stop recording icon (square) */}
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                {/* Pulsing red dot indicator */}
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#fff",
                    border: "2px solid #ef4444",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              </>
            ) : (
              /* Record icon (circle) */
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>
        )}

        {/* Recording indicator for non-original hosts */}
        {!isOriginalHost && isRecordingOn && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              background: "#ef4444",
              borderRadius: "20px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#fff",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            REC {recordingDuration}
          </div>
        )}

        {/* Blur Background Button with Slider - only show if potentially supported */}
        {isBlurSupported !== false && (
          <div style={{ position: "relative" }}>
            {/* Blur intensity slider - shows when blur is enabled and slider is toggled */}
            {isBlurEnabled && showBlurSlider && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  onClick={() => setShowBlurSlider(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 10,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "60px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#1f1f1f",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: "140px",
                    zIndex: 11,
                  }}
                >
                  {/* Close button */}
                  <button
                    onClick={() => setShowBlurSlider(false)}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: "none",
                      background: "transparent",
                      color: "#6b7280",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                    title="Close"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="currentColor"
                    >
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                  <span
                    style={{
                      color: "#9ca3af",
                      fontSize: "11px",
                      textTransform: "uppercase",
                    }}
                  >
                    Blur Intensity
                  </span>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={blurAmount}
                    onChange={(e) =>
                      handleBlurAmountChange(Number(e.target.value))
                    }
                    style={{
                      width: "100px",
                      height: "6px",
                      appearance: "none",
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((blurAmount - 5) / 25) * 100}%, #374151 ${((blurAmount - 5) / 25) * 100}%, #374151 100%)`,
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    {blurAmount}
                  </span>
                </div>
              </>
            )}
            <button
              onClick={toggleBlurBackground}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isBlurEnabled) setShowBlurSlider(!showBlurSlider);
              }}
              disabled={isBlurLoading || isBlurSupported === null}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                background: isBlurEnabled ? "#8b5cf6" : "#374151",
                color: "#fff",
                cursor:
                  isBlurLoading || isBlurSupported === null
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isBlurLoading || isBlurSupported === null ? 0.6 : 1,
                position: "relative",
              }}
              title={
                isBlurEnabled
                  ? "Click to disable, right-click for intensity"
                  : "Blur background"
              }
            >
              {isBlurLoading ? (
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid #666",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="currentColor"
                >
                  {/* Frame/border */}
                  <path d="M3 3h4v2H5v2H3V3zm14 0h4v4h-2V5h-2V3zM3 17v4h4v-2H5v-2H3zm18 0v4h-4v-2h2v-2h2z" />
                  {/* Person silhouette */}
                  <circle cx="12" cy="8" r="2.5" />
                  <path d="M12 12c-2.5 0-4.5 1.5-4.5 3.5V17h9v-1.5c0-2-2-3.5-4.5-3.5z" />
                  {/* Blur effect dots */}
                  <circle cx="6" cy="10" r="1" opacity="0.5" />
                  <circle cx="18" cy="10" r="1" opacity="0.5" />
                  <circle cx="7" cy="14" r="0.8" opacity="0.4" />
                  <circle cx="17" cy="14" r="0.8" opacity="0.4" />
                </svg>
              )}
              {/* Small indicator dot when blur is active */}
              {isBlurEnabled && (
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    border: "2px solid #262626",
                  }}
                />
              )}
            </button>
            {/* Settings button to toggle slider when blur is enabled */}
            {isBlurEnabled && (
              <button
                onClick={() => setShowBlurSlider(!showBlurSlider)}
                style={{
                  position: "absolute",
                  bottom: "-8px",
                  right: "-8px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "2px solid #262626",
                  background: showBlurSlider ? "#8b5cf6" : "#374151",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
                title="Adjust blur intensity"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="currentColor"
                >
                  <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Transcribe Button - host only */}
        {isOriginalHost && (
          <div style={{ position: "relative" }}>
            <button
              onClick={toggleTranscription}
              disabled={isUploading}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                background: isCapturing ? "#f59e0b" : "#374151",
                color: "#fff",
                cursor: isUploading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isUploading ? 0.6 : 1,
                position: "relative",
              }}
              title={
                isCapturing
                  ? `Transcribing ${formatDuration(captureDuration)} — click to stop`
                  : "Start transcription capture"
              }
            >
              {isUploading ? (
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid #666",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="currentColor"
                >
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
              )}
              {/* Pulsing indicator when capturing */}
              {isCapturing && (
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid #f59e0b",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </button>
            {/* Upload progress indicator */}
            {uploadProgress && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-24px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontSize: "10px",
                  color: "#9ca3af",
                  background: "#1f1f1f",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                {uploadProgress}
              </div>
            )}
          </div>
        )}

        {/* Participants Button - only show for original host */}
        {isOriginalHost && (
          <div style={{ position: "relative" }}>
            {/* Participants menu */}
            {showParticipantsMenu && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  onClick={() => setShowParticipantsMenu(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 10,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "60px",
                    right: 0,
                    background: "#1f1f1f",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    minWidth: "220px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 11,
                  }}
                >
                  {/* Close button */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                      paddingBottom: "8px",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      Participants ({peers.length})
                    </span>
                    <button
                      onClick={() => setShowParticipantsMenu(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#6b7280",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="currentColor"
                      >
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </div>

                  {/* Participants list */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {peers.map((peer) => (
                      <div
                        key={peer.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px",
                          background: "#262626",
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background:
                                peer.id === originalHostId
                                  ? "var(--color-primary)"
                                  : "#374151",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            {(peer.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                color: "#fff",
                                fontSize: "13px",
                                fontWeight: "500",
                              }}
                            >
                              {peer.name || "Unknown"}
                              {peer.isLocal && " (You)"}
                            </div>
                            <div style={{ color: "#9ca3af", fontSize: "11px" }}>
                              {peer.id === originalHostId
                                ? "Host (owner)"
                                : peer.roleName === "host"
                                  ? "Co-host"
                                  : "Guest"}
                            </div>
                          </div>
                        </div>

                        {/* Promote/Demote button - don't show for original host or self */}
                        {peer.id !== originalHostId && !peer.isLocal && (
                          <button
                            onClick={() =>
                              peer.roleName === "host"
                                ? demoteToGuest(peer.id)
                                : promoteToHost(peer.id)
                            }
                            disabled={promotingPeerId === peer.id}
                            style={{
                              padding: "4px 8px",
                              background:
                                peer.roleName === "host"
                                  ? "#374151"
                                  : "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "500",
                              cursor:
                                promotingPeerId === peer.id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: promotingPeerId === peer.id ? 0.6 : 1,
                            }}
                          >
                            {promotingPeerId === peer.id
                              ? "..."
                              : peer.roleName === "host"
                                ? "Demote"
                                : "Make Co-host"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "8px",
                      borderTop: "1px solid #333",
                      color: "#6b7280",
                      fontSize: "11px",
                    }}
                  >
                    Co-hosts can share their screen
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setShowParticipantsMenu(!showParticipantsMenu)}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "none",
                background: showParticipantsMenu ? "#8b5cf6" : "#374151",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
              title="Manage participants"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              {/* Badge showing number of guests that can be promoted */}
              {peers.filter((p) => p.roleName === "guest" && !p.isLocal)
                .length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    right: "0",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#16a34a",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #262626",
                  }}
                >
                  {
                    peers.filter((p) => p.roleName === "guest" && !p.isLocal)
                      .length
                  }
                </div>
              )}
            </button>
          </div>
        )}

        <button
          onClick={handleLeave}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "none",
            background: "#ef4444",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Leave"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>

      {/* Chat messages (simplified) */}
      {messages.length > 0 && (
        <div
          style={{
            padding: "8px 16px",
            background: "#1f1f1f",
            borderTop: "1px solid #333",
            maxHeight: "100px",
            overflow: "auto",
          }}
        >
          {messages.slice(-3).map((msg) => (
            <div
              key={msg.id}
              style={{
                color: "#9ca3af",
                fontSize: "12px",
                marginBottom: "4px",
              }}
            >
              <span style={{ color: "#fff", fontWeight: "500" }}>
                {msg.senderName}:{" "}
              </span>
              {msg.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Screen Share Tile Component
interface ScreenShareTileProps {
  peerId: string;
  peerName: string;
  hmsActions: ReturnType<typeof useHMSActions>;
}

function ScreenShareTile({
  peerId,
  peerName,
  hmsActions,
}: ScreenShareTileProps) {
  const screenShareTrack = useHMSStore(selectScreenShareByPeerID(peerId));

  if (!screenShareTrack) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
        background: "#000",
        borderRadius: "8px",
        overflow: "hidden",
        width: "100%",
        aspectRatio: "16/9",
        minHeight: "300px",
      }}
    >
      <video
        autoPlay
        playsInline
        ref={(el) => {
          if (el && screenShareTrack) {
            hmsActions.attachVideo(screenShareTrack.id, el);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
      {/* Screen share badge */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          padding: "4px 12px",
          background: "#16a34a",
          borderRadius: "4px",
          color: "#fff",
          fontSize: "12px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
        </svg>
        {peerName}&apos;s screen
      </div>
    </div>
  );
}
