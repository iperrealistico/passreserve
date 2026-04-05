import { platformLogCatalog } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform logs"
};

export default function PlatformLogsPage() {
  return (
    <div className="admin-page">
      <section className="panel section-card admin-section">
        <div className="section-kicker">Platform logs</div>
        <h2>Event logs now explain deployment, payment, and tooling state in platform terms.</h2>
        <div className="timeline">
          {platformLogCatalog.map((entry) => (
            <div className="timeline-step" key={entry.id}>
              <strong>{entry.eventType}</strong>
              <span>
                {entry.levelLabel} · {entry.actor} · {entry.entity}
              </span>
              <span>{entry.message}</span>
              <span>{entry.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
