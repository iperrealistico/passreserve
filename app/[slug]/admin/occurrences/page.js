import { getOrganizerOccurrencesAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { saveOrganizerOccurrenceAction } from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerOccurrencesPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerOccurrencesAdmin(slug);
  const selectedEvent = typeof query.event === "string" ? query.event : "";
  const occurrences = selectedEvent
    ? data.occurrences.filter((occurrence) => occurrence.eventSlug === selectedEvent)
    : data.occurrences;
  const defaultEventTypeId =
    data.events.find((event) => event.slug === selectedEvent)?.id || data.events[0]?.id || "";

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Date saved successfully.
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/occurrences`}
        description="A date is one scheduled instance of an event. Use this page to create, publish, cancel, or review the actual bookable dates that sit under each event."
        eyebrow="Dates"
        events={data.events}
        query={query}
        selectedEvent={selectedEvent}
        tip="If Events are the templates, Dates are the real sessions attendees can pick from. This is the place to change timing, capacity, price, and publication state for each date."
        title={selectedEvent ? "Manage dates for one event" : "Manage scheduled dates"}
      />

      <section className="panel section-card admin-section">
        <div className="section-kicker">Date planner</div>
        <h3>{selectedEvent ? "Current dates for this event" : "Current dates"}</h3>
        {!data.billing.enabled ? (
          <p>
            Paid dates stay blocked until billing is ready. Free events and pay-at-event dates can
            still be published.
          </p>
        ) : null}
        <div className="timeline">
          {occurrences.map((occurrence) => (
            <div className="timeline-step" key={occurrence.id}>
              <strong>{occurrence.eventTitle}</strong>
              <span>{occurrence.startsAtLabel}</span>
              <span>{occurrence.endsAtLabel}</span>
              <span>
                {occurrence.capacitySummary.remaining} remaining · {occurrence.status}
              </span>
              <span>
                {occurrence.usesOnlinePayments ? "Online payment enabled" : "No online payment"}
              </span>
            </div>
          ))}
          {occurrences.length === 0 ? (
            <div className="timeline-step">
              <strong>No dates match this event filter yet.</strong>
              <span>Choose another event or clear the filter to review every scheduled date.</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Save date</div>
        <h3>Use full ISO strings to keep the timezone explicit</h3>
        <p>
          Publishing a paid occurrence requires Stripe Connect to be ready and, if your monthly fee
          is above zero, platform billing to be active.
        </p>
        <form action={saveOrganizerOccurrenceAction} className="registration-field-grid">
          <input name="eventFilter" type="hidden" value={selectedEvent} />
          <input name="slug" type="hidden" value={slug} />
          <label className="field">
            <span>Existing date id</span>
            <input name="id" placeholder="leave blank to create new" type="text" />
          </label>
          <label className="field">
            <span>Event</span>
            <select defaultValue={defaultEventTypeId} name="eventTypeId">
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status">
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label className="field">
            <span>Starts at ISO</span>
            <input name="startsAt" placeholder="2026-05-01T18:30:00+02:00" type="text" />
          </label>
          <label className="field">
            <span>Ends at ISO</span>
            <input name="endsAt" placeholder="2026-05-01T21:30:00+02:00" type="text" />
          </label>
          <label className="field">
            <span>Capacity</span>
            <input name="capacity" type="number" />
          </label>
          <label className="field">
            <span>Price cents</span>
            <input name="priceCents" type="number" />
          </label>
          <label className="field">
            <span>Prepay percentage</span>
            <input name="prepayPercentage" type="number" />
          </label>
          <label className="field">
            <span>Venue title</span>
            <input name="venueTitle" type="text" />
          </label>
          <label className="field">
            <span>Published</span>
            <select name="published">
              <option value="false">Draft only</option>
              <option value="true">Published</option>
            </select>
          </label>
          <label className="field field-span">
            <span>Note</span>
            <textarea name="note" rows="2" />
          </label>
          <label className="field field-span">
            <span>Image URL</span>
            <input name="imageUrl" type="url" />
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              Save date
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
