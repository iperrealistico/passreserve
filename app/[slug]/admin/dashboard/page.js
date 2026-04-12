import { getOrganizerDashboard } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import Link from "next/link";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerDashboardPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const dashboard = await getOrganizerDashboard(slug);

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "impersonated"
            ? "Organizer dashboard opened successfully."
            : "Organizer admin update saved successfully."}
        </div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/dashboard`}
        description="Start here when you want the quickest read on what needs attention today: upcoming dates, recent signups, and whether any attendee still needs payment follow-up."
        eyebrow="Dashboard"
        query={query}
        tip="Use Events for the event pages themselves, Dates for the scheduled sessions, Registrations for attendee status, Payments for reconciliation, and Billing for Stripe setup."
        title={`${dashboard.organizer.name} overview`}
      />

      <section className="panel section-card admin-section">
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Active registrations</div>
            <div className="metric-value">{dashboard.summary.activeCount}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Upcoming dates</div>
            <div className="metric-value">{dashboard.summary.upcomingOccurrences}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Online collected</div>
            <div className="metric-value">{dashboard.summary.onlineCollectedLabel}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Due at venue</div>
            <div className="metric-value">{dashboard.summary.dueAtEventLabel}</div>
          </div>
        </div>
      </section>

      {!dashboard.billing.enabled ? (
        <section className="panel section-card admin-section">
          <div className="section-kicker">Billing checklist</div>
          <h3>Paid dates are still blocked</h3>
          <p>{dashboard.billing.paidPublishingLabel}</p>
          <div className="timeline">
            {dashboard.billing.checklist.map((item) => (
              <div className="timeline-step" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href={`/${slug}/admin/billing`}>
              Open billing
            </Link>
          </div>
        </section>
      ) : null}

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">Upcoming occurrences</div>
          <h3>Next scheduled dates</h3>
          <div className="timeline">
            {dashboard.upcomingOccurrences.map((entry) => (
              <div className="timeline-step" key={entry.id}>
                <strong>{entry.eventTitle}</strong>
                <span>{entry.dateLabel}</span>
                <span>{entry.timeLabel}</span>
                <span>{entry.capacity.remaining} seats remaining</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Recent registrations</div>
          <h3>Latest attendee activity</h3>
          <div className="timeline">
            {dashboard.recentRegistrations.map((registration) => (
              <div className="timeline-step" key={registration.id}>
                <strong>
                  {registration.registrationCode} · {registration.attendeeName}
                </strong>
                <span>{registration.eventTitle}</span>
                <span>{registration.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
