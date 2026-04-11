import Link from "next/link";

import { submitOrganizerRequestRedirectAction } from "./actions.js";
import {
  getDiscoveryResults
} from "../lib/passreserve-service.js";
import {
  organizerLaunchWindows,
  organizerPaymentModels,
  publicNavigation
} from "../lib/passreserve-domain.js";
import { PublicVisual } from "../lib/passreserve-visual-component.js";
import { routeVisuals } from "../lib/passreserve-visuals.js";

const hostIntentArticles = [
  {
    label: "Free setup",
    title: "A free event platform that still feels ready for real guests",
    paragraphs: [
      "If you are comparing free event registration software, a free event booking platform, or a free event signup platform, Passreserve gives you a clean way to publish dates, pricing, venue details, and registration rules without adding friction for your audience.",
      "It works as free event management software, a free ticketing alternative, and a free event page builder for teams searching free software for event organizers, free software for workshops and classes, or free event software for small teams."
    ]
  },
  {
    label: "Flexible payments",
    title: "Payment rules that match the way your events actually run",
    paragraphs: [
      "Some formats need guests to pay at the event, while others work better with pay later event booking, deposit event registration, or deposit-only event booking. Passreserve is event software without forced checkout, so the payment flow can match the venue, the audience, and the way you host.",
      "That gives organizers room for event booking with balance due at venue, a simple way to collect deposits for workshops, the option to let guests pay at the venue, and no online fee event booking when a lighter registration flow makes more sense."
    ]
  },
  {
    label: "Starting out",
    title: "Useful answers for hosts who are trying to get online quickly",
    paragraphs: [
      "Many organizers arrive with questions like how to create an event page for free or how to accept event registrations without high fees. Passreserve answers that with host pages that explain the experience clearly, show the next dates, and keep signup simple for guests.",
      "For people comparing the best free platform to book events, it also works as software for hosts who want guests to pay at the event, while still keeping registrations organized and the public page easy to trust."
    ]
  },
  {
    label: "Recurring formats",
    title: "A better fit for repeat dates, classes, retreats, and local experiences",
    paragraphs: [
      "If you host repeating sessions, Passreserve works as free event software for recurring dates, event booking software for retreats, and class booking software for small businesses that need upcoming dates, capacity, and pricing to stay easy to read.",
      "It also fits a free platform for local experiences, from workshops and tastings to guided rides, community gatherings, and seasonal programs that need calm presentation instead of a heavy marketplace feel."
    ]
  }
];

export default async function HomePage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query.query === "string" ? query.query : "";
  const results = await getDiscoveryResults(search);

  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <span className="wordmark-name">Passreserve.com</span>
            <span className="wordmark-tag">Find an event or launch one with confidence</span>
          </div>
          <nav className="nav" aria-label="Primary">
            {publicNavigation.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
            <Link href="/about">About</Link>
          </nav>
        </header>

        {query.message ? (
          <div className="registration-message registration-message-success">
            Your organizer request is now in the Passreserve launch inbox.
          </div>
        ) : null}
        {query.error ? (
          <div className="registration-message registration-message-error">
            The organizer request could not be saved. Please check the form and try again.
          </div>
        ) : null}

        <section className="hero home-split-hero" id="discover">
          <article className="panel hero-copy hero-stack home-primary-panel" id="featured">
            <PublicVisual
              className="home-panel-visual"
              priority
              sizes="(min-width: 1024px) 27vw, 100vw"
              visualId={routeVisuals.homeFind}
            />
            <h1 className="home-panel-title">Find an event</h1>
            <p>
              Search by host, city, or event style, then open the page that answers what it is,
              where it happens, what it costs, and how to join.
            </p>

            <form className="search-lab" method="GET">
              <label className="search-field">
                <span className="search-label">Search by host, city, or event type</span>
                <input
                  defaultValue={search}
                  name="query"
                  placeholder="Try Bologna, Trail Lab, family festival, or Dolomites"
                  type="text"
                />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Search
                </button>
              </div>
              <div className="search-caption" aria-live="polite">
                <strong>
                  {search ? `${results.length} matches for "${search}"` : "Featured events and hosts"}
                </strong>
                <span>Search by host, city, or event style.</span>
              </div>
            </form>

            <div className="event-lineup">
              {results.map((entry) => (
                <article className="event-card" key={entry.id}>
                  <div className="event-card-body">
                    <h3>{entry.eventTitle}</h3>
                    <p>{entry.eventSummary}</p>
                    <div className="event-card-meta">
                      <div className="spotlight-note">
                        <span className="spotlight-label">Host</span>
                        <strong>{entry.organizerName}</strong>
                      </div>
                      <div className="spotlight-note">
                        <span className="spotlight-label">Location</span>
                        <strong>
                          {entry.city}, {entry.region}
                        </strong>
                      </div>
                      <div className="spotlight-note">
                        <span className="spotlight-label">Pricing</span>
                        <strong>
                          {entry.priceLabel} · {entry.collectionLabel}
                        </strong>
                      </div>
                    </div>
                    <div className="hero-actions event-card-actions">
                      <Link className="button button-primary" href={entry.eventHref}>
                        Open event page
                      </Link>
                      <Link className="button button-secondary" href={entry.organizerHref}>
                        Open host page
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <aside className="panel hero-copy hero-stack home-primary-panel" id="organizer-launch">
            <PublicVisual
              className="home-panel-visual"
              sizes="(min-width: 1024px) 27vw, 100vw"
              visualId={routeVisuals.homeHost}
            />
            <h2 className="home-panel-title">Host an event</h2>
            <p>
              Request organizer access to publish a host page, manage recurring dates, and choose
              whether attendees pay online, leave a deposit, or pay at the event.
            </p>

            <form action={submitOrganizerRequestRedirectAction} className="registration-field-grid">
              <label className="field">
                <span>Contact name</span>
                <input name="contactName" required type="text" />
              </label>
              <label className="field">
                <span>Contact email</span>
                <input name="contactEmail" required type="email" />
              </label>
              <label className="field">
                <span>Contact phone</span>
                <input name="contactPhone" type="text" />
              </label>
              <label className="field">
                <span>Organizer name</span>
                <input name="organizerName" required type="text" />
              </label>
              <label className="field">
                <span>City</span>
                <input name="city" required type="text" />
              </label>
              <label className="field">
                <span>Launch window</span>
                <select defaultValue={organizerLaunchWindows[1]?.id} name="launchWindow">
                  {organizerLaunchWindows.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Payment model</span>
                <select defaultValue={organizerPaymentModels[1]?.id} name="paymentModel">
                  {organizerPaymentModels.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-span">
                <span>What do you host?</span>
                <textarea name="eventFocus" required rows="2" />
              </label>
              <label className="field field-span">
                <span>Notes</span>
                <textarea name="note" rows="2" />
              </label>
              <div className="hero-actions">
                <button className="button button-primary" type="submit">
                  Send organizer request
                </button>
              </div>
            </form>
          </aside>
        </section>

        <section className="section-grid" id="how-it-works">
          <article className="panel section-card section-span host-intent-section">
            <div className="host-intent-copy">
              <span className="section-kicker">For hosts</span>
              <h2>Free event registration software for hosts who want flexible payments</h2>
              <p>
                Passreserve helps organizers publish event pages, accept registrations, collect
                deposits, or let guests pay at the event, with a calmer setup that stays easy to
                understand for both hosts and attendees.
              </p>
            </div>

            <div aria-label="Host guides" className="host-intent-rail">
              {hostIntentArticles.map((article) => (
                <article className="host-intent-card" key={article.title}>
                  <span className="host-intent-tag">{article.label}</span>
                  <h3>{article.title}</h3>
                  {article.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
