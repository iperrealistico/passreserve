import Link from "next/link";

import {
  getRegistrationPaymentPreviewView,
  registrationFlowPhase
} from "../../../../../../../../lib/passreserve-registrations";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return {
      title: "Payment preview"
    };
  }

  return {
    title: `Preview payment for ${view.event.title}`,
    description: `Preview the Passreserve.com payment return flow for ${view.event.title}.`
  };
}

function PreviewStatePanel({ view }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="empty-state">
          <article className="panel empty-card">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {registrationFlowPhase.label} payment preview
            </span>
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

export default async function RegistrationPaymentPreviewPage({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return <PreviewStatePanel view={view} />;
  }

  if (view.paymentExpired) {
    return (
      <PreviewStatePanel
        view={{
          title: "The payment preview has expired.",
          message:
            "The original hold window has closed, so this preview token can no longer simulate a successful payment return."
        }}
      />
    );
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
              Stripe preview fallback for unconfigured environments
            </span>
          </div>
          <nav className="nav" aria-label="Payment preview navigation">
            <Link href={view.organizer.organizerHref}>Organizer hub</Link>
            <Link href={view.event.detailHref}>Event page</Link>
            <Link href={view.restartHref}>Registration flow</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {registrationFlowPhase.label} payment preview
            </span>
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>Preview payment</span>
            </div>
            <div className="page-place">
              {view.organizer.city}, {view.organizer.region}
            </div>
            <h1>Live Stripe Checkout is not configured here, so this route previews the return flow.</h1>
            <p>
              The registration is already in a pending-payment state. This page makes the setup
              gap explicit while still letting us verify the success and cancel returns locally
              without pretending money was collected.
            </p>
            <div className="pill-list">
              <span className="pill">{view.registrationCode}</span>
              <span className="pill">{view.payment.onlineAmountLabel} online</span>
              <span className="pill">Expires {view.paymentExpiresAtLabel}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">Environment mode</div>
              <h2>{view.environment.mode}</h2>
              <p>
                Add the Stripe secret and webhook env vars to switch this route from preview to
                live hosted Checkout.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Online amount</div>
                <div className="metric-value">{view.payment.onlineAmountLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Due at event</div>
                <div className="metric-value">{view.payment.dueAtEventLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Ticket</div>
                <div className="metric-value">{view.ticketCategory.label}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Confirmed at</div>
                <div className="metric-value">{view.confirmedAtLabel}</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="registration-grid">
          <article className="panel section-card registration-flow-card">
            <div className="section-kicker">Payment split</div>
            <h2>What the hosted Checkout flow would collect</h2>
            <div className="registration-review-grid">
              <div className="registration-review-card">
                <span className="spotlight-label">Occurrence</span>
                <strong>{view.occurrence.label}</strong>
                <span>{view.occurrence.time}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Attendee</span>
                <strong>{view.attendee.name}</strong>
                <span>{view.attendee.email}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Quantity</span>
                <strong>{view.quantityLabel}</strong>
                <span>{view.ticketCategory.label}</span>
              </div>
            </div>

            <div className="payment-card registration-payment-card">
              <div className="payment-heading">
                <strong>Previewed collection</strong>
                <span>{view.event.collectionLabel}</span>
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

            <div className="hero-actions">
              <Link
                className="button button-primary"
                href={`/${slug}/events/${eventSlug}/register/payment/success/${paymentToken}?preview=1`}
              >
                Preview successful payment
              </Link>
              <Link
                className="button button-secondary"
                href={`/${slug}/events/${eventSlug}/register/payment/cancel/${paymentToken}`}
              >
                Preview cancelled payment
              </Link>
            </div>
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Setup requirements</div>
            <h3>Env keys needed for live Checkout</h3>
            <div className="registration-rule-list">
              {view.environment.requirements.map((requirement) => (
                <div className="registration-rule-item" key={requirement.key}>
                  <strong>
                    {requirement.key} · {requirement.present ? "present" : "missing"}
                  </strong>
                  <span>{requirement.requiredFor}</span>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              <Link className="button button-secondary" href={view.restartHref}>
                Back to the registration flow
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
