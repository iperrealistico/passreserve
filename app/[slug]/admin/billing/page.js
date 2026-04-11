import { getOrganizerBillingAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";

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
  const data = await getOrganizerBillingAdmin(slug);
  const message = messageFor(typeof query.message === "string" ? query.message : "");
  const error = typeof query.error === "string" ? query.error : "";

  return (
    <div className="admin-page">
      {message ? (
        <div className="registration-message registration-message-success">{message}</div>
      ) : null}
      {error ? <div className="registration-message registration-message-error">{error}</div> : null}

      <section className="panel section-card admin-section">
        <div className="section-kicker">Billing and payouts</div>
        <h2>Stripe Connect for {data.organizer.name}</h2>
        <p>
          Attendee payments settle directly into this organizer&apos;s Stripe account. Passreserve
          only orchestrates onboarding and Checkout.
        </p>
        <div className="pill-list">
          <span className="pill">Connection: {data.billing.stripeConnectionStatusLabel}</span>
          <span className="pill">Charges: {data.billing.stripeChargesEnabled ? "Enabled" : "Blocked"}</span>
          <span className="pill">Payouts: {data.billing.stripePayoutsEnabled ? "Enabled" : "Blocked"}</span>
          <span className="pill">Monthly fee: {data.billing.monthlyFeeLabel}</span>
          <span className="pill">Billing: {data.billing.billingStatusLabel}</span>
        </div>
        <p>{data.billing.paidPublishingLabel}</p>
        <div className="hero-actions">
          <a className="button button-primary" href={`/${slug}/admin/billing/connect`}>
            {data.billing.stripeAccountId ? "Reconnect Stripe" : "Connect Stripe"}
          </a>
          <a className="button button-secondary" href={`/${slug}/admin/billing/return?manual=1`}>
            Refresh status
          </a>
        </div>
      </section>

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
        <h3>Current Stripe runtime</h3>
        <p>
          {data.stripeEnvironment.mode === "live"
            ? "Stripe API credentials are configured, so Connect onboarding and direct-charge Checkout can run here."
            : "This environment is in preview mode. Connect onboarding needs a Stripe secret key, but existing preview payment links still work for local smoke testing."}
        </p>
      </section>
    </div>
  );
}
