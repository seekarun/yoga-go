"use client";

import type { Product } from "@/types";

interface ProductsSectionProps {
  products: Product[];
  currency: string;
  variant?: "light" | "dark" | "gray";
  onBookProduct?: (productId: string) => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  USD: "$",
  GBP: "\u00a3",
  EUR: "\u20ac",
  INR: "\u20b9",
  NZD: "$",
  CAD: "$",
  SGD: "$",
};

function formatPrice(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  const amount = cents / 100;
  return Number.isInteger(amount)
    ? `${symbol}${amount}`
    : `${symbol}${amount.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Products Section Component
 * Displays product catalog cards on the landing page
 */
export default function ProductsSection({
  products,
  currency,
  variant = "light",
  onBookProduct,
}: ProductsSectionProps) {
  if (products.length === 0) return null;

  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#f9fafb",
      cardTitle: "#1a1a1a",
      cardText: "#4b5563",
      cardBorder: "#e5e7eb",
      imageBg: "#e5e7eb",
      priceBg: "#f0f9ff",
      priceText: "#0369a1",
      badgeBg: "#f3f4f6",
      badgeText: "#6b7280",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      cardBg: "#262626",
      cardTitle: "#ffffff",
      cardText: "#9ca3af",
      cardBorder: "#374151",
      imageBg: "#374151",
      priceBg: "#1e3a5f",
      priceText: "#93c5fd",
      badgeBg: "#374151",
      badgeText: "#9ca3af",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#ffffff",
      cardTitle: "#1a1a1a",
      cardText: "#4b5563",
      cardBorder: "#e5e7eb",
      imageBg: "#e5e7eb",
      priceBg: "#f0f9ff",
      priceText: "#0369a1",
      badgeBg: "#f3f4f6",
      badgeText: "#6b7280",
    },
  };

  const theme = colors[variant];

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: theme.bg,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: theme.heading,
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: theme.subheading,
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.cardBg,
    borderRadius: "12px",
    overflow: "hidden",
    border: `1px solid ${theme.cardBorder}`,
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex",
    flexDirection: "column",
  };

  const cardImageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%",
    backgroundColor: theme.imageBg,
    overflow: "hidden",
  };

  const cardImageStyle = (
    image?: string,
    position?: string,
    zoom?: number,
  ): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backgroundImage: image ? `url(${image})` : undefined,
    backgroundPosition: position || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: image ? `scale(${(zoom || 100) / 100})` : undefined,
  });

  const cardContentStyle: React.CSSProperties = {
    padding: "20px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: theme.cardTitle,
    marginBottom: "8px",
  };

  const cardDescStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: theme.cardText,
    lineHeight: 1.6,
    marginBottom: "16px",
    flex: 1,
  };

  const metaRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 500,
    backgroundColor: theme.badgeBg,
    color: theme.badgeText,
  };

  const priceStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: theme.priceText,
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--brand-500, #667eea)",
    color: "#ffffff",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  };

  return (
    <section style={sectionStyle}>
      <style>{`
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .product-book-btn:hover {
          opacity: 0.9;
        }
      `}</style>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h2 style={headingStyle}>Our Services</h2>
          <p style={subheadingStyle}>
            Browse our offerings and book your appointment
          </p>
        </div>

        <div style={gridStyle}>
          {products.map((product) => (
            <div key={product.id} className="product-card" style={cardStyle}>
              {/* Card Image */}
              {product.image && (
                <div style={cardImageContainerStyle}>
                  <div
                    style={cardImageStyle(
                      product.image,
                      product.imagePosition,
                      product.imageZoom,
                    )}
                  />
                </div>
              )}

              {/* Card Content */}
              <div style={cardContentStyle}>
                <h3 style={cardTitleStyle}>{product.name}</h3>
                {product.description && (
                  <p style={cardDescStyle}>{product.description}</p>
                )}

                {/* Duration + Price */}
                <div style={metaRowStyle}>
                  <span style={badgeStyle}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatDuration(product.durationMinutes)}
                  </span>
                  <span style={priceStyle}>
                    {formatPrice(product.price, currency)}
                  </span>
                </div>

                {/* Book Now Button */}
                <button
                  type="button"
                  className="product-book-btn"
                  style={buttonStyle}
                  onClick={() => onBookProduct?.(product.id)}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
