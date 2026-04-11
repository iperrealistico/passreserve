import { getOrganizerOccurrencesAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { saveOrganizerOccurrenceAction } from "../actions.js";

export default async function OrganizerOccurrencesPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerOccurrencesAdmin(slug);

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Occurrence saved successfully.
        </div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="section-kicker">Occurrence planner</div>
        <h2>Current occurrences</h2>
        <div className="timeline">
          {data.occurrences.map((occurrence) => (
            <div className="timeline-step" key={occurrence.id}>
              <strong>{occurrence.eventTitle}</strong>
              <span>{occurrence.startsAtLabel}</span>
              <span>{occurrence.endsAtLabel}</span>
              <span>
                {occurrence.capacitySummary.remaining} remaining · {occurrence.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Save occurrence</div>
        <h3>Use full ISO strings to keep the timezone explicit</h3>
        <form action={saveOrganizerOccurrenceAction} className="registration-field-grid">
          <input name="slug" type="hidden" value={slug} />
          <label className="field">
            <span>Existing occurrence id</span>
            <input name="id" placeholder="leave blank to create new" type="text" />
          </label>
          <label className="field">
            <span>Event</span>
            <select name="eventTypeId">
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
              Save occurrence
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
