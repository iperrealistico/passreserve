import {
  getOrganizerEventsAdmin,
  getOrganizerPaymentsAdmin
} from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { recordVenuePaymentAction } from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerPaymentsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const [data, eventsData] = await Promise.all([
    getOrganizerPaymentsAdmin(slug),
    getOrganizerEventsAdmin(slug)
  ]);
  const selectedEvent = typeof query.event === "string" ? query.event : "";
  const payments = selectedEvent
    ? data.payments.filter((payment) => payment.eventSlug === selectedEvent)
    : data.payments;

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Venue payment recorded successfully.
        </div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/payments`}
        description="Use payments to reconcile what was collected online, what was collected at the venue, and what is still outstanding."
        eyebrow="Payments"
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        tip="Filter by event whenever different pricing models are active, so deposits and venue balances do not get mixed together."
        title={selectedEvent ? "Payment tracking for one event" : "Online and venue-side payment tracking"}
      />

      <section className="panel section-card admin-section">
      <div className="admin-card-grid">
        {payments.map((payment) => (
          <article className="admin-card" key={payment.id}>
            <div className="admin-card-head">
              <div>
                <h4>{payment.registrationCode}</h4>
                <p>
                  {payment.attendeeName} · {payment.eventTitle}
                </p>
              </div>
            </div>
            <div className="admin-card-metrics">
              <div>
                <span className="metric-label">Online collected</span>
                <strong>{payment.onlineCollectedLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Venue collected</span>
                <strong>{payment.venueCollectedLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Still due</span>
                <strong>{payment.dueAtEventOpenLabel}</strong>
              </div>
            </div>
            {payment.ledger.length > 0 ? (
              <div className="timeline">
                {payment.ledger.map((entry) => (
                  <div className="timeline-step" key={entry.id}>
                    <strong>
                      {entry.kind} · {entry.status}
                    </strong>
                    <span>{entry.note}</span>
                    <span>
                      {entry.amountLabel} · {entry.provider} · {entry.occurredAtLabel}
                    </span>
                    {entry.stripeAccountId ? <span>{entry.stripeAccountId}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {payment.dueAtEventOpenCents > 0 ? (
              <form action={recordVenuePaymentAction} className="registration-panel-stack">
                <input name="eventFilter" type="hidden" value={selectedEvent} />
                <input name="slug" type="hidden" value={slug} />
                <input name="registrationId" type="hidden" value={payment.id} />
                <label className="field">
                  <span>Venue payment cents</span>
                  <input name="amountCents" placeholder={String(payment.dueAtEventOpenCents)} type="number" />
                </label>
                <div className="hero-actions">
                  <button className="button button-primary" type="submit">
                    Record venue payment
                  </button>
                </div>
              </form>
            ) : null}
          </article>
        ))}
        {payments.length === 0 ? (
          <article className="admin-card">
            <h4>No payments match this filter.</h4>
            <p>Choose another event or clear the filter to review all organizer payment records.</p>
          </article>
        ) : null}
      </div>
      </section>
    </div>
  );
}
