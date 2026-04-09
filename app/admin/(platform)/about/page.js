import Link from "next/link";

import { aboutCmsBlocks, aboutPageStory } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "About page"
};

export default function PlatformAboutCmsPage() {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">About page</div>
          <h2>Keep the about page warm, clear, and event-first.</h2>
          <p>
            The about page should explain what Passreserve is for, how attendees sign up, and how
            organizers manage events without exposing internal project history.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/about">
              Open public about page
            </Link>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Live summary</div>
            <h2>{aboutPageStory.hero.eyebrow}</h2>
            <p>{aboutPageStory.hero.summary}</p>
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Content blocks</div>
        <h3>Each block supports the public page.</h3>
        <div className="admin-card-grid">
          {aboutCmsBlocks.map((block) => (
            <article className="admin-card" key={block.title}>
              <div className="admin-badge-row">
                <span className={`admin-badge admin-badge-${block.statusTone}`}>
                  {block.statusLabel}
                </span>
              </div>
              <h4>{block.title}</h4>
              <p>{block.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Published sections</div>
        <h3>The live about page is arranged for clear reading.</h3>
        <div className="timeline">
          {aboutPageStory.sections.map((section) => (
            <div className="timeline-step" key={section.id}>
              <strong>{section.title}</strong>
              <span>{section.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
