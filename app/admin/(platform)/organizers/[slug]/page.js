import Link from "next/link";
import { notFound } from "next/navigation";

import { getPlatformOrganizerDetail } from "../../../../../lib/passreserve-admin-service.js";
import {
  deleteOrganizerAction,
  openOrganizerDashboardAction,
  sendOrganizerResetFromPlatformAction,
  setOrganizerPasswordFromPlatformAction,
  suspendOrganizerAction,
  updateOrganizerBillingAction
} from "../../../actions.js";

export default async function PlatformOrganizerDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const detail = await getPlatformOrganizerDetail(slug);

  if (!detail) {
    notFound();
  }

  return (
    <div className="admin-page">
      {query.message === "billing-saved" ? (
        <div className="registration-message registration-message-success">
          Organizer billing updated successfully.
        </div>
      ) : null}
      {query.message === "reset-sent" ? (
        <div className="registration-message registration-message-success">
          Organizer reset email generated successfully.
        </div>
      ) : null}
      {query.message === "password-updated" ? (
        <div className="registration-message registration-message-success">
          Organizer password updated successfully.
        </div>
      ) : null}
      {query.message === "status-updated" ? (
        <div className="registration-message registration-message-success">
          Organizer status updated successfully.
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}
      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer detail</div>
        <h2>{detail.organizer.name}</h2>
        <p>
          {detail.organizer.city}, {detail.organizer.region}
        </p>
        <div className="pill-list">
          <span className="pill">{detail.organizer.summary.activeCount} active registrations</span>
          <span className="pill">{detail.organizer.summary.upcomingOccurrences} upcoming occurrences</span>
          <span className="pill">{detail.organizer.summary.onlineCollectedLabel} online</span>
          <span className="pill">{detail.organizer.summary.dueAtEventLabel} due at venue</span>
        </div>
        <div className="hero-actions">
          <form action={openOrganizerDashboardAction}>
            <input name="slug" type="hidden" value={slug} />
            <button className="button button-primary" type="submit">
              Open organizer dashboard
            </button>
          </form>
          <Link className="button button-secondary" href={detail.organizer.publicHref}>
            Public organizer page
          </Link>
          <form action={suspendOrganizerAction}>
            <input name="slug" type="hidden" value={slug} />
            <button className="button button-secondary" type="submit">
              {detail.organizer.status === "ARCHIVED" ? "Reactivate organizer" : "Suspend organizer"}
            </button>
          </form>
          <form action={deleteOrganizerAction}>
            <input name="slug" type="hidden" value={slug} />
            <button className="button button-secondary button-danger" type="submit">
              Delete organizer
            </button>
          </form>
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">Stripe and billing</div>
          <h3>Paid event eligibility</h3>
          <div className="timeline">
            <div className="timeline-step">
              <strong>Connection</strong>
              <span>{detail.organizer.billing.stripeConnectionStatusLabel}</span>
              <span>{detail.organizer.billing.stripeAccountId || "No connected account"}</span>
            </div>
            <div className="timeline-step">
              <strong>Charges and payouts</strong>
              <span>
                Charges {detail.organizer.billing.stripeChargesEnabled ? "enabled" : "blocked"} ·
                payouts {detail.organizer.billing.stripePayoutsEnabled ? "enabled" : "blocked"}
              </span>
            </div>
            <div className="timeline-step">
              <strong>Billing</strong>
              <span>
                {detail.organizer.billing.monthlyFeeLabel} monthly ·{" "}
                {detail.organizer.billing.billingStatusLabel}
              </span>
            </div>
            <div className="timeline-step">
              <strong>Publishing</strong>
              <span>{detail.organizer.billing.paidPublishingLabel}</span>
            </div>
          </div>
          <form action={updateOrganizerBillingAction} className="registration-panel-stack">
            <input name="slug" type="hidden" value={slug} />
            <label className="field">
              <span>Monthly fee cents</span>
              <input
                defaultValue={detail.organizer.billing.onlinePaymentsMonthlyFeeCents}
                min="0"
                name="onlinePaymentsMonthlyFeeCents"
                type="number"
              />
            </label>
            <label className="field">
              <span>Billing status</span>
              <select
                defaultValue={detail.organizer.billing.onlinePaymentsBillingStatus}
                name="onlinePaymentsBillingStatus"
              >
                <option value="NOT_REQUIRED">Not required</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <div className="hero-actions">
              <button className="button button-primary" type="submit">
                Save billing
              </button>
            </div>
          </form>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Venues</div>
          <h3>Organizer venues</h3>
          <div className="timeline">
            {(detail.organizer.venues?.length ? detail.organizer.venues : [
              {
                title: detail.organizer.venueTitle,
                detail: detail.organizer.venueDetail,
                mapHref: detail.organizer.venueMapHref
              }
            ])
              .filter((venue) => venue.title || venue.detail || venue.mapHref)
              .map((venue, index) => (
                <div className="timeline-step" key={`${venue.title}-${index}`}>
                  <strong>{venue.title || `Venue ${index + 1}`}</strong>
                  {venue.detail ? <span>{venue.detail}</span> : null}
                  {venue.mapHref ? <span>{venue.mapHref}</span> : null}
                </div>
              ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Admin accounts</div>
          <h3>Organizer admins</h3>
          <div className="timeline">
            {detail.admins.map((admin) => (
              <div className="timeline-step" key={admin.id}>
                <strong>{admin.name}</strong>
                <span>{admin.email}</span>
                <span>{admin.isPrimary ? "Primary admin" : "Organizer admin"}</span>
                <div className="hero-actions">
                  <form action={sendOrganizerResetFromPlatformAction}>
                    <input name="slug" type="hidden" value={slug} />
                    <input name="email" type="hidden" value={admin.email} />
                    <button className="button button-secondary" type="submit">
                      Send reset link
                    </button>
                  </form>
                </div>
                <form action={setOrganizerPasswordFromPlatformAction} className="registration-panel-stack">
                  <input name="slug" type="hidden" value={slug} />
                  <input name="adminUserId" type="hidden" value={admin.id} />
                  <label className="field">
                    <span>Set new password directly</span>
                    <input
                      minLength="8"
                      name="newPassword"
                      placeholder="At least 8 characters"
                      type="password"
                    />
                  </label>
                  <div className="hero-actions">
                    <button className="button button-primary" type="submit">
                      Update password
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Events</div>
          <h3>Published and draft events</h3>
          <div className="timeline">
            {detail.events.map((event) => (
              <div className="timeline-step" key={event.id}>
                <strong>{event.title}</strong>
                <span>{event.visibility}</span>
                <span>{event.occurrenceCount} occurrences</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Recent registrations</div>
        <h3>Latest attendee activity</h3>
        <div className="timeline">
          {detail.recentRegistrations.map((registration) => (
            <div className="timeline-step" key={registration.id}>
              <strong>
                {registration.registrationCode} · {registration.attendeeName}
              </strong>
              <span>{registration.eventTitle}</span>
              <span>{registration.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
