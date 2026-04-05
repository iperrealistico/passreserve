import Link from "next/link";

import {
  getConfirmationFieldRules,
  getRegistrationHoldView,
  registrationFlowPhase
} from "../../../../../../../lib/passreserve-registrations";
import ConfirmationForm from "./confirmation-form";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, holdToken } = await params;
  const holdView = getRegistrationHoldView(slug, eventSlug, holdToken);

  if (holdView.state !== "ready") {
    return {
      title: "Registration hold"
    };
  }

  return {
    title: `Confirm ${holdView.event.title}`,
    description: `Review and confirm the pending Passreserve.com registration hold for ${holdView.event.title}.`
  };
}

function HoldStatePanel({ holdView }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="empty-state">
          <article className="panel empty-card">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {registrationFlowPhase.label} hold state
            </span>
            <h1>{holdView.title}</h1>
            <p>{holdView.message}</p>
            <div className="hero-actions">
              {holdView.restartHref ? (
                <Link className="button button-primary" href={holdView.restartHref}>
                  Start a fresh hold
                </Link>
              ) : (
                <Link className="button button-primary" href="/">
                  Return to discovery
                </Link>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default async function RegistrationConfirmPage({ params }) {
  const { slug, eventSlug, holdToken } = await params;
  const holdView = getRegistrationHoldView(slug, eventSlug, holdToken);

  if (holdView.state !== "ready") {
    return <HoldStatePanel holdView={holdView} />;
  }

  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Hold review, attendee confirmation, and registration code handoff
            </span>
          </div>
          <nav className="nav" aria-label="Hold review navigation">
            <Link href={holdView.organizer.organizerHref}>Organizer hub</Link>
            <Link href={holdView.event.detailHref}>Event page</Link>
            <Link href={holdView.occurrence.registrationHref}>Edit registration</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {registrationFlowPhase.label} confirmation
            </span>
            <div className="breadcrumb">
              <Link href={holdView.organizer.organizerHref}>{holdView.organizer.name}</Link>
              <span>/</span>
              <Link href={holdView.event.detailHref}>{holdView.event.title}</Link>
              <span>/</span>
              <span>Confirm hold</span>
            </div>
            <div className="page-place">
              {holdView.organizer.city}, {holdView.organizer.region}
            </div>
            <h1>Review the hold before confirming the registration.</h1>
            <p>
              Hold {holdView.hold.id} currently protects {holdView.quantityLabel} on{" "}
              {holdView.occurrence.label}. Confirming here either finalizes the registration
              or opens the payment step, depending on the online amount.
            </p>
            <div className="pill-list">
              <span className="pill">{holdView.occurrence.capacityLabel}</span>
              <span className="pill">{holdView.ticketCategory.label}</span>
              <span className="pill">Expires {holdView.hold.expiresAtLabel}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">Hold window</div>
              <h2>{holdView.hold.expiresAtLabel}</h2>
              <p>
                The hold stays live for 30 minutes so the attendee can review the occurrence,
                the attendee details, and the payment split without risking silent overbooking.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Before hold</div>
                <div className="metric-value">{holdView.capacity.beforeRemaining}</div>
              </div>
              <div className="metric">
                <div className="metric-label">After hold</div>
                <div className="metric-value">{holdView.capacity.afterHoldRemaining}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Confirmed</div>
                <div className="metric-value">{holdView.capacity.confirmedCount}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Pending holds</div>
                <div className="metric-value">{holdView.capacity.pendingHoldCount}</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="registration-grid">
          <article className="panel section-card registration-flow-card">
            <div className="section-kicker">Hold summary</div>
            <h2>Occurrence, attendee, and payment details</h2>

            <div className="registration-review-grid">
              <div className="registration-review-card">
                <span className="spotlight-label">Occurrence</span>
                <strong>{holdView.occurrence.label}</strong>
                <span>{holdView.occurrence.time}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Ticket and quantity</span>
                <strong>{holdView.ticketCategory.label}</strong>
                <span>{holdView.quantityLabel}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Attendee</span>
                <strong>{holdView.attendee.name}</strong>
                <span>{holdView.attendee.email}</span>
              </div>
            </div>

            <div className="payment-card registration-payment-card">
              <div className="payment-heading">
                <strong>Payment split</strong>
                <span>
                  {holdView.ticketCategory.unitPriceLabel} each, {holdView.event.collectionLabel}
                </span>
              </div>
              <div className="payment-amounts">
                <div className="payment-amount">
                  <span className="payment-label">Ticket total</span>
                  <span className="payment-value">{holdView.payment.subtotalLabel}</span>
                </div>
                <div className="payment-amount">
                  <span className="payment-label">Paid online</span>
                  <span className="payment-value">{holdView.payment.onlineAmountLabel}</span>
                </div>
                <div className="payment-amount">
                  <span className="payment-label">Due at event</span>
                  <span className="payment-value">{holdView.payment.dueAtEventLabel}</span>
                </div>
              </div>
            </div>

            <div className="section-kicker">Confirmation checklist</div>
            <div className="registration-rule-list">
              {getConfirmationFieldRules().map((rule) => (
                <div className="registration-rule-item" key={rule.field}>
                  <strong>{rule.label}</strong>
                  <span>{rule.detail}</span>
                </div>
              ))}
            </div>

            <ConfirmationForm
              eventSlug={eventSlug}
              holdToken={holdToken}
              slug={slug}
            />
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Lifecycle timeline</div>
            <h3>What happens around this hold</h3>
            <div className="registration-rule-list">
              {holdView.timeline.map((item) => (
                <div className="registration-rule-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>

            <div className="section-kicker">Current capacity mix</div>
            <div className="registration-review-grid">
              <div className="registration-review-card">
                <span className="spotlight-label">Pending payment</span>
                <strong>{holdView.capacity.pendingPaymentCount}</strong>
                <span>Seats waiting on later payment completion</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Total capacity</span>
                <strong>{holdView.capacity.totalCapacity}</strong>
                <span>Seats available on this occurrence overall</span>
              </div>
            </div>

            <div className="hero-actions">
              <Link className="button button-secondary" href={holdView.occurrence.registrationHref}>
                Edit the registration
              </Link>
            </div>
          </aside>
        </section>

        <footer className="footer">
          <span>
            Phase 09 keeps the confirmation page as the point where pending holds either settle
            directly or hand off into hosted payment.
          </span>
          <Link href={holdView.event.detailHref}>Return to the event page</Link>
        </footer>
      </div>
    </main>
  );
}
