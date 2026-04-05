import Link from "next/link";

import { platformOrganizers } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform organizers"
};

export default function PlatformOrganizersPage() {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Organizer management</div>
          <h2>Organizer support now reads like enablement, not tenant maintenance.</h2>
          <p>
            Each organizer detail route connects the public hub, organizer-admin surfaces, payment
            follow-up, and platform support context in one place. That keeps the Phase 11 language
            shift visible wherever platform ops need to intervene.
          </p>
          <div className="pill-list">
            <span className="pill">{platformOrganizers.length} seeded organizers</span>
            <span className="pill">Public and admin routes linked</span>
            <span className="pill">Payment status visible</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">What changed</div>
            <h2>Organizer-first language</h2>
            <p>
              The platform team now speaks about organizers, events, registrations, venues, and
              payment states instead of tenants, bookings, and inventory rows.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/admin/emails">
              Open launch inbox
            </Link>
            <Link className="button button-secondary" href="/admin/health">
              Review health
            </Link>
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer roster</div>
        <h3>Public routes, organizer admin, and platform support all connect from here.</h3>
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
                  Open platform detail
                </Link>
                <Link className="button button-secondary" href={organizer.publicHref}>
                  Public page
                </Link>
                <Link className="button button-secondary" href={organizer.dashboardHref}>
                  Organizer admin
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
