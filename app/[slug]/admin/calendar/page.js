import {
  getOrganizerCalendar,
  getOrganizerEventsAdmin
} from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerCalendarPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const [calendar, eventsData] = await Promise.all([
    getOrganizerCalendar(slug),
    getOrganizerEventsAdmin(slug)
  ]);
  const selectedEvent = typeof query.event === "string" ? query.event : "";
  const entries = selectedEvent
    ? calendar.entries.filter((entry) => entry.eventSlug === selectedEvent)
    : calendar.entries;

  return (
    <div className="admin-page">
      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/calendar`}
        description="Use the calendar when you want to see upcoming dates in date order and quickly spot what needs attention next."
        eyebrow="Calendar"
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        tip="If one event is getting hard to follow, filter it here so the date list only shows that event."
        title={selectedEvent ? "Scheduled dates for one event" : "Scheduled dates across your events"}
      />

      <section className="panel section-card admin-section">
        <div className="section-kicker">Dates</div>
        <h3>{selectedEvent ? "Filtered scheduled dates" : "Upcoming dates"}</h3>
        <div className="timeline">
          {entries.map((entry) => (
            <div className="timeline-step" key={entry.id}>
              <strong>{entry.eventTitle}</strong>
              <span>{entry.dateLabel}</span>
              <span>{entry.timeLabel}</span>
              <span>
                {entry.capacity.remaining} remaining · {entry.published ? "Published" : "Draft"}
              </span>
            </div>
          ))}
          {entries.length === 0 ? (
            <div className="timeline-step">
              <strong>No dates match this event filter yet.</strong>
              <span>Try another event or clear the filter to see all scheduled dates.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
