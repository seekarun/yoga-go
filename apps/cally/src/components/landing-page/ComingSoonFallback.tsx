/**
 * Minimal fallback shown at `/` when the platform tenant's landing page
 * is not yet published or PLATFORM_TENANT_ID is not configured.
 */
export default function ComingSoonFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        textAlign: "center",
        background: "#f8fafc",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          fontWeight: "700",
          color: "#008080",
          marginBottom: "12px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        CallyGo
      </h1>
      <p
        style={{
          fontSize: "18px",
          color: "#64748b",
          marginBottom: "8px",
        }}
      >
        Run your business. Let CallyGo handle the rest.
      </p>
      <p
        style={{
          fontSize: "14px",
          color: "#94a3b8",
        }}
      >
        Coming soon.
      </p>
    </div>
  );
}
