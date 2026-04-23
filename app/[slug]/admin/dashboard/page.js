import Link from "next/link";

import { getOrganizerDashboard } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerDashboardPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const dashboard = await getOrganizerDashboard(slug);
  const dietary = dashboard.summary.dietary;

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "impersonated"
            ? isItalian
              ? "Dashboard organizer aperta correttamente."
              : "Organizer dashboard opened successfully."
            : isItalian
              ? "Aggiornamento admin organizer salvato."
              : "Organizer admin update saved successfully."}
        </div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/dashboard`}
        description={
          isItalian
            ? "Questa schermata riassume cosa richiede attenzione oggi: date in arrivo, nuove registrazioni, incassi e restrizioni alimentari."
            : "This view highlights what needs attention today: upcoming dates, recent registrations, collections, and dietary restrictions."
        }
        eyebrow={isItalian ? "Oggi" : "Today"}
        query={query}
        tip={
          isItalian
            ? "Usa Eventi per il catalogo, Date per le singole sessioni, Registrazioni per il dettaglio partecipanti e Billing per Stripe."
            : "Use Events for the catalog, Dates for scheduled sessions, Registrations for attendee detail, and Billing for Stripe."
        }
        title={`${dashboard.organizer.name} ${isItalian ? "panoramica giornaliera" : "daily overview"}`}
      />

      <section className="panel section-card admin-section">
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">{isItalian ? "Registrazioni attive" : "Active registrations"}</div>
            <div className="metric-value">{dashboard.summary.activeCount}</div>
          </div>
          <div className="metric">
            <div className="metric-label">{isItalian ? "Date in arrivo" : "Upcoming dates"}</div>
            <div className="metric-value">{dashboard.summary.upcomingOccurrences}</div>
          </div>
          <div className="metric">
            <div className="metric-label">{isItalian ? "Incassato online" : "Online collected"}</div>
            <div className="metric-value">{dashboard.summary.onlineCollectedLabel}</div>
          </div>
          <div className="metric">
            <div className="metric-label">{isItalian ? "Da incassare sul posto" : "Due at venue"}</div>
            <div className="metric-value">{dashboard.summary.dueAtEventLabel}</div>
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">
            {isItalian ? "Restrizioni alimentari" : "Dietary restrictions"}
          </div>
          <h3>
            {isItalian
              ? "Panoramica partecipanti con esigenze"
              : "Participant restrictions overview"}
          </h3>
          <div className="metrics">
            <div className="metric">
              <div className="metric-label">
                {isItalian ? "Partecipanti con restrizioni" : "Participants with restrictions"}
              </div>
              <div className="metric-value">{dietary.participantsWithRestrictions}</div>
            </div>
          </div>
          <div className="admin-note-list">
            {dietary.breakdown.length ? (
              dietary.breakdown.map((item) => (
                <div className="admin-note-item" key={item.id}>
                  <strong>{item.label}</strong>
                  <p>
                    {item.count} {isItalian ? "partecipanti" : "participants"}
                  </p>
                </div>
              ))
            ) : (
              <div className="admin-note-item">
                <strong>
                  {isItalian ? "Nessuna restrizione segnalata" : "No restrictions reported"}
                </strong>
                <p>
                  {isItalian
                    ? "Le nuove registrazioni con allergie o intolleranze compariranno qui."
                    : "New registrations with allergies or intolerances will appear here."}
                </p>
              </div>
            )}
          </div>
          {dietary.customNotes.length ? (
            <div className="timeline">
              {dietary.customNotes.slice(0, 6).map((note, index) => (
                <div className="timeline-step" key={`${note.attendeeName}-${index}`}>
                  <strong>{note.attendeeName || (isItalian ? "Partecipante" : "Attendee")}</strong>
                  <span>{note.detail}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="hero-actions">
            <Link className="button button-secondary" href={`/${slug}/admin/registrations`}>
              {isItalian ? "Apri registrazioni" : "Open registrations"}
            </Link>
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">{isItalian ? "Date in arrivo" : "Upcoming dates"}</div>
          <h3>{isItalian ? "Prossime sessioni" : "Next scheduled sessions"}</h3>
          <div className="timeline">
            {dashboard.upcomingOccurrences.length ? (
              dashboard.upcomingOccurrences.map((entry) => (
                <div className="timeline-step" key={entry.id}>
                  <strong>{entry.eventTitle}</strong>
                  <span>{entry.dateLabel}</span>
                  <span>{entry.timeLabel}</span>
                  <span>
                    {entry.capacity.remaining} {isItalian ? "posti rimasti" : "seats remaining"}
                  </span>
                </div>
              ))
            ) : (
              <div className="timeline-step">
                <strong>{isItalian ? "Nessuna data in arrivo" : "No upcoming dates"}</strong>
                <span>
                  {isItalian
                    ? "Crea o pubblica una data per far comparire la prossima sessione qui."
                    : "Create or publish a date to surface the next session here."}
                </span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="admin-grid">
        <article className="panel section-card admin-section">
          <div className="section-kicker">{isItalian ? "Registrazioni recenti" : "Recent registrations"}</div>
          <h3>{isItalian ? "Ultima attività partecipanti" : "Latest attendee activity"}</h3>
          <div className="timeline">
            {dashboard.recentRegistrations.length ? (
              dashboard.recentRegistrations.map((registration) => (
                <div className="timeline-step" key={registration.id}>
                  <strong>
                    {registration.registrationCode} · {registration.attendeeName}
                  </strong>
                  <span>{registration.eventTitle}</span>
                  <span>{registration.status}</span>
                  <span>{registration.quantityLabel}</span>
                </div>
              ))
            ) : (
              <div className="timeline-step">
                <strong>{isItalian ? "Nessuna registrazione recente" : "No recent registrations"}</strong>
                <span>
                  {isItalian
                    ? "Le nuove registrazioni compariranno qui appena create."
                    : "New registrations will appear here as soon as they are created."}
                </span>
              </div>
            )}
          </div>
        </article>

        <article className="panel section-card admin-section">
          <div className="section-kicker">{isItalian ? "Checklist billing" : "Billing checklist"}</div>
          <h3>
            {dashboard.billing.enabled
              ? isItalian
                ? "Pagamenti online pronti"
                : "Online payments ready"
              : isItalian
                ? "Pagamenti online ancora bloccati"
                : "Online payments still blocked"}
          </h3>
          <p>{dashboard.billing.paidPublishingLabel}</p>
          <div className="timeline">
            {dashboard.billing.checklist.map((item) => (
              <div className="timeline-step" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href={`/${slug}/admin/billing`}>
              {isItalian ? "Apri billing" : "Open billing"}
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
