import { getOrganizerEventsAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { saveOrganizerEventAction } from "../actions.js";

export default async function OrganizerEventsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerEventsAdmin(slug);

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Event saved successfully.
        </div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="section-kicker">Event catalog</div>
        <h2>Create or update organizer events</h2>
        <div className="admin-card-grid">
          {data.events.map((event) => (
            <article className="admin-card" key={event.id}>
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
                  <span className="metric-label">Occurrences</span>
                  <strong>{event.occurrenceCount}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Save event</div>
        <h3>New or existing event</h3>
        <form action={saveOrganizerEventAction} className="registration-field-grid">
          <input name="slug" type="hidden" value={slug} />
          <label className="field">
            <span>Existing event id</span>
            <input name="id" placeholder="leave blank to create new" type="text" />
          </label>
          <label className="field">
            <span>Title</span>
            <input name="title" required type="text" />
          </label>
          <label className="field">
            <span>Event slug</span>
            <input name="eventSlug" type="text" />
          </label>
          <label className="field">
            <span>Category</span>
            <input name="category" type="text" />
          </label>
          <label className="field">
            <span>Visibility</span>
            <select name="visibility">
              <option value="DRAFT">Draft</option>
              <option value="PUBLIC">Public</option>
              <option value="UNLISTED">Unlisted</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="field">
            <span>Base price cents</span>
            <input name="basePriceCents" type="number" />
          </label>
          <label className="field">
            <span>Prepay percentage</span>
            <input name="prepayPercentage" type="number" />
          </label>
          <label className="field">
            <span>Duration minutes</span>
            <input name="durationMinutes" type="number" />
          </label>
          <label className="field field-span">
            <span>Summary</span>
            <textarea name="summary" rows="2" />
          </label>
          <label className="field field-span">
            <span>Description</span>
            <textarea name="description" rows="3" />
          </label>
          <label className="field field-span">
            <span>Audience</span>
            <textarea name="audience" rows="2" />
          </label>
          <label className="field">
            <span>Venue title</span>
            <input name="venueTitle" type="text" />
          </label>
          <label className="field field-span">
            <span>Venue detail</span>
            <textarea name="venueDetail" rows="2" />
          </label>
          <label className="field">
            <span>Map URL</span>
            <input name="mapHref" type="url" />
          </label>
          <label className="field field-span">
            <span>Attendee instructions</span>
            <textarea name="attendeeInstructions" rows="2" />
          </label>
          <label className="field field-span">
            <span>Organizer notes</span>
            <textarea name="organizerNotes" rows="2" />
          </label>
          <label className="field field-span">
            <span>Cancellation policy</span>
            <textarea name="cancellationPolicy" rows="2" />
          </label>
          <label className="field field-span">
            <span>Highlights (one per line)</span>
            <textarea name="highlights" rows="3" />
          </label>
          <label className="field field-span">
            <span>Included (one per line)</span>
            <textarea name="included" rows="3" />
          </label>
          <label className="field field-span">
            <span>Policies (one per line)</span>
            <textarea name="policies" rows="3" />
          </label>
          <label className="field field-span">
            <span>Image URL</span>
            <input name="imageUrl" type="url" />
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              Save event
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
