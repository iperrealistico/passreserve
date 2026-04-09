import Link from "next/link";

import {
  getConfirmedRegistrationView
} from "../../../../../../../lib/passreserve-registrations";

function formatRegistrationStatus(status) {
  switch (status) {
    case "CONFIRMED_PAID":
      return "Paid in full";
    case "CONFIRMED_PARTIALLY_PAID":
      return "Deposit paid";
    case "CONFIRMED_UNPAID":
      return "Payment due at event";
    default:
      return "Confirmed";
  }
}

function formatPaymentStatus(status) {
  switch (status) {
    case "PAID":
      return "Paid online";
    case "PARTIALLY_PAID":
      return "Partially paid online";
    case "NONE":
      return "No online payment";
    default:
      return "Payment updated";
  }
}

export async function generateMetadata({ params }) {
  const { slug, eventSlug, confirmationToken } = await params;
  const view = getConfirmedRegistrationView(slug, eventSlug, confirmationToken);

  if (view.state !== "ready") {
    return {
      title: "Registration confirmation"
    };
  }

  return {
    title: view.registrationCode,
    description: `Passreserve.com registration ${view.registrationCode} for ${view.event.title}.`
  };
}

function ConfirmationStatePanel({ view }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="empty-state">
          <article className="panel empty-card">
            <span className="eyebrow">Registration</span>
            <h1>{view.title}</h1>
            <p>{view.message}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/">
                Return to discovery
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default async function RegistrationConfirmedPage({ params }) {
  const { slug, eventSlug, confirmationToken } = await params;
  const view = getConfirmedRegistrationView(slug, eventSlug, confirmationToken);

  if (view.state !== "ready") {
    return <ConfirmationStatePanel view={view} />;
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
              Registration confirmed and ready for your next step
            </span>
          </div>
          <nav className="nav" aria-label="Confirmed registration navigation">
            <Link href={view.organizer.organizerHref}>Host page</Link>
            <Link href={view.event.detailHref}>Event page</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">You&apos;re in</span>
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>{view.registrationCode}</span>
            </div>
            <div className="page-place">
              {view.organizer.city}, {view.organizer.region}
            </div>
            <h1>{view.headline}</h1>
            <p>{view.nextStep}</p>
            <div className="pill-list">
              <span className="pill">{formatRegistrationStatus(view.registrationStatus)}</span>
              <span className="pill">{formatPaymentStatus(view.paymentStatus)}</span>
              <span className="pill">{view.paymentProvider.label}</span>
              <span className="pill">{view.quantityLabel}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">Registration code</div>
              <h2>{view.registrationCode}</h2>
              <p>
                Keep this code handy for event-day check-in and any updates from the host.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Confirmed at</div>
                <div className="metric-value">{view.confirmedAtLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Reconciled</div>
                <div className="metric-value">{view.reconciledAtLabel || "N/A"}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Online amount</div>
                <div className="metric-value">{view.payment.onlineAmountLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Due at event</div>
                <div className="metric-value">{view.payment.dueAtEventLabel}</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="registration-grid">
          <article className="panel section-card registration-flow-card">
            <div className="section-kicker">Attendee summary</div>
            <h2>Your registration details</h2>

            <div className="registration-review-grid">
              <div className="registration-review-card registration-review-card-code">
                <span className="spotlight-label">Registration code</span>
                <strong>{view.registrationCode}</strong>
                <span>{formatRegistrationStatus(view.registrationStatus)}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Attendee</span>
                <strong>{view.attendee.name}</strong>
                <span>{view.attendee.email}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Occurrence</span>
                <strong>{view.occurrence.label}</strong>
                <span>{view.occurrence.time}</span>
              </div>
            </div>

            <div className="payment-card registration-payment-card">
              <div className="payment-heading">
                <strong>Payment split</strong>
                <span>
                  {view.ticketCategory.label} · {view.quantityLabel}
                </span>
              </div>
              <div className="payment-amounts">
                <div className="payment-amount">
                  <span className="payment-label">Ticket total</span>
                  <span className="payment-value">{view.payment.subtotalLabel}</span>
                </div>
                <div className="payment-amount">
                  <span className="payment-label">Paid online</span>
                  <span className="payment-value">{view.payment.onlineAmountLabel}</span>
                </div>
                <div className="payment-amount">
                  <span className="payment-label">Due at event</span>
                  <span className="payment-value">{view.payment.dueAtEventLabel}</span>
                </div>
              </div>
            </div>

            <div className="registration-rule-list">
              <div className="registration-rule-item">
                <strong>Ticket category</strong>
                <span>{view.ticketCategory.label}</span>
              </div>
              <div className="registration-rule-item">
                <strong>Hold opened</strong>
                <span>{view.createdAtLabel}</span>
              </div>
              <div className="registration-rule-item">
                <strong>Confirmed</strong>
                <span>{view.confirmedAtLabel}</span>
              </div>
              <div className="registration-rule-item">
                <strong>Payment provider</strong>
                <span>{view.paymentProvider.label}</span>
              </div>
            </div>
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Next steps</div>
            <h3>What to keep on hand</h3>
            <div className="registration-rule-list">
              {view.timeline.map((item) => (
                <div className="registration-rule-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              <Link className="button button-secondary" href={view.event.detailHref}>
                Back to the event page
              </Link>
              <Link className="button button-primary" href={view.organizer.organizerHref}>
                Open host page
              </Link>
            </div>
          </aside>
        </section>

        <footer className="footer">
          <span>Keep your registration code handy for event-day check-in and updates.</span>
          <Link href={view.event.detailHref}>Return to the event page</Link>
        </footer>
      </div>
    </main>
  );
}
