const shellStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  background:
    "radial-gradient(circle at top, #17324d 0%, #0b1622 45%, #05090d 100%)",
  color: "#f3f6fb",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
};

const cardStyle = {
  width: "100%",
  maxWidth: "760px",
  padding: "32px",
  borderRadius: "24px",
  background: "rgba(8, 14, 22, 0.82)",
  border: "1px solid rgba(160, 196, 255, 0.2)",
  boxShadow: "0 20px 80px rgba(0, 0, 0, 0.35)"
};

const badgeStyle = {
  display: "inline-block",
  marginBottom: "18px",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(108, 173, 255, 0.14)",
  border: "1px solid rgba(108, 173, 255, 0.28)",
  color: "#9bccff",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase"
};

const mutedStyle = {
  color: "#b5c2d2",
  lineHeight: 1.65,
  fontSize: "16px"
};

const listStyle = {
  marginTop: "20px",
  paddingLeft: "20px",
  color: "#d9e3ef",
  lineHeight: 1.7
};

export default function HomePage() {
  return (
    <main style={shellStyle}>
      <section style={cardStyle}>
        <div style={badgeStyle}>Passreserve.com</div>
        <h1 style={{ margin: 0, fontSize: "42px", lineHeight: 1.05 }}>
          Deployment bootstrap is live.
        </h1>
        <p style={{ ...mutedStyle, marginTop: "16px", marginBottom: 0 }}>
          This repository is now connected to GitHub and Vercel. The production
          deployment is intentionally minimal while the full Passreserve.com event
          platform is implemented phase by phase.
        </p>
        <ul style={listStyle}>
          <li>The active implementation plan is tracked in the root project documentation.</li>
          <li>Future AI agents must read the workflow files before changing code.</li>
          <li>Every push is expected to trigger and pass a Vercel deployment check.</li>
        </ul>
      </section>
    </main>
  );
}
