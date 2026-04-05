import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-state">
      <section className="panel empty-card">
        <span className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Passreserve.com
        </span>
        <h1>This page is not live yet.</h1>
        <p>
          The Passreserve.com rollout is being implemented in phases. Organizer hubs,
          attendee registration, the about story, and platform-admin routes are now live,
          but this specific route has not been published yet.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/">
            Return to discovery
          </Link>
        </div>
      </section>
    </main>
  );
}
