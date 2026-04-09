import {
  getPlatformHealth,
  siteSettingsSnapshot
} from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Service status"
};

export default async function PlatformHealthPage() {
  const platformHealth = await getPlatformHealth();

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Service status</div>
          <h2>Live site status, checkout mode, and request storage stay visible together.</h2>
          <p>
            Use this view to confirm host coverage, email readiness, and checkout status before
            replying to hosts or guests.
          </p>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Vercel target</div>
            <h2>{siteSettingsSnapshot.vercel.projectName}</h2>
            <p>
              {siteSettingsSnapshot.vercel.teamId}
              <br />
              {siteSettingsSnapshot.vercel.projectId}
            </p>
          </div>
          <div className="metrics">
            {platformHealth.metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span className="metric-label">{metric.label}</span>
                <div className="metric-value">{metric.value}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Checks</div>
        <h3>Service readiness is explicit.</h3>
        <div className="admin-card-grid">
          {platformHealth.checks.map((check) => (
            <article className="admin-card" key={check.title}>
              <div className="admin-badge-row">
                <span className={`admin-badge admin-badge-${check.statusTone}`}>
                  {check.statusLabel}
                </span>
              </div>
              <h4>{check.title}</h4>
              <p>{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Known risks</div>
        <h3>Current caveats stay visible to the team.</h3>
        <div className="admin-note-list">
          {platformHealth.risks.map((risk) => (
            <div className="admin-note-item" key={risk.title}>
              <strong>{risk.title}</strong>
              <p>{risk.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
