import Link from "next/link";

import { PublicHeader } from "../public-header.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getDiscoveryResults } from "../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

const discoveryChips = ["workshop", "retreat", "sunrise", "gravel", "family", "dinner"];

export default async function EventsPage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query.query === "string" ? query.query : "";
  const { locale, dictionary } = await getTranslations();
  const results = await getDiscoveryResults(search);

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader currentPath="/events" dictionary={dictionary} locale={locale} />

        <section className="panel results-shell">
          <div className="results-page-hero">
            <div className="results-intro">
              <span className="section-kicker">{dictionary.events.eyebrow}</span>
              <h1>{dictionary.events.title}</h1>
              <p>{dictionary.events.summary}</p>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-muted/50 p-5">
              <div className="section-kicker">{dictionary.home.supportTitle}</div>
              <div className="mt-4 grid gap-3">
                <div className="text-sm text-muted-foreground">
                  {dictionary.home.supportItems[0]}
                </div>
                <div className="text-sm text-muted-foreground">
                  {dictionary.home.supportItems[1]}
                </div>
                <div className="text-sm text-muted-foreground">
                  {dictionary.home.supportItems[2]}
                </div>
              </div>
            </div>
          </div>

          <form action="/events" className="search-lab search-lab-compact" method="GET">
            <label className="search-field">
              <span className="search-label">{dictionary.events.inputLabel}</span>
              <input
                defaultValue={search}
                name="query"
                placeholder={dictionary.events.inputPlaceholder}
                type="text"
              />
            </label>

            <div className="hero-actions search-actions-row mt-4">
              <button className="button button-primary button-compact" type="submit">
                {dictionary.events.inputLabel}
              </button>
              {search ? (
                <Link className="button button-secondary button-compact" href="/events">
                  Clear
                </Link>
              ) : null}
            </div>

            <div className="quick-chip-row mt-4">
              {discoveryChips.map((chip) => (
                <Link className="quick-chip" href={`/events?query=${encodeURIComponent(chip)}`} key={chip}>
                  {chip}
                </Link>
              ))}
            </div>
          </form>

          <div className="results-summary-row" aria-live="polite">
            <strong>
              {search
                ? `${results.length} ${dictionary.events.resultsLabel} for "${search}"`
                : dictionary.events.title}
            </strong>
            <span>{dictionary.events.summary}</span>
          </div>

          {results.length ? (
            <div className="result-grid">
              {results.map((entry) => (
                <article className="result-card result-card-static" key={entry.id}>
                  <div className="result-head">
                    <div>
                      <div className="result-capacity section-kicker">{entry.organizerName}</div>
                      <h3>{entry.eventTitle}</h3>
                    </div>
                    <div className="result-city text-sm text-muted-foreground">
                      <span>{entry.city}</span>
                      <span className="result-region">{entry.region}</span>
                    </div>
                  </div>

                  <p>{entry.eventSummary}</p>

                  <div className="result-meta">
                    <span>{entry.organizerTagline}</span>
                    <span>
                      {entry.priceLabel} · {entry.collectionLabel}
                    </span>
                  </div>

                  <div className="hero-actions search-actions-row mt-4">
                    <Link className="button button-primary button-compact" href={entry.eventHref}>
                      {dictionary.events.openEvent}
                    </Link>
                    <Link className="button button-secondary button-compact" href={entry.organizerHref}>
                      {dictionary.events.openOrganizer}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <article className="search-empty">
              <h3>{dictionary.events.emptyTitle}</h3>
              <p>{dictionary.events.emptySummary}</p>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
