"use client";

/**
 * HmsVideoRoomWrapper Component
 *
 * Wraps the HmsVideoRoom component with HMSRoomProvider
 * from @100mslive/react-sdk. Must be loaded client-side only (no SSR).
 */

import { HMSRoomProvider } from "@100mslive/react-sdk";
import HmsVideoRoom from "@/components/HmsVideoRoom";

interface HmsVideoRoomWrapperProps {
  authToken: string;
  userName: string;
  onLeave?: () => void;
}

export default function HmsVideoRoomWrapper({
  authToken,
  userName,
  onLeave,
}: HmsVideoRoomWrapperProps) {
  return (
    <HMSRoomProvider>
      <HmsVideoRoom
        authToken={authToken}
        userName={userName}
        onLeave={onLeave}
      />
    </HMSRoomProvider>
  );
}
