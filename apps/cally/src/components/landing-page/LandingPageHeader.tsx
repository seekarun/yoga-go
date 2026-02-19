"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ProfileIconDropdown from "@/components/ProfileIconDropdown";

export const SECTION_NAV_LABELS: Record<string, string> = {
  about: "About",
  features: "Services",
  products: "Products",
  testimonials: "Reviews",
  faq: "FAQ",
  location: "Location",
  gallery: "Gallery",
};

interface LandingPageHeaderProps {
  logo?: string;
  tenantName: string;
  sections: { id: string; label: string }[];
  tenantId: string;
}

export default function LandingPageHeader({
  logo,
  tenantName,
  sections,
  tenantId,
}: LandingPageHeaderProps) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (y > lastY.current && y > 80) setVisible(false);
      else if (y < lastY.current) setVisible(true);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((sectionId: string) => {
    if (sectionId === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMenuOpen(false);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(8px)" : "none",
        background: scrolled ? "rgba(0,0,0,0.15)" : "transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex-shrink-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant avatar URL, fixed size
              <img
                src={logo}
                alt={tenantName}
                style={{ height: "24px", width: "auto" }}
                className="cursor-pointer object-contain"
                onClick={() => scrollTo("hero")}
              />
            ) : (
              <button
                type="button"
                onClick={() => scrollTo("hero")}
                className="text-white hover:opacity-80 transition-opacity"
                aria-label="Home"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>
            )}
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className="text-white text-sm font-medium uppercase tracking-wider hover:opacity-80 transition-opacity"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Right side: hamburger + profile */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden text-white p-1"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>

            {/* Profile icon */}
            <ProfileIconDropdown tenantId={tenantId} inline />
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: mobileMenuOpen ? `${sections.length * 48 + 16}px` : "0",
          opacity: mobileMenuOpen ? 1 : 0,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: mobileMenuOpen ? "rgba(0,0,0,0.7)" : "transparent",
        }}
      >
        <nav className="px-4 py-2 flex flex-col">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="text-white text-sm font-medium uppercase tracking-wider py-3 text-left hover:opacity-80 transition-opacity"
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
