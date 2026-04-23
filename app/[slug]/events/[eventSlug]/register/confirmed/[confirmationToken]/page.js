import Link from "next/link";

import { PublicFooter } from "../../../../../../public-footer.js";
import { PublicHeader } from "../../../../../../public-header.js";
import { getTranslations } from "../../../../../../../lib/passreserve-i18n.js";
import { getConfirmedRegistrationView } from "../../../../../../../lib/passreserve-service.js";

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

export async function generateMetadata({ params }) {
  const { slug, eventSlug, confirmationToken } = await params;
  const view = await getConfirmedRegistrationView(slug, eventSlug, confirmationToken);

  if (view.state !== "ready") {
    return { title: "Registration confirmation" };
  }

  return {
    title: view.registrationCode,
    description: `Registration ${view.registrationCode} for ${view.event.title}.`
  };
}

function ConfirmationStatePanel({ view }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="search-empty">
          <h1>{view.title}</h1>
          <p>{view.message}</p>
          <div className="hero-actions mt-4">
            <Link className="button button-primary" href="/">
              Return to discovery
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function RegistrationConfirmedPage({ params }) {
  const { slug, eventSlug, confirmationToken } = await params;
  const view = await getConfirmedRegistrationView(slug, eventSlug, confirmationToken);
  const { locale, dictionary } = await getTranslations();

  if (view.state !== "ready") {
    return <ConfirmationStatePanel view={view} />;
  }

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>{view.registrationCode}</span>
            </div>
            <h1>{view.headline}</h1>
            <p>{view.nextStep}</p>
            <div className="pill-list mt-6">
              <span className="pill">{formatRegistrationStatus(view.registrationStatus)}</span>
              <span className="pill">{view.paymentProvider.label}</span>
              <span className="pill">{view.quantityLabel}</span>
            </div>
          </article>

          <aside className="hero-aside">
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Registration code</div>
                <div className="metric-value">{view.registrationCode}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Confirmed at</div>
                <div className="metric-value">{view.confirmedAtLabel}</div>
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
            <div className="section-kicker">Participants</div>
            <h2>Your registration details</h2>
            <div className="registration-choice-grid">
              {view.attendees.map((attendee, index) => (
                <article className="registration-choice registration-choice-active" key={attendee.id || index}>
                  <div className="registration-choice-head">
                    <strong>
                      {attendee.firstName || view.attendee.name} {attendee.lastName || ""}
                    </strong>
                    <span>{attendee.email || view.attendee.email}</span>
                  </div>
                  {attendee.address ? <span>{attendee.address}</span> : null}
                  {attendee.phone ? <span>{attendee.phone}</span> : null}
                </article>
              ))}
            </div>

            <div className="payment-card mt-6">
              <div className="payment-heading">
                <strong>Payment split</strong>
                <span>{view.ticketCategory.label}</span>
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
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">Timeline</div>
            <h3>What happens next</h3>
            <div className="timeline mt-6">
              {view.timeline.map((item) => (
                <div className="timeline-step" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
