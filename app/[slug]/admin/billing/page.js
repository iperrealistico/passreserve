import {
  getOrganizerBillingAdmin,
  getOrganizerEventsAdmin
} from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

function messageFor(value) {
  switch (value) {
    case "stripe-connected":
      return "Stripe status refreshed successfully.";
    case "billing-synced":
      return "Billing status refreshed successfully.";
    default:
      return "";
  }
}

export default async function OrganizerBillingPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const [data, eventsData] = await Promise.all([
    getOrganizerBillingAdmin(slug),
    getOrganizerEventsAdmin(slug)
  ]);
  const selectedEvent = typeof query.event === "string" ? query.event : "";
  const selectedEventRecord =
    eventsData.events.find((event) => event.slug === selectedEvent) || null;
  const appendEventQuery = (path) =>
    selectedEvent
      ? `${path}${path.includes("?") ? "&" : "?"}event=${encodeURIComponent(selectedEvent)}`
      : path;
  const message = messageFor(typeof query.message === "string" ? query.message : "");
  const error = typeof query.error === "string" ? query.error : "";

  return (
    <div className="admin-page">
      {message ? (
        <div className="registration-message registration-message-success">{message}</div>
      ) : null}
      {error ? <div className="registration-message registration-message-error">{error}</div> : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/billing`}
        description="Use billing to connect Stripe, understand whether online checkout is ready, and review how your current events will handle payment."
        eyebrow="Billing"
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        tip="Billing is organizer-wide, but filtering by event helps you focus on one event’s pricing and published dates while you check payment readiness."
        title={selectedEventRecord ? `Billing focus for ${selectedEventRecord.title}` : `Stripe and payout setup for ${data.organizer.name}`}
      />

      <section className="panel section-card admin-section">
        <div className="pill-list">
          <span className="pill">Connection: {data.billing.stripeConnectionStatusLabel}</span>
          <span className="pill">Charges: {data.billing.stripeChargesEnabled ? "Enabled" : "Blocked"}</span>
          <span className="pill">Payouts: {data.billing.stripePayoutsEnabled ? "Enabled" : "Blocked"}</span>
          <span className="pill">Monthly fee: {data.billing.monthlyFeeLabel}</span>
          <span className="pill">Billing: {data.billing.billingStatusLabel}</span>
        </div>
        <p>{data.billing.paidPublishingLabel}</p>
        <div className="hero-actions">
          <a className="button button-primary" href={appendEventQuery(`/${slug}/admin/billing/connect`)}>
            {data.billing.stripeAccountId ? "Reconnect Stripe" : "Connect Stripe"}
          </a>
          <a className="button button-secondary" href={appendEventQuery(`/${slug}/admin/billing/return?manual=1`)}>
            Refresh status
          </a>
        </div>
      </section>

      {selectedEventRecord ? (
        <section className="panel section-card admin-section">
          <div className="section-kicker">Event focus</div>
          <h3>{selectedEventRecord.title}</h3>
          <div className="admin-card-metrics">
            <div>
              <span className="metric-label">Visibility</span>
              <strong>{selectedEventRecord.visibility}</strong>
            </div>
            <div>
              <span className="metric-label">Base price</span>
              <strong>{selectedEventRecord.basePriceLabel}</strong>
            </div>
            <div>
              <span className="metric-label">All dates</span>
              <strong>{selectedEventRecord.occurrenceCount}</strong>
            </div>
            <div>
              <span className="metric-label">Published dates</span>
              <strong>{selectedEventRecord.publishedOccurrenceCount}</strong>
            </div>
          </div>
          <p className="admin-page-tip">
            This event will only accept live online checkout once the organizer-wide Stripe setup is ready.
            Until then, keep it free, pay-at-event, or in draft while you finish billing setup.
          </p>
        </section>
      ) : null}

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">Eligibility</div>
          <h3>Paid event publishing</h3>
          <div className="timeline">
            <div className="timeline-step">
              <strong>Stripe account</strong>
              <span>{data.billing.stripeAccountId || "No connected account yet"}</span>
            </div>
            <div className="timeline-step">
              <strong>Connected at</strong>
              <span>{data.billing.stripeConnectedAtLabel}</span>
            </div>
            <div className="timeline-step">
              <strong>Last synced</strong>
              <span>{data.billing.stripeLastSyncedAtLabel}</span>
            </div>
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Checklist</div>
          <h3>What still needs attention</h3>
          <div className="timeline">
            {(data.billing.checklist.length > 0 ? data.billing.checklist : ["Stripe and billing are ready for paid dates."]).map(
              (item) => (
                <div className="timeline-step" key={item}>
                  <strong>{item}</strong>
                </div>
              )
            )}
          </div>
        </article>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Environment</div>
        <h3>Stripe setup in this environment</h3>
        <p>
          {data.stripeEnvironment.mode === "live"
            ? "Stripe is connected in live mode, so organizer onboarding and online checkout can run in production."
            : "Live Stripe is not connected yet in this environment. Hosts can still use free events or collect payment at the venue while you finish the Stripe setup."}
        </p>
      </section>
    </div>
  );
}
