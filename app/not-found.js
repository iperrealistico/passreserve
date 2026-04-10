import Link from "next/link";

import { PublicVisual } from "../lib/passreserve-visual-component";
import { routeVisuals } from "../lib/passreserve-visuals";

export default function NotFound() {
  return (
    <main className="empty-state">
      <section className="panel empty-card">
        <PublicVisual
          className="empty-card-visual"
          sizes="(min-width: 768px) 36vw, 90vw"
          visualId={routeVisuals.notFound}
        />
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
