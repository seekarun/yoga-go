"use client";

import { useState, useCallback } from "react";
import type { SimpleLandingPageConfig } from "@/types/landing-page";
import HeroTemplateRenderer from "@/templates/hero";
import { BookingWidget } from "@/components/booking";

interface LandingPageRendererProps {
  config: SimpleLandingPageConfig;
  tenantId: string;
}

/**
 * Public landing page renderer
 * Renders the selected template without edit mode
 * Handles booking widget when button action is "booking"
 */
export default function LandingPageRenderer({
  config,
  tenantId,
}: LandingPageRendererProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleButtonClick = useCallback(() => {
    if (config.button?.action === "booking") {
      setIsBookingOpen(true);
    }
  }, [config.button?.action]);

  return (
    <>
      <HeroTemplateRenderer
        config={config}
        isEditing={false}
        onButtonClick={handleButtonClick}
      />
      <BookingWidget
        tenantId={tenantId}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />
    </>
  );
}
