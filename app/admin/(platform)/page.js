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
      <section className="panel section-card admin-section">
        <div className="admin-overview-grid">
          <div className="admin-overview-copy">
            <div className="section-kicker">{isItalian ? "Panoramica supporto" : "Support overview"}</div>
            <h2>
              {isItalian
                ? "Supporto platform, contenuti e controlli operativi in un colpo solo."
                : "Platform support, content, and operational checks in one clear starting point."}
            </h2>
            <p>
              {isItalian
                ? "Qui capisci subito cosa richiede attenzione: richieste organizer, follow-up pagamenti, qualità contenuti e stato ambiente."
                : "Use this first screen to see what needs attention now: organizer requests, payment follow-up, content quality, and environment readiness."}
            </p>
          </div>

          <div className="admin-summary-grid">
            <div className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Organizer attivi" : "Active organizers"}</span>
              <strong className="metric-value">{overview.summary.organizerCount}</strong>
            </div>
            <div className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Eventi pubblici" : "Public events"}</span>
              <strong className="metric-value">{overview.summary.eventCount}</strong>
            </div>
            <div className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Date pubblicate" : "Published dates"}</span>
              <strong className="metric-value">{overview.summary.occurrenceCount}</strong>
            </div>
            <div className="admin-summary-card">
              <span className="metric-label">
                {isItalian ? "Registrazioni attive" : "Active registrations"}
              </span>
              <strong className="metric-value">{overview.summary.activeRegistrations}</strong>
            </div>
          </div>
        </div>

        <div className="admin-shell-note-grid">
          <div className="admin-shell-note">
            <strong>{isItalian ? "Applications aperte" : "Open applications"}</strong>
            {overview.summary.pendingApplicationsCount}
          </div>
          <div className="admin-shell-note">
            <strong>{isItalian ? "Mailbox non lette" : "Unread mailbox"}</strong>
            {overview.summary.unreadMailboxCount}
          </div>
          <div className="admin-shell-note">
            <strong>{isItalian ? "Template email" : "Email templates"}</strong>
            {overview.summary.templateCount}
          </div>
          <div className="admin-shell-note">
            <strong>{isItalian ? "Incassato online" : "Collected online"}</strong>
            {overview.summary.onlineCollectedLabel}
          </div>
          <div className="admin-shell-note">
            <strong>{isItalian ? "Stato pagamenti" : "Payments status"}</strong>
            {overview.summary.stripeModeLabel}
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section admin-section-wide">
          <div className="section-kicker">{isItalian ? "Panoramica supporto" : "Support overview"}</div>
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
          <div className="section-kicker">{isItalian ? "Stato platform" : "Platform state"}</div>
          <h3>{isItalian ? "Indicatori rapidi" : "Quick operational signals"}</h3>
          <div className="admin-note-list">
            <div className="admin-note-item">
              <span className="spotlight-label">{isItalian ? "Storage attuale" : "Current storage"}</span>
              <strong>{overview.summary.storageLabel}</strong>
            </div>
            {overview.releaseTracks.map((track) => (
              <div className="admin-note-item" key={track.title}>
                <strong>{track.title}</strong>
                <p>{track.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel section-card admin-section">
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
      </section>
    </div>
  );
}
