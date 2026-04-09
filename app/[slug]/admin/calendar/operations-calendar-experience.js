import Link from "next/link";

export default function OperationsCalendarExperience({ organizer }) {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Calendar</div>
          <h2>Occurrence days now show attendees, payment pressure, and capacity watch notes.</h2>
          <p>
            The calendar stays occurrence-first, but every day card now carries organizer-local
            timing, booked attendee counts, online collection, and venue-balance follow-up.
          </p>
          <div className="pill-list">
            <span className="pill">{organizer.totalUpcomingOccurrences} upcoming occurrences</span>
            <span className="pill">{organizer.summary.pendingPayments} payment follow-ups</span>
            <span className="pill">{organizer.summary.openVenueBalances} venue-balance attendees</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Time zone</div>
            <h2>{organizer.timeZone}</h2>
            <p>
              Every day and time below is shown in the local host time zone so the team can plan
              staffing, check-in, and payment follow-up against the correct schedule.
            </p>
          </div>

          <div className="hero-actions">
            <Link className="button button-primary" href={organizer.registrationsHref}>
              Open registrations
            </Link>
            <Link className="button button-secondary" href={organizer.occurrencesHref}>
              Open date planner
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Upcoming day view</div>
              <h3>Upcoming dates shown in local time.</h3>
            </div>
            <div className="admin-inline-metrics">
              <span>{organizer.calendarDays.length} day groups</span>
              <span>{organizer.summary.onlineCollectedLabel} already collected</span>
            </div>
          </div>

          <div className="ops-day-list">
            {organizer.calendarDays.map((day) => (
              <article className="ops-day-card" key={day.key}>
                <div className="ops-day-header">
                  <div>
                    <div className="section-kicker">{day.weekdayLabel}</div>
                    <h4>{day.dateLabel}</h4>
                  </div>
                  <span className="pill">{day.occurrences.length} occurrences</span>
                </div>

                <div className="ops-occurrence-stack">
                  {day.occurrences.map((occurrence) => (
                    <article className="ops-occurrence-card" key={occurrence.id}>
                      <div className="ops-record-head">
                        <div>
                          <div className="admin-badge-row">
                            <span className={`admin-badge admin-badge-${occurrence.status}`}>
                              {occurrence.status}
                            </span>
                            <span className="route-label">{occurrence.collectionLabel}</span>
                          </div>
                          <h4 className="ops-record-title">{occurrence.eventTitle}</h4>
                          <p>
                            {occurrence.timeLabel} · {occurrence.venue}
                          </p>
                        </div>
                        <div className="ops-record-totals">
                          <strong>{occurrence.attendeeCountLabel}</strong>
                          <span>{occurrence.remainingCount} seats remain</span>
                        </div>
                      </div>

                      <div className="ops-inline-list">
                        <span>{occurrence.paymentStateLabel}</span>
                        <span>{occurrence.onlineCollectedLabel} online</span>
                        <span>{occurrence.dueAtEventLabel} still due</span>
                      </div>

                      <div className="ops-link-row">
                        <Link href={occurrence.registrationsHref}>Registrations</Link>
                        <Link href={occurrence.paymentsHref}>Payments</Link>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Capacity watch</div>
            <h3>Dates that need staffing or room checks.</h3>
            <div className="admin-note-list">
              {organizer.hotOccurrences.length > 0 ? (
                organizer.hotOccurrences.map((occurrence) => (
                  <div className="admin-note-item" key={occurrence.id}>
                    <strong>{occurrence.eventTitle}</strong>
                    <p>
                      {occurrence.label} · {occurrence.remainingCount} seats left ·{" "}
                      {occurrence.venue}
                    </p>
                  </div>
                ))
              ) : (
                <div className="admin-note-item">
                  <strong>No dates on capacity watch</strong>
                  <p>Published occurrences still have comfortable remaining capacity.</p>
                </div>
              )}
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Time zone</div>
            <h3>Local day boundaries stay visible to the team.</h3>
            <div className="status-list">
              {organizer.timeZoneAudit.items.map((item, index) => (
                <div className="status-item" key={item.title}>
                  <span className="status-index">{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
