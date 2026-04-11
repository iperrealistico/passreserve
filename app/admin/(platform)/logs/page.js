import { listAuditLogs } from "../../../../lib/passreserve-service.js";

export const metadata = {
  title: "Logs"
};

export default async function PlatformLogsPage() {
  const logs = await listAuditLogs(100);

  return (
    <section className="panel section-card admin-section">
      <div className="section-kicker">Audit log</div>
      <h2>Recent platform activity</h2>
      <div className="timeline">
        {logs.map((entry) => (
          <div className="timeline-step" key={entry.id}>
            <strong>{entry.eventType}</strong>
            <span>{entry.message}</span>
            <span>{entry.createdAt}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
