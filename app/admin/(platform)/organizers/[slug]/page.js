import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getPlatformOrganizerBySlug,
  getPlatformOrganizerSlugs
} from "../../../../../lib/passreserve-platform";

export function generateStaticParams() {
  return getPlatformOrganizerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getPlatformOrganizerBySlug(slug);

  return {
    title: organizer ? `${organizer.name} host detail` : "Host not found"
  };
}

export default async function PlatformOrganizerDetailPage({ params }) {
  const { slug } = await params;
  const organizer = getPlatformOrganizerBySlug(slug);

  if (!organizer) {
    notFound();
  }

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="breadcrumb">
            <Link href="/admin/organizers">Organizers</Link>
            <span>/</span>
            <span>{organizer.name}</span>
          </div>
          <h2>{organizer.name}</h2>
          <p>
            {organizer.city}, {organizer.region} · {organizer.tagline}
          </p>
          <div className="pill-list">
            <span className="pill">{organizer.metrics.eventCount} event types</span>
            <span className="pill">{organizer.metrics.publishedOccurrences} published dates</span>
            <span className="pill">{organizer.summary.activeCount} active registrations</span>
            <span className="pill">{organizer.summary.onlineCollectedLabel} online collected</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Organizer status</div>
            <h2>{organizer.healthLabel}</h2>
            <p>
              Joined {organizer.joinedAtLabel}. This view keeps the public page, host dashboard,
              payments, and support context visible together.
            </p>
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="metric-label">Pending confirm</span>
              <div className="metric-value">{organizer.summary.pendingConfirmations}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Pending payment</span>
              <div className="metric-value">{organizer.summary.pendingPayments}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Attended</span>
              <div className="metric-value">{organizer.summary.attendedCount}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Venue balances</span>
              <div className="metric-value">{organizer.summary.openVenueBalances}</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="section-kicker">Support actions</div>
          <h3>The team can jump directly into the right host page.</h3>
          <div className="admin-card-grid">
            {organizer.supportActions.map((action) => (
              <article className="admin-card" key={action.href}>
                <h4>{action.label}</h4>
                <p>{action.detail}</p>
                <Link className="inline-link" href={action.href}>
                  Open page
                </Link>
              </article>
            ))}
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Provider summary</div>
            <h3>Collection modes active for this organizer.</h3>
            <div className="ops-provider-grid">
              {organizer.providerSummary.map((provider) => (
                <div className="ops-provider-card" key={provider.mode}>
                  <span className="route-label">{provider.label}</span>
                  <strong>{provider.count} records</strong>
                  <span>{provider.amountLabel} collected online</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Timezone audit</div>
            <h3>Daily plans stay anchored to {organizer.timeZone}.</h3>
            <div className="status-list">
              {organizer.timeZoneAudit.items.map((item, index) => (
                <div className="status-item" key={item.title}>
                  <span className="status-index">{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Event catalog preview</div>
        <h3>Public promises, occurrence timing, and payment defaults stay visible.</h3>
        <div className="admin-card-grid">
          {organizer.eventsPreview.map((event) => (
            <article className="admin-card" key={event.slug}>
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${event.visibility}`}>
                      {event.visibility}
                    </span>
                  </div>
                  <h4>{event.title}</h4>
                  <p>{event.summary}</p>
                </div>
                <div className="admin-card-price">
                  <strong>{event.basePriceLabel}</strong>
                  <span>{event.collectionLabel}</span>
                </div>
              </div>

              <div className="ops-inline-list">
                <span>{event.category}</span>
                <span>{event.nextOccurrenceLabel}</span>
                <span>{event.registrationsCount} registrations tracked</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="section-kicker">Recent registrations</div>
          <h3>The team can trace guest outcomes quickly.</h3>
          <div className="timeline">
            {organizer.recentRegistrations.map((record) => (
              <div className="timeline-step" key={record.id}>
                <strong>{record.registrationCode}</strong>
                <span>
                  {record.attendeeName} · {record.createdAtLabel}
                </span>
                <span>
                  {record.eventTitle} · {record.statusLabel} · {record.payment.collectionSummary}
                </span>
              </div>
            ))}
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Capacity watch</div>
            <h3>Occurrences that deserve support attention.</h3>
            <div className="admin-note-list">
              {organizer.hotOccurrences.length > 0 ? (
                organizer.hotOccurrences.map((occurrence) => (
                  <div className="admin-note-item" key={occurrence.id}>
                    <strong>{occurrence.eventTitle}</strong>
                    <p>
                      {occurrence.label} · {occurrence.remainingCount} seats remain ·{" "}
                      {occurrence.collectionLabel}
                    </p>
                  </div>
                ))
              ) : (
                <div className="admin-note-item">
                  <strong>No hot occurrences</strong>
                  <p>The current dates still have comfortable room and no special support flags.</p>
                </div>
              )}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
