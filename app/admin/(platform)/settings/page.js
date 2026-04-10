import {
  getPlatformHealth,
  siteSettingsSnapshot
} from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform settings"
};

export default async function PlatformSettingsPage() {
  const platformHealth = await getPlatformHealth();

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Settings</div>
          <h2>Brand, contact points, and checkout status stay aligned.</h2>
          <p>
            This screen keeps the site name, metadata, inboxes, and checkout status together so
            public pages and team replies stay consistent.
          </p>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Production target</div>
            <h2>{siteSettingsSnapshot.vercel.projectName}</h2>
            <p>
              {siteSettingsSnapshot.vercel.productionAlias}
              <br />
              {siteSettingsSnapshot.vercel.projectId}
            </p>
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">SEO and brand</div>
        <h3>Public-facing references stay aligned.</h3>
        <div className="admin-preview-grid">
          <div className="admin-preview-panel">
            <span className="route-label">Site title</span>
            <h4>{siteSettingsSnapshot.seo.title}</h4>
            <p>{siteSettingsSnapshot.seo.description}</p>
          </div>
          <div className="admin-preview-panel">
            <span className="route-label">Keywords</span>
            <div className="pill-list">
              {siteSettingsSnapshot.seo.keywords.map((keyword) => (
                <span className="pill" key={keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="section-kicker">Team contacts</div>
          <h3>Who receives what.</h3>
          <div className="admin-note-list">
            <div className="admin-note-item">
              <strong>Support email</strong>
              <p>{siteSettingsSnapshot.operations.platformEmail}</p>
            </div>
            <div className="admin-note-item">
              <strong>Launch inbox</strong>
              <p>{siteSettingsSnapshot.operations.launchInbox}</p>
            </div>
            <div className="admin-note-item">
              <strong>Alert inbox</strong>
              <p>{siteSettingsSnapshot.operations.adminNotifications}</p>
            </div>
            <div className="admin-note-item">
              <strong>Reply target</strong>
              <p>{siteSettingsSnapshot.operations.supportResponseTarget}</p>
            </div>
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Live-site check</div>
            <h3>Live confirmation stays part of the routine.</h3>
            <p>{siteSettingsSnapshot.operations.deploymentRule}</p>
          </article>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Stripe environment</div>
        <h3>Checkout status is visible before launch claims are made.</h3>
        <div className="admin-card-grid">
          {siteSettingsSnapshot.stripe.requirements.map((requirement) => (
            <article className="admin-card" key={requirement.key}>
              <div className="admin-badge-row">
                <span
                  className={`admin-badge admin-badge-${
                    requirement.present ? "public" : "capacity-watch"
                  }`}
                >
                  {requirement.present ? "Present" : "Missing"}
                </span>
              </div>
              <h4>{requirement.label}</h4>
              <p>{requirement.requiredFor}</p>
              <span className="inline-link">{requirement.key}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Health cross-check</div>
        <h3>Settings connect directly to the current site checks.</h3>
        <div className="timeline">
          {platformHealth.checks.map((check) => (
            <div className="timeline-step" key={check.title}>
              <strong>{check.title}</strong>
              <span>
                {check.statusLabel} · {check.detail}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
