"use client";

import { useState } from "react";

import {
  discoveryJourneys,
  discoveryMetrics,
  discoveryModes,
  discoveryQuickSearches,
  discoverySignals,
  getDiscoveryResults,
  organizerLaunchSteps,
  organizerLaunchWindows,
  organizerPaymentModels,
  phaseDiscovery,
  publicNavigation,
  publicNavigationBlueprint,
  searchPrinciples
} from "../lib/passreserve-domain";

const initialJoinRequest = {
  contact: "",
  organizer: "",
  city: "",
  launchWindow: organizerLaunchWindows[1].id,
  paymentModel: organizerPaymentModels[1].id
};

function formatOrganizerRoute(entry) {
  return `/${entry.slug}`;
}

function formatEventRoute(entry) {
  return `/${entry.slug}/events/${entry.eventSlug}`;
}

export default function HomeExperience() {
  const [searchMode, setSearchMode] = useState(discoveryModes[0].id);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [joinRequest, setJoinRequest] = useState(initialJoinRequest);
  const [submittedJoinRequest, setSubmittedJoinRequest] = useState(null);

  const trimmedQuery = query.trim();
  const results = getDiscoveryResults(trimmedQuery, searchMode);
  const selectedEntry = results.find((entry) => entry.id === selectedId) ?? results[0] ?? null;
  const launchWindowLabel =
    organizerLaunchWindows.find((item) => item.id === joinRequest.launchWindow)?.label ??
    joinRequest.launchWindow;
  const paymentModelLabel =
    organizerPaymentModels.find((item) => item.id === joinRequest.paymentModel)?.label ??
    joinRequest.paymentModel;
  const canPrepareRequest =
    joinRequest.contact.trim() &&
    joinRequest.organizer.trim() &&
    joinRequest.city.trim();

  function handleQuickSearch(chip) {
    setSearchMode(chip.mode);
    setQuery(chip.query);
    setSelectedId(null);
  }

  function handleJoinFieldChange(event) {
    const { name, value } = event.target;

    setJoinRequest((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleJoinRequestSubmit(event) {
    event.preventDefault();

    if (!canPrepareRequest) {
      return;
    }

    setSubmittedJoinRequest({
      ...joinRequest,
      launchWindowLabel,
      paymentModelLabel
    });
  }

  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <span className="wordmark-name">Passreserve.com</span>
            <span className="wordmark-tag">
              Event discovery, registration deposits, and organizer operations
            </span>
          </div>
          <nav className="nav" aria-label="Primary">
            {publicNavigation.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="hero" id="discover">
          <article className="panel hero-copy hero-stack">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {phaseDiscovery.label} active
            </span>
            <h1>Find the right organizer, city, or event before the first click.</h1>
            <p>
              Passreserve.com now uses the homepage as a discovery desk, not a placeholder.
              Attendees can search by organizer, city, or event keyword, while new organizers
              can understand the launch path without wading through rental-era language.
            </p>
            <p>
              This phase defines the public IA that later organizer pages, event detail routes,
              and registration flows will inherit: organizer-first hubs, occurrence-first
              discovery, and clear payment framing from the start.
            </p>

            <div className="search-lab">
              <div className="filter-row" aria-label="Discovery mode">
                {discoveryModes.map((mode) => (
                  <button
                    className={`filter-pill${mode.id === searchMode ? " filter-pill-active" : ""}`}
                    key={mode.id}
                    onClick={() => {
                      setSearchMode(mode.id);
                      setSelectedId(null);
                    }}
                    type="button"
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <label className="search-field">
                <span className="search-label">Search organizers, cities, or event words</span>
                <input
                  name="query"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedId(null);
                  }}
                  placeholder="Try Bologna, Trail House, family festival, or Dolomites"
                  type="text"
                  value={query}
                />
              </label>

              <div className="quick-chip-row" aria-label="Suggested searches">
                {discoveryQuickSearches.map((chip) => (
                  <button
                    className="quick-chip"
                    key={`${chip.mode}-${chip.query}`}
                    onClick={() => handleQuickSearch(chip)}
                    type="button"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="search-caption" aria-live="polite">
                <strong>
                  {trimmedQuery
                    ? `${results.length} matches for "${trimmedQuery}"`
                    : "Featured discovery deck"}
                </strong>
                <span>
                  Exact organizer names rank first, city searches stay future-facing, and
                  keyword searches inspect event titles, summaries, and audience cues together.
                </span>
              </div>
            </div>
          </article>

          <aside className="panel hero-aside launch-aside" aria-label="Phase summary">
            <div className="status-block">
              <div className="status-label">Current build layer</div>
              <h2>{phaseDiscovery.title}</h2>
              <p>{phaseDiscovery.summary}</p>
            </div>

            <div className="metrics" aria-label="Phase metrics">
              {discoveryMetrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="list-label">What this phase delivers</div>
              <div className="status-list">
                {organizerLaunchSteps.map((step, index) => (
                  <div className="status-item" key={step.title}>
                    <span className="status-index">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      {step.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid">
          <article className="panel section-card section-span">
            <div className="results-shell">
              <div className="results-intro">
                <div className="section-kicker">Discovery board</div>
                <h2>
                  {trimmedQuery
                    ? `Matches for "${trimmedQuery}"`
                    : "Featured organizers, cities, and event signals"}
                </h2>
                <p>
                  The homepage now behaves like a discovery surface: it can express organizer
                  authority, city-led browsing, and keyword intent without pretending the
                  platform is still an equipment catalog.
                </p>
              </div>

              {results.length ? (
                <>
                  <div className="result-grid">
                    {results.map((entry) => (
                      <button
                        className={`result-card${
                          selectedEntry?.id === entry.id ? " result-card-active" : ""
                        }`}
                        key={entry.id}
                        onClick={() => setSelectedId(entry.id)}
                        type="button"
                      >
                        <div className="result-head">
                          <span className="result-city">
                            {entry.city}
                            <span className="result-region">{entry.region}</span>
                          </span>
                          <span className="result-capacity">{entry.capacity}</span>
                        </div>
                        <h3>{entry.event}</h3>
                        <p>{entry.description}</p>
                        <div className="result-meta">
                          <span>{entry.organizer}</span>
                          <span>{entry.nextOccurrence}</span>
                        </div>
                        <div className="pill-list">
                          {entry.keywords.slice(0, 3).map((keyword) => (
                            <span className="pill" key={keyword}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <div className="result-footer">
                          <span>{entry.priceFrom}</span>
                          <strong>{entry.deposit}</strong>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedEntry ? (
                    <div className="result-spotlight">
                      <div className="spotlight-copy">
                        <div className="section-kicker">Selected organizer brief</div>
                        <h3>
                          {selectedEntry.organizer}
                          <span className="spotlight-city">
                            {selectedEntry.city}, {selectedEntry.region}
                          </span>
                        </h3>
                        <p>{selectedEntry.audience}</p>
                        <div className="spotlight-notes">
                          <div className="spotlight-note">
                            <span className="spotlight-label">Next live date</span>
                            <strong>{selectedEntry.nextOccurrence}</strong>
                          </div>
                          <div className="spotlight-note">
                            <span className="spotlight-label">Commercial framing</span>
                            <strong>
                              {selectedEntry.priceFrom} · {selectedEntry.deposit}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="spotlight-routes">
                        <div className="route-card">
                          <span className="route-label">Organizer route</span>
                          <strong>{formatOrganizerRoute(selectedEntry)}</strong>
                          <p>{selectedEntry.organizerNote}</p>
                        </div>
                        <div className="route-card">
                          <span className="route-label">Event route</span>
                          <strong>{formatEventRoute(selectedEntry)}</strong>
                          <p>
                            Event pages can now take over for photos, long description, policies,
                            payment explanation, and upcoming occurrence selection.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="search-empty">
                  <h3>No exact matches yet.</h3>
                  <p>
                    Try a nearby city, a clearer organizer name, or an event theme such as
                    workshop, family, gravel, or sunset.
                  </p>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="section-grid" id="signals">
          {discoverySignals.map((signal) => (
            <article className="panel section-card" key={signal.title}>
              <div className="section-kicker">Discovery signal</div>
              <h3>{signal.title}</h3>
              <p>{signal.detail}</p>
            </article>
          ))}

          <article className="panel section-card">
            <div className="section-kicker">Navigation blueprint</div>
            <h3>The top-level public journeys are now named explicitly.</h3>
            <div className="mapping-list">
              {publicNavigationBlueprint.map((item) => (
                <div className="mapping-row" key={item.title}>
                  <div className="mapping-terms">
                    <span className="mapping-current">{item.title}</span>
                  </div>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="journeys">
          <article className="panel section-card section-span">
            <div className="section-kicker">Public journeys</div>
            <h3>Attendees and organizers now have clearer first-click paths.</h3>
            <p>
              This root experience now explains how discovery should work before deeper route
              work arrives. Each journey names the entry point, what the attendee or organizer
              sees next, and where later phases will take over.
            </p>
            <div className="journey-grid">
              {discoveryJourneys.map((journey) => (
                <article className="journey-card" key={journey.title}>
                  <strong>{journey.title}</strong>
                  <p>{journey.description}</p>
                  <ul>
                    {journey.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="search-rules">
          <article className="panel section-card">
            <div className="section-kicker">Search logic</div>
            <h3>Discovery ranking is now defined in product language and demo behavior.</h3>
            <p>
              Passreserve.com should feel intentional at the first query. These rules now guide
              how organizer, city, and keyword intent are surfaced from the homepage.
            </p>
            <div className="principle-list">
              {searchPrinciples.map((principle) => (
                <div className="principle-item" key={principle.title}>
                  <strong>{principle.title}</strong>
                  <span>{principle.detail}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card" id="organizer-launch">
            <div className="section-kicker">Organizer launch request</div>
            <h3>Capture the organizer brief before the admin system takes over.</h3>
            <p>
              The organizer join path is now framed around launch readiness instead of partner
              signup language. The root page asks for the inputs that later phases will need
              anyway: identity, city, timing, and payment stance.
            </p>

            <form className="launch-form" onSubmit={handleJoinRequestSubmit}>
              <label className="field">
                <span>Contact person</span>
                <input
                  name="contact"
                  onChange={handleJoinFieldChange}
                  placeholder="Marta Bianchi"
                  type="text"
                  value={joinRequest.contact}
                />
              </label>

              <label className="field">
                <span>Organizer name</span>
                <input
                  name="organizer"
                  onChange={handleJoinFieldChange}
                  placeholder="Lago Studio Pass"
                  type="text"
                  value={joinRequest.organizer}
                />
              </label>

              <label className="field">
                <span>Primary city</span>
                <input
                  name="city"
                  onChange={handleJoinFieldChange}
                  placeholder="Como"
                  type="text"
                  value={joinRequest.city}
                />
              </label>

              <label className="field">
                <span>Target launch window</span>
                <select
                  name="launchWindow"
                  onChange={handleJoinFieldChange}
                  value={joinRequest.launchWindow}
                >
                  {organizerLaunchWindows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Default online collection</span>
                <select
                  name="paymentModel"
                  onChange={handleJoinFieldChange}
                  value={joinRequest.paymentModel}
                >
                  {organizerPaymentModels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="button button-primary"
                disabled={!canPrepareRequest}
                type="submit"
              >
                Prepare organizer request
              </button>
            </form>

            {submittedJoinRequest ? (
              <div className="submission-card">
                <span className="route-label">Organizer request prepared</span>
                <h4>{submittedJoinRequest.organizer}</h4>
                <p>
                  Passreserve.com can now frame this organizer publicly around{" "}
                  {submittedJoinRequest.city}, a {submittedJoinRequest.launchWindowLabel.toLowerCase()}{" "}
                  launch, and a default collection stance of {submittedJoinRequest.paymentModelLabel}.
                </p>
                <div className="submission-grid">
                  <div className="spotlight-note">
                    <span className="spotlight-label">Contact</span>
                    <strong>{submittedJoinRequest.contact}</strong>
                  </div>
                  <div className="spotlight-note">
                    <span className="spotlight-label">Homepage signals</span>
                    <strong>
                      {submittedJoinRequest.organizer} · {submittedJoinRequest.city}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="field-help">
                Fill the three required fields to preview the organizer launch brief this phase
                is designed around.
              </p>
            )}
          </article>
        </section>

        <footer className="footer">
          <span>
            Phase 05 shifts Passreserve.com from a domain-foundation page into a public
            discovery and organizer launch surface.
          </span>
          <a href="#discover">Return to discovery</a>
        </footer>
      </div>
    </main>
  );
}
