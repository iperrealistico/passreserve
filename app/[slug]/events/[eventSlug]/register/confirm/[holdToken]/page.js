import Link from "next/link";

import {
  getConfirmationFieldRules,
  getRegistrationHoldView
} from "../../../../../../../lib/passreserve-service.js";
import { getTranslations } from "../../../../../../../lib/passreserve-i18n.js";
import { PublicHeader } from "../../../../../../public-header.js";
import ConfirmationForm from "./confirmation-form.js";

export async function generateMetadata({ params }) {
  const { slug, eventSlug, holdToken } = await params;
  const holdView = await getRegistrationHoldView(slug, eventSlug, holdToken);

  if (holdView.state !== "ready") {
    return { title: "Registration hold" };
  }

  return {
    title: `Confirm ${holdView.event.title}`,
    description: `Review and confirm the pending registration hold for ${holdView.event.title}.`
  };
}

function HoldStatePanel({ holdView }) {
  return (
    <main className="shell">
      <div className="content">
        <section className="search-empty">
          <h1>{holdView.title}</h1>
          <p>{holdView.message}</p>
          <div className="hero-actions mt-4">
            <Link className="button button-primary" href={holdView.restartHref || "/"}>
              Start again
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function RegistrationConfirmPage({ params }) {
  const { slug, eventSlug, holdToken } = await params;
  const holdView = await getRegistrationHoldView(slug, eventSlug, holdToken);
  const { locale, dictionary } = await getTranslations();

  if (holdView.state !== "ready") {
    return <HoldStatePanel holdView={holdView} />;
  }

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <div className="breadcrumb">
              <Link href={holdView.organizer.organizerHref}>{holdView.organizer.name}</Link>
              <span>/</span>
              <Link href={holdView.event.detailHref}>{holdView.event.title}</Link>
              <span>/</span>
              <span>Confirm</span>
            </div>
            <div className="page-place">
              {holdView.organizer.city}, {holdView.organizer.region}
            </div>
            <h1>Review your details and confirm your place.</h1>
            <p>
              We are holding {holdView.quantityLabel} on {holdView.occurrence.label} until{" "}
              {holdView.hold.expiresAtLabel}.
            </p>
            <div className="pill-list mt-6">
              <span className="pill">{holdView.occurrence.capacityLabel}</span>
              <span className="pill">{holdView.ticketCategory.label}</span>
              <span className="pill">Expires {holdView.hold.expiresAtLabel}</span>
            </div>
          </article>

          <aside className="hero-aside">
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
                <div className="metric-label">Pending holds</div>
                <div className="metric-value">{holdView.capacity.pendingHoldCount}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Pending payment</div>
                <div className="metric-value">{holdView.capacity.pendingPaymentCount}</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="registration-grid">
          <article className="panel section-card registration-flow-card">
            <div className="section-kicker">Participants</div>
            <h2>Review the participant details</h2>

            <div className="registration-choice-grid">
              {holdView.attendees.map((attendee, index) => (
                <article className="registration-choice registration-choice-active" key={attendee.id || index}>
                  <div className="registration-choice-head">
                    <strong>
                      {attendee.firstName} {attendee.lastName}
                    </strong>
                    <span>{attendee.email}</span>
                  </div>
                  <span>{attendee.address}</span>
                  <span>{attendee.phone}</span>
                  {attendee.dietaryOther ? <span>{attendee.dietaryOther}</span> : null}
                </article>
              ))}
            </div>

            <div className="payment-card mt-6">
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

            <div className="registration-rule-list mt-6">
              {getConfirmationFieldRules().map((rule) => (
                <div className="registration-rule-item rounded-[1.25rem] border border-border bg-muted/40 p-4" key={rule.field}>
                  <strong>{rule.label}</strong>
                  <span>{rule.detail}</span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <ConfirmationForm
                eventSlug={eventSlug}
                holdToken={holdToken}
                labels={{
                  terms:
                    locale === "it"
                      ? "Accetto le indicazioni dell'organizer, le note venue e le policy pubblicate per questa data."
                      : "I accept the organizer guidance, venue notes, and published policies for this date.",
                  responsibility:
                    locale === "it"
                      ? "Confermo il numero dei partecipanti e che la data selezionata è corretta per il gruppo registrato."
                      : "I confirm the participant count and that the selected date still matches the registered group.",
                  submit: locale === "it" ? "Conferma registrazione" : "Confirm registration",
                  submitting: locale === "it" ? "Conferma in corso..." : "Confirming registration..."
                }}
                slug={slug}
              />
            </div>
          </article>

          <aside className="panel section-card registration-aside">
            <div className="section-kicker">After confirmation</div>
            <h3>What happens next</h3>
            <div className="timeline mt-6">
              {holdView.timeline.map((item) => (
                <div className="timeline-step" key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
