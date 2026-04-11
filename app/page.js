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

const hostIntentPosts = [
  {
    label: "Free setup",
    title: "Looking for a free event platform that still feels professional?",
    paragraphs: [
      "If you are comparing free event registration software, a free event booking platform, or a free event signup platform, Passreserve gives you a clean host page, clear date publishing, and a registration flow that feels ready for real guests. It works as free event management software, a free ticketing alternative, and a free event page builder for organizers who want a calmer setup instead of extra marketplace layers.",
      "For studios, guides, clubs, and independent venues, it is free software for event organizers, free software for workshops and classes, and free event software for small teams that need something polished without paying before they grow."
    ]
  },
  {
    label: "Flexible payments",
    title: "Need guests to pay later, leave a deposit, or settle on site?",
    paragraphs: [
      "Hosts often need pay at the event flexibility, pay later event booking, deposit event registration, or deposit-only event booking depending on the format. Passreserve is event software without forced checkout, so you can run event booking with balance due at venue when that fits your audience better than taking everything online.",
      "That makes it easier to collect deposits for workshops, let guests pay at the venue, and offer no online fee event booking for dinners, rides, classes, retreats, and local experiences that work best with simpler payment rules."
    ]
  },
  {
    label: "Start free",
    title: "Trying to publish a host page without getting buried in fees?",
    paragraphs: [
      "Many organizers arrive here searching how to create an event page for free or how to accept event registrations without high fees. Passreserve is built for that exact moment, with host pages that explain the event clearly, show the next dates, and keep the registration steps straightforward.",
      "If you are comparing the best free platform to book events, Passreserve focuses on hosts who want control over pricing, dates, deposits, and follow-up, including software for hosts who want guests to pay at the event instead of forcing every booking into the same checkout."
    ]
  },
  {
    label: "Recurring formats",
    title: "Running classes, retreats, or repeat dates?",
    paragraphs: [
      "If you run weekly sessions, seasonal launches, or repeating calendars, Passreserve works as free event software for recurring dates while still keeping each occurrence clear. It also fits event booking software for retreats, class booking software for small businesses, and a free platform for local experiences that need location details, host credibility, and a simple way to collect registrations.",
      "That makes it useful for workshops, community events, guided outings, food formats, education-led programs, and smaller local teams that want a free base product without losing flexibility as they add more dates."
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
          <article className="panel section-card section-span seo-intent-section">
            <div className="seo-intent-head">
              <div>
                <span className="section-kicker">For hosts</span>
                <h2>
                  Free event registration software for organizers who want clear pages and
                  flexible payments
                </h2>
              </div>
              <p className="seo-intent-lead">
                Passreserve helps hosts create event pages, accept registrations, collect
                deposits, and let guests pay at the event when that suits the format better than
                forcing a full online checkout.
              </p>
            </div>

            <div
              aria-label="Host search intent guides"
              className="seo-post-carousel"
              tabIndex={0}
            >
              {hostIntentPosts.map((post) => (
                <article className="seo-post-card" key={post.title}>
                  <span className="seo-post-kicker">{post.label}</span>
                  <h3>{post.title}</h3>
                  {post.paragraphs.map((paragraph) => (
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
