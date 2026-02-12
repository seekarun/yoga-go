"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Integrations page
 */
export default function IntegrationsPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    email: string | null;
  }>({ connected: false, email: null });

  const [zoomStatus, setZoomStatus] = useState<{
    connected: boolean;
    email: string | null;
  }>({ connected: false, email: null });

  const [outlookStatus, setOutlookStatus] = useState<{
    connected: boolean;
    email: string | null;
  }>({ connected: false, email: null });

  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    chargesEnabled: boolean;
    email: string | null;
  }>({ connected: false, chargesEnabled: false, email: null });

  useEffect(() => {
    fetch("/api/data/app/google-calendar/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGoogleStatus({
            connected: data.data.connected,
            email: data.data.email,
          });
        }
      })
      .catch((err) =>
        console.error("[DBG][settings] Failed to fetch Google status:", err),
      );

    fetch("/api/data/app/zoom/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setZoomStatus({
            connected: data.data.connected,
            email: data.data.email,
          });
        }
      })
      .catch((err) =>
        console.error("[DBG][settings] Failed to fetch Zoom status:", err),
      );

    fetch("/api/data/app/outlook-calendar/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOutlookStatus({
            connected: data.data.connected,
            email: data.data.email,
          });
        }
      })
      .catch((err) =>
        console.error("[DBG][settings] Failed to fetch Outlook status:", err),
      );

    fetch("/api/data/app/stripe/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStripeStatus({
            connected: data.data.connected,
            chargesEnabled: data.data.chargesEnabled,
            email: data.data.email,
          });
        }
      })
      .catch((err) =>
        console.error("[DBG][settings] Failed to fetch Stripe status:", err),
      );
  }, []);

  const integrations = [
    {
      name: "Stripe",
      description: stripeStatus.connected
        ? stripeStatus.chargesEnabled
          ? `Connected to ${stripeStatus.email}`
          : "Setup incomplete — complete Stripe onboarding"
        : "Accept payments from your customers",
      connected: stripeStatus.connected && stripeStatus.chargesEnabled,
      statusText: stripeStatus.connected
        ? stripeStatus.chargesEnabled
          ? "Connected"
          : "Setup incomplete"
        : "Not connected",
      href: `/srv/${expertId}/settings/stripe`,
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
        </svg>
      ),
    },
    {
      name: "Google Calendar",
      description: googleStatus.connected
        ? `Connected to ${googleStatus.email}`
        : "Sync events with Google Calendar",
      connected: googleStatus.connected,
      statusText: googleStatus.connected ? "Connected" : "Not connected",
      href: `/srv/${expertId}/settings/google`,
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V7.5h15v12z" />
          <path d="M7.5 10.5h3v3h-3zM12 10.5h3v3h-3zM16.5 10.5h-1.5v3h3v-1.5h-1.5z" />
        </svg>
      ),
    },
    {
      name: "Outlook Calendar",
      description: outlookStatus.connected
        ? `Connected to ${outlookStatus.email}`
        : "Sync events with Outlook Calendar",
      connected: outlookStatus.connected,
      statusText: outlookStatus.connected ? "Connected" : "Not connected",
      href: `/srv/${expertId}/settings/outlook`,
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V7.5h15v12z" />
          <path d="M7.5 10.5h3v3h-3zM12 10.5h3v3h-3zM16.5 10.5h-1.5v3h3v-1.5h-1.5z" />
        </svg>
      ),
    },
    {
      name: "Zoom",
      description: zoomStatus.connected
        ? `Connected to ${zoomStatus.email}`
        : "Create Zoom meetings automatically",
      connected: zoomStatus.connected,
      statusText: zoomStatus.connected ? "Connected" : "Not connected",
      href: `/srv/${expertId}/settings/zoom`,
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.585 4.585C2.264 4.585.38 6.468.38 8.79v6.42c0 2.322 1.884 4.205 4.205 4.205h10.05c.348 0 .63-.282.63-.63v-6.42c0-.348-.282-.63-.63-.63H8.79a.63.63 0 0 1-.63-.63V8.79c0-.348.282-.63.63-.63h6.42c.348 0 .63-.282.63-.63V4.585c0-.348-.282-.63-.63-.63H4.585zm14.63 5.04v4.16l3.785 2.84V6.785l-3.785 2.84z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Integrations
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Connect third-party services to enhance your experience.
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="bg-white rounded-lg border border-[var(--color-border)] p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="text-[var(--color-primary)]">
                {integration.icon}
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-main)]">
                  {integration.name}
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {integration.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {integration.connected ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                  {integration.href && (
                    <Link
                      href={integration.href}
                      className="px-4 py-2 border border-[var(--color-border)] text-[var(--text-main)] rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Manage
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <span className="text-sm text-[var(--text-muted)]">
                    {integration.statusText}
                  </span>
                  {integration.href ? (
                    <Link
                      href={integration.href}
                      className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm"
                    >
                      Connect
                    </Link>
                  ) : (
                    <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm">
                      Connect
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Other Settings Links */}
      <div className="mt-8 pt-8 border-t border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Other Settings
        </h2>
        <div className="space-y-2">
          <Link
            href={`/srv/${expertId}/settings/subscription`}
            className="block p-4 bg-white rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-medium text-[var(--text-main)]">
              Subscription & Billing
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Manage your plan, billing, and payment method
            </p>
          </Link>
          <Link
            href={`/srv/${expertId}/settings/domain`}
            className="block p-4 bg-white rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-medium text-[var(--text-main)]">
              Domain & Email
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Configure your custom domain and email settings
            </p>
          </Link>
          <Link
            href={`/srv/${expertId}/settings/phone`}
            className="block p-4 bg-white rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-medium text-[var(--text-main)]">
              Phone Calling
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Configure AI phone calls and morning briefings
            </p>
          </Link>
          <Link
            href={`/srv/${expertId}/settings/embed`}
            className="block p-4 bg-white rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-medium text-[var(--text-main)]">
              Embed Widgets
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Add booking, contact, or chat widgets to your external website
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
