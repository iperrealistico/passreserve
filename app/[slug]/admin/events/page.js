import Link from "next/link";

import { getOrganizerEventsAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import {
  deleteOrganizerEventAction,
  saveOrganizerEventAction,
  suspendOrganizerEventAction
} from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

function multilineValue(entries) {
  return Array.isArray(entries) ? entries.join("\n") : "";
}

export default async function OrganizerEventsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerEventsAdmin(slug);
  const editId = typeof query.edit === "string" ? query.edit : "";
  const selectedEvent = editId ? data.events.find((event) => event.id === editId) ?? null : null;
  const isEditing = Boolean(selectedEvent);

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "status-updated"
            ? "Event visibility updated successfully."
            : query.message === "deleted"
              ? "Event deleted successfully."
              : "Event saved successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/events`}
        description="Use this page to manage the event pages themselves: title, copy, pricing defaults, and whether an event should be visible to the public."
        eyebrow="Events"
        query={query}
        tip="Think of an event as the reusable page template. The separate Dates area is where you add the actual scheduled sessions people can book."
        title="Create, pause, or update event pages"
      />

      <section className="panel section-card admin-section">
        <div className="section-kicker">Event list</div>
        <h3>Existing event pages</h3>
        <div className="admin-card-grid">
          {data.events.map((event) => (
            <article
              className={`admin-card${selectedEvent?.id === event.id ? " admin-card-active" : ""}`}
              key={event.id}
            >
              <h4>{event.title}</h4>
              <p>{event.summary}</p>
              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">Visibility</span>
                  <strong>{event.visibility}</strong>
                </div>
                <div>
                  <span className="metric-label">Base price</span>
                  <strong>{event.basePriceLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Dates</span>
                  <strong>{event.occurrenceCount}</strong>
                </div>
                <div>
                  <span className="metric-label">Public dates</span>
                  <strong>{event.publishedOccurrenceCount}</strong>
                </div>
                <div>
                  <span className="metric-label">Registrations</span>
                  <strong>{event.registrationCount}</strong>
                </div>
              </div>
              <div className="hero-actions">
                <Link
                  className="button button-primary"
                  href={`/${slug}/admin/events?edit=${encodeURIComponent(event.id)}#event-form`}
                >
                  Edit event
                </Link>
                <form action={suspendOrganizerEventAction}>
                  <input name="slug" type="hidden" value={slug} />
                  <input name="eventId" type="hidden" value={event.id} />
                  <button className="button button-secondary" type="submit">
                    {event.visibility === "ARCHIVED" ? "Restore as draft" : "Suspend event"}
                  </button>
                </form>
                <form action={deleteOrganizerEventAction}>
                  <input name="slug" type="hidden" value={slug} />
                  <input name="eventId" type="hidden" value={event.id} />
                  <button
                    className="button button-secondary button-danger"
                    disabled={event.registrationCount > 0}
                    type="submit"
                  >
                    Delete event
                  </button>
                </form>
              </div>
              {event.registrationCount > 0 ? (
                <p className="admin-page-tip">
                  This event already has registrations, so it can be suspended but not deleted.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section" id="event-form">
        <div className="section-kicker">{isEditing ? "Edit event" : "Create event"}</div>
        <h3>{isEditing ? selectedEvent.title : "Create a new event page"}</h3>
        <p className="admin-page-tip">
          {isEditing
            ? "You are editing an existing event. Update the details below, then save your changes."
            : "Start a fresh event page here. Once saved, you can add bookable dates in the Dates area."}
        </p>
        <form action={saveOrganizerEventAction} className="registration-field-grid">
          <input name="slug" type="hidden" value={slug} />
          <input name="id" type="hidden" value={selectedEvent?.id || ""} />
          <label className="field">
            <span>Title</span>
            <input defaultValue={selectedEvent?.title || ""} name="title" required type="text" />
          </label>
          <label className="field">
            <span>Event slug</span>
            <input defaultValue={selectedEvent?.slug || ""} name="eventSlug" type="text" />
          </label>
          <label className="field">
            <span>Category</span>
            <input defaultValue={selectedEvent?.category || ""} name="category" type="text" />
          </label>
          <label className="field">
            <span>Visibility</span>
            <select defaultValue={selectedEvent?.visibility || "DRAFT"} name="visibility">
              <option value="DRAFT">Draft</option>
              <option value="PUBLIC">Public</option>
              <option value="UNLISTED">Unlisted</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="field">
            <span>Base price cents</span>
            <input defaultValue={selectedEvent?.basePriceCents ?? ""} name="basePriceCents" type="number" />
          </label>
          <label className="field">
            <span>Prepay percentage</span>
            <input
              defaultValue={selectedEvent?.prepayPercentage ?? ""}
              name="prepayPercentage"
              type="number"
            />
          </label>
          <label className="field">
            <span>Duration minutes</span>
            <input
              defaultValue={selectedEvent?.durationMinutes ?? ""}
              name="durationMinutes"
              type="number"
            />
          </label>
          <label className="field field-span">
            <span>Summary</span>
            <textarea defaultValue={selectedEvent?.summary || ""} name="summary" rows="2" />
          </label>
          <label className="field field-span">
            <span>Description</span>
            <textarea defaultValue={selectedEvent?.description || ""} name="description" rows="3" />
          </label>
          <label className="field field-span">
            <span>Audience</span>
            <textarea defaultValue={selectedEvent?.audience || ""} name="audience" rows="2" />
          </label>
          <label className="field">
            <span>Venue title</span>
            <input defaultValue={selectedEvent?.venueTitle || ""} name="venueTitle" type="text" />
          </label>
          <label className="field field-span">
            <span>Venue detail</span>
            <textarea
              defaultValue={selectedEvent?.venueDetail || ""}
              name="venueDetail"
              rows="2"
            />
          </label>
          <label className="field">
            <span>Map URL</span>
            <input defaultValue={selectedEvent?.mapHref || ""} name="mapHref" type="url" />
          </label>
          <label className="field field-span">
            <span>Attendee instructions</span>
            <textarea
              defaultValue={selectedEvent?.attendeeInstructions || ""}
              name="attendeeInstructions"
              rows="2"
            />
          </label>
          <label className="field field-span">
            <span>Organizer notes</span>
            <textarea
              defaultValue={selectedEvent?.organizerNotes || ""}
              name="organizerNotes"
              rows="2"
            />
          </label>
          <label className="field field-span">
            <span>Cancellation policy</span>
            <textarea
              defaultValue={selectedEvent?.cancellationPolicy || ""}
              name="cancellationPolicy"
              rows="2"
            />
          </label>
          <label className="field field-span">
            <span>Highlights (one per line)</span>
            <textarea
              defaultValue={multilineValue(selectedEvent?.highlights)}
              name="highlights"
              rows="3"
            />
          </label>
          <label className="field field-span">
            <span>Included (one per line)</span>
            <textarea
              defaultValue={multilineValue(selectedEvent?.included)}
              name="included"
              rows="3"
            />
          </label>
          <label className="field field-span">
            <span>Policies (one per line)</span>
            <textarea
              defaultValue={multilineValue(selectedEvent?.policies)}
              name="policies"
              rows="3"
            />
          </label>
          <label className="field field-span">
            <span>Image URL</span>
            <input defaultValue={selectedEvent?.imageUrl || ""} name="imageUrl" type="url" />
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              {isEditing ? "Save changes" : "Create event"}
            </button>
            {isEditing ? (
              <Link className="button button-secondary" href={`/${slug}/admin/events#event-form`}>
                Create new event
              </Link>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
