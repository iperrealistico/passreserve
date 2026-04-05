import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRegistrationExperienceBySlugs,
  getRegistrationRouteParams,
  registrationFlowPhase
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
              Event detail pages, live registration, and hosted payment-ready attendee flow
            </span>
          </div>
          <nav className="nav" aria-label="Event page navigation">
            <Link href="/">Discover</Link>
            <Link href={organizer.organizerHref}>Organizer hub</Link>
            <a href="#occurrences">Upcoming dates</a>
            <a href="#faq">FAQ</a>
          </nav>
        </header>

        <section className="hero detail-hero">
          <article className="panel hero-copy public-hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {registrationFlowPhase.label} registration live
            </span>
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
                Back to organizer hub
              </Link>
            </div>
          </article>

          <aside className="panel hero-aside public-hero-aside">
            <div className="status-block">
              <div className="status-label">Hosted by {organizer.name}</div>
              <h2>{event.nextOccurrence.label}</h2>
              <p>
                Event pages now carry the long-form description, pricing model, venue detail,
                attendee policies, and the live registration entry point for each occurrence.
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
                  <strong>Next date</strong>
                  {event.nextOccurrence.time}, with{" "}
                  {event.prepayPercentage > 0 ? "Stripe Checkout after confirmation" : "venue payment only"}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid">
          <article className="panel section-card">
            <div className="section-kicker">What attendees should know</div>
            <h3>Highlights for this event type</h3>
            <p>
              This is where the event route explains what makes this format distinct from the
              organizer&apos;s other public experiences.
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
            <div className="section-kicker">Payment framing</div>
            <h3>Attendees now see the money split before they create a hold.</h3>
            <p>
              The occurrence cards below now open the live registration flow. This payment
              section makes the split explicit first so the attendee knows what is paid online
              and what remains due at the event before the hold is created.
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
            <div className="section-kicker">Upcoming occurrences</div>
            <h2>Occurrence-first scheduling now opens directly into registration.</h2>
            <p>
              Each occurrence card carries its own date, time, capacity state, and registration
              route so the attendee can move straight into the hold flow without falling back
              to slot settings or hidden admin data.
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
                        View organizer hub
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
            <div className="section-kicker">Venue and inclusions</div>
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
            <div className="section-kicker">Photo support</div>
            <h3>This route now supports event-specific imagery and editorial detail.</h3>
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
            <h3>Event-specific rules live with the event, not in hidden settings.</h3>
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
            <h3>Common questions are now answered on the public event route.</h3>
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
            <div className="section-kicker">Event-specific CTA</div>
            <h2>Choose a published occurrence, then start the live registration flow.</h2>
            <p>
              Phase 09 keeps the event route honest: the attendee can understand the date,
              venue, policy, and payment framing here, then move straight into the signed hold,
              confirmation, and payment lifecycle.
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
          <span>
            Phase 09 event routes now connect discovery to a real organizer hub, event detail,
            registration lifecycle, and hosted payment handoff.
          </span>
          <Link href={organizer.organizerHref}>Return to organizer hub</Link>
        </footer>
      </div>
    </main>
  );
}
