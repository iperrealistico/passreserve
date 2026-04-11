import Link from "next/link";

import { PublicHeader } from "../public-header.js";
import { getDiscoveryResults } from "../../lib/passreserve-service.js";
import { PublicVisual } from "../../lib/passreserve-visual-component.js";
import { routeVisuals } from "../../lib/passreserve-visuals.js";

const discoveryChips = [
  "workshop",
  "retreat",
  "sunrise",
  "gravel",
  "family",
  "dinner"
];

export default async function EventsPage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query.query === "string" ? query.query : "";
  const results = await getDiscoveryResults(search);

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader />

        <section className="panel hero-copy results-shell">
          <div className="results-page-hero">
            <div className="results-intro">
              <span className="section-kicker">Find an event</span>
              <h1>Search events by host, city, or format</h1>
              <p>
                Browse upcoming workshops, dinners, retreats, rides, and local experiences, then
                open the event page for dates, pricing, and registration details.
              </p>
            </div>

            <PublicVisual
              className="results-page-visual"
              priority
              sizes="(min-width: 1024px) 30vw, 100vw"
              visualId={routeVisuals.homeFind}
            />
          </div>

          <form action="/events" className="search-lab search-lab-compact" method="GET">
            <label className="search-field">
              <span className="search-label">Search by host, city, or event type</span>
              <input
                defaultValue={search}
                name="query"
                placeholder="Try Bologna, Trail Lab, family festival, or Dolomites"
                type="text"
              />
            </label>

            <div className="hero-actions search-actions-row">
              <button className="button button-primary button-compact" type="submit">
                Search events
              </button>
              {search ? (
                <Link className="button button-secondary button-compact" href="/events">
                  Clear search
                </Link>
              ) : null}
            </div>

            <div className="quick-chip-row">
              {discoveryChips.map((chip) => (
                <Link className="quick-chip" href={`/events?query=${encodeURIComponent(chip)}`} key={chip}>
                  {chip}
                </Link>
              ))}
            </div>
          </form>

          <div className="results-summary-row" aria-live="polite">
            <strong>
              {search ? `${results.length} matches for "${search}"` : "Featured upcoming events"}
            </strong>
            <span>Choose the event page for the full schedule, venue, and registration flow.</span>
          </div>

          {results.length ? (
            <div className="result-grid">
              {results.map((entry) => (
                <article className="result-card result-card-static" key={entry.id}>
                  <div className="result-head">
                    <div>
                      <div className="result-capacity">Event</div>
                      <h3>{entry.eventTitle}</h3>
                    </div>
                    <div className="result-city">
                      <span>{entry.city}</span>
                      <span className="result-region">{entry.region}</span>
                    </div>
                  </div>

                  <p>{entry.eventSummary}</p>

                  <div className="result-meta">
                    <span>{entry.organizerName}</span>
                    <span>
                      {entry.priceLabel} · {entry.collectionLabel}
                    </span>
                  </div>

                  <div className="hero-actions search-actions-row">
                    <Link className="button button-primary button-compact" href={entry.eventHref}>
                      Open event
                    </Link>
                    <Link className="button button-secondary button-compact" href={entry.organizerHref}>
                      Open host
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className="search-empty">
              <h3>No events matched that search.</h3>
              <p>
                Try a city, a host name, or a format like workshop, retreat, sunrise, dinner, or
                gravel.
              </p>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
