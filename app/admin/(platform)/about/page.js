import Link from "next/link";

import { aboutCmsBlocks, aboutPageStory } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform about CMS"
};

export default function PlatformAboutCmsPage() {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">About CMS</div>
          <h2>The public story now explains Passreserve.com as an event platform.</h2>
          <p>
            The about route no longer needs to inherit MTB Reserve storytelling. Phase 11
            rewrites the public narrative around organizer hubs, event pages, deposits, and calm
            platform operations while keeping the content structure easy to manage.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/about">
              Open public about page
            </Link>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Public story</div>
            <h2>{aboutPageStory.hero.eyebrow}</h2>
            <p>{aboutPageStory.hero.summary}</p>
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">CMS blocks</div>
        <h3>Each block now carries event-platform language.</h3>
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
        <h3>The new public story is already structured for reuse.</h3>
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
