"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { SimpleLandingPageConfig } from "@/types/landing-page";
import type { Product } from "@/types";
import HeroTemplateRenderer from "@/templates/hero";
import { LandingPageThemeProvider } from "@/templates/hero/ThemeProvider";
import LandingPageHeader, {
  SECTION_NAV_LABELS,
} from "@/components/landing-page/LandingPageHeader";
import BookingWidget from "@/components/booking/BookingWidget";
import WebinarSignup from "@/components/webinar/WebinarSignup";
import SurveyOverlay from "@/components/landing-page/SurveyOverlay";

interface LandingPageRendererProps {
  config: SimpleLandingPageConfig;
  tenantId: string;
  products?: Product[];
  currency?: string;
  address?: string;
  logo?: string;
  tenantName: string;
}

declare const CallyEmbed:
  | { open: (widget: string) => void; close: () => void; isOpen: () => boolean }
  | undefined;

/**
 * Public landing page renderer
 * Renders the selected template without edit mode
 * Uses embed.js popup mode for booking/contact actions
 */
export default function LandingPageRenderer({
  config,
  tenantId,
  products,
  currency,
  address,
  logo,
  tenantName,
}: LandingPageRendererProps) {
  const searchParams = useSearchParams();
  const hasWaitlistParam = !!searchParams.get("waitlist");

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingProductId, setBookingProductId] = useState<
    string | undefined
  >();
  const [bookingProductName, setBookingProductName] = useState<
    string | undefined
  >();
  const [webinarOpen, setWebinarOpen] = useState(false);
  const [webinarProductId, setWebinarProductId] = useState<
    string | undefined
  >();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  // Auto-open booking widget when returning from waitlist email
  useEffect(() => {
    if (hasWaitlistParam) {
      setBookingOpen(true);
    }
  }, [hasWaitlistParam]);

  // Load embed.js in popup mode
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- embed config is a plain object on window
    (window as any).CallyEmbedConfig = {
      tenantId,
      widget: "booking",
      mode: "popup",
    };
    const script = document.createElement("script");
    script.src = "/embed.js";
    document.body.appendChild(script);
    return () => {
      script.remove();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanup global
      delete (window as any).CallyEmbed;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanup global
      delete (window as any).CallyEmbedConfig;
      document.getElementById("cally-embed-overlay")?.remove();
      document.getElementById("cally-embed-styles")?.remove();
    };
  }, [tenantId]);

  const handleButtonClick = useCallback(() => {
    const action = config.button?.action || "booking";

    // If the action is a survey, open the survey overlay
    if (action.startsWith("survey:")) {
      const surveyId = action.replace("survey:", "");
      setSelectedSurveyId(surveyId);
      return;
    }

    // Otherwise open CallyEmbed for booking/contact/chat
    if (typeof CallyEmbed !== "undefined") {
      CallyEmbed.open(action);
    } else {
      console.error("[DBG][LandingPageRenderer] CallyEmbed not loaded yet");
    }
  }, [config.button?.action]);

  const handleBookProduct = useCallback(
    (productId: string) => {
      const product = products?.find((p) => p.id === productId);
      // If it's a webinar, open the webinar signup instead
      if (product?.productType === "webinar") {
        setWebinarProductId(productId);
        setWebinarOpen(true);
        return;
      }
      setBookingProductId(productId);
      setBookingProductName(product?.name);
      setBookingOpen(true);
    },
    [products],
  );

  const handleSignupWebinar = useCallback((productId: string) => {
    setWebinarProductId(productId);
    setWebinarOpen(true);
  }, []);

  return (
    <LandingPageThemeProvider
      palette={config.theme?.palette}
      headerFont={config.theme?.headerFont}
      bodyFont={config.theme?.bodyFont}
    >
      <LandingPageHeader
        logo={logo}
        tenantName={tenantName}
        sections={(config.sections || [])
          .filter((s) => s.enabled)
          .map((s) => ({
            id: s.id,
            label: SECTION_NAV_LABELS[s.id] || s.id,
          }))}
        tenantId={tenantId}
      />
      <div id="section-hero">
        <HeroTemplateRenderer
          config={config}
          isEditing={false}
          onButtonClick={handleButtonClick}
          products={products}
          currency={currency}
          onBookProduct={handleBookProduct}
          onSignupWebinar={handleSignupWebinar}
          address={address}
        />
      </div>
      <BookingWidget
        tenantId={tenantId}
        isOpen={bookingOpen}
        onClose={() => {
          setBookingOpen(false);
          setBookingProductId(undefined);
          setBookingProductName(undefined);
        }}
        productId={bookingProductId}
        productName={bookingProductName}
      />
      <WebinarSignup
        tenantId={tenantId}
        productId={webinarProductId}
        isOpen={webinarOpen}
        onClose={() => {
          setWebinarOpen(false);
          setWebinarProductId(undefined);
        }}
      />

      {/* Survey overlay */}
      {selectedSurveyId && (
        <SurveyOverlay
          tenantId={tenantId}
          surveyId={selectedSurveyId}
          onClose={() => setSelectedSurveyId(null)}
        />
      )}
    </LandingPageThemeProvider>
  );
}
