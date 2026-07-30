import Link from "next/link";

import { PublicFooter } from "../public-footer.js";
import { PublicHeader } from "../public-header.js";
import { getTranslations } from "../../lib/passreserve-i18n.js";
import { getDiscoveryResults } from "../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

export const metadata = {
  alternates: {
    canonical: "/events"
  }
};

const discoveryChips = ["workshop", "retreat", "sunrise", "gravel", "family", "dinner"];

const DEFAULT_DISCOVERY_COUNTRY = "italy";
const DEFAULT_DISCOVERY_REGION = "tuscany";

function buildEventsHref(values, includeEmptyKeys = []) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value) {
      params.set(key, value);
      continue;
    }

    if (includeEmptyKeys.includes(key)) {
      params.set(key, "");
    }
  }

  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

export default async function EventsPage({ searchParams }) {
  const query = await searchParams;
  const search = typeof query.query === "string" ? query.query : "";
  const requestedCountry =
    typeof query.country === "string" ? query.country : DEFAULT_DISCOVERY_COUNTRY;
  const requestedRegion =
    typeof query.region === "string" ? query.region : DEFAULT_DISCOVERY_REGION;
  const requestedCity = typeof query.city === "string" ? query.city : "";
  const { locale, dictionary } = await getTranslations();
  const discovery = await getDiscoveryResults(search, locale, {
    country: requestedCountry,
    region: requestedRegion,
    city: requestedCity
  });
  const { results, filterOptions, appliedFilters } = discovery;
  const hasActiveSearch = Boolean(search);
  const hasActiveFilters = Boolean(
    appliedFilters.country || appliedFilters.region || appliedFilters.city
  );
  const clearHref = buildEventsHref({
    country: appliedFilters.country,
    region: appliedFilters.region,
    city: appliedFilters.city
  });
  const showAllHref = buildEventsHref(
    {
      query: search,
      country: "",
      region: "",
      city: ""
    },
    ["country", "region", "city"]
  );

  return (
    <main className="shell">
      <div className="content">
        <PublicHeader currentPath="/events" dictionary={dictionary} locale={locale} />

        <section className="panel results-shell mt-8 sm:mt-10">
          <div className="results-page-hero">
            <div className="results-intro">
              <span className="section-kicker">{dictionary.events.eyebrow}</span>
              <h1>{dictionary.events.title}</h1>
              {dictionary.events.summary ? <p>{dictionary.events.summary}</p> : null}
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

            <div className="results-filter-grid mt-4">
              <label className="field">
                <span>{dictionary.events.countryLabel}</span>
                <select defaultValue={appliedFilters.country} name="country">
                  <option value="">{dictionary.events.allCountries}</option>
                  {filterOptions.countries.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{dictionary.events.regionLabel}</span>
                <select defaultValue={appliedFilters.region} name="region">
                  <option value="">{dictionary.events.allRegions}</option>
                  {filterOptions.regions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{dictionary.events.cityLabel}</span>
                <select defaultValue={appliedFilters.city} name="city">
                  <option value="">{dictionary.events.allCities}</option>
                  {filterOptions.cities.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hero-actions search-actions-row mt-4">
              <button className="button button-primary button-compact" type="submit">
                {dictionary.events.inputLabel}
              </button>
              {hasActiveSearch ? (
                <Link
                  className="button button-secondary button-compact"
                  href={clearHref}
                  prefetch={false}
                >
                  Clear
                </Link>
              ) : null}
              {hasActiveFilters ? (
                <Link
                  className="button button-secondary button-compact"
                  href={showAllHref}
                  prefetch={false}
                >
                  {dictionary.events.showAll}
                </Link>
              ) : null}
            </div>

            <div className="quick-chip-row mt-4">
              {discoveryChips.map((chip) => (
                <Link
                  className="quick-chip"
                  href={buildEventsHref({
                    query: chip,
                    country: appliedFilters.country,
                    region: appliedFilters.region,
                    city: appliedFilters.city
                  })}
                  key={chip}
                  prefetch={false}
                >
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
            {dictionary.events.summary ? <span>{dictionary.events.summary}</span> : null}
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
                      {entry.region ? <span className="result-region">{entry.region}</span> : null}
                    </div>
                  </div>

                  <p>{entry.eventSummary}</p>

                  <div className="result-meta">
                    {entry.organizerTagline ? <span>{entry.organizerTagline}</span> : null}
                    <div className="result-price-group">
                      <span className="result-price-tag">{entry.priceLabel}</span>
                      <span className="result-collection-label">{entry.collectionLabel}</span>
                    </div>
                  </div>

                  <div className="hero-actions search-actions-row mt-4">
                    <Link
                      className="button button-primary button-compact"
                      href={entry.eventHref}
                      prefetch={false}
                    >
                      {dictionary.events.openEvent}
                    </Link>
                    <Link
                      className="button button-secondary button-compact"
                      href={entry.organizerHref}
                      prefetch={false}
                    >
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

        <PublicFooter dictionary={dictionary} locale={locale} />
      </div>
    </main>
  );
}
