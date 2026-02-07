"use client";

import { useState, useCallback } from "react";
import type { SimpleLandingPageConfig } from "@/types/landing-page";
import HeroTemplateRenderer from "@/templates/hero";
import { BookingWidget } from "@/components/booking";
import { ContactWidget } from "@/components/contact";

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
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleButtonClick = useCallback(() => {
    if (config.button?.action === "booking") {
      setIsBookingOpen(true);
    } else if (config.button?.action === "contact") {
      setIsContactOpen(true);
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
      <ContactWidget
        tenantId={tenantId}
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </>
  );
}
