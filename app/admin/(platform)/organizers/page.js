import Link from "next/link";

import { platformOrganizers } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Hosts"
};

export default function PlatformOrganizersPage() {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Host management</div>
          <h2>Review every host from one organizer roster.</h2>
          <p>
            Each host detail view connects the public page, host dashboard, registrations, and
            payments so approved staff can jump directly to the right action.
          </p>
          <div className="pill-list">
            <span className="pill">{platformOrganizers.length} hosts</span>
            <span className="pill">Public pages and team tools linked</span>
            <span className="pill">Payment status visible</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">What this view is for</div>
            <h2>Fast host review</h2>
            <p>
              Use this roster to spot request status, payment follow-up, and host readiness before
              jumping into a specific host.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/admin/emails">
              Open inbox
            </Link>
            <Link className="button button-secondary" href="/admin/health">
              View checks
            </Link>
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Host roster</div>
        <h3>Public pages, host tools, and support links all connect from here.</h3>
        <div className="admin-card-grid">
          {platformOrganizers.map((organizer) => (
            <article className="admin-card" key={organizer.slug}>
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${organizer.launchStatusTone}`}>
                      {organizer.launchStatusLabel}
                    </span>
                    <span className={`admin-badge admin-badge-${organizer.healthTone}`}>
                      {organizer.healthLabel}
                    </span>
                  </div>
                  <h4>{organizer.name}</h4>
                  <p>
                    {organizer.city}, {organizer.region} · joined {organizer.joinedAtLabel}
                  </p>
                </div>
                <div className="admin-card-price">
                  <strong>{organizer.summary.activeCount}</strong>
                  <span>active registrations</span>
                </div>
              </div>

              <p>{organizer.tagline}</p>

              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">Events</span>
                  <strong>{organizer.metrics.eventCount}</strong>
                </div>
                <div>
                  <span className="metric-label">Occurrences</span>
                  <strong>{organizer.metrics.publishedOccurrences}</strong>
                </div>
                <div>
                  <span className="metric-label">Online collected</span>
                  <strong>{organizer.summary.onlineCollectedLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Due at venue</span>
                  <strong>{organizer.summary.dueAtEventLabel}</strong>
                </div>
              </div>

              <div className="ops-inline-list">
                <span>{organizer.featuredEventTitle}</span>
                <span>{organizer.collectionLabel}</span>
                <span>{organizer.timeZone}</span>
              </div>

              <div className="admin-actions-row">
                <Link className="button button-primary" href={organizer.detailHref}>
                  Open host detail
                </Link>
                <Link className="button button-secondary" href={organizer.publicHref}>
                  Public page
                </Link>
                <Link className="button button-secondary" href={organizer.dashboardHref}>
                  Host dashboard
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
