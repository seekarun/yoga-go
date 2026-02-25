"use client";

import type { HeroTemplateProps } from "./types";

// ============================================================================
// Salon color palette — baked in, not derived from theme
// ============================================================================
const C = {
  bgCream: "#FAF5F0",
  bgWarm: "#F5EDE4",
  bgDark: "#2C2420",
  accent: "#8B6F4E",
  accentHover: "#7A5F3E",
  textDark: "#2C2420",
  textBody: "#5C4F44",
  textMuted: "#8B8178",
  border: "#E8DDD0",
  white: "#ffffff",
};

// ============================================================================
// Helpers
// ============================================================================
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

// ============================================================================
// Editable text helper — simple contentEditable span in edit mode
// ============================================================================
function EditableText({
  text,
  tag: Tag = "span",
  style,
  isEditing,
  onTextChange,
}: {
  text: string;
  tag?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  style?: React.CSSProperties;
  isEditing: boolean;
  onTextChange?: (val: string) => void;
}) {
  if (!isEditing) {
    return <Tag style={style}>{text}</Tag>;
  }
  return (
    <Tag
      className="salon-editable"
      contentEditable
      suppressContentEditableWarning
      style={{
        ...style,
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "2px 6px",
        transition: "background 0.2s",
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) =>
        onTextChange?.(e.currentTarget.textContent || "")
      }
    >
      {text}
    </Tag>
  );
}

// ============================================================================
// Main component
// ============================================================================
export default function SalonTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    products = [],
    currency = "AUD",
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
    onHeroBgImageClick,
    onAboutTitleChange,
    onAboutParagraphChange,
    onAboutImageClick,
    onProductsHeadingChange,
    onBookProduct,
    onSignupWebinar,
    onTestimonialsHeadingChange,
    onFooterTextChange,
  } = props;

  const {
    title,
    subtitle,
    backgroundImage,
    button,
    about,
    productsConfig,
    testimonials: testimonialsConfig,
    footer: footerConfig,
  } = config;

  const activeProducts = products.filter((p) => p.isActive);
  const showProductsGrid = activeProducts.length > 3;
  const serviceProducts = activeProducts.slice(0, 3);
  const hasTestimonials =
    testimonialsConfig?.testimonials &&
    testimonialsConfig.testimonials.length > 0;

  // ------------------------------------------------------------------
  // Responsive CSS injected once
  // ------------------------------------------------------------------
  const responsiveCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');

    .salon-editable:focus {
      background: rgba(139, 111, 78, 0.08) !important;
      outline: 2px solid rgba(139, 111, 78, 0.4) !important;
      outline-offset: 2px;
    }
    .salon-editable:hover:not(:focus) {
      background: rgba(139, 111, 78, 0.04);
    }

    .salon-services-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
    @media (max-width: 900px) {
      .salon-services-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 600px) {
      .salon-services-grid {
        grid-template-columns: 1fr;
      }
    }

    .salon-products-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .salon-products-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 600px) {
      .salon-products-grid {
        grid-template-columns: 1fr;
      }
    }

    .salon-testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
    }

    .salon-service-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(44, 36, 32, 0.12);
    }
    .salon-product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(44, 36, 32, 0.1);
    }
    .salon-btn:hover {
      background-color: ${C.accentHover} !important;
    }
    .salon-btn-outline:hover {
      background-color: ${C.accent} !important;
      color: ${C.white} !important;
    }
    .salon-hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(44, 36, 32, 0.3) 0%,
        rgba(44, 36, 32, 0.6) 100%
      );
    }
    .salon-about-row {
      display: flex;
      gap: 64px;
      align-items: center;
      max-width: 1100px;
      margin: 0 auto;
    }
    @media (max-width: 768px) {
      .salon-about-row {
        flex-direction: column;
        gap: 32px;
      }
    }
  `;

  // Shared font families
  const serif = "'Playfair Display', Georgia, serif";
  const sans = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  // ------------------------------------------------------------------
  // Section: Hero
  // ------------------------------------------------------------------
  function HeroSection() {
    return (
      <section
        style={{
          position: "relative",
          minHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          overflow: "hidden",
          padding: "60px 24px",
        }}
      >
        {/* Background image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
              : `linear-gradient(135deg, ${C.bgWarm} 0%, ${C.bgCream} 100%)`,
            backgroundSize: "cover",
            backgroundPosition: config.imagePosition || "50% 50%",
            backgroundRepeat: "no-repeat",
            transform: config.imageZoom
              ? `scale(${config.imageZoom / 100})`
              : undefined,
            zIndex: 0,
            cursor: isEditing ? "pointer" : undefined,
          }}
          onClick={isEditing ? onHeroBgImageClick : undefined}
        />
        {backgroundImage && <div className="salon-hero-overlay" />}

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "800px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <EditableText
            tag="h1"
            text={title || "Welcome"}
            isEditing={isEditing}
            onTextChange={onTitleChange}
            style={{
              fontFamily: serif,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: 600,
              color: backgroundImage ? C.white : C.textDark,
              lineHeight: 1.1,
              marginBottom: "20px",
              textShadow: backgroundImage
                ? "0 2px 20px rgba(0,0,0,0.3)"
                : "none",
              letterSpacing: "-0.02em",
            }}
          />
          <EditableText
            tag="p"
            text={subtitle || "Experience the art of beauty"}
            isEditing={isEditing}
            onTextChange={onSubtitleChange}
            style={{
              fontFamily: sans,
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              fontWeight: 300,
              color: backgroundImage ? "rgba(255,255,255,0.9)" : C.textBody,
              lineHeight: 1.7,
              marginBottom: "40px",
              maxWidth: "600px",
              margin: "0 auto 40px",
            }}
          />
          {button && (
            <button
              type="button"
              className="salon-btn"
              onClick={onButtonClick}
              style={{
                fontFamily: sans,
                fontSize: "0.95rem",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "16px 48px",
                backgroundColor: C.accent,
                color: C.white,
                border: "none",
                borderRadius: "0",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
            >
              {button.label || "Book Appointment"}
            </button>
          )}
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Section: About
  // ------------------------------------------------------------------
  function AboutSection() {
    if (!about) return null;
    return (
      <section
        style={{
          backgroundColor: C.bgCream,
          padding: "100px 24px",
        }}
      >
        <div className="salon-about-row">
          {/* Image */}
          {about.image && (
            <div
              style={{
                flex: "0 0 400px",
                maxWidth: "400px",
                cursor: isEditing ? "pointer" : undefined,
              }}
              onClick={isEditing ? onAboutImageClick : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={about.image}
                alt="About"
                style={{
                  width: "100%",
                  height: "500px",
                  objectFit: "cover",
                  objectPosition: about.imagePosition || "50% 50%",
                  ...(isEditing
                    ? {
                        outline: "2px dashed rgba(139,111,78,0.3)",
                        outlineOffset: "4px",
                      }
                    : {}),
                }}
              />
            </div>
          )}
          {/* Text */}
          <div style={{ flex: 1 }}>
            <EditableText
              tag="h2"
              text={about.title || "About Us"}
              isEditing={isEditing}
              onTextChange={onAboutTitleChange}
              style={{
                fontFamily: serif,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 600,
                color: C.textDark,
                marginBottom: "24px",
                lineHeight: 1.2,
              }}
            />
            <div
              style={{
                width: "60px",
                height: "2px",
                backgroundColor: C.accent,
                marginBottom: "24px",
              }}
            />
            <EditableText
              tag="p"
              text={about.paragraph || ""}
              isEditing={isEditing}
              onTextChange={onAboutParagraphChange}
              style={{
                fontFamily: sans,
                fontSize: "1.05rem",
                fontWeight: 400,
                color: C.textBody,
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            />
          </div>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Section: Services (top 3 products)
  // ------------------------------------------------------------------
  function ServicesSection() {
    if (serviceProducts.length === 0) return null;
    return (
      <section
        style={{
          backgroundColor: C.white,
          padding: "100px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <EditableText
              tag="h2"
              text={productsConfig?.heading || "Our Services"}
              isEditing={isEditing}
              onTextChange={onProductsHeadingChange}
              style={{
                fontFamily: serif,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 600,
                color: C.textDark,
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                width: "60px",
                height: "2px",
                backgroundColor: C.accent,
                margin: "0 auto",
              }}
            />
          </div>

          <div className="salon-services-grid">
            {serviceProducts.map((product) => {
              const imgUrl = product.images?.[0]?.url || product.image || "";
              return (
                <div
                  key={product.id}
                  className="salon-service-card"
                  style={{
                    backgroundColor: C.white,
                    border: `1px solid ${C.border}`,
                    overflow: "hidden",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    product.productType === "webinar"
                      ? onSignupWebinar?.(product.id)
                      : onBookProduct?.(product.id)
                  }
                >
                  {imgUrl && (
                    <div
                      style={{
                        width: "100%",
                        height: "280px",
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  )}
                  <div style={{ padding: "28px 24px" }}>
                    <h3
                      style={{
                        fontFamily: serif,
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        color: C.textDark,
                        marginBottom: "8px",
                      }}
                    >
                      {product.name}
                    </h3>
                    {product.description && (
                      <p
                        style={{
                          fontFamily: sans,
                          fontSize: "0.9rem",
                          color: C.textMuted,
                          lineHeight: 1.6,
                          marginBottom: "16px",
                        }}
                      >
                        {product.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: sans,
                          fontSize: "0.85rem",
                          color: C.textMuted,
                        }}
                      >
                        {formatDuration(product.durationMinutes)}
                      </span>
                      <span
                        style={{
                          fontFamily: serif,
                          fontSize: "1.15rem",
                          fontWeight: 600,
                          color: C.accent,
                        }}
                      >
                        {product.price > 0
                          ? formatPrice(product.price, currency)
                          : "Free"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Section: Booking CTA
  // ------------------------------------------------------------------
  function BookingCTASection() {
    return (
      <section
        style={{
          backgroundColor: C.bgWarm,
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              fontWeight: 600,
              color: C.textDark,
              marginBottom: "16px",
            }}
          >
            Ready to Transform Your Look?
          </h2>
          <p
            style={{
              fontFamily: sans,
              fontSize: "1.05rem",
              color: C.textBody,
              lineHeight: 1.7,
              marginBottom: "36px",
            }}
          >
            Book your appointment today and let our experts take care of you.
          </p>
          <button
            type="button"
            className="salon-btn"
            onClick={onButtonClick}
            style={{
              fontFamily: sans,
              fontSize: "0.95rem",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "16px 48px",
              backgroundColor: C.accent,
              color: C.white,
              border: "none",
              borderRadius: "0",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
          >
            Book Appointment
          </button>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Section: Products Grid (only if >3 products)
  // ------------------------------------------------------------------
  function ProductsGridSection() {
    if (!showProductsGrid) return null;
    return (
      <section
        style={{
          backgroundColor: C.bgCream,
          padding: "100px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 600,
                color: C.textDark,
                marginBottom: "16px",
              }}
            >
              All Services & Pricing
            </h2>
            <div
              style={{
                width: "60px",
                height: "2px",
                backgroundColor: C.accent,
                margin: "0 auto",
              }}
            />
          </div>

          <div className="salon-products-grid">
            {activeProducts.map((product) => {
              const imgUrl = product.images?.[0]?.url || product.image || "";
              return (
                <div
                  key={product.id}
                  className="salon-product-card"
                  style={{
                    backgroundColor: C.white,
                    border: `1px solid ${C.border}`,
                    overflow: "hidden",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                >
                  {imgUrl && (
                    <div
                      style={{
                        width: "100%",
                        height: "200px",
                        backgroundImage: `url(${imgUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  )}
                  <div style={{ padding: "20px" }}>
                    <h3
                      style={{
                        fontFamily: serif,
                        fontSize: "1.05rem",
                        fontWeight: 600,
                        color: C.textDark,
                        marginBottom: "6px",
                      }}
                    >
                      {product.name}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: sans,
                          fontSize: "0.8rem",
                          color: C.textMuted,
                        }}
                      >
                        {formatDuration(product.durationMinutes)}
                      </span>
                      <span
                        style={{
                          fontFamily: serif,
                          fontSize: "1.05rem",
                          fontWeight: 600,
                          color: C.accent,
                        }}
                      >
                        {product.price > 0
                          ? formatPrice(product.price, currency)
                          : "Free"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="salon-btn-outline"
                      onClick={() =>
                        product.productType === "webinar"
                          ? onSignupWebinar?.(product.id)
                          : onBookProduct?.(product.id)
                      }
                      style={{
                        width: "100%",
                        fontFamily: sans,
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        padding: "10px 0",
                        backgroundColor: "transparent",
                        color: C.accent,
                        border: `1px solid ${C.accent}`,
                        borderRadius: "0",
                        cursor: "pointer",
                        transition: "background-color 0.3s, color 0.3s",
                      }}
                    >
                      {product.productType === "webinar"
                        ? "Register"
                        : "Book Now"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Section: Testimonials
  // ------------------------------------------------------------------
  function TestimonialsSection() {
    if (!hasTestimonials) return null;
    const testimonials = testimonialsConfig!.testimonials;
    return (
      <section
        style={{
          backgroundColor: C.white,
          padding: "100px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <EditableText
              tag="h2"
              text={testimonialsConfig?.heading || "What Our Clients Say"}
              isEditing={isEditing}
              onTextChange={onTestimonialsHeadingChange}
              style={{
                fontFamily: serif,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 600,
                color: C.textDark,
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                width: "60px",
                height: "2px",
                backgroundColor: C.accent,
                margin: "0 auto",
              }}
            />
          </div>

          <div className="salon-testimonials-grid">
            {testimonials.map((t) => (
              <div
                key={t.id}
                style={{
                  backgroundColor: C.bgCream,
                  padding: "40px 32px",
                  borderLeft: `3px solid ${C.accent}`,
                }}
              >
                {/* Star rating */}
                {t.rating && (
                  <div style={{ marginBottom: "16px" }}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          color: C.accent,
                          fontSize: "1rem",
                          marginRight: "2px",
                        }}
                      >
                        &#9733;
                      </span>
                    ))}
                  </div>
                )}
                <p
                  style={{
                    fontFamily: sans,
                    fontSize: "1rem",
                    fontStyle: "italic",
                    color: C.textBody,
                    lineHeight: 1.8,
                    marginBottom: "20px",
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <span
                    style={{
                      fontFamily: serif,
                      fontWeight: 600,
                      color: C.textDark,
                      fontSize: "0.95rem",
                    }}
                  >
                    {t.authorName}
                  </span>
                  {t.authorTitle && (
                    <span
                      style={{
                        fontFamily: sans,
                        color: C.textMuted,
                        fontSize: "0.85rem",
                        marginLeft: "8px",
                      }}
                    >
                      &mdash; {t.authorTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Section: Footer
  // ------------------------------------------------------------------
  function FooterSection() {
    if (config.footerEnabled === false) return null;
    const links = footerConfig?.links || [];
    return (
      <footer
        style={{
          backgroundColor: C.bgDark,
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {links.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "32px",
                marginBottom: "24px",
                flexWrap: "wrap",
              }}
            >
              {links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: sans,
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.7)",
                    textDecoration: "none",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <EditableText
            tag="p"
            text={footerConfig?.text || "\u00a9 2026 All rights reserved."}
            isEditing={isEditing}
            onTextChange={onFooterTextChange}
            style={{
              fontFamily: sans,
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.5)",
            }}
          />
          {footerConfig?.showPoweredBy !== false && (
            <p
              style={{
                fontFamily: sans,
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: "12px",
              }}
            >
              Powered by CallyGo
            </p>
          )}
        </div>
      </footer>
    );
  }

  // ------------------------------------------------------------------
  // Render all sections in fixed order
  // ------------------------------------------------------------------
  return (
    <>
      <style>{responsiveCSS}</style>
      <div
        style={{
          fontFamily: sans,
          color: C.textDark,
          lineHeight: 1.6,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <BookingCTASection />
        <ProductsGridSection />
        <TestimonialsSection />
        <FooterSection />
      </div>
    </>
  );
}
