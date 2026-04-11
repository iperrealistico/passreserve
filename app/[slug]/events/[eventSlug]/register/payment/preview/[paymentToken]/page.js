import Link from "next/link";

import {
  getRegistrationPaymentPreviewView
} from "../../../../../../../../lib/passreserve-service.js";
import { PublicVisual } from "../../../../../../../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../../../../../../../lib/passreserve-visuals.js";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return {
      title: "Payment review"
    };
  }

  return {
    title: `Payment review for ${view.event.title}`,
    description: `Review the Passreserve.com payment step for ${view.event.title}.`
  };
}

function PreviewStatePanel({ view }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="empty-state">
          <article className="panel empty-card">
            <PublicVisual
              className="empty-card-visual"
              sizes="(min-width: 768px) 36vw, 90vw"
              visualId={routeVisuals.paymentPreview}
            />
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
  const view = await getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return <PreviewStatePanel view={view} />;
  }

  if (view.paymentExpired) {
    return (
      <PreviewStatePanel
        view={{
          title: "This payment link has expired.",
          message:
            "The original payment window has closed, so this link can no longer be used."
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
              Review your payment details before checkout
            </span>
          </div>
          <nav className="nav" aria-label="Payment preview navigation">
            <Link href={view.organizer.organizerHref}>Host page</Link>
            <Link href={view.event.detailHref}>Event page</Link>
            <Link href={view.restartHref}>Registration</Link>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>Review payment</span>
            </div>
            <div className="page-place">
              {view.organizer.city}, {view.organizer.region}
            </div>
            <h1>Review this registration before checkout opens.</h1>
            <p>
              Your registration is already waiting on payment. Review the amount due now and keep
              the registration details close before you continue.
            </p>
            <div className="pill-list">
              <span className="pill">{view.registrationCode}</span>
              <span className="pill">{view.payment.onlineAmountLabel} online</span>
              <span className="pill">Expires {view.paymentExpiresAtLabel}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.paymentPreview}
            />
            <div className="status-block">
              <div className="status-label">Next step</div>
              <h2>Secure payment</h2>
              <p>
                Review the amount due now, then continue to the payment step when you are ready.
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
            <h2>What you&apos;re paying now</h2>
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
                <strong>Online collection</strong>
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
                Continue to secure payment
              </Link>
              <Link
                className="button button-secondary"
                href={`/${slug}/events/${eventSlug}/register/payment/cancel/${paymentToken}`}
              >
                Not now
              </Link>
            </div>
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Before you continue</div>
            <h3>What to keep in mind</h3>
            <div className="registration-rule-list">
              <div className="registration-rule-item">
                <strong>Registration saved</strong>
                <span>Your place is still tied to {view.registrationCode} while this payment window stays open.</span>
              </div>
              <div className="registration-rule-item">
                <strong>Online amount only</strong>
                <span>You&apos;ll pay {view.payment.onlineAmountLabel} now, and any remaining balance stays due at the event.</span>
              </div>
              <div className="registration-rule-item">
                <strong>Need to pause?</strong>
                <span>You can come back to this payment window before it expires.</span>
              </div>
            </div>

            <div className="hero-actions">
              <Link className="button button-secondary" href={view.restartHref}>
                Back to registration
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
