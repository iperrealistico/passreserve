import { getPlatformHealth } from "../../../../lib/passreserve-admin-service.js";

export const metadata = {
  title: "Health"
};

export default async function PlatformHealthPage() {
  const health = await getPlatformHealth();

  return (
    <div className="admin-page">
      <section className="panel section-card admin-section">
        <div className="section-kicker">Health</div>
        <h2>Environment and launch readiness</h2>
        <div className="metrics">
          {health.metrics.map((metric) => (
            <div className="metric" key={metric.label}>
              <div className="metric-label">{metric.label}</div>
              <div className="metric-value">{metric.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">Checks</div>
          <h3>Current platform checks</h3>
          <div className="status-list">
            {health.checks.map((check, index) => (
              <div className="status-item" key={check.title}>
                <span className="status-index">{index + 1}</span>
                <div>
                  <strong>
                    {check.title} · {check.statusLabel}
                  </strong>
                  {check.detail}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">Launch blockers</div>
          <h3>Owner-controlled items still required</h3>
          <div className="timeline">
            {health.risks.map((risk) => (
              <div className="timeline-step" key={risk.title}>
                <strong>{risk.title}</strong>
                <span>{risk.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
