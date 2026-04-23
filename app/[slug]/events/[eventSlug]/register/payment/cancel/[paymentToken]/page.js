import Link from "next/link";

import { PublicFooter } from "../../../../../../../public-footer.js";
import { PublicHeader } from "../../../../../../../public-header.js";
import { getTranslations } from "../../../../../../../../lib/passreserve-i18n.js";
import { getRegistrationPaymentCancellationView } from "../../../../../../../../lib/passreserve-service.js";
import ResumePaymentForm from "./resume-payment-form.js";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentCancellationView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return { title: "Payment cancelled" };
  }

  return {
    title: `Pending payment for ${view.event.title}`,
    description: `Resume the payment flow for ${view.event.title}.`
  };
}

function CancellationStatePanel({ view }) {
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

export default async function RegistrationPaymentCancelPage({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentCancellationView(slug, eventSlug, paymentToken);
  const { locale, dictionary } = await getTranslations();

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
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <h1>The registration is confirmed, but the online amount is still open.</h1>
            <p>
              Reopen payment below if you still want to keep this registration active for the
              selected date.
            </p>
          </article>

          <aside className="hero-aside">
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
            <div className="payment-card">
              <div className="payment-heading">
                <strong>Payment split</strong>
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

            <div className="mt-6">
              <ResumePaymentForm eventSlug={eventSlug} paymentToken={paymentToken} slug={slug} />
            </div>
          </article>
        </section>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
