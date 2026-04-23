import Link from "next/link";

import { PublicFooter } from "../../../../../../../public-footer.js";
import { PublicHeader } from "../../../../../../../public-header.js";
import { getTranslations } from "../../../../../../../../lib/passreserve-i18n.js";
import { getRegistrationPaymentPreviewView } from "../../../../../../../../lib/passreserve-service.js";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);

  if (view.state !== "ready") {
    return { title: "Payment review" };
  }

  return {
    title: `Payment review for ${view.event.title}`,
    description: `Review the payment step for ${view.event.title}.`
  };
}

function PreviewStatePanel({ view }) {
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

export default async function RegistrationPaymentPreviewPage({ params }) {
  const { slug, eventSlug, paymentToken } = await params;
  const view = await getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);
  const { locale, dictionary } = await getTranslations();

  if (view.state !== "ready") {
    return <PreviewStatePanel view={view} />;
  }

  if (view.paymentExpired) {
    return (
      <PreviewStatePanel
        view={{
          title: "This payment link has expired.",
          message: "The original payment window has closed, so this link can no longer be used."
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
            <div className="breadcrumb">
              <Link href={view.organizer.organizerHref}>{view.organizer.name}</Link>
              <span>/</span>
              <Link href={view.event.detailHref}>{view.event.title}</Link>
              <span>/</span>
              <span>Payment</span>
            </div>
            <h1>Review this registration before checkout opens.</h1>
            <p>
              Your registration is already waiting on payment. Review the amount due now before
              continuing to checkout.
            </p>
          </article>

          <aside className="hero-aside">
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Registration code</div>
                <div className="metric-value">{view.registrationCode}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Online amount</div>
                <div className="metric-value">{view.payment.onlineAmountLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Due at event</div>
                <div className="metric-value">{view.payment.dueAtEventLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Expires</div>
                <div className="metric-value">{view.paymentExpiresAtLabel}</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="registration-grid">
          <article className="panel section-card registration-flow-card">
            <div className="payment-card">
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

            <div className="hero-actions mt-6">
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
        </section>

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
