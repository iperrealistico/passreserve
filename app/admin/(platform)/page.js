import Link from "next/link";

import {
  getPlatformOverview,
  getPlatformOrganizers
} from "../../../lib/passreserve-admin-service.js";
import { getTranslations } from "../../../lib/passreserve-i18n.js";

export const metadata = {
  title: "Platform dashboard"
};

export default async function PlatformAdminOverviewPage() {
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const [overview, organizers] = await Promise.all([
    getPlatformOverview(),
    getPlatformOrganizers()
  ]);

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">{isItalian ? "Panoramica supporto" : "Support overview"}</div>
          <h2>
            {isItalian
              ? "Organizer, contenuti, inbox e controlli operativi nello stesso posto."
              : "Keep organizers, content, inbox activity, and operational checks in one place."}
          </h2>
          <p>
            {isItalian
              ? "Questa dashboard è il punto di partenza per capire cosa richiede attenzione subito: richieste organizer, follow-up pagamenti e stato dell'infrastruttura."
              : "Start here to see what needs attention first: organizer requests, payment follow-up, and infrastructure readiness."}
          </p>
          <div className="pill-list">
            <span className="pill">{overview.summary.organizerCount} {isItalian ? "organizer" : "organizers"}</span>
            <span className="pill">{overview.summary.eventCount} {isItalian ? "eventi" : "events"}</span>
            <span className="pill">{overview.summary.occurrenceCount} {isItalian ? "date" : "occurrences"}</span>
            <span className="pill">{overview.summary.activeRegistrations} {isItalian ? "registrazioni attive" : "active registrations"}</span>
          </div>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">{isItalian ? "Modalità pagamenti" : "Payment mode"}</div>
            <h2>{overview.summary.stripeModeLabel}</h2>
            <p>
              {isItalian
                ? "Mantieni chiaro cosa è in produzione e cosa è ancora in preview."
                : "Keep it obvious what is production-ready and what is still running in preview."}
            </p>
          </div>

          <div className="metrics">
            <div className="metric">
              <span className="metric-label">{isItalian ? "Richieste aperte" : "Open requests"}</span>
              <div className="metric-value">{overview.summary.openRequestsCount}</div>
            </div>
            <div className="metric">
              <span className="metric-label">{isItalian ? "Template" : "Templates"}</span>
              <div className="metric-value">{overview.summary.templateCount}</div>
            </div>
            <div className="metric">
              <span className="metric-label">{isItalian ? "Incassato online" : "Online collected"}</span>
              <div className="metric-value">{overview.summary.onlineCollectedLabel}</div>
            </div>
            <div className="metric">
              <span className="metric-label">{isItalian ? "Storage inbox" : "Inbox storage"}</span>
              <div className="metric-value">{overview.summary.inboxStorageLabel}</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="section-kicker">{isItalian ? "Coda priorità" : "Attention queue"}</div>
          <h3>{isItalian ? "Cosa richiede attenzione adesso" : "What needs attention first"}</h3>
          <div className="admin-note-list">
            {overview.attentionQueue.map((item) => (
              <div className="admin-note-item" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <Link className="inline-link" href={item.href}>
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">{isItalian ? "Copertura organizer" : "Organizer coverage"}</div>
          <h3>{isItalian ? "Organizer più attivi" : "Currently active organizers"}</h3>
          <div className="timeline">
            {organizers.slice(0, 6).map((organizer) => (
              <div className="timeline-step" key={organizer.slug}>
                <strong>{organizer.name}</strong>
                <span>
                  {organizer.city}, {organizer.region}
                </span>
                <span>{organizer.summary.activeCount} {isItalian ? "registrazioni attive" : "active registrations"}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
