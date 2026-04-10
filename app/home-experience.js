"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { submitOrganizerRequestAction } from "./actions";
import {
  discoveryJourneys,
  discoveryQuickSearches,
  discoverySignals,
  getDiscoveryResults,
  organizerLaunchWindows,
  organizerPaymentModels,
  publicNavigation
} from "../lib/passreserve-domain";
import { PublicVisual } from "../lib/passreserve-visual-component";
import { routeVisuals } from "../lib/passreserve-visuals";

const initialOrganizerRequest = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  organizerName: "",
  city: "",
  launchWindow: organizerLaunchWindows[1].id,
  paymentModel: organizerPaymentModels[1].id,
  eventFocus: "",
  note: ""
};

const initialActionState = {
  status: "idle",
  message: "",
  detail: "",
  fieldErrors: {}
};

const visitorJourneys = [
  {
    title: "Join an event",
    description:
      "Start from a city, a host, or an event style, then move straight to the date and details that matter.",
    steps: discoveryJourneys[0].steps
  },
  {
    title: "Host an event",
    description:
      "Share the basics about your events, get set up with approval, and publish a page that people can trust quickly.",
    steps: [
      "Tell us who you are, what you host, and where your events happen.",
      "Choose whether guests pay nothing online, a deposit, or the full amount.",
      "We review the request and help shape your first public page and event lineup."
    ]
  }
];

function formatOrganizerRoute(entry) {
  return `/${entry.slug}`;
}

function formatEventRoute(entry) {
  return `/${entry.slug}/events/${entry.eventSlug}`;
}

export default function HomeExperience() {
  const [actionState, formAction, isPending] = useActionState(
    submitOrganizerRequestAction,
    initialActionState
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [organizerRequest, setOrganizerRequest] = useState(initialOrganizerRequest);

  const trimmedQuery = query.trim();
  const results = getDiscoveryResults(trimmedQuery);
  const selectedEntry = results.find((entry) => entry.id === selectedId) ?? results[0] ?? null;
  const canSubmitOrganizerRequest =
    organizerRequest.contactName.trim() &&
    organizerRequest.contactEmail.trim() &&
    organizerRequest.organizerName.trim() &&
    organizerRequest.city.trim() &&
    organizerRequest.eventFocus.trim();

  useEffect(() => {
    if (actionState.status === "success") {
      setOrganizerRequest(initialOrganizerRequest);
    }
  }, [actionState.status]);

  function handleQuickSearch(chip) {
    setQuery(chip.query);
    setSelectedId(null);
  }

  function handleOrganizerFieldChange(event) {
    const { name, value } = event.target;

    setOrganizerRequest((current) => ({
      ...current,
      [name]: value
    }));
  }

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

            <div className="search-lab">
              <label className="search-field">
                <span className="search-label">Search by host, city, or event type</span>
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
                    : "Featured events and hosts"}
                </strong>
                <span>
                  Start with a host, a city, or a theme and open the event that feels like the
                  right fit.
                </span>
              </div>
            </div>

            <div className="hero-actions hero-actions-inline">
              <a className="button button-primary" href="#featured">
                Browse featured events
              </a>
              <a className="button button-secondary" href="#organizer-launch">
                Host an event
              </a>
            </div>
          </article>

          <aside className="panel home-organizer-panel">
            <PublicVisual
              className="home-panel-visual"
              sizes="(min-width: 1024px) 27vw, 100vw"
              visualId={routeVisuals.homeHost}
            />
            <div className="status-block home-panel-copy">
              <h2 className="home-panel-title">Host an event</h2>
              <p>
                Share what you host, where it happens, and how online payment should work. We&apos;ll
                review the request and help shape a public page people can trust quickly.
              </p>
            </div>

            <div className="status-list">
              <div className="status-item">
                <span className="status-index">1</span>
                <div>
                  <strong>Show your next dates clearly</strong>
                  Your public page highlights upcoming events, venue details, and what guests
                  should know before they register.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">2</span>
                <div>
                  <strong>Set payment expectations upfront</strong>
                  Choose no online payment, a deposit, or full prepayment and let guests see that
                  split before they commit.
                </div>
              </div>
              <div className="status-item">
                <span className="status-index">3</span>
                <div>
                  <strong>Manage everything in one place</strong>
                  Keep dates, registrations, and payment follow-up together without juggling
                  separate tools.
                </div>
              </div>
            </div>

            <div className="hero-actions hero-actions-inline">
              <a className="button button-primary" href="#organizer-launch">
                Request organizer access
              </a>
              <Link className="button button-secondary" href="/admin/login">
                Existing organizer login
              </Link>
            </div>
          </aside>
        </section>

        <section className="section-grid" id="featured">
          <article className="panel section-card section-span">
            <div className="results-shell">
              <div className="results-intro">
                <div className="section-kicker">Featured now</div>
                <h2>
                  {trimmedQuery
                    ? `Matches for "${trimmedQuery}"`
                    : "Hosts and events worth opening first"}
                </h2>
                <p>
                  Every card leads you toward the same decision: which event feels right, on
                  which date, with which host.
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
                        <div className="section-kicker">Selected host</div>
                        <h3>
                          {selectedEntry.organizer}
                          <span className="spotlight-city">
                            {selectedEntry.city}, {selectedEntry.region}
                          </span>
                        </h3>
                        <p>{selectedEntry.audience}</p>
                        <div className="spotlight-notes">
                          <div className="spotlight-note">
                            <span className="spotlight-label">Next date</span>
                            <strong>{selectedEntry.nextOccurrence}</strong>
                          </div>
                          <div className="spotlight-note">
                            <span className="spotlight-label">Price</span>
                            <strong>
                              {selectedEntry.priceFrom} · {selectedEntry.deposit}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="spotlight-routes">
                        <div className="route-card">
                          <span className="route-label">Host page</span>
                          <strong>{selectedEntry.organizer}</strong>
                          <p>{selectedEntry.organizerNote}</p>
                          <Link
                            className="button button-secondary route-button"
                            href={formatOrganizerRoute(selectedEntry)}
                          >
                            Open host page
                          </Link>
                        </div>
                        <div className="route-card">
                          <span className="route-label">Event page</span>
                          <strong>{selectedEntry.event}</strong>
                          <p>
                            Open the event page to check the format, see the next dates, and pick
                            the right signup.
                          </p>
                          <Link
                            className="button button-secondary route-button"
                            href={formatEventRoute(selectedEntry)}
                          >
                            Open event page
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="search-empty">
                  <h3>No exact matches yet.</h3>
                  <p>
                    Try a nearby city, a clearer host name, or a theme such as workshop, family,
                    gravel, or sunset.
                  </p>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="section-grid" id="how-it-works">
          <article className="panel section-card section-span">
            <div className="section-kicker">Two clear paths</div>
            <h3>Join an event or launch one.</h3>
            <p>
              Passreserve.com is built around two simple jobs: helping guests find the right
              event and helping hosts publish it without turning setup into extra overhead.
            </p>
            <div className="journey-grid">
              {visitorJourneys.map((journey) => (
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

          {discoverySignals.map((signal) => (
            <article className="panel section-card" key={signal.title}>
              <div className="section-kicker">Why it feels clearer</div>
              <h3>{signal.title}</h3>
              <p>{signal.detail}</p>
            </article>
          ))}
        </section>

        <section className="section-grid" id="organizer-launch">
          <article className="panel section-card section-span">
            <div className="section-kicker">Host an event</div>
            <h3>Tell us what you host and where you host it.</h3>
            <p>
              Start with the basics. We&apos;ll use them to shape your first Passreserve page,
              your initial event lineup, and the signup flow your guests will see.
            </p>

            <form action={formAction} className="launch-form">
              <label className="field">
                <span>Contact person</span>
                <input
                  name="contactName"
                  onChange={handleOrganizerFieldChange}
                  placeholder="Marta Bianchi"
                  type="text"
                  value={organizerRequest.contactName}
                />
                {actionState.fieldErrors.contactName ? (
                  <span className="field-help">{actionState.fieldErrors.contactName}</span>
                ) : null}
              </label>

              <label className="field">
                <span>Contact email</span>
                <input
                  name="contactEmail"
                  onChange={handleOrganizerFieldChange}
                  placeholder="marta@example.com"
                  type="email"
                  value={organizerRequest.contactEmail}
                />
                {actionState.fieldErrors.contactEmail ? (
                  <span className="field-help">{actionState.fieldErrors.contactEmail}</span>
                ) : null}
              </label>

              <label className="field">
                <span>Phone number</span>
                <input
                  name="contactPhone"
                  onChange={handleOrganizerFieldChange}
                  placeholder="+39 347 555 9011"
                  type="tel"
                  value={organizerRequest.contactPhone}
                />
              </label>

              <label className="field">
                <span>Host or organizer name</span>
                <input
                  name="organizerName"
                  onChange={handleOrganizerFieldChange}
                  placeholder="Lago Studio Pass"
                  type="text"
                  value={organizerRequest.organizerName}
                />
                {actionState.fieldErrors.organizerName ? (
                  <span className="field-help">{actionState.fieldErrors.organizerName}</span>
                ) : null}
              </label>

              <label className="field">
                <span>Main city</span>
                <input
                  name="city"
                  onChange={handleOrganizerFieldChange}
                  placeholder="Como"
                  type="text"
                  value={organizerRequest.city}
                />
                {actionState.fieldErrors.city ? (
                  <span className="field-help">{actionState.fieldErrors.city}</span>
                ) : null}
              </label>

              <label className="field">
                <span>Target launch window</span>
                <select
                  name="launchWindow"
                  onChange={handleOrganizerFieldChange}
                  value={organizerRequest.launchWindow}
                >
                  {organizerLaunchWindows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Default online payment</span>
                <select
                  name="paymentModel"
                  onChange={handleOrganizerFieldChange}
                  value={organizerRequest.paymentModel}
                >
                  {organizerPaymentModels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>What do you host?</span>
                <textarea
                  name="eventFocus"
                  onChange={handleOrganizerFieldChange}
                  placeholder="Weekend workshops, guided rides, seasonal dinners, community walks..."
                  rows="4"
                  value={organizerRequest.eventFocus}
                />
                {actionState.fieldErrors.eventFocus ? (
                  <span className="field-help">{actionState.fieldErrors.eventFocus}</span>
                ) : null}
              </label>

              <label className="field">
                <span>Anything else we should know?</span>
                <textarea
                  name="note"
                  onChange={handleOrganizerFieldChange}
                  placeholder="Share anything helpful about your audience, venue, timing, or setup."
                  rows="4"
                  value={organizerRequest.note}
                />
              </label>

              <button
                className="button button-primary"
                disabled={!canSubmitOrganizerRequest || isPending}
                type="submit"
              >
                {isPending ? "Saving request..." : "Request organizer access"}
              </button>
            </form>

            {actionState.status === "success" ? (
              <div className="submission-card">
                <span className="route-label">Request received</span>
                <h4>{actionState.request.organizerName}</h4>
                <p>{actionState.message}</p>
                <div className="submission-grid">
                  <div className="spotlight-note">
                    <span className="spotlight-label">Launch window</span>
                    <strong>{actionState.request.launchWindow}</strong>
                  </div>
                  <div className="spotlight-note">
                    <span className="spotlight-label">Payment setup</span>
                    <strong>{actionState.request.paymentModel}</strong>
                  </div>
                </div>
                <p className="field-help">{actionState.detail}</p>
              </div>
            ) : actionState.status === "error" ? (
              <p className="field-help">{actionState.message}</p>
            ) : (
              <p className="field-help">
                We&apos;ll review new host requests and reply within one business day.
              </p>
            )}
          </article>
        </section>

        <footer className="footer">
          <span>Need a fresh start? Return to the top and search again.</span>
          <a href="#discover">Back to the top</a>
        </footer>
      </div>
    </main>
  );
}
