import { getPlatformHealth } from "../../../../lib/passreserve-admin-service.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";

export const metadata = {
  title: "Health"
};

function formatDateTime(value, locale) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default async function PlatformHealthPage() {
  const health = await getPlatformHealth();
  const { locale, dictionary } = await getTranslations();
  const isItalian = locale === "it";

  return (
    <div className="admin-page">
      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{dictionary.health.title}</div>
            <h2>
              {isItalian
                ? "Ambiente, pagamenti ed email mostrati senza ambiguità."
                : "Environment, payments, and email readiness shown without ambiguity."}
            </h2>
          </div>
          <div className="pill-list">
            <span className="pill">{health.email.outboundModeLabel}</span>
            <span className="pill">
              {dictionary.health.inbound}: {dictionary.health.outboundOnly}
            </span>
          </div>
        </div>
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
          <div className="section-kicker">{isItalian ? "Checks" : "Checks"}</div>
          <h3>{isItalian ? "Controlli correnti piattaforma" : "Current platform checks"}</h3>
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
          <div className="section-kicker">{isItalian ? "Stato email" : "Email readiness"}</div>
          <h3>
            {isItalian
              ? "Invio operativo, ricezione non implementata"
              : "Outbound ready, inbound not implemented"}
          </h3>
          <div className="admin-note-list">
            <div className="admin-note-item">
              <span className="spotlight-label">{dictionary.health.email}</span>
              <strong>{health.email.outboundModeLabel}</strong>
            </div>
            <div className="admin-note-item">
              <span className="spotlight-label">{dictionary.health.inbound}</span>
              <strong>{dictionary.health.outboundOnly}</strong>
            </div>
            <div className="admin-note-item">
              <span className="spotlight-label">{isItalian ? "Fallimenti recenti" : "Recent failures"}</span>
              <strong>{health.email.recentFailureCount}</strong>
            </div>
          </div>
          <div className="timeline">
            {health.email.recentFailures.length ? (
              health.email.recentFailures.map((entry) => (
                <div className="timeline-step" key={entry.id}>
                  <strong>
                    {entry.templateSlug} · {entry.recipientEmail}
                  </strong>
                  <span>{entry.deliveryStatus}</span>
                  <span>{formatDateTime(entry.sentAt, locale)}</span>
                </div>
              ))
            ) : (
              <div className="timeline-step">
                <strong>{isItalian ? "Nessun fallimento recente" : "No recent failures"}</strong>
                <span>
                  {isItalian
                    ? "Gli ultimi tentativi email non hanno registrato errori."
                    : "Recent email attempts have not recorded delivery failures."}
                </span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">{isItalian ? "Rischi residui" : "Remaining risks"}</div>
        <h3>{isItalian ? "Cose da non dare per scontate" : "What still needs explicit attention"}</h3>
        <div className="timeline">
          {health.risks.map((risk) => (
            <div className="timeline-step" key={risk.title}>
              <strong>{risk.title}</strong>
              <span>{risk.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
