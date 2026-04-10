import Link from "next/link";

import { aboutPageStory } from "../../lib/passreserve-platform";
import { PublicVisual } from "../../lib/passreserve-visual-component";
import { routeVisuals } from "../../lib/passreserve-visuals";

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
              Clear event details for guests and hosts alike
            </span>
          </div>
          <nav className="nav" aria-label="About navigation">
            <Link href="/#featured">Find an event</Link>
            <Link href="/#organizer-launch">Host an event</Link>
          </nav>
        </header>

        <section className="hero">
          <article className="panel hero-copy hero-stack">
            <h1>{aboutPageStory.hero.title}</h1>
            <p>{aboutPageStory.hero.summary}</p>
            <p>{aboutPageStory.hero.secondary}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/">
                Browse events
              </Link>
              <Link className="button button-secondary" href="/#organizer-launch">
                Request organizer access
              </Link>
            </div>
          </article>

          <aside className="panel hero-aside">
            <PublicVisual
              className="aside-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.aboutHero}
            />
            <div className="status-block">
              <div className="status-label">What makes the product distinct</div>
              <h2>Clear hosts, clear dates, clear expectations.</h2>
              <p>
                Passreserve.com is built to help visitors understand who is hosting, what each
                event includes, which date to choose, and what they need to pay now.
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
          <article className="panel section-card visual-callout-card">
            <PublicVisual
              className="section-visual"
              sizes="(min-width: 1024px) 28vw, 100vw"
              visualId={routeVisuals.aboutCta}
            />
            <div className="section-kicker">Hosting at a glance</div>
            <h2>Make the first page feel trustworthy.</h2>
            <p>
              A strong host page should explain the event format, the next dates, and the payment
              split before a guest ever starts the signup.
            </p>
          </article>
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
            <div className="section-kicker">Next step</div>
            <h2>{aboutPageStory.cta.title}</h2>
            <p>{aboutPageStory.cta.detail}</p>
          </div>
          <div className="hero-actions cta-actions">
            <Link className="button button-primary" href="/#organizer-launch">
              Host an event
            </Link>
            <Link className="button button-secondary" href="/">
              Browse events
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
