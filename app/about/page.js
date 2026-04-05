import Link from "next/link";

import { aboutPageStory } from "../../lib/passreserve-platform";

export const metadata = {
  title: "About Passreserve.com",
  description: aboutPageStory.hero.summary
};

export default function AboutPage() {
  return (
    <main className="shell">
      <div className="content">
        <header className="topbar">
          <div className="wordmark">
            <Link className="wordmark-name" href="/">
              Passreserve.com
            </Link>
            <span className="wordmark-tag">
              Event registration, organizer operations, and calm platform tooling
            </span>
          </div>
          <nav className="nav" aria-label="About navigation">
            <Link href="/">Discover</Link>
            <Link href="/admin/login">Platform admin</Link>
          </nav>
        </header>

        <section className="hero">
          <article className="panel hero-copy hero-stack">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              {aboutPageStory.hero.eyebrow}
            </span>
            <h1>{aboutPageStory.hero.title}</h1>
            <p>{aboutPageStory.hero.summary}</p>
            <p>{aboutPageStory.hero.secondary}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/">
                Return to discovery
              </Link>
              <Link className="button button-secondary" href="/admin/login">
                Open platform admin
              </Link>
            </div>
          </article>

          <aside className="panel hero-aside">
            <div className="status-block">
              <div className="status-label">What makes the product distinct</div>
              <h2>Organizer-first, occurrence-first, server-owned.</h2>
              <p>
                Passreserve.com keeps the lightweight monolith and slug-based routing from the
                original product, but every public and operational surface now speaks in event
                terms instead of rental terms.
              </p>
            </div>

            <div className="metrics" aria-label="About metrics">
              {aboutPageStory.metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="section-grid">
          {aboutPageStory.sections.map((section) => (
            <article className="panel section-card" key={section.id}>
              <div className="section-kicker">About section</div>
              <h2>{section.title}</h2>
              <p>{section.detail}</p>
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="section-grid">
          <article className="panel section-card section-span">
            <div className="section-kicker">FAQ</div>
            <h2>Public messaging stays direct and practical.</h2>
            <div className="faq-list">
              {aboutPageStory.faq.map((item) => (
                <div className="faq-item" key={item.question}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="cta-band">
          <div>
            <div className="section-kicker">Next route</div>
            <h2>{aboutPageStory.cta.title}</h2>
            <p>{aboutPageStory.cta.detail}</p>
          </div>
          <div className="hero-actions cta-actions">
            <Link className="button button-primary" href="/admin/login">
              Platform admin
            </Link>
            <Link className="button button-secondary" href="/">
              Discovery home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
