import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRegistrationExperienceBySlugs
} from "../../../../lib/passreserve-service.js";
import { PassreserveMedia } from "../../../../lib/passreserve-media.js";
import { routeVisuals, selectCatalogVisualId } from "../../../../lib/passreserve-visuals.js";
import { PublicPhotoGallery } from "../../public-photo-gallery.js";

export const dynamic = "force-dynamic";

function toList(value) {
  return Array.isArray(value) ? value : [];
}

function getCoverMedia(items, fallbackVisualId, seed) {
  const firstMedia = toList(items)[0];

  if (firstMedia?.imageUrl || firstMedia?.visualId) {
    return firstMedia;
  }

  return {
    visualId: fallbackVisualId || selectCatalogVisualId(seed, 0)
  };
}

export async function generateMetadata({ params }) {
  const { slug, eventSlug } = await params;
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

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
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    notFound();
  }

  const { organizer, event } = entry;
  const nextOccurrence = event.nextOccurrence;
  const occurrences = toList(event.occurrences);
  const highlights = toList(event.highlights);
  const included = toList(event.included);
  const policies = toList(event.policies);
  const faqItems = toList(event.faq);
  const gallery = toList(event.gallery);
  const galleryPhotos = gallery.length
    ? gallery
    : [
        {
          visualId: selectCatalogVisualId(`${organizer.slug}:${event.slug}`, 0)
        },
        {
          visualId: selectCatalogVisualId(`${organizer.slug}:${event.slug}`, 1)
        }
      ];
  const coverMedia = getCoverMedia(galleryPhotos, routeVisuals.eventHero, `${organizer.slug}:${event.slug}`);

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

        <section className="detail-hero">
          <article className="panel detail-hero-copy">
            <div className="breadcrumb">
              <Link href={organizer.organizerHref}>{organizer.name}</Link>
              <span>/</span>
              <span>{event.title}</span>
            </div>
            <div className="page-place">
              {organizer.city}, {organizer.region}
            </div>
            <h1>{event.title}</h1>
            {event.summary ? <p>{event.summary}</p> : null}
            <div className="pill-list">
              <span className="pill">{event.category}</span>
              <span className="pill">{event.duration}</span>
              <span className="pill">{event.collectionLabel}</span>
            </div>
            {event.description ? <p>{event.description}</p> : null}
            <div className="hero-actions">
              {nextOccurrence?.registrationHref ? (
                <Link className="button button-primary" href={nextOccurrence.registrationHref}>
                  Register for the next date
                </Link>
              ) : (
                <a className="button button-primary" href="#occurrences">
                  Check upcoming dates
                </a>
              )}
              <a className="button button-secondary" href={event.interestHref}>
                Email the organizer
              </a>
              <Link className="button button-secondary" href={organizer.organizerHref}>
                Back to host page
              </Link>
            </div>
          </article>

          <aside className="panel detail-hero-summary">
            <PassreserveMedia
              alt={`${event.title} cover`}
              className="detail-hero-image"
              media={coverMedia}
              priority
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
            <div className="detail-hero-summary-body">
              <div className="detail-hero-summary-head">
                <div className="section-kicker">Hosted by {organizer.name}</div>
                <h2>{nextOccurrence?.label || "Dates coming soon"}</h2>
                <p>{nextOccurrence?.time || "The first public date will appear here once it is published."}</p>
              </div>

              <div className="detail-hero-stat-grid">
                <div className="detail-hero-stat">
                  <span className="metric-label">Price</span>
                  <strong>{event.priceLabel}</strong>
                </div>
                <div className="detail-hero-stat">
                  <span className="metric-label">Payment</span>
                  <strong>{event.collectionLabel}</strong>
                </div>
                <div className="detail-hero-stat">
                  <span className="metric-label">Capacity</span>
                  <strong>{nextOccurrence?.capacityLabel || "No dates yet"}</strong>
                </div>
                <div className="detail-hero-stat">
                  <span className="metric-label">Venue</span>
                  <strong>{event.venueDetail || organizer.venue.title}</strong>
                </div>
              </div>

              <div className="detail-hero-notes">
                <div className="detail-hero-note">
                  <span className="spotlight-label">Audience fit</span>
                  <p>{event.audience || "The organizer can use this area to explain who the event is best for before registration opens."}</p>
                </div>
                <div className="detail-hero-note">
                  <span className="spotlight-label">Payment plan</span>
                  <p>
                    {nextOccurrence
                      ? event.prepayPercentage > 0
                        ? `${nextOccurrence.time}, with the online amount collected after confirmation`
                        : `${nextOccurrence.time}, with payment handled at the event`
                      : "Publish a first date to show the live time and payment plan here."}
                  </p>
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
              {highlights.length ? (
                highlights.map((highlight) => (
                  <div className="policy-item" key={highlight}>
                    {highlight}
                  </div>
                ))
              ) : (
                <div className="policy-item">Key event highlights will appear here as the organizer finishes the public page.</div>
              )}
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
              {occurrences.length ? (
                occurrences.map((occurrence) => (
                  <article className="occurrence-card" key={occurrence.id}>
                    <div className="occurrence-body">
                      <div className="occurrence-head">
                        <div>
                          <div className="page-place">{occurrence.label}</div>
                          <h3>{occurrence.time}</h3>
                        </div>
                        <div className="occurrence-price">
                          <span className="metric-label">Ticket total</span>
                          <strong>{event.priceLabel}</strong>
                        </div>
                      </div>
                      <p>{occurrence.note}</p>
                      <div className="event-card-meta occurrence-meta">
                        <div className="spotlight-note">
                          <span className="spotlight-label">Capacity</span>
                          <strong>{occurrence.capacity.statusLabel}</strong>
                        </div>
                        <div className="spotlight-note">
                          <span className="spotlight-label">Payment</span>
                          <strong>{event.collectionLabel}</strong>
                        </div>
                        <div className="spotlight-note">
                          <span className="spotlight-label">Venue</span>
                          <strong>{event.venueDetail || organizer.venue.title}</strong>
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
                ))
              ) : (
                <article className="search-empty">
                  <h3>No public dates are open yet.</h3>
                  <p>The event page is live, and the organizer can publish the first bookable date from the host dashboard.</p>
                </article>
              )}
            </div>
          </article>
        </section>

        <section className="section-grid">
          <article className="panel section-card">
            <div className="section-kicker">Included and on site</div>
            <h3>{organizer.venue.title}</h3>
            <p>{event.venueDetail}</p>
            <div className="policy-list">
              {included.length ? (
                included.map((item) => (
                  <div className="policy-item" key={item}>
                    {item}
                  </div>
                ))
              ) : (
                <div className="policy-item">Included items and on-site details will appear here once the organizer finishes the event setup.</div>
              )}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Gallery</div>
            <h3>See the setting before you commit.</h3>
            <PublicPhotoGallery items={galleryPhotos} title={`${event.title} gallery`} />
          </article>
        </section>

        <section className="section-grid" id="faq">
          <article className="panel section-card">
            <div className="section-kicker">Policies</div>
            <h3>Important details before you register.</h3>
            <div className="policy-list">
              {policies.length ? (
                policies.map((policy) => (
                  <div className="policy-item" key={policy}>
                    {policy}
                  </div>
                ))
              ) : (
                <div className="policy-item">Policies will be published here before registration opens for the first date.</div>
              )}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Attendee FAQ</div>
            <h3>Common questions before signup.</h3>
            <div className="faq-list">
              {faqItems.length ? (
                faqItems.map((item) => (
                  <article className="faq-item" key={item.question}>
                    <strong>{item.question}</strong>
                    <p>{item.answer}</p>
                  </article>
                ))
              ) : (
                <article className="faq-item">
                  <strong>When will more attendee details be available?</strong>
                  <p>The organizer can add event-specific answers here as the public registration page is completed.</p>
                </article>
              )}
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
            {nextOccurrence?.registrationHref ? (
              <Link className="button button-primary" href={nextOccurrence.registrationHref}>
                Register now
              </Link>
            ) : (
              <a className="button button-primary" href="#occurrences">
                See when dates go live
              </a>
            )}
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
