import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-state">
      <section className="panel empty-card">
        <span className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Passreserve.com
        </span>
        <h1>We couldn&apos;t find that page.</h1>
        <p>
          The link may be out of date, or the event or organizer may no longer be available.
          Start from the main discovery page to browse live organizers and upcoming events.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/">
            Browse events
          </Link>
        </div>
      </section>
    </main>
  );
}
