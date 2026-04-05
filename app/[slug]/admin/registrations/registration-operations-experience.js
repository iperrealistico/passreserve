"use client";

import Link from "next/link";
import { useState } from "react";

import {
  applyRegistrationOperation,
  getAvailableRegistrationActions,
  summarizeRegistrationOperations
} from "../../../../lib/passreserve-operations";

const filterOptions = [
  {
    id: "all",
    label: "All registrations"
  },
  {
    id: "open",
    label: "Open work"
  },
  {
    id: "payments",
    label: "Payment follow-up"
  },
  {
    id: "history",
    label: "History"
  }
];

function getActionClassName(tone, index) {
  if (tone === "danger") {
    return "button button-secondary button-danger";
  }

  if (index === 0 || tone === "primary") {
    return "button button-primary";
  }

  return "button button-secondary button-muted";
}

function getVisibleRecords(records, filter) {
  switch (filter) {
    case "open":
      return records.filter(
        (record) => !["ATTENDED", "CANCELLED", "NO_SHOW"].includes(record.status)
      );
    case "payments":
      return records.filter(
        (record) =>
          record.payment.paymentStatus === "FAILED" ||
          record.status === "PENDING_PAYMENT" ||
          record.payment.dueAtEventOutstanding > 0
      );
    case "history":
      return records.filter((record) => record.historical);
    default:
      return records;
  }
}

export default function RegistrationOperationsExperience({ organizer }) {
  const [records, setRecords] = useState(organizer.records);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState(
    "Organizer actions on this screen update the in-repo operations draft so the queue logic can be reviewed safely."
  );

  const summary = summarizeRegistrationOperations(records);
  const visibleRecords = getVisibleRecords(records, filter);

  function handleAction(recordId, actionId) {
    setRecords((current) => {
      const result = applyRegistrationOperation(current, recordId, actionId);

      setMessage(result.message);

      return result.records;
    });
  }

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Registration operations</div>
          <h2>Organizer queues now cover confirmation, cancellation, no-show, and reconciliation.</h2>
          <p>
            This route turns the Phase 08 and Phase 09 attendee flow into a practical organizer
            queue. Registration states, payment states, and venue-balance follow-up can now be
            reviewed and progressed without leaving the admin shell.
          </p>
          <div className="pill-list">
            <span className="pill">{summary.activeCount} active registrations</span>
            <span className="pill">{summary.pendingConfirmations} pending confirm</span>
            <span className="pill">{summary.pendingPayments} payment follow-up</span>
            <span className="pill">{summary.dueAtEventLabel} due at venue</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Queue health</div>
            <h2>{organizer.name}</h2>
            <p>
              The organizer can progress registrations from hold to payment, close venue balances,
              and preserve historical states like attended, no-show, or cancelled for audit clarity.
            </p>
          </div>

          <div className="ops-filter-bar">
            <label className="field">
              <span>Filter view</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                {filterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="hero-actions">
            <Link className="button button-secondary" href={organizer.calendarHref}>
              Open calendar
            </Link>
            <Link className="button button-primary" href={organizer.paymentsHref}>
              Open payments
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Queue actions</div>
              <h3>Review and progress each attendee record.</h3>
            </div>
            <div className="admin-inline-metrics">
              <span>{visibleRecords.length} registrations in this filter</span>
              <span>{summary.onlineCollectedLabel} collected online</span>
            </div>
          </div>

          <div className="ops-message">{message}</div>

          <div className="ops-record-list">
            {visibleRecords.map((record) => {
              const actions = getAvailableRegistrationActions(record);

              return (
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

                  <div className="ops-meta-grid">
                    <div className="ops-meta-card">
                      <span className="metric-label">Attendee</span>
                      <strong>{record.attendeeEmail}</strong>
                      <span>{record.attendeePhone}</span>
                    </div>
                    <div className="ops-meta-card">
                      <span className="metric-label">Ticket</span>
                      <strong>{record.ticketLabel}</strong>
                      <span>{record.quantityLabel}</span>
                    </div>
                    <div className="ops-meta-card">
                      <span className="metric-label">Created</span>
                      <strong>{record.createdAtLabel}</strong>
                      <span>{record.venue}</span>
                    </div>
                    <div className="ops-meta-card">
                      <span className="metric-label">Collection</span>
                      <strong>{record.payment.onlineAmountExpectedLabel} online target</strong>
                      <span>{record.payment.dueAtEventExpectedLabel} venue target</span>
                    </div>
                  </div>

                  <p className="ops-note">{record.note}</p>
                  <p className="ops-note ops-note-muted">{record.actionHint}</p>

                  <div className="ops-inline-list">
                    <span>{record.payment.collectionSummary}</span>
                    <span>{record.venueNote}</span>
                  </div>

                  <div className="ops-link-row">
                    <Link href={record.publicEventHref}>Public event page</Link>
                    <Link href={record.adminPaymentsHref}>Payment view</Link>
                  </div>

                  {actions.length > 0 ? (
                    <div className="ops-action-row">
                      {actions.map((action, index) => (
                        <button
                          className={getActionClassName(action.tone, index)}
                          key={action.id}
                          onClick={() => handleAction(record.id, action.id)}
                          type="button"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Workflow notes</div>
            <h3>How organizer actions map to the attendee lifecycle.</h3>
            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Confirm</strong>
                  Move a hold into the next organizer-owned state while keeping capacity pressure
                  visible.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Reconcile payment</strong>
                  Record online settlement or venue collection without losing the original
                  registration context.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>No-show and cancellation</strong>
                  Close operational exceptions while keeping payment and audit details visible.
                </div>
              </div>
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Totals</div>
            <h3>Current queue totals.</h3>
            <div className="timeline">
              <div className="timeline-step">
                <strong>Online collected</strong>
                <span>{summary.onlineCollectedLabel}</span>
              </div>
              <div className="timeline-step">
                <strong>Due at venue</strong>
                <span>{summary.dueAtEventLabel}</span>
              </div>
              <div className="timeline-step">
                <strong>Refunded</strong>
                <span>{summary.refundedLabel}</span>
              </div>
              <div className="timeline-step">
                <strong>Pending online amount</strong>
                <span>{summary.pendingOnlineAmountLabel}</span>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
