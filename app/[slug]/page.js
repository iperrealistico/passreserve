import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicHeader } from "../public-header.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getOrganizerPage } from "../../lib/passreserve-service.js";
import { PassreserveMedia } from "../../lib/passreserve-media.js";

export const dynamic = "force-dynamic";

function buildRegistrationHref(slug, eventSlug, occurrenceId) {
  return `/${slug}/events/${eventSlug}/register?occurrence=${occurrenceId}`;
}

function toList(value) {
  return Array.isArray(value) ? value : [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = await getOrganizerPage(slug);

  if (!organizer) {
    return { title: "Page not found" };
  }

  return {
    title: `${organizer.name} · Organizer`,
    description: organizer.description
  };
}

export default async function OrganizerPage({ params }) {
  const { slug } = await params;
  const { locale, dictionary } = await getTranslations();
  const organizer = await getOrganizerPage(slug);

  if (!organizer) {
    notFound();
  }

  const events = toList(organizer.events);
  const agenda = toList(organizer.agenda);
  const venues = toList(organizer.venues);
  const faqItems = toList(organizer.faq);
  const policies = toList(organizer.policies);

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader dictionary={dictionary} locale={locale} />

        <section className="hero">
          <article className="hero-copy">
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1>{organizer.name}</h1>
            {organizer.tagline ? <p>{organizer.tagline}</p> : null}
            {organizer.description ? <p>{organizer.description}</p> : null}
            <div className="pill-list mt-6">
              {toList(organizer.themeTags).map((tag) => (
                <span className="pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="hero-actions mt-6">
              {organizer.featuredEvent ? (
                <Link className="button button-primary" href={organizer.featuredEvent.detailHref}>
                  {dictionary.organizer.events}
                </Link>
              ) : null}
              <a className="button button-secondary" href="#agenda">
                {dictionary.organizer.agenda}
              </a>
              <a className="button button-secondary" href={`mailto:${organizer.contact.email}`}>
                {dictionary.organizer.emailOrganizer}
              </a>
            </div>
          </article>

          <aside className="hero-aside">
            <div className="metrics">
              <div className="metric">
                <div className="metric-label">{dictionary.organizer.events}</div>
                <div className="metric-value">{events.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label">{dictionary.organizer.agenda}</div>
                <div className="metric-value">{organizer.totalUpcomingOccurrences}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Default payment</div>
                <div className="metric-value">{organizer.defaultCollectionLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">{dictionary.organizer.contact}</div>
                <div className="metric-value">{organizer.contact.email}</div>
              </div>
            </div>

            <div className="status-list mt-6">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>{dictionary.organizer.venue}</strong>
                  {organizer.venue.title || organizer.venue.detail || "Venue details coming soon"}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>{dictionary.organizer.contact}</strong>
                  {organizer.contact.phone || organizer.contact.email}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Payment clarity</strong>
                  {organizer.defaultCollectionLabel} is shown before anyone starts registration.
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid mt-6" id="events">
          <article className="panel section-card section-span">
            <div className="section-kicker">{dictionary.organizer.events}</div>
            <h2>Choose the format that fits your plan.</h2>
            <div className="result-grid">
              {events.map((event) => {
                const firstPhoto = toList(event.gallery).find((item) => item?.imageUrl) || null;
                const nextAvailableOccurrence =
                  event.occurrences.find((occurrence) => occurrence.registrationAvailable) ||
                  event.nextOccurrence ||
                  null;

                return (
                  <article className="event-card" key={event.slug}>
                    {firstPhoto ? (
                      <PassreserveMedia
                        alt={`${event.title} cover`}
                        className="event-card-cover"
                        imageClassName="event-card-cover-image"
                        media={firstPhoto}
                      />
                    ) : null}
                    <div className="event-card-body">
                      <div className="event-card-head">
                        <div>
                          <div className="section-kicker">{event.category}</div>
                          <h3>{event.title}</h3>
                        </div>
                        <div className="spotlight-note">
                          <span className="spotlight-label">Payment</span>
                          <strong>
                            {event.priceLabel} · {event.collectionLabel}
                          </strong>
                        </div>
                      </div>
                      <p>{event.summary}</p>
                      <div className="pill-list mt-4">
                        {toList(event.highlights).slice(0, 3).map((highlight) => (
                          <span className="pill" key={highlight}>
                            {highlight}
                          </span>
                        ))}
                      </div>
                      <div className="hero-actions mt-5">
                        <Link className="button button-primary" href={event.detailHref}>
                          {dictionary.events.openEvent}
                        </Link>
                        {nextAvailableOccurrence?.id ? (
                          <Link
                            className="button button-secondary"
                            href={buildRegistrationHref(organizer.slug, event.slug, nextAvailableOccurrence.id)}
                          >
                            {dictionary.organizer.cta}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        </section>

        <section className="section-grid mt-6" id="agenda">
          <article className="panel section-card section-span">
            <div className="section-kicker">{dictionary.organizer.agenda}</div>
            <h2>See the next dates at a glance.</h2>
            <div className="agenda-list">
              {agenda.length ? (
                agenda.map((occurrence) => (
                  <article className="agenda-item" key={occurrence.id}>
                    <div className="agenda-head">
                      <div>
                        <strong>{occurrence.eventTitle}</strong>
                        <span>{occurrence.label}</span>
                      </div>
                      <span className="route-label">{occurrence.capacity}</span>
                    </div>
                    <p>{occurrence.note}</p>
                    <div className="agenda-meta">
                      <span>{occurrence.time}</span>
                      <span>{occurrence.priceLabel}</span>
                      <span>{occurrence.collectionLabel}</span>
                    </div>
                    <Link
                      className="inline-link"
                      href={buildRegistrationHref(organizer.slug, occurrence.eventSlug, occurrence.id)}
                    >
                      {dictionary.organizer.cta}
                    </Link>
                  </article>
                ))
              ) : (
                <article className="search-empty">
                  <h3>No upcoming dates yet.</h3>
                  <p>The organizer can publish the first dates from the admin area.</p>
                </article>
              )}
            </div>
          </article>
        </section>

        <section className="section-grid mt-6">
          <article className="panel section-card">
            <div className="section-kicker">{dictionary.organizer.venue}</div>
            <h2>{organizer.venue.title || "Venue details"}</h2>
            <p>{organizer.venue.detail}</p>
            <div className="timeline mt-6">
              {venues.map((venue, index) => (
                <div className="timeline-step" key={`${venue.title}-${index}`}>
                  <strong>{venue.title || `Venue ${index + 1}`}</strong>
                  <span>{venue.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card" id="faq">
            <div className="section-kicker">FAQ</div>
            <h2>Before you register</h2>
            <div className="faq-list">
              {faqItems.map((item) => (
                <article className="faq-item" key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
              {policies.map((policy) => (
                <article className="faq-item" key={policy}>
                  <strong>Policy</strong>
                  <p>{policy}</p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
