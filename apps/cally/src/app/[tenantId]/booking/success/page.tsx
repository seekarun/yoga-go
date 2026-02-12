/**
 * Booking Success Page — shown after Stripe Checkout completion
 * Route: /{tenantId}/booking/success?session_id=cs_xxx
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getCheckoutSession } from "@/lib/stripe";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export default async function BookingSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const { tenantId } = await params;
  const { session_id: sessionId } = await searchParams;

  console.log(
    "[DBG][booking/success] Loading for tenant:",
    tenantId,
    "session:",
    sessionId,
  );

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    notFound();
  }

  let paymentStatus: "paid" | "unpaid" | "unknown" = "unknown";
  let visitorName = "";
  let bookingDate = "";
  let bookingNote = "";

  if (sessionId) {
    try {
      const session = await getCheckoutSession(sessionId);
      paymentStatus = session.payment_status === "paid" ? "paid" : "unpaid";
      visitorName = session.metadata?.visitorName || "";
      bookingDate = session.metadata?.date || "";
      bookingNote = session.metadata?.note || "";
    } catch (error) {
      console.error(
        "[DBG][booking/success] Failed to fetch checkout session:",
        error,
      );
    }
  }

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const formattedDate = bookingDate
    ? new Date(bookingDate + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: paymentStatus === "paid" ? "#10b981" : "#f59e0b",
            padding: "25px 30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            {paymentStatus === "paid" ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <h1
            style={{
              color: "#ffffff",
              margin: 0,
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            {paymentStatus === "paid"
              ? "Payment Received!"
              : "Processing Payment..."}
          </h1>
        </div>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {paymentStatus === "paid" ? (
            <>
              <p
                style={{
                  fontSize: "16px",
                  color: "#333",
                  margin: "0 0 20px 0",
                  textAlign: "center",
                }}
              >
                {visitorName ? `Thank you, ${visitorName}!` : "Thank you!"} Your
                booking with <strong>{tenant.name}</strong> has been confirmed.
              </p>

              <p
                style={{
                  fontSize: "14px",
                  color: "#666",
                  margin: "0 0 25px 0",
                  textAlign: "center",
                }}
              >
                You will receive a confirmation email shortly.
              </p>

              {formattedDate && (
                <div
                  style={{
                    background: "#ecfdf5",
                    padding: "16px 20px",
                    borderRadius: "8px",
                    borderLeft: "4px solid #10b981",
                    marginBottom: "25px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "13px",
                      color: "#065f46",
                      fontWeight: 600,
                    }}
                  >
                    Booking Details
                  </p>
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "14px",
                      color: "#333",
                    }}
                  >
                    <strong>Date:</strong> {formattedDate}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#333",
                    }}
                  >
                    <strong>Timezone:</strong> {timezone}
                  </p>
                  {bookingNote && (
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      <strong>Note:</strong> {bookingNote}
                    </p>
                  )}
                </div>
              )}

              {/* Status Badge */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "25px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: "#d1fae5",
                    color: "#065f46",
                    padding: "8px 20px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Confirmed
                </span>
              </div>
            </>
          ) : (
            <p
              style={{
                fontSize: "16px",
                color: "#333",
                margin: "0 0 20px 0",
                textAlign: "center",
              }}
            >
              Your payment is being processed. You will receive a confirmation
              email once complete.
            </p>
          )}

          {/* Back link */}
          <div style={{ textAlign: "center" }}>
            <Link
              href={`/${tenantId}`}
              style={{
                display: "inline-block",
                background: "#4f46e5",
                color: "#ffffff",
                padding: "12px 28px",
                textDecoration: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Back to {tenant.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
