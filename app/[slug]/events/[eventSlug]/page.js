import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRegistrationExperienceBySlugs,
  getRegistrationRouteParams
} from "../../../../lib/passreserve-registrations";

export function generateStaticParams() {
  return getRegistrationRouteParams();
}

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const entry = getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    return {
      title: "Event not found"
    };
  }

  return {
    title: entry.event.title,
    description: entry.event.summary
  };
}

export default async function EventDetailPage({ params }) {
  const { slug, eventSlug } = await params;
  const entry = getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    notFound();
  }

  const { organizer, event } = entry;

  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Event details, upcoming dates, and simple registration
            </span>
          </div>
          <nav className="nav" aria-label="Event page navigation">
            <Link href="/">Discover</Link>
            <Link href={organizer.organizerHref}>Host page</Link>
            <a href="#occurrences">Upcoming dates</a>
            <a href="#faq">FAQ</a>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">Event page</span>
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
            <p>{event.description}</p>
            <div className="pill-list">
              <span className="pill">{event.category}</span>
              <span className="pill">{event.duration}</span>
              <span className="pill">{event.collectionLabel}</span>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href={event.nextOccurrence.registrationHref}>
                Register for the next date
              </Link>
              <a className="button button-secondary" href={event.interestHref}>
                Email the organizer
              </a>
              <Link className="button button-secondary" href={organizer.organizerHref}>
                Back to host page
              </Link>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">Hosted by {organizer.name}</div>
              <h2>{event.nextOccurrence.label}</h2>
              <p>
                Everything you need is kept on one page: what this event is, who it is for,
                what it includes, how much it costs, and which dates are open right now.
              </p>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label">Price</div>
                <div className="metric-value">{event.priceLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Online collection</div>
                <div className="metric-value">{event.collectionLabel}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Occurrences</div>
                <div className="metric-value">{event.occurrences.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Next capacity</div>
                <div className="metric-value">{event.nextOccurrence.capacityLabel}</div>
              </div>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Audience fit</strong>
                  {event.audience}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Venue detail</strong>
                  {event.venueDetail}
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Payment</strong>
                  {event.prepayPercentage > 0
                    ? `${event.nextOccurrence.time}, with the online amount collected after confirmation`
                    : `${event.nextOccurrence.time}, with payment handled at the event`}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid">
          <article className="panel section-card">
            <div className="section-kicker">Why people choose it</div>
            <h3>Highlights for this event</h3>
            <p>
              Use this section to understand the feel of the event before you compare dates.
            </p>
            <div className="policy-list">
              {event.highlights.map((highlight) => (
                <div className="policy-item" key={highlight}>
                  {highlight}
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Pricing</div>
            <h3>See the total and what you pay now.</h3>
            <p>
              If a deposit or online amount is required, it is shown clearly before you start
              registration.
            </p>
            <div className="payment-card">
              <div className="payment-heading">
                <strong>
                  {event.priceLabel} total ticket, {event.collectionLabel}
                </strong>
                <span>{event.venueDetail}</span>
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

        <section className="section-grid" id="occurrences">
          <article className="panel section-card section-span">
            <div className="section-kicker">Choose a date</div>
            <h2>Pick the date that works for you.</h2>
            <p>
              Each date keeps its own timing, availability, and registration link so you can
              sign up without guessing what is still open.
            </p>
            <div className="occurrence-list">
              {event.occurrences.map((occurrence) => (
                <article className="occurrence-card" key={occurrence.id}>
                  <div className="occurrence-cover" style={{ background: event.gallery[0].background }}>
                    <span className="route-label">{occurrence.capacityLabel}</span>
                    <strong>{occurrence.label}</strong>
                    <span>{occurrence.time}</span>
                  </div>
                  <div className="occurrence-body">
                    <h3>{event.title}</h3>
                    <p>{occurrence.note}</p>
                    <div className="event-card-meta">
                      <div className="spotlight-note">
                        <span className="spotlight-label">Ticket total</span>
                        <strong>{event.priceLabel}</strong>
                      </div>
                      <div className="spotlight-note">
                        <span className="spotlight-label">Online collection</span>
                        <strong>{event.collectionLabel}</strong>
                      </div>
                      <div className="spotlight-note">
                        <span className="spotlight-label">Capacity state</span>
                        <strong>{occurrence.capacity.statusLabel}</strong>
                      </div>
                    </div>
                    <div className="hero-actions event-card-actions">
                      <Link className="button button-primary" href={occurrence.registrationHref}>
                        Register for this date
                      </Link>
                      <Link className="button button-secondary" href={organizer.organizerHref}>
                        View host page
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid">
          <article className="panel section-card">
            <div className="section-kicker">Included and on site</div>
            <h3>{organizer.venue.title}</h3>
            <p>{event.venueDetail}</p>
            <div className="policy-list">
              {event.included.map((item) => (
                <div className="policy-item" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Visual feel</div>
            <h3>Get a sense of the event before you commit.</h3>
            <div className="photo-grid">
              {event.gallery.map((photo) => (
                <article
                  className="photo-card"
                  key={photo.title}
                  style={{ background: photo.background }}
                >
                  <span className="route-label">Event photo</span>
                  <strong>{photo.title}</strong>
                  <p>{photo.caption}</p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="faq">
          <article className="panel section-card">
            <div className="section-kicker">Policies</div>
            <h3>Important details before you register.</h3>
            <div className="policy-list">
              {event.policies.map((policy) => (
                <div className="policy-item" key={policy}>
                  {policy}
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Attendee FAQ</div>
            <h3>Common questions before signup.</h3>
            <div className="faq-list">
              {event.faq.map((item) => (
                <article className="faq-item" key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="cta-band">
          <div>
            <div className="section-kicker">Ready to join?</div>
            <h2>Pick a date and start your registration.</h2>
            <p>
              You&apos;ll choose a date, confirm your details, and receive a registration code
              with any next payment steps explained clearly.
            </p>
          </div>
          <div className="hero-actions cta-actions">
            <Link className="button button-primary" href={event.nextOccurrence.registrationHref}>
              Register now
            </Link>
            <a className="button button-secondary" href={event.interestHref}>
              Email the organizer
            </a>
          </div>
        </section>

        <footer className="footer">
          <span>Want to compare more formats from the same host? Return to the host page.</span>
          <Link href={organizer.organizerHref}>Return to the host page</Link>
        </footer>
      </div>
    </main>
  );
}
