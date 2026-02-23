export default function LaunchingSoon() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        color: "#f8fafc",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          marginBottom: "0.5rem",
        }}
      >
        Cally
      </div>
      <div
        style={{
          width: "3rem",
          height: "3px",
          background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          borderRadius: "2px",
          marginBottom: "2rem",
        }}
      />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "1rem",
          color: "#e2e8f0",
        }}
      >
        Launching Soon
      </h1>
      <p
        style={{
          fontSize: "1.1rem",
          color: "#94a3b8",
          maxWidth: "28rem",
          lineHeight: 1.6,
        }}
      >
        The all-in-one assistant for solopreneurs. Landing pages, bookings, and
        client management — all in one place.
      </p>
    </div>
  );
}
