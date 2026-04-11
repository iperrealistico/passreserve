import { getOrganizerCalendar } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";

export default async function OrganizerCalendarPage({ params }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const calendar = await getOrganizerCalendar(slug);

  return (
    <section className="panel section-card admin-section">
      <div className="section-kicker">Calendar</div>
      <h2>Upcoming occurrences</h2>
      <div className="timeline">
        {calendar.entries.map((entry) => (
          <div className="timeline-step" key={entry.id}>
            <strong>{entry.eventTitle}</strong>
            <span>{entry.dateLabel}</span>
            <span>{entry.timeLabel}</span>
            <span>
              {entry.capacity.remaining} remaining · {entry.published ? "Published" : "Draft"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
