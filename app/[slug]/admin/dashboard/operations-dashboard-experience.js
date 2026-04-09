import Link from "next/link";

export default function OperationsDashboardExperience({ organizer }) {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Dashboard</div>
          <h2>Registrations, venue balances, and upcoming dates share one view.</h2>
          <p>
            This dashboard keeps today&apos;s registrations, payment follow-up, and upcoming dates
            in one place so the team can act fast without losing context.
          </p>
          <div className="pill-list">
            <span className="pill">{organizer.summary.activeCount} active registrations</span>
            <span className="pill">{organizer.summary.queuedToday} queued today</span>
            <span className="pill">{organizer.summary.onlineCollectedLabel} online collected</span>
            <span className="pill">{organizer.summary.dueAtEventLabel} due at venue</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Current snapshot</div>
            <h2>{organizer.name}</h2>
            <p>
              Times are shown in {organizer.timeZone}. The dashboard keeps open payments,
              capacity pressure, and guest follow-up visible at a glance.
            </p>
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="metric-label">Pending confirm</span>
              <div className="metric-value">{organizer.summary.pendingConfirmations}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Pending payment</span>
              <div className="metric-value">{organizer.summary.pendingPayments}</div>
            </div>
            <div className="metric">
              <span className="metric-label">Attended</span>
              <div className="metric-value">{organizer.summary.attendedCount}</div>
            </div>
            <div className="metric">
              <span className="metric-label">No-shows</span>
              <div className="metric-value">{organizer.summary.noShowCount}</div>
            </div>
          </div>

          <div className="hero-actions">
            <Link className="button button-primary" href={organizer.registrationsHref}>
              Open registrations
            </Link>
            <Link className="button button-secondary" href={organizer.paymentsHref}>
              Open payments
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Attention queue</div>
              <h3>Open confirmations, payment follow-up, and venue-balance work.</h3>
            </div>
            <div className="admin-inline-metrics">
              <span>{organizer.summary.openVenueBalances} attendees with venue balances</span>
              <span>{organizer.paymentQueue.length} registrations need follow-up</span>
            </div>
          </div>

          <div className="ops-record-list">
            {organizer.paymentQueue.slice(0, 5).map((record) => (
              <article className="ops-record-card" key={record.id}>
                <div className="ops-record-head">
                  <div>
                    <div className="admin-badge-row">
                      <span className={`admin-badge admin-badge-${record.statusTone}`}>
                        {record.statusLabel}
                      </span>
                      <span
                        className={`admin-badge admin-badge-payment-${record.payment.paymentStatusTone}`}
                      >
                        {record.payment.paymentStatusLabel}
                      </span>
                      <span className="route-label">{record.registrationCode}</span>
                    </div>
                    <h4 className="ops-record-title">{record.attendeeName}</h4>
                    <p>
                      {record.eventTitle} · {record.dayLabel} · {record.timeRangeLabel}
                    </p>
                  </div>
                  <div className="ops-record-totals">
                    <strong>{record.payment.onlineCollectedLabel}</strong>
                    <span>{record.payment.dueAtEventOutstandingLabel} still due</span>
                  </div>
                </div>

                <p className="ops-note">{record.note}</p>
                <div className="ops-inline-list">
                  <span>{record.quantityLabel}</span>
                  <span>{record.ticketLabel}</span>
                  <span>{record.payment.collectionSummary}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Recent registrations</div>
            <h3>Most recent guest activity.</h3>
            <div className="timeline">
              {organizer.recentRegistrations.map((record) => (
                <div className="timeline-step" key={record.id}>
                  <strong>{record.registrationCode}</strong>
                  <span>
                    {record.attendeeName} · {record.createdAtLabel}
                  </span>
                  <ul>
                    <li>{record.eventTitle}</li>
                    <li>{record.statusLabel}</li>
                    <li>{record.payment.collectionSummary}</li>
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Capacity watch</div>
            <h3>Occurrences that need closer staffing and venue checks.</h3>
            <div className="admin-note-list">
              {organizer.hotOccurrences.length > 0 ? (
                organizer.hotOccurrences.map((occurrence) => (
                  <div className="admin-note-item" key={occurrence.id}>
                    <strong>{occurrence.eventTitle}</strong>
                    <p>
                      {occurrence.label} · {occurrence.remainingCount} seats remain ·{" "}
                      {occurrence.collectionLabel}
                    </p>
                  </div>
                ))
              ) : (
                <div className="admin-note-item">
                  <strong>No immediate capacity pressure</strong>
                  <p>The next published occurrences still have comfortable room for new attendees.</p>
                </div>
              )}
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Time zone</div>
            <h3>Every date is shown in local time.</h3>
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
