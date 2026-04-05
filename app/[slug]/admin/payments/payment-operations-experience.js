"use client";

import Link from "next/link";
import { useState } from "react";

import {
  applyRegistrationOperation,
  getAvailableRegistrationActions,
  summarizeRegistrationOperations
} from "../../../../lib/passreserve-operations";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function getActionClassName(tone, index) {
  if (tone === "danger") {
    return "button button-secondary button-danger";
  }

  if (index === 0 || tone === "primary") {
    return "button button-primary";
  }

  return "button button-secondary button-muted";
}

function summarizeProviders(records) {
  const providers = ["stripe-live", "venue"];

  return providers.map((mode) => {
    const providerRecords = records.filter((record) => record.payment.providerMode === mode);

    return {
      mode,
      label: providerRecords[0]?.payment.providerLabel ?? mode,
      count: providerRecords.length,
      amountLabel: formatCurrency(
        providerRecords.reduce((sum, record) => sum + record.payment.onlineCollected, 0)
      )
    };
  });
}

export default function PaymentOperationsExperience({ organizer }) {
  const [records, setRecords] = useState(organizer.records);
  const [message, setMessage] = useState(
    "This organizer payment board keeps online collection, venue balances, and refunds visible without using live provider state."
  );

  const paymentRecords = records.filter(
    (record) =>
      record.payment.onlineAmountExpected > 0 ||
      record.payment.dueAtEventExpected > 0 ||
      record.payment.refundedAmount > 0
  );
  const followUpRecords = paymentRecords.filter(
    (record) =>
      record.status === "PENDING_PAYMENT" ||
      record.payment.paymentStatus === "FAILED" ||
      record.payment.dueAtEventOutstanding > 0
  );
  const summary = summarizeRegistrationOperations(records);
  const providerSummary = summarizeProviders(paymentRecords);

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
          <div className="section-kicker">Payment operations</div>
          <h2>Organizer payment visibility now shows online collection, venue balance, and refunds.</h2>
          <p>
            This route keeps the payment side of Passreserve.com calm and explicit. Organizers can
            see what was collected online, what is still due at the venue, and which records need
            manual reconciliation before the occurrence runs.
          </p>
          <div className="pill-list">
            <span className="pill">{summary.onlineCollectedLabel} online collected</span>
            <span className="pill">{summary.dueAtEventLabel} due at venue</span>
            <span className="pill">{summary.pendingOnlineAmountLabel} pending online</span>
            <span className="pill">{summary.refundedLabel} refunded</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Reconciliation queue</div>
            <h2>{organizer.name}</h2>
            <p>
              Organizers can mark online amounts received, close venue balances, and keep refund
              history visible without collapsing payment logic back into the public flow.
            </p>
          </div>

          <div className="hero-actions">
            <Link className="button button-secondary" href={organizer.registrationsHref}>
              Open registrations
            </Link>
            <Link className="button button-primary" href={organizer.calendarHref}>
              Open calendar
            </Link>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">Payment ledger</div>
              <h3>Track provider settlement, venue balances, and refund outcomes.</h3>
            </div>
            <div className="admin-inline-metrics">
              <span>{followUpRecords.length} records need follow-up</span>
              <span>{paymentRecords.length} payment-aware registrations</span>
            </div>
          </div>

          <div className="ops-message">{message}</div>

          <div className="ops-record-list">
            {paymentRecords.map((record) => {
              const actions = getAvailableRegistrationActions(record).filter((action) =>
                ["mark-online-paid", "record-venue-payment", "cancel", "mark-attended"].includes(
                  action.id
                )
              );

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
                        <span className="route-label">{record.payment.providerLabel}</span>
                      </div>
                      <h4 className="ops-record-title">{record.registrationCode}</h4>
                      <p>
                        {record.attendeeName} · {record.eventTitle} · {record.dayLabel}
                      </p>
                    </div>
                    <div className="ops-record-totals">
                      <strong>{record.payment.onlineCollectedLabel}</strong>
                      <span>{record.payment.dueAtEventOutstandingLabel} still due</span>
                    </div>
                  </div>

                  <div className="ops-meta-grid">
                    <div className="ops-meta-card">
                      <span className="metric-label">Online target</span>
                      <strong>{record.payment.onlineAmountExpectedLabel}</strong>
                      <span>{record.payment.onlineCollectedLabel} collected</span>
                    </div>
                    <div className="ops-meta-card">
                      <span className="metric-label">Venue target</span>
                      <strong>{record.payment.dueAtEventExpectedLabel}</strong>
                      <span>{record.payment.venueCollectedLabel} collected</span>
                    </div>
                    <div className="ops-meta-card">
                      <span className="metric-label">Provider session</span>
                      <strong>{record.payment.sessionId ?? "Not created yet"}</strong>
                      <span>{record.payment.paymentIntentId ?? "No payment intent yet"}</span>
                    </div>
                    <div className="ops-meta-card">
                      <span className="metric-label">Refunded</span>
                      <strong>{record.payment.refundedAmountLabel}</strong>
                      <span>{record.payment.collectionSummary}</span>
                    </div>
                  </div>

                  <div className="ops-link-row">
                    <Link href={record.adminRegistrationsHref}>Registration queue</Link>
                    <Link href={record.publicEventHref}>Public event page</Link>
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
            <div className="section-kicker">Provider summary</div>
            <h3>How collection is split across channels.</h3>
            <div className="ops-provider-grid">
              {providerSummary.map((provider) => (
                <div className="ops-provider-card" key={provider.mode}>
                  <span className="metric-label">{provider.label}</span>
                  <strong>{provider.count}</strong>
                  <span>{provider.amountLabel}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card admin-section">
            <div className="section-kicker">Follow-up lanes</div>
            <h3>What still needs organizer attention.</h3>
            <div className="timeline">
              <div className="timeline-step">
                <strong>Pending online</strong>
                <span>{summary.pendingOnlineAmountLabel}</span>
              </div>
              <div className="timeline-step">
                <strong>Venue balance due</strong>
                <span>{summary.dueAtEventLabel}</span>
              </div>
              <div className="timeline-step">
                <strong>Refunded</strong>
                <span>{summary.refundedLabel}</span>
              </div>
              <div className="timeline-step">
                <strong>Payment follow-up</strong>
                <span>{followUpRecords.length} registrations still need action.</span>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
