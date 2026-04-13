import Link from "next/link";

import { getOrganizerOccurrencesAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { saveOrganizerOccurrenceAction } from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

function formatDateTimeLocal(value, timeZone) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function formatEurosInput(cents) {
  if (typeof cents !== "number") {
    return "";
  }

  const euros = cents / 100;

  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
}

export default async function OrganizerOccurrencesPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerOccurrencesAdmin(slug);
  const selectedEventFilter = typeof query.event === "string" ? query.event : "";
  const editId = typeof query.edit === "string" ? query.edit : "";
  const selectedOccurrence = editId
    ? data.occurrences.find((occurrence) => occurrence.id === editId) ?? null
    : null;
  const selectedEvent = selectedOccurrence?.eventSlug || selectedEventFilter;
  const activeEvent =
    data.events.find((event) => event.id === selectedOccurrence?.eventTypeId) ||
    data.events.find((event) => event.slug === selectedEvent) ||
    data.events[0] ||
    null;
  const occurrences = selectedEvent
    ? data.occurrences.filter((occurrence) => occurrence.eventSlug === selectedEvent)
    : data.occurrences;
  const defaultEventTypeId = selectedOccurrence?.eventTypeId || activeEvent?.id || "";
  const isEditing = Boolean(selectedOccurrence);

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
          <p className="admin-page-tip">
            You can still publish free or pay-at-event dates now. Passreserve will stop paid dates
            only if billing setup is still missing.
          </p>
        ) : null}
        <div className="admin-card-grid">
          {occurrences.map((occurrence) => (
            <article
              className={`admin-card${selectedOccurrence?.id === occurrence.id ? " admin-card-active" : ""}`}
              key={occurrence.id}
            >
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${occurrence.status.toLowerCase()}`}>
                      {occurrence.status}
                    </span>
                    <span className={`admin-badge admin-badge-${occurrence.published ? "public" : "draft"}`}>
                      {occurrence.published ? "Published" : "Draft only"}
                    </span>
                  </div>
                  <h4>{occurrence.eventTitle}</h4>
                  <p>{occurrence.startsAtLabel}</p>
                </div>
              </div>
              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">Ends</span>
                  <strong>{occurrence.endsAtLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Seats left</span>
                  <strong>{occurrence.capacitySummary.remaining}</strong>
                </div>
                <div>
                  <span className="metric-label">Capacity</span>
                  <strong>{occurrence.capacity}</strong>
                </div>
                <div>
                  <span className="metric-label">Price</span>
                  <strong>{formatEurosInput(occurrence.priceCents)} EUR</strong>
                </div>
              </div>
              <div className="admin-note-list">
                <div className="admin-note-item">
                  <span className="spotlight-label">Collection</span>
                  <strong>
                    {occurrence.usesOnlinePayments
                      ? `${occurrence.prepayPercentage}% collected online`
                      : "Pay at the event"}
                  </strong>
                </div>
                <div className="admin-note-item">
                  <span className="spotlight-label">Venue</span>
                  <strong>{occurrence.venueTitle || activeEvent?.venueTitle || "Use event default"}</strong>
                </div>
              </div>
              <div className="hero-actions">
                <Link
                  className="button button-primary"
                  href={`/${slug}/admin/occurrences?event=${encodeURIComponent(occurrence.eventSlug)}&edit=${encodeURIComponent(occurrence.id)}#date-form`}
                >
                  Edit date
                </Link>
              </div>
            </article>
          ))}
          {occurrences.length === 0 ? (
            <div className="timeline-step">
              <strong>No dates match this event filter yet.</strong>
              <span>Choose another event or clear the filter to review every scheduled date.</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel section-card admin-section" id="date-form">
        <div className="section-kicker">{isEditing ? "Edit date" : "Create date"}</div>
        <h3>{isEditing ? `${selectedOccurrence.eventTitle} date` : "Create a new date"}</h3>
        <p className="admin-page-tip">
          Pick the event, choose the start and end time, then set capacity and payment settings.
          Times follow {data.organizer.timeZone}.
        </p>
        <form action={saveOrganizerOccurrenceAction} className="registration-field-grid">
          <input name="eventFilter" type="hidden" value={selectedEvent} />
          <input name="slug" type="hidden" value={slug} />
          <input name="id" type="hidden" value={selectedOccurrence?.id || ""} />
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
            <select defaultValue={selectedOccurrence?.status || "SCHEDULED"} name="status">
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          <label className="field">
            <span>Starts</span>
            <input
              defaultValue={formatDateTimeLocal(selectedOccurrence?.startsAt, data.organizer.timeZone)}
              name="startsAt"
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>Ends</span>
            <input
              defaultValue={formatDateTimeLocal(selectedOccurrence?.endsAt, data.organizer.timeZone)}
              name="endsAt"
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>Capacity</span>
            <input
              defaultValue={selectedOccurrence?.capacity ?? 12}
              min="1"
              name="capacity"
              type="number"
            />
          </label>
          <label className="field">
            <span>Price (EUR)</span>
            <input
              defaultValue={formatEurosInput(selectedOccurrence?.priceCents ?? activeEvent?.basePriceCents)}
              min="0"
              name="priceEuros"
              step="0.01"
              type="number"
            />
          </label>
          <label className="field">
            <span>Prepay percentage</span>
            <input
              defaultValue={
                selectedOccurrence?.prepayPercentage ?? activeEvent?.prepayPercentage ?? 0
              }
              max="100"
              min="0"
              name="prepayPercentage"
              type="number"
            />
          </label>
          <label className="field">
            <span>Venue title</span>
            <input
              defaultValue={selectedOccurrence?.venueTitle || activeEvent?.venueTitle || ""}
              name="venueTitle"
              type="text"
            />
          </label>
          <label className="field">
            <span>Published</span>
            <select
              defaultValue={selectedOccurrence ? String(Boolean(selectedOccurrence.published)) : "false"}
              name="published"
            >
              <option value="false">Draft only</option>
              <option value="true">Published</option>
            </select>
          </label>
          <label className="field field-span">
            <span>Note</span>
            <textarea defaultValue={selectedOccurrence?.note || ""} name="note" rows="2" />
          </label>
          <label className="field field-span">
            <span>Image URL</span>
            <input defaultValue={selectedOccurrence?.imageUrl || ""} name="imageUrl" type="url" />
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              {isEditing ? "Save changes" : "Create date"}
            </button>
            {isEditing ? (
              <Link
                className="button button-secondary"
                href={selectedEvent ? `/${slug}/admin/occurrences?event=${encodeURIComponent(selectedEvent)}#date-form` : `/${slug}/admin/occurrences#date-form`}
              >
                Create new date
              </Link>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
