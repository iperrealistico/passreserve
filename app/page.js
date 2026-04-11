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
          <article className="panel hero-copy hero-stack home-primary-panel">
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
      </div>
    </main>
  );
}
