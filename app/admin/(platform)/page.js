import Link from "next/link";

import { getPlatformOverview, getPlatformOrganizers } from "../../../lib/passreserve-admin-service.js";

export const metadata = {
  title: "Platform dashboard"
};

export default async function PlatformAdminOverviewPage() {
  const overview = await getPlatformOverview();
  const organizers = await getPlatformOrganizers();

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Support overview</div>
          <h2>Keep organizers, content, and operational readiness in one place.</h2>
          <p>
            This dashboard now reads from the same persistent state as the public product, so the
            team is looking at the real platform instead of a sample snapshot.
          </p>
          <div className="pill-list">
            <span className="pill">{overview.summary.organizerCount} organizers</span>
            <span className="pill">{overview.summary.eventCount} public events</span>
            <span className="pill">{overview.summary.occurrenceCount} occurrences</span>
            <span className="pill">{overview.summary.activeRegistrations} active registrations</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Payment mode</div>
            <h2>{overview.summary.stripeModeLabel}</h2>
            <p>
              Platform ops, onboarding, and release readiness all stay visible together so the
              next action is obvious.
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
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="section-kicker">Attention queue</div>
          <h3>What needs attention first</h3>
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

        <article className="panel section-card admin-section">
          <div className="section-kicker">Organizer coverage</div>
          <h3>Currently active organizers</h3>
          <div className="timeline">
            {organizers.slice(0, 6).map((organizer) => (
              <div className="timeline-step" key={organizer.slug}>
                <strong>{organizer.name}</strong>
                <span>
                  {organizer.city}, {organizer.region}
                </span>
                <span>{organizer.summary.activeCount} active registrations</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
