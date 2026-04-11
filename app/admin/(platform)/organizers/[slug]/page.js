import Link from "next/link";
import { notFound } from "next/navigation";

import { getPlatformOrganizerDetail } from "../../../../../lib/passreserve-admin-service.js";

export default async function PlatformOrganizerDetailPage({ params }) {
  const { slug } = await params;
  const detail = await getPlatformOrganizerDetail(slug);

  if (!detail) {
    notFound();
  }

  return (
    <div className="admin-page">
      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer detail</div>
        <h2>{detail.organizer.name}</h2>
        <p>
          {detail.organizer.city}, {detail.organizer.region}
        </p>
        <div className="pill-list">
          <span className="pill">{detail.organizer.summary.activeCount} active registrations</span>
          <span className="pill">{detail.organizer.summary.upcomingOccurrences} upcoming occurrences</span>
          <span className="pill">{detail.organizer.summary.onlineCollectedLabel} online</span>
          <span className="pill">{detail.organizer.summary.dueAtEventLabel} due at venue</span>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href={detail.organizer.dashboardHref}>
            Open organizer dashboard
          </Link>
          <Link className="button button-secondary" href={detail.organizer.publicHref}>
            Public organizer page
          </Link>
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">Admin accounts</div>
          <h3>Organizer admins</h3>
          <div className="timeline">
            {detail.admins.map((admin) => (
              <div className="timeline-step" key={admin.id}>
                <strong>{admin.name}</strong>
                <span>{admin.email}</span>
                <span>{admin.isPrimary ? "Primary admin" : "Organizer admin"}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Events</div>
          <h3>Published and draft events</h3>
          <div className="timeline">
            {detail.events.map((event) => (
              <div className="timeline-step" key={event.id}>
                <strong>{event.title}</strong>
                <span>{event.visibility}</span>
                <span>{event.occurrenceCount} occurrences</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Recent registrations</div>
        <h3>Latest attendee activity</h3>
        <div className="timeline">
          {detail.recentRegistrations.map((registration) => (
            <div className="timeline-step" key={registration.id}>
              <strong>
                {registration.registrationCode} · {registration.attendeeName}
              </strong>
              <span>{registration.eventTitle}</span>
              <span>{registration.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
