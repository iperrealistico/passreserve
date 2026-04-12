import {
  getOrganizerEventsAdmin,
  getOrganizerRegistrationsAdmin
} from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { updateOrganizerRegistrationAction } from "../actions.js";
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

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Registration updated successfully.
        </div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/registrations`}
        description="Use registrations to manage attendee status after someone signs up: confirm attendance, mark no-shows, or cancel a registration."
        eyebrow="Registrations"
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        tip="Filter by event when several event lines are active at once so you can work one attendee queue at a time."
        title={selectedEvent ? "Registration queue for one event" : "Organizer registration queue"}
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
                <p>{registration.eventTitle}</p>
              </div>
            </div>
            <div className="admin-card-metrics">
              <div>
                <span className="metric-label">Status</span>
                <strong>{registration.status}</strong>
              </div>
              <div>
                <span className="metric-label">Date</span>
                <strong>{registration.occurrenceLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Online collected</span>
                <strong>{registration.onlineCollectedLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Open at venue</span>
                <strong>{registration.dueAtEventOpenLabel}</strong>
              </div>
            </div>
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
