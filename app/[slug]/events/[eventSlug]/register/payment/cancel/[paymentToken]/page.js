import Link from "next/link";

import {
  getRegistrationPaymentCancellationView
} from "../../../../../../../../lib/passreserve-service.js";
import { PublicVisual } from "../../../../../../../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../../../../../../../lib/passreserve-visuals.js";
import ResumePaymentForm from "./resume-payment-form.js";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentCancellationView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return {
      title: "Payment cancelled"
    };
  }

  return {
    title: `Pending payment for ${view.event.title}`,
    description: `Resume the Passreserve.com payment flow for ${view.event.title}.`
  };
}

function CancellationStatePanel({ view }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="empty-state">
          <article className="panel empty-card">
            <PublicVisual
              className="empty-card-visual"
              sizes="(min-width: 768px) 36vw, 90vw"
              visualId={routeVisuals.paymentCancel}
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

export default async function RegistrationPaymentCancelPage({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentCancellationView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return <CancellationStatePanel view={view} />;
  }

  if (view.paymentExpired) {
    return (
      <CancellationStatePanel
        view={{
          title: "The pending payment window has expired.",
          message:
            "This registration no longer has an open payment window. Return to the event page and create a fresh registration if seats are still available."
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
              Resume your payment without re-entering your registration
            </span>
          </div>
          <nav className="nav" aria-label="Pending payment navigation">
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
              <span>Pending payment</span>
            </div>
            <div className="page-place">
              {view.organizer.city}, {view.organizer.region}
            </div>
            <h1>The registration is confirmed, but the online amount still needs to be completed.</h1>
            <p>
              Your registration is already confirmed. If you still want this date, reopen the
              payment step below and finish the online amount.
            </p>
            <div className="pill-list">
              <span className="pill">{view.registrationCode}</span>
              <span className="pill">{view.payment.onlineAmountLabel} online</span>
              <span className="pill">Window closes {view.paymentExpiresAtLabel}</span>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.paymentCancel}
            />
            <div className="status-block">
              <div className="status-label">Payment status</div>
              <h2>{view.payment.onlineAmountLabel} outstanding</h2>
              <p>
                Reopening payment creates a fresh secure session tied to the same registration
                code.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Attendee</div>
                <div className="metric-value">{view.attendee.name}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Occurrence</div>
                <div className="metric-value">{view.occurrence.label}</div>
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
            <div className="section-kicker">Pending payment summary</div>
            <h2>Keep the same registration while reopening payment.</h2>
            <div className="registration-review-grid">
              <div className="registration-review-card">
                <span className="spotlight-label">Ticket</span>
                <strong>{view.ticketCategory.label}</strong>
                <span>{view.quantityLabel}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Confirmed at</span>
                <strong>{view.confirmedAtLabel}</strong>
                <span>{view.attendee.email}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Registration code</span>
                <strong>{view.registrationCode}</strong>
                <span>{view.registrationCode}</span>
              </div>
            </div>

            <div className="payment-card registration-payment-card">
              <div className="payment-heading">
                <strong>Collection split</strong>
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

            <ResumePaymentForm
              eventSlug={eventSlug}
              paymentToken={paymentToken}
              slug={slug}
            />
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Next steps</div>
            <h3>What happens if you reopen payment</h3>
            <div className="registration-rule-list">
              <div className="registration-rule-item">
                <strong>Same registration code</strong>
                <span>The attendee keeps {view.registrationCode} while the payment session changes.</span>
              </div>
              <div className="registration-rule-item">
                <strong>Same payment split</strong>
                <span>
                  {view.payment.onlineAmountLabel} stays online and {view.payment.dueAtEventLabel}
                  {" "}stays due at the event.
                </span>
              </div>
              <div className="registration-rule-item">
                <strong>Fresh checkout link</strong>
                <span>
                  Passreserve.com creates a new checkout link without making the attendee redo
                  the original confirmation checklist.
                </span>
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
