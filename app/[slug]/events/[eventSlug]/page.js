import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicHeader } from "../../../public-header.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { getRegistrationExperienceBySlugs } from "../../../../lib/passreserve-service.js";
import { PassreserveMedia } from "../../../../lib/passreserve-media.js";

export const dynamic = "force-dynamic";

function toList(value) {
  return Array.isArray(value) ? value : [];
}

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    return { title: "Event not found" };
  }

  return {
    title: entry.event.title,
    description: entry.event.summary
  };
}

export default async function EventDetailPage({ params }) {
  const { slug, eventSlug } = await params;
  const { locale, dictionary } = await getTranslations();
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    notFound();
  }

  const { organizer, event } = entry;
  const firstPhoto = toList(event.gallery).find((item) => item?.imageUrl) || null;

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="detail-hero">
          <article className="detail-hero-copy">
            <div className="breadcrumb">
              <Link href={organizer.organizerHref}>{organizer.name}</Link>
              <span>/</span>
              <span>{event.title}</span>
            </div>
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1>{event.title}</h1>
            <p>{event.summary}</p>
            <div className="pill-list mt-6">
              <span className="pill">{event.category}</span>
              <span className="pill">{event.duration}</span>
              <span className="pill">{event.collectionLabel}</span>
            </div>
            {event.description ? <p className="mt-6">{event.description}</p> : null}
            <div className="hero-actions mt-6">
              {event.nextOccurrence?.registrationHref ? (
                <Link className="button button-primary" href={event.nextOccurrence.registrationHref}>
                  {dictionary.event.register}
                </Link>
              ) : null}
              <Link className="button button-secondary" href={organizer.organizerHref}>
                {dictionary.event.hostPage}
              </Link>
              <a className="button button-secondary" href={`mailto:${organizer.contact.email}`}>
                {dictionary.organizer.emailOrganizer}
              </a>
            </div>
          </article>

          <aside className="detail-hero-summary">
            {firstPhoto ? (
              <PassreserveMedia
                alt={`${event.title} cover`}
                className="detail-hero-image"
                media={firstPhoto}
                priority
              />
            ) : null}
            <div className="detail-hero-summary-head">
              <div className="section-kicker">{dictionary.event.details}</div>
              <h2>{event.priceLabel}</h2>
              <p>{event.venueDetail || organizer.venue.title}</p>
            </div>

            <div className="detail-hero-stat-grid mt-6">
              <div className="detail-hero-stat">
                <span className="metric-label">{dictionary.event.pricing}</span>
                <strong>{event.collectionLabel}</strong>
              </div>
              <div className="detail-hero-stat">
                <span className="metric-label">{dictionary.organizer.agenda}</span>
                <strong>{event.occurrences.length}</strong>
              </div>
              <div className="detail-hero-stat">
                <span className="metric-label">{dictionary.event.audience}</span>
                <strong>{event.audience || "Open to published attendees"}</strong>
              </div>
              <div className="detail-hero-stat">
                <span className="metric-label">{dictionary.organizer.venue}</span>
                <strong>{organizer.venue.title}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid mt-6">
          <article className="panel section-card">
            <div className="section-kicker">{dictionary.event.details}</div>
            <h2>Highlights</h2>
            <div className="policy-list">
              {toList(event.highlights).map((highlight) => (
                <div className="policy-item" key={highlight}>
                  {highlight}
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">{dictionary.event.pricing}</div>
            <h2>What you pay now versus later</h2>
            <div className="payment-card">
              <div className="payment-heading">
                <strong>{event.priceLabel}</strong>
                <span>{event.collectionLabel}</span>
              </div>
              <div className="payment-amounts">
                <div className="payment-amount">
                  <span className="payment-label">Ticket total</span>
                  <span className="payment-value">{event.payment.subtotalLabel}</span>
                </div>
                <div className="payment-amount">
                  <span className="payment-label">Paid online</span>
                  <span className="payment-value">{event.payment.onlineAmountLabel}</span>
                </div>
                <div className="payment-amount">
                  <span className="payment-label">Due at event</span>
                  <span className="payment-value">{event.payment.dueAtEventLabel}</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="section-grid mt-6" id="occurrences">
          <article className="panel section-card section-span">
            <div className="section-kicker">{dictionary.event.dates}</div>
            <h2>Pick the date that works for you.</h2>
            <div className="agenda-list">
              {event.occurrences.length ? (
                event.occurrences.map((occurrence) => (
                  <article className="agenda-item" key={occurrence.id}>
                    <div className="agenda-head">
                      <div>
                        <strong>{occurrence.label}</strong>
                        <span>{occurrence.time}</span>
                      </div>
                      <span className="route-label">{occurrence.capacityLabel}</span>
                    </div>
                    <p>{occurrence.note}</p>
                    <div className="agenda-meta">
                      <span>{occurrence.capacity.statusLabel}</span>
                      <span>{event.collectionLabel}</span>
                      <span>{event.venueDetail || organizer.venue.title}</span>
                    </div>
                    {occurrence.registrationAvailable ? (
                      <Link className="button button-primary mt-4" href={occurrence.registrationHref}>
                        {dictionary.event.register}
                      </Link>
                    ) : (
                      <div className="mt-4 rounded-[1.25rem] bg-muted px-4 py-3 text-sm text-muted-foreground">
                        {occurrence.registrationGate?.reason || dictionary.registration.blocked}
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <article className="search-empty">
                  <h3>{dictionary.event.noDates}</h3>
                  <p>The event page is live and dates can be published from the organizer admin area.</p>
                </article>
              )}
            </div>
          </article>
        </section>

        <section className="section-grid mt-6">
          <article className="panel section-card">
            <div className="section-kicker">{dictionary.event.included}</div>
            <h2>{organizer.venue.title}</h2>
            <div className="policy-list">
              {toList(event.included).map((item) => (
                <div className="policy-item" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card" id="faq">
            <div className="section-kicker">{dictionary.event.policies}</div>
            <h2>Policies and FAQ</h2>
            <div className="faq-list">
              {toList(event.policies).map((policy) => (
                <article className="faq-item" key={policy}>
                  <strong>Policy</strong>
                  <p>{policy}</p>
                </article>
              ))}
              {toList(event.faq).map((item) => (
                <article className="faq-item" key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
