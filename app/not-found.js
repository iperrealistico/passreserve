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
          The Passreserve.com rollout is being implemented in phases, and this route
          has not been published yet. The public product language is now aligned,
          but the full event experience is still taking shape.
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/">
            Return to the homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
