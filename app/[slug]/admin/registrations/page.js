import {
  getOrganizerEventsAdmin,
  getOrganizerRegistrationsAdmin
} from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import {
  recordVenuePaymentAction,
  updateOrganizerRegistrationAction
} from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerRegistrationsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const [data, eventsData] = await Promise.all([
    getOrganizerRegistrationsAdmin(slug),
    getOrganizerEventsAdmin(slug)
  ]);
  const selectedEvent = typeof query.event === "string" ? query.event : "";
  const registrations = selectedEvent
    ? data.registrations.filter((registration) => registration.eventSlug === selectedEvent)
    : data.registrations;
  const canRecordVenuePayment = (registration) =>
    registration.dueAtEventOpenCents > 0 &&
    !["PENDING_CONFIRM", "CANCELLED", "NO_SHOW"].includes(registration.status);

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "recorded"
            ? "Venue payment recorded successfully."
            : "Registration updated successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/registrations`}
        description="Use this queue to manage attendee status, review what has been paid online, and record anything collected in person at the venue."
        eyebrow="Registrations"
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        tip="Keep everything in one place: attendee status, online payment history, venue balance still due, and any in-person payment you collect before or during the event."
        title={selectedEvent ? "Registrations and payments for one event" : "Attendee and payment queue"}
      />

      <section className="panel section-card admin-section">
        <div className="admin-card-grid">
          {registrations.map((registration) => (
            <article className="admin-card" key={registration.id}>
              <div className="admin-card-head">
                <div>
                  <h4>
                    {registration.registrationCode} · {registration.attendeeName}
                  </h4>
                  <p>
                    {registration.eventTitle} · {registration.occurrenceLabel}
                  </p>
                </div>
              </div>
              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">Status</span>
                  <strong>{registration.status}</strong>
                </div>
                <div>
                  <span className="metric-label">Ticket</span>
                  <strong>{registration.ticketLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Online collected</span>
                  <strong>{registration.onlineCollectedLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Collected at venue</span>
                  <strong>{registration.venueCollectedLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Still due at venue</span>
                  <strong>{registration.dueAtEventOpenLabel}</strong>
                </div>
              </div>

              {registration.ledger.length > 0 ? (
                <div className="timeline admin-payment-ledger">
                  {registration.ledger.map((entry) => (
                    <div className="timeline-step" key={entry.id}>
                      <strong>
                        {entry.amountLabel} · {entry.provider}
                      </strong>
                      <span>{entry.note}</span>
                      <span>{entry.occurredAtLabel}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {canRecordVenuePayment(registration) ? (
                <form action={recordVenuePaymentAction} className="admin-inline-form">
                  <input name="eventFilter" type="hidden" value={selectedEvent} />
                  <input name="slug" type="hidden" value={slug} />
                  <input name="registrationId" type="hidden" value={registration.id} />
                  <div className="admin-inline-form-row">
                    <label className="field admin-inline-field">
                      <span>Amount collected at venue</span>
                      <input
                        inputMode="decimal"
                        name="amountEuros"
                        placeholder={(registration.dueAtEventOpenCents / 100).toFixed(2)}
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <button className="button button-primary" type="submit">
                      Record venue payment
                    </button>
                  </div>
                  <p className="admin-form-hint">
                    Enter the amount in euros, for example {(registration.dueAtEventOpenCents / 100).toFixed(2)}.
                  </p>
                </form>
              ) : registration.dueAtEventOpenCents > 0 ? (
                <p className="admin-page-tip">
                  Record the venue balance after this attendee is confirmed or once the event is underway.
                </p>
              ) : (
                <p className="admin-page-tip">No venue balance is left open for this registration.</p>
              )}

              <div className="hero-actions">
                {registration.actions.map((action) => (
                  <form action={updateOrganizerRegistrationAction} key={action}>
                    <input name="eventFilter" type="hidden" value={selectedEvent} />
                    <input name="slug" type="hidden" value={slug} />
                    <input name="registrationId" type="hidden" value={registration.id} />
                    <input name="action" type="hidden" value={action} />
                    <button className="button button-secondary" type="submit">
                      {action.replaceAll("_", " ")}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}
          {registrations.length === 0 ? (
            <article className="admin-card">
              <h4>No registrations match this filter.</h4>
              <p>Choose another event or clear the filter to see the full registration queue.</p>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
