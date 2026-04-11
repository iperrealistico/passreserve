import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOrganizerPage,
  getOrganizerSlugs
} from "../../lib/passreserve-service.js";
import { PublicVisual } from "../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../lib/passreserve-visuals.js";

function buildRegistrationHref(slug, eventSlug, occurrenceId) {
  return `/${slug}/events/${eventSlug}/register?occurrence=${occurrenceId}`;
}

export async function generateStaticParams() {
  return (await getOrganizerSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = await getOrganizerPage(slug);

  if (!organizer) {
    return {
      title: "Organizer not found"
    };
  }

  return {
    title: `${organizer.name} events`,
    description: organizer.description
  };
}

export default async function OrganizerPage({ params }) {
  const { slug } = await params;
  const organizer = await getOrganizerPage(slug);

  if (!organizer) {
    notFound();
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
              Hosted events with clear dates, pricing, and venue details
            </span>
          </div>
          <nav className="nav" aria-label="Host page navigation">
            <Link href="/">Discover</Link>
            <a href="#events">Event lineup</a>
            <a href="#dates">Upcoming dates</a>
            <a href="#venue">Venue and contact</a>
            <a href="#faq">FAQ</a>
          </nav>
        </header>

        <section className="hero public-hero">
          <article className="panel hero-copy public-hero-copy">
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1>{organizer.name}</h1>
            <p>{organizer.tagline}</p>
            <p>{organizer.description}</p>
            <div className="pill-list">
              {organizer.themeTags.map((tag) => (
                <span className="pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href={organizer.featuredEvent.detailHref}>
                Open featured event
              </Link>
              <a className="button button-secondary" href="#dates">
                Review upcoming dates
              </a>
              <a className="button button-secondary" href={organizer.interestHref}>
                Email organizer
              </a>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.organizerHero}
            />
            <div className="status-block">
              <div className="status-label">Featured next</div>
              <h2>{organizer.featuredEvent.title}</h2>
              <p>
                Start with the featured event, then browse the upcoming dates below to compare the
                host, the place, and the price before you register.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Event types</div>
                <div className="metric-value">{organizer.events.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Upcoming dates</div>
                <div className="metric-value">{organizer.totalUpcomingOccurrences}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Online payment</div>
                <div className="metric-value">{organizer.defaultCollectionLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Host city</div>
                <div className="metric-value">{organizer.city}</div>
              </div>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Meeting point</strong>
                  {organizer.venue.title}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Questions</strong>
                  {organizer.contact.email}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Payment style</strong>
                  {organizer.defaultCollectionLabel}, shown clearly before anyone starts registration.
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid" id="events">
          <article className="panel section-card section-span">
            <div className="section-kicker">Event lineup</div>
            <h2>Choose the format that feels right for you.</h2>
            <p>
              Each event keeps its own tone, next date, and payment approach so you can compare
              options without losing the personality of the host.
            </p>
            <div className="event-lineup">
              {organizer.events.map((event) => (
                <article className="event-card" key={event.slug}>
                  <PublicVisual
                    className="event-card-cover"
                    sizes="(min-width: 1024px) 24vw, 100vw"
                    visualId={event.gallery[0].visualId}
                  >
                    <span className="route-label">{event.category}</span>
                    <strong>{event.nextOccurrence.label}</strong>
                    <span>{event.collectionLabel}</span>
                  </PublicVisual>
                  <div className="event-card-body">
                    <h3>{event.title}</h3>
                    <p>{event.summary}</p>
                    <div className="event-card-meta">
                      <div className="spotlight-note">
                        <span className="spotlight-label">Next live date</span>
                        <strong>{event.nextOccurrenceLabel}</strong>
                      </div>
                      <div className="spotlight-note">
                        <span className="spotlight-label">Price and collection</span>
                        <strong>
                          {event.priceLabel} total, {event.collectionLabel}
                        </strong>
                      </div>
                    </div>
                    <div className="pill-list">
                      {event.highlights.slice(0, 3).map((highlight) => (
                        <span className="pill" key={highlight}>
                          {highlight}
                        </span>
                      ))}
                    </div>
                    <div className="hero-actions event-card-actions">
                      <Link className="button button-primary" href={event.detailHref}>
                        Open event page
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={buildRegistrationHref(
                          organizer.slug,
                          event.slug,
                          event.nextOccurrence.id
                        )}
                      >
                        Start registration
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="dates">
          <article className="panel section-card">
            <div className="section-kicker">Upcoming dates</div>
            <h3>Browse the next available dates at a glance.</h3>
            <p>
              If you already know you want this organizer, you should be able to go from this
              list straight into the date that works for you.
            </p>
            <div className="agenda-list">
              {organizer.agenda.map((occurrence) => (
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
                    href={buildRegistrationHref(
                      organizer.slug,
                      occurrence.eventSlug,
                      occurrence.id
                    )}
                  >
                    Start registration
                  </Link>
                </article>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Atmosphere</div>
            <h3>Get a feel for the place before you sign up.</h3>
            <p>
              These photos help show the pace, setting, and hosting style behind the events before
              you choose a date.
            </p>
            <div className="photo-grid">
              {organizer.photoStory.map((photo) => (
                <PublicVisual
                  alt={`${photo.title}. ${photo.caption}`}
                  className="photo-card"
                  key={photo.title}
                  sizes="(min-width: 1024px) 20vw, 100vw"
                  visualId={photo.visualId}
                >
                  <span className="route-label">Venue feel</span>
                  <strong>{photo.title}</strong>
                  <p>{photo.caption}</p>
                </PublicVisual>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="venue">
          <article className="panel section-card">
            <div className="section-kicker">Venue and contact</div>
            <h3>{organizer.venue.title}</h3>
            <p>{organizer.venue.detail}</p>
            <div className="contact-list">
              <div className="contact-item">
                <span className="spotlight-label">Organizer email</span>
                <strong>{organizer.contact.email}</strong>
              </div>
              <div className="contact-item">
                <span className="spotlight-label">Organizer phone</span>
                <strong>{organizer.contact.phone}</strong>
              </div>
            </div>
            <div className="hero-actions">
              <a
                className="button button-secondary"
                href={organizer.venue.mapHref}
                rel="noreferrer"
                target="_blank"
              >
                {organizer.venue.mapLabel}
              </a>
              <a className="button button-secondary" href={organizer.interestHref}>
                Ask a venue question
              </a>
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Before you book</div>
            <h3>Know the basics before you choose a date.</h3>
            <div className="policy-list">
              {organizer.policies.map((policy) => (
                <div className="policy-item" key={policy}>
                  {policy}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="faq">
          <article className="panel section-card section-span">
            <div className="section-kicker">FAQ</div>
            <h3>Common questions, answered before registration.</h3>
            <div className="faq-list">
              {organizer.faq.map((item) => (
                <article className="faq-item" key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <footer className="footer">
          <span>Open an event page to compare dates, pricing, and what&apos;s included.</span>
          <Link href="/">Return to discovery</Link>
        </footer>
      </div>
    </main>
  );
}
