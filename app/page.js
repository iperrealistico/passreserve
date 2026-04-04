import Link from "next/link";

import {
  antiCorruptionRules,
  compatibilityAreas,
  domainEntities,
  foundationHighlights,
  paymentExamples,
  paymentStatuses,
  phaseFoundation,
  publicationRules,
  registrationStatuses,
  roadmap,
  transitionTracks
} from "../lib/passreserve-domain";

const audienceCards = [
  {
    kicker: "For attendees",
    title: "Choose a real event date, then see the money split clearly.",
    body:
      "Passreserve.com is being built around dated occurrences, calm registration steps, and explicit online-versus-at-event payment language."
  },
  {
    kicker: "For organizers",
    title: "Operate from occurrences, capacities, and payment states.",
    body:
      "The platform direction favors practical event-day workflows over catalog clutter, with each organizer owning a clear event model and a simpler admin shell."
  }
];

const statusFamilies = [
  {
    kicker: "Registration statuses",
    title: "The attendee lifecycle now has explicit operational states.",
    body:
      "Confirmation holds, event-day attendance, and cancellations are now modeled separately instead of being blurred into generic booking language.",
    items: registrationStatuses
  },
  {
    kicker: "Payment statuses",
    title: "Money states stay distinct from attendance states.",
    body:
      "Online collection, deposits, failures, and refunds need their own vocabulary so organizers can reconcile money cleanly.",
    items: paymentStatuses
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <span className="wordmark-name">Passreserve.com</span>
            <span className="wordmark-tag">
              Simple event registration, deposits, and organizer operations
            </span>
          </div>
          <nav className="nav" aria-label="Primary">
            <a href="#why-passreserve">Why Passreserve</a>
            <a href="#foundation">Domain model</a>
            <a href="#transition">Transition rules</a>
            <a href="#payments">Payment logic</a>
            <a href="#roadmap">Roadmap</a>
          </nav>
        </header>

        <section className="hero" id="why-passreserve">
          <article className="panel hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {phaseFoundation.label} active
            </span>
            <h1>The event model is now explicit.</h1>
            <p>
              Passreserve.com has moved beyond vocabulary-only groundwork. The
              active app now defines the event-platform foundation in code:
              organizers own event types, event types produce dated occurrences,
              attendees create registrations, and payment records keep online
              collection auditable.
            </p>
            <p>
              This phase is about reducing future churn. Public discovery,
              organizer admin flows, registration UX, and Stripe integration can
              now build on a shared model instead of re-deciding entity
              boundaries or status language in every screen.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#foundation">
                Explore the foundation
              </a>
              <a className="button button-secondary" href="#payments">
                See payment examples
              </a>
            </div>
          </article>

          <aside className="panel hero-aside" aria-label="Project status">
            <div className="status-block">
              <div className="status-label">Current status</div>
              <h2>{phaseFoundation.title}</h2>
              <p>{phaseFoundation.summary}</p>
            </div>

            <div className="metrics" aria-label="High-level metrics">
              <div className="metric">
                <div className="metric-label">Phase</div>
                <div className="metric-value">04</div>
              </div>
              <div className="metric">
                <div className="metric-label">Entities</div>
                <div className="metric-value">{domainEntities.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Reg states</div>
                <div className="metric-value">{registrationStatuses.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Online pay</div>
                <div className="metric-value">0-100%</div>
              </div>
            </div>

            <div>
              <div className="list-label">What this phase locks</div>
              <div className="status-list">
                {foundationHighlights.map((item, index) => (
                  <div className="status-item" key={item.title}>
                    <span className="status-index">{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="section-grid" id="audiences">
          {audienceCards.map((card) => (
            <article className="panel section-card audience-card" key={card.title}>
              <div className="section-kicker">{card.kicker}</div>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </section>

        <section className="section-grid" id="foundation">
          <article className="panel section-card section-span">
            <div className="section-kicker">Core event entities</div>
            <h3>Five reusable models now define the Passreserve.com domain.</h3>
            <p>
              These entities give future screens, emails, and admin workflows a
              shared vocabulary. They also make it clear which legacy concepts are
              true bridges and which ones should disappear as the event platform
              takes shape.
            </p>
            <div className="entity-grid">
              {domainEntities.map((entity) => (
                <article className="entity-card" key={entity.name}>
                  <div className="entity-header">
                    <strong>{entity.name}</strong>
                    <span className="entity-bridge">{entity.bridge}</span>
                  </div>
                  <p className="entity-summary">{entity.summary}</p>
                  <ul className="entity-fields">
                    {entity.fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid">
          {statusFamilies.map((family) => (
            <article className="panel section-card" key={family.kicker}>
              <div className="section-kicker">{family.kicker}</div>
              <h3>{family.title}</h3>
              <p>{family.body}</p>
              <div className="scenario-list">
                {family.items.map((item) => (
                  <div className="scenario-item" key={item.code}>
                    <strong>{item.code}</strong>
                    <span>{item.note}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="section-grid" id="transition">
          <article className="panel section-card">
            <div className="section-kicker">Transition path</div>
            <h3>The event model has clean boundaries for what stays, what lands, and what goes away.</h3>
            <p>
              The goal is not a rewrite. It is a staged transition that keeps the
              strongest infrastructure pieces while refusing to trap events inside
              rental-era slots, inventory labels, or vague payment fields.
            </p>
            <div className="timeline">
              {transitionTracks.map((track) => (
                <div className="timeline-step" key={track.title}>
                  <strong>{track.title}</strong>
                  <span>{track.summary}</span>
                  <ul>
                    {track.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Compatibility review</div>
            <h3>The strongest parts of the platform stay in play.</h3>
            <p>
              The event foundation is intentionally designed to reuse the
              monolith&apos;s proven infrastructure instead of introducing
              unnecessary architectural churn.
            </p>
            <div className="mapping-list">
              {compatibilityAreas.map((item) => (
                <div className="mapping-row" key={item.area}>
                  <div className="mapping-terms">
                    <span className="mapping-current">{item.area}</span>
                  </div>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="payments">
          <article className="panel section-card">
            <div className="section-kicker">Payment logic</div>
            <h3>Deposit math now has concrete examples for zero, partial, and full online collection.</h3>
            <p>
              Each occurrence can keep a calm registration flow while still
              telling the attendee exactly what was paid online and what remains
              due at the event.
            </p>
            <div className="payment-grid">
              {paymentExamples.map((example) => (
                <article className="payment-card" key={example.label}>
                  <div className="payment-heading">
                    <strong>{example.label}</strong>
                    <span>
                      {example.quantity} tickets at {example.unitPrice.toFixed(0)} EUR
                    </span>
                  </div>
                  <p>{example.summary}</p>
                  <div className="payment-amounts" aria-label={`Amounts for ${example.label}`}>
                    <div className="payment-amount">
                      <span className="payment-label">Subtotal</span>
                      <span className="payment-value">{example.subtotalLabel}</span>
                    </div>
                    <div className="payment-amount">
                      <span className="payment-label">Online now</span>
                      <span className="payment-value">{example.onlineAmountLabel}</span>
                    </div>
                    <div className="payment-amount">
                      <span className="payment-label">Due at event</span>
                      <span className="payment-value">{example.dueAtEventLabel}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Visibility and capacity</div>
            <h3>Occurrences own the truth for what is visible and what is still bookable.</h3>
            <p>
              These rules are the guardrails for future public discovery, event
              detail pages, registration holds, and sold-out handling.
            </p>
            <div className="legacy-list">
              {publicationRules.map((rule) => (
                <div className="legacy-item" key={rule.title}>
                  <strong>{rule.title}</strong>
                  <span>{rule.detail}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="section-grid" id="roadmap">
          <article className="panel section-card">
            <div className="section-kicker">Implementation order</div>
            <h3>The next build layers now have a stable domain underneath them.</h3>
            <p>
              The immediate goal is not to ship every organizer workflow at once.
              It is to make sure each next layer inherits a model that already
              knows what an occurrence is, how deposits behave, and where legacy
              concepts stop.
            </p>
            <div className="timeline">
              {roadmap.map((item) => (
                <div className="timeline-step" key={item.step}>
                  <strong>{item.step}</strong>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section-card">
            <div className="section-kicker">Anti-corruption rules</div>
            <h3>The event model stays clean by boxing in transitional legacy concepts.</h3>
            <p>
              These rules keep the new Passreserve.com product from silently
              inheriting the wrong abstractions while the rest of the platform is
              still being transformed.
            </p>
            <div className="legacy-list">
              {antiCorruptionRules.map((rule) => (
                <div className="legacy-item" key={rule}>
                  {rule}
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className="footer">
          <span>
            Passreserve.com now has a coded event-domain foundation that future
            phases can build on directly.
          </span>
          <Link href="/missing-route">See the branded empty state</Link>
        </footer>
      </div>
    </main>
  );
}
