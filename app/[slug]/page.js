import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOrganizerBySlug,
  getOrganizerSlugs,
  publicOrganizerPhase
} from "../../lib/passreserve-public";

export function generateStaticParams() {
  return getOrganizerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerBySlug(slug);

  if (!organizer) {
    return {
      title: "Organizer not found"
    };
  }

  return {
    title: `${organizer.name} organizer page`,
    description: organizer.description
  };
}

export default async function OrganizerPage({ params }) {
  const { slug } = await params;
  const organizer = getOrganizerBySlug(slug);

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
              Organizer hubs, event pages, and occurrence-first public browsing
            </span>
          </div>
          <nav className="nav" aria-label="Organizer page navigation">
            <Link href="/">Discover</Link>
            <a href="#events">Event lineup</a>
            <a href="#dates">Upcoming dates</a>
            <a href="#venue">Venue and contact</a>
            <a href="#faq">FAQ</a>
          </nav>
        </header>

        <section className="hero public-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {publicOrganizerPhase.label} live
            </span>
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
            <div className="status-block">
              <div className="status-label">Organizer snapshot</div>
              <h2>{organizer.featuredEvent.title}</h2>
              <p>
                The organizer page now acts like a public event hub: featured event up top,
                dated occurrences underneath, and venue plus policy details visible before the
                attendee reaches the registration flow.
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
                <div className="metric-label">Default collection</div>
                <div className="metric-value">{organizer.defaultCollectionLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Venue zone</div>
                <div className="metric-value">{organizer.city}</div>
              </div>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Venue</strong>
                  {organizer.venue.title}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Contact</strong>
                  {organizer.contact.email}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Map support</strong>
                  Use the venue section to explain arrival, check-in, and where any event-day
                  balance is handled.
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid" id="events">
          <article className="panel section-card section-span">
            <div className="section-kicker">Event lineup</div>
            <h2>Featured events and presentation routes are now live for this organizer.</h2>
            <p>
              Each card links to its own event page, carries the next dated occurrence, and
              makes the deposit or full-payment rule visible before the attendee commits to a
              date.
            </p>
            <div className="event-lineup">
              {organizer.events.map((event) => (
                <article className="event-card" key={event.slug}>
                  <div
                    className="event-card-cover"
                    style={{ background: event.gallery[0].background }}
                  >
                    <span className="route-label">{event.category}</span>
                    <strong>{event.nextOccurrence.label}</strong>
                    <span>{event.collectionLabel}</span>
                  </div>
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
                      <a className="button button-secondary" href={event.interestHref}>
                        Ask about this event
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="dates">
          <article className="panel section-card">
            <div className="section-kicker">Upcoming agenda</div>
            <h3>Occurrences now surface directly on the organizer page.</h3>
            <p>
              The public hub can show a true dated agenda without forcing events back into slot
              settings. Each occurrence keeps its own capacity and event-specific route.
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
                  <Link className="inline-link" href={occurrence.detailHref}>
                    View occurrence context
                  </Link>
                </article>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Photo story</div>
            <h3>The organizer page now has room for photos and place cues.</h3>
            <p>
              These visual tiles show where the public experience can carry atmosphere, venue
              signals, and host credibility without reducing the page to a plain event table.
            </p>
            <div className="photo-grid">
              {organizer.photoStory.map((photo) => (
                <article
                  className="photo-card"
                  key={photo.title}
                  style={{ background: photo.background }}
                >
                  <span className="route-label">Photo support</span>
                  <strong>{photo.title}</strong>
                  <p>{photo.caption}</p>
                </article>
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
            <div className="section-kicker">Attendee policies</div>
            <h3>Policy and payment expectations are now visible on the public route.</h3>
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
            <div className="section-kicker">Organizer FAQ</div>
            <h3>Attendee-facing questions no longer need to wait for later phases.</h3>
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
          <span>
            Phase 06 makes organizer hubs and event detail routes live on Passreserve.com.
          </span>
          <Link href="/">Return to discovery</Link>
        </footer>
      </div>
    </main>
  );
}
