"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { PRICING_TIERS } from "@/lib/pricing";
import type { SubscriptionTier } from "@/types/subscription";

/* ─── icon components ─── */

function IconLayout() {
  return (
    <svg
      className="w-7 h-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      className="w-7 h-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg
      className="w-7 h-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function IconChatBubble() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
      />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    </svg>
  );
}

/* ─── hero mockup ─── */

function HeroMockup() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Phone frame */}
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-[#008080]/10 border border-[var(--color-border)] p-3">
        <div className="bg-[var(--color-bg-main)] rounded-[1.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              9:41
            </span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-[var(--text-muted)] rounded-sm opacity-60" />
              <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full opacity-40" />
            </div>
          </div>

          {/* Mini calendar */}
          <div className="px-4 pb-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[var(--text-main)]">
                  Today
                </span>
                <span className="text-xs text-[var(--color-primary)] font-medium">
                  Feb 2026
                </span>
              </div>
              <div className="space-y-2">
                {[
                  {
                    time: "10:00",
                    title: "Hair styling — Sarah",
                    color: "#008080",
                  },
                  {
                    time: "11:30",
                    title: "Colour treatment — Mia",
                    color: "#ff7f50",
                  },
                  {
                    time: "14:00",
                    title: "Consultation — James",
                    color: "#008080",
                  },
                ].map((item) => (
                  <div key={item.time} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-10 shrink-0">
                      {item.time}
                    </span>
                    <div
                      className="flex-1 text-xs font-medium rounded-lg px-3 py-2 text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI chat bubble */}
          <div className="px-4 pb-5">
            <div className="bg-[var(--color-accent)] rounded-xl p-3 shadow-sm flex items-start gap-2.5">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <IconSparkles />
              </div>
              <div>
                <p className="text-xs font-semibold text-white mb-0.5">
                  CallyGo AI
                </p>
                <p className="text-xs text-white/90 leading-relaxed">
                  You have 3 bookings today. Sarah prefers shorter sessions
                  &mdash; want me to send a reminder?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-[var(--color-secondary)] rounded-2xl -rotate-12 opacity-60" />
      <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-[var(--color-accent)]/15 rounded-xl rotate-12" />
    </div>
  );
}

/* ─── pricing card ─── */

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
  trialLabel,
  cta,
  onCtaClick,
}: {
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  trialLabel: string;
  cta: string;
  onCtaClick: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col transition-shadow duration-300 ${
        highlighted
          ? "bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/20 scale-[1.02]"
          : "bg-white border border-[var(--color-border)] hover:shadow-lg"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3
          className={`text-lg font-semibold mb-1 ${highlighted ? "text-white" : "text-[var(--text-main)]"}`}
        >
          {name}
        </h3>
        <p
          className={`text-sm ${highlighted ? "text-white/70" : "text-[var(--text-muted)]"}`}
        >
          {description}
        </p>
      </div>
      <div className="mb-2">
        <span
          className={`text-4xl font-bold ${highlighted ? "text-white" : "text-[var(--text-main)]"}`}
        >
          ${price}
        </span>
        <span
          className={`text-sm ${highlighted ? "text-white/70" : "text-[var(--text-muted)]"}`}
        >
          /month
        </span>
      </div>
      <p className="text-sm font-medium mb-6 text-[var(--color-accent)]">
        {trialLabel}
      </p>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span
              className={`mt-0.5 shrink-0 ${highlighted ? "text-[var(--color-accent)]" : "text-[var(--color-primary)]"}`}
            >
              <IconCheck />
            </span>
            <span
              className={`text-sm ${highlighted ? "text-white/90" : "text-[var(--text-body)]"}`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCtaClick}
        className={`w-full py-3.5 px-4 rounded-lg font-medium transition-all duration-200 min-h-[44px] ${
          highlighted
            ? "bg-white text-[var(--color-primary)] hover:bg-white/90"
            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

/* ─── main page ─── */

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = "/srv";
    } else {
      login("/srv");
    }
  };

  const handleSelectPlan = (tier: SubscriptionTier) => {
    const checkoutUrl = `/api/data/app/subscription/checkout-redirect?tier=${tier}`;
    if (isAuthenticated) {
      window.location.href = checkoutUrl;
    } else {
      login(checkoutUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)]">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <span
              className="text-xl font-bold text-[var(--color-primary)]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              CallyGo
            </span>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-body)]">
              <a
                href="#features"
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                Pricing
              </a>
            </nav>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  href="/srv"
                  className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors min-h-[44px] flex items-center"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2.5 text-sm font-medium text-[var(--text-body)] hover:text-[var(--color-primary)] transition-colors min-h-[44px] flex items-center"
                  >
                    Log In
                  </Link>
                  <button
                    onClick={() => login("/srv")}
                    className="px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors min-h-[44px]"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[var(--color-secondary)] text-[var(--color-primary)] text-sm font-medium px-4 py-2 rounded-full mb-6">
                <IconSparkles />
                <span>AI-powered for solopreneurs</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-[var(--text-main)] leading-[1.15] mb-6">
                Run your business.
                <br />
                <span className="text-[var(--color-primary)]">
                  Let CallyGo handle the rest.
                </span>
              </h1>
              <p className="text-lg text-[var(--text-body)] mb-8 leading-relaxed max-w-lg">
                The all-in-one assistant for solopreneurs. Landing pages,
                scheduling, and customer management&mdash;simplified by AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors text-base font-semibold shadow-lg shadow-[var(--color-primary)]/20 min-h-[44px]"
                >
                  Start Your 14-Day Free Trial
                </button>
              </div>
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                No credit card required. Set up in under 5 minutes.
              </p>
            </div>

            {/* Right — mockup */}
            <div className="flex justify-center md:justify-end">
              <HeroMockup />
            </div>
          </div>
        </div>
        {/* Soft gradient transition to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[var(--color-bg-main)]" />
      </section>

      {/* ── Feature Bento Grid ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-4">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-lg text-[var(--text-body)] max-w-xl mx-auto">
            Three powerful pillars to run your business from one calm center.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 — Landing Pages (tall) */}
          <div className="group bg-white rounded-2xl border border-[var(--color-border)] p-8 hover:shadow-xl hover:shadow-[var(--color-primary)]/5 transition-all duration-300 flex flex-col">
            <div className="w-14 h-14 bg-[var(--color-secondary)] rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-6">
              <IconLayout />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">
              Simple Landing Pages
            </h3>
            <p className="text-[var(--text-body)] leading-relaxed mb-6 flex-1">
              Create a professional online presence in minutes. Customise your
              brand, list your services, and let clients book directly &mdash;
              no coding needed.
            </p>
            <div className="bg-[var(--color-secondary)] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg" />
                <div className="flex-1">
                  <div className="h-2 bg-[var(--color-primary)]/20 rounded w-2/3 mb-1" />
                  <div className="h-2 bg-[var(--color-primary)]/10 rounded w-1/2" />
                </div>
              </div>
              <div className="h-12 bg-white/60 rounded-lg mt-2" />
              <div className="flex gap-2 mt-2">
                <div className="h-8 bg-[var(--color-primary)] rounded-lg flex-1" />
                <div className="h-8 bg-white/80 rounded-lg flex-1" />
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {[
                "AI-powered page editor",
                "Custom domain support",
                "Products & services showcase",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-[var(--text-body)]"
                >
                  <span className="text-[var(--color-primary)]">
                    <IconCheck />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2 — Smart Scheduling (tall) */}
          <div className="group bg-white rounded-2xl border border-[var(--color-border)] p-8 hover:shadow-xl hover:shadow-[var(--color-primary)]/5 transition-all duration-300 flex flex-col">
            <div className="w-14 h-14 bg-[var(--color-secondary)] rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-6">
              <IconCalendar />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">
              Smart Scheduling
            </h3>
            <p className="text-[var(--text-body)] leading-relaxed mb-6 flex-1">
              Clients book from your page. You set the rules &mdash; working
              hours, buffers, and availability. Syncs with Google Calendar and
              Outlook.
            </p>
            <div className="bg-[var(--color-secondary)] rounded-xl p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div
                    key={`${d}-${i}`}
                    className="text-center text-[10px] font-medium text-[var(--text-muted)]"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 14 }, (_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                      i === 4
                        ? "bg-[var(--color-primary)] text-white"
                        : i === 8
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-white/60 text-[var(--text-muted)]"
                    }`}
                  >
                    {i + 10}
                  </div>
                ))}
              </div>
            </div>
            <ul className="mt-6 space-y-2">
              {[
                "Stripe payments at booking",
                "Video calls (Zoom, Meet, built-in)",
                "Automated reminders & follow-ups",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-[var(--text-body)]"
                >
                  <span className="text-[var(--color-primary)]">
                    <IconCheck />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Card 3 — AI Assistant (tall, accent border) */}
          <div className="group bg-white rounded-2xl border-2 border-[var(--color-accent)]/30 p-8 hover:shadow-xl hover:shadow-[var(--color-accent)]/10 transition-all duration-300 flex flex-col">
            <div className="w-14 h-14 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center text-[var(--color-accent)] mb-6">
              <IconSparkles />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">
              AI Business Assistant
            </h3>
            <p className="text-[var(--text-body)] leading-relaxed mb-6 flex-1">
              Your AI sidekick handles morning briefings, client comms, content
              ideas, and daily planning &mdash; so you can focus on your craft.
            </p>
            <div className="bg-[var(--color-accent)]/5 rounded-xl p-4 space-y-2.5">
              {[
                {
                  icon: <IconChatBubble />,
                  text: '"Draft a follow-up for Sarah\'s appointment"',
                },
                {
                  icon: <IconBolt />,
                  text: '"Send me a morning briefing at 8am"',
                },
                {
                  icon: <IconClipboard />,
                  text: '"Summarise this week\'s bookings"',
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2.5 text-xs text-[var(--text-body)] shadow-sm border border-[var(--color-border)]"
                >
                  <span className="text-[var(--color-accent)] shrink-0">
                    {item.icon}
                  </span>
                  <span className="leading-tight">{item.text}</span>
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-2">
              {[
                "Phone morning briefings",
                "AI content for your landing page",
                "Smart scheduling suggestions",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-[var(--text-body)]"
                >
                  <span className="text-[var(--color-accent)]">
                    <IconCheck />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── The AI Edge ── */}
      <section className="bg-[var(--color-secondary)]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <IconSparkles />
                The AI Edge
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-6">
                Stop doing busywork.
                <br />
                Let AI handle it.
              </h2>
              <p className="text-lg text-[var(--text-body)] leading-relaxed mb-8">
                CallyGo&apos;s AI assistant learns how your business runs and
                quietly takes care of the repetitive stuff &mdash; drafting
                messages, preparing your daily schedule, suggesting follow-ups,
                and keeping clients engaged.
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: "Morning briefings via phone",
                    desc: "Wake up to a voice call summarising your day's schedule and priorities.",
                  },
                  {
                    title: "Client communication drafts",
                    desc: "AI writes follow-ups, reminders, and thank-you messages — you just approve.",
                  },
                  {
                    title: "Landing page content",
                    desc: "Update your page copy, headlines, and descriptions with a single prompt.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 bg-white rounded-xl p-4 border border-[var(--color-border)]"
                  >
                    <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center text-[var(--color-accent)] shrink-0 mt-0.5">
                      <IconSparkles />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-main)] text-sm mb-0.5">
                        {item.title}
                      </p>
                      <p className="text-sm text-[var(--text-body)] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative illustration */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 sm:w-80 sm:h-80 bg-white rounded-3xl shadow-lg border border-[var(--color-border)] p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white">
                        <IconSparkles />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)]">
                          CallyGo AI
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Your assistant
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-[var(--color-secondary)] rounded-xl px-4 py-3 text-sm text-[var(--text-body)]">
                        Good morning! You have 4 clients today. Sarah is a
                        returning customer &mdash; consider offering her the
                        loyalty discount.
                      </div>
                      <div className="bg-[var(--color-primary)] rounded-xl px-4 py-3 text-sm text-white ml-8">
                        Yes, send the discount to Sarah please.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[var(--color-bg-main)] rounded-lg px-3 py-2 border border-[var(--color-border)]">
                    <div className="flex-1 text-xs text-[var(--text-muted)]">
                      Ask CallyGo anything...
                    </div>
                    <div className="w-7 h-7 bg-[var(--color-primary)] rounded-md flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Decorative floating elements */}
                <div className="absolute -top-3 -right-3 w-14 h-14 bg-[var(--color-accent)]/15 rounded-2xl rotate-12" />
                <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl -rotate-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Ticker ── */}
      <section className="bg-white border-y border-[var(--color-border)] py-10 overflow-hidden">
        <p className="text-center text-sm font-medium text-[var(--text-muted)] mb-6">
          Trusted by creators in Beauty, Finance, and Wellness
        </p>
        <div className="relative">
          <div className="flex animate-ticker whitespace-nowrap">
            {/* Duplicate for seamless loop */}
            {[...Array(2)].map((_, setIdx) => (
              <div key={setIdx} className="flex items-center gap-12 px-6">
                {[
                  "Glow Studio",
                  "TaxPro Advisors",
                  "Mindful Yoga",
                  "Bella Hair Co.",
                  "VoiceWell Therapy",
                  "Peak Fitness",
                  "The Style Room",
                  "Zen Wellness",
                ].map((brand) => (
                  <div
                    key={`${setIdx}-${brand}`}
                    className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity"
                  >
                    <div className="w-8 h-8 bg-[var(--color-border)] rounded-lg" />
                    <span className="text-sm font-medium text-[var(--text-body)] whitespace-nowrap">
                      {brand}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[var(--text-body)] max-w-xl mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees. Cancel
            anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.tier}
              name={tier.name}
              price={tier.price}
              description={tier.description}
              features={tier.features}
              highlighted={tier.highlighted}
              trialLabel={tier.trialLabel}
              cta="Start Free Trial"
              onCtaClick={() => handleSelectPlan(tier.tier)}
            />
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-28">
        <div className="bg-[var(--color-primary)] rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to go?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-lg mx-auto">
              Join CallyGo today and turn your solo business into a
              well-organized, client-friendly operation.
            </p>
            <button
              onClick={handleGetStarted}
              className="px-10 py-4 bg-white text-[var(--color-primary)] rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg min-h-[44px]"
            >
              Join CallyGo Today
            </button>
            <p className="mt-4 text-sm text-white/60">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--color-border)] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <span
                className="text-lg font-bold text-[var(--color-primary)]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                CallyGo
              </span>
              <div className="hidden sm:flex items-center gap-6 text-sm text-[var(--text-muted)]">
                <a
                  href="#features"
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  Pricing
                </a>
                <Link
                  href="/auth/signin"
                  className="hover:text-[var(--color-primary)] transition-colors"
                >
                  Log In
                </Link>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              &copy; {new Date().getFullYear()} CallyGo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
