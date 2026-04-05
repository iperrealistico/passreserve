import { platformHealth, siteSettingsSnapshot } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform settings"
};

export default function PlatformSettingsPage() {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Global settings</div>
          <h2>Brand, SEO, delivery endpoints, and deployment rules now match Passreserve.com.</h2>
          <p>
            Phase 11 reintroduces the platform-settings surface in event language. Metadata,
            support inboxes, Stripe readiness, and Vercel identifiers now sit beside the
            operational rule that every push must be verified on the real deployment target.
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
        <h3>Public-facing references are now platform-accurate.</h3>
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
          <div className="section-kicker">Operations contacts</div>
          <h3>Platform communication rules are explicit.</h3>
          <div className="admin-note-list">
            <div className="admin-note-item">
              <strong>Platform support</strong>
              <p>{siteSettingsSnapshot.operations.platformEmail}</p>
            </div>
            <div className="admin-note-item">
              <strong>Organizer launch inbox</strong>
              <p>{siteSettingsSnapshot.operations.launchInbox}</p>
            </div>
            <div className="admin-note-item">
              <strong>Admin notifications</strong>
              <p>{siteSettingsSnapshot.operations.adminNotifications}</p>
            </div>
            <div className="admin-note-item">
              <strong>Response target</strong>
              <p>{siteSettingsSnapshot.operations.supportResponseTarget}</p>
            </div>
          </div>
        </article>

        <aside className="admin-page">
          <article className="panel section-card admin-section">
            <div className="section-kicker">Verification rule</div>
            <h3>Deployment checks stay non-negotiable.</h3>
            <p>{siteSettingsSnapshot.operations.deploymentRule}</p>
          </article>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Stripe environment</div>
        <h3>Payment readiness is visible from platform settings.</h3>
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
        <h3>Settings now connect directly to operational status.</h3>
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
