import Link from "next/link";

import {
  getPlatformOverview,
  platformAdminPhase,
  platformLogCatalog,
  platformOrganizers
} from "../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform admin overview"
};

export default function PlatformAdminOverviewPage() {
  const overview = getPlatformOverview();

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Platform overview</div>
          <h2>Organizer support, CMS, and operations now share one platform surface.</h2>
          <p>
            {platformAdminPhase.summary} The active Passreserve.com workspace no longer stops at
            organizer admin. The platform team can now review organizer launches, public story,
            email scenarios, and health signals from one root-level route map.
          </p>
          <div className="pill-list">
            <span className="pill">{overview.summary.organizerCount} organizers</span>
            <span className="pill">{overview.summary.occurrenceCount} published occurrences</span>
            <span className="pill">{overview.summary.activeRegistrations} active registrations</span>
            <span className="pill">{overview.summary.onlineCollectedLabel} collected online</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Current platform pulse</div>
            <h2>{overview.summary.stripeModeLabel}</h2>
            <p>
              The platform view keeps organizer volume, request inbox pressure, and payment
              readiness visible together so a future ops team can prioritize the right follow-up.
            </p>
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="metric-label">Open requests</span>
              <div className="metric-value">{overview.summary.openRequestsCount}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Templates</span>
              <div className="metric-value">{overview.summary.templateCount}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Online collected</span>
              <div className="metric-value">{overview.summary.onlineCollectedLabel}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Due at venue</span>
              <div className="metric-value">{overview.summary.dueAtEventLabel}</div>
            </div>
          </div>

          <div className="hero-actions">
            <Link className="button button-primary" href="/admin/organizers">
              Review organizers
            </Link>
            <Link className="button button-secondary" href="/admin/health">
              Open health
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Attention queue</div>
              <h3>Phase 11 keeps the highest-value platform follow-up visible.</h3>
            </div>
          </div>

          <div className="admin-note-list">
            {overview.attentionQueue.map((item) => (
              <div className="admin-note-item" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <Link className="inline-link" href={item.href}>
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Release tracks</div>
            <h3>What Phase 11 adds to the active app.</h3>
            <div className="timeline">
              {overview.releaseTracks.map((item) => (
                <div className="timeline-step" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Recent platform events</div>
            <h3>Latest operational context carried into this phase.</h3>
            <div className="timeline">
              {platformLogCatalog.slice(0, 3).map((entry) => (
                <div className="timeline-step" key={entry.id}>
                  <strong>{entry.eventType}</strong>
                  <span>
                    {entry.levelLabel} · {entry.actor}
                  </span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer coverage</div>
        <h3>Every seeded organizer now has a platform-admin detail route.</h3>
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
                    {organizer.city}, {organizer.region} · {organizer.featuredEventTitle}
                  </p>
                </div>
                <div className="admin-card-price">
                  <strong>{organizer.summary.activeCount}</strong>
                  <span>active registrations</span>
                </div>
              </div>

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

              <div className="admin-actions-row">
                <Link className="button button-primary" href={organizer.detailHref}>
                  Organizer detail
                </Link>
                <Link className="button button-secondary" href={organizer.dashboardHref}>
                  Organizer dashboard
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
