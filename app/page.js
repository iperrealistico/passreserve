import Link from "next/link";

const audienceCards = [
  {
    kicker: "For attendees",
    title: "Discover events without checkout chaos.",
    body:
      "Passreserve.com is being shaped around clear event pages, date-aware occurrences, calm registration steps, and transparent payment breakdowns."
  },
  {
    kicker: "For organizers",
    title: "Run events with practical tools, not platform bloat.",
    body:
      "Organizer-facing operations are being designed for schedules, capacities, registrations, deposits, and follow-up work that teams actually need on event day."
  }
];

const vocabulary = [
  "Organizer",
  "Event type",
  "Occurrence",
  "Registration",
  "Payment state",
  "Amount due at event"
];

const roadmap = [
  {
    step: "Phase 03",
    text: "Brand, metadata, and vocabulary are becoming Passreserve.com-first."
  },
  {
    step: "Next",
    text: "Public organizer pages, event presentation, and occurrence-driven browsing will follow."
  },
  {
    step: "Later",
    text: "Registration flows, deposits, and organizer operations will expand on the same foundation."
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <span className="wordmark-name">Passreserve.com</span>
            <span className="wordmark-tag">Simple event booking and organizer operations</span>
          </div>
          <nav className="nav" aria-label="Primary">
            <a href="#why-passreserve">Why Passreserve</a>
            <a href="#audiences">Who it serves</a>
            <a href="#vocabulary">Vocabulary</a>
            <a href="#roadmap">Roadmap</a>
          </nav>
        </header>

        <section className="hero" id="why-passreserve">
          <article className="panel hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Phase 03 in progress
            </span>
            <h1>Event booking with a calmer operational core.</h1>
            <p>
              Passreserve.com is the public face of the GATHERPASS transformation:
              a practical event platform for organizers, venues, and seasonal
              experiences. The app is being built in phases, starting by replacing
              rental language with the event vocabulary the final product will use.
            </p>
            <p>
              The live product direction is now clear: organizers publish event
              types, attendees choose dated occurrences, registrations stay
              traceable, and payment handling can support zero-percent, deposit, or
              full online collection without losing operational simplicity.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#roadmap">
                Follow the rollout
              </a>
              <a className="button button-secondary" href="#vocabulary">
                See the new product language
              </a>
            </div>
          </article>

          <aside className="panel hero-aside" aria-label="Project status">
            <div className="status-block">
              <div className="status-label">Current status</div>
              <h2>Brand foundation live</h2>
              <p>
                The root app now speaks in organizer, occurrence, registration, and
                payment terms instead of legacy rental language.
              </p>
            </div>

            <div className="metrics" aria-label="High-level metrics">
              <div className="metric">
                <div className="metric-label">Deployment</div>
                <div className="metric-value">Vercel-linked</div>
              </div>
              <div className="metric">
                <div className="metric-label">Phase</div>
                <div className="metric-value">03 active</div>
              </div>
            </div>

            <div>
              <div className="list-label">What this baseline establishes</div>
              <div className="status-list">
                <div className="status-item">
                  <span className="status-index">1</span>
                  <div>
                    <strong>Public naming</strong>
                    Passreserve.com is now the product name shown in the live app.
                  </div>
                </div>
                <div className="status-item">
                  <span className="status-index">2</span>
                  <div>
                    <strong>Event-first wording</strong>
                    Public copy is aligned with organizers, events, occurrences,
                    registrations, and deposits.
                  </div>
                </div>
                <div className="status-item">
                  <span className="status-index">3</span>
                  <div>
                    <strong>Implementation runway</strong>
                    Future phases can now add discovery, event pages, and payments
                    on top of a coherent brand baseline.
                  </div>
                </div>
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

        <section className="section-grid">
          <article className="panel section-card" id="vocabulary">
            <div className="section-kicker">Vocabulary baseline</div>
            <h3>The product language is being standardized now.</h3>
            <p>
              This project is intentionally shifting from legacy rental terminology
              to the nouns the final platform will use everywhere: public pages,
              admin workflows, payment states, and future emails.
            </p>
            <div className="pill-list" aria-label="Passreserve vocabulary">
              {vocabulary.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="panel section-card" id="roadmap">
            <div className="section-kicker">Implementation order</div>
            <h3>Building the event product phase by phase.</h3>
            <p>
              The immediate goal is not to ship every event feature at once. It is
              to make each next layer rest on clear terminology, strong metadata,
              and a public-facing brand that already matches the destination.
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
        </section>

        <footer className="footer">
          <span>Passreserve.com is now the public brand baseline for the live app.</span>
          <Link href="/missing-route">See the branded empty state</Link>
        </footer>
      </div>
    </main>
  );
}
