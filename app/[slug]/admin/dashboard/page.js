import Link from "next/link";

import { getOrganizerDashboard } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";
import { OrganizerTourControls } from "../organizer-tour-replay-button.js";

export default async function OrganizerDashboardPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const dashboard = await getOrganizerDashboard(slug);
  const dietary = dashboard.summary.dietary;
  const attentionCards = [
    {
      id: "schedule",
      eyebrow: isItalian ? "Programma" : "Schedule",
      title:
        dashboard.summary.upcomingOccurrences > 0
          ? isItalian
            ? `${dashboard.summary.upcomingOccurrences} date in arrivo`
            : `${dashboard.summary.upcomingOccurrences} upcoming dates`
          : isItalian
            ? "Nessuna data imminente"
            : "No dates coming up",
      detail:
        dashboard.summary.upcomingOccurrences > 0
          ? isItalian
            ? "Controlla capienza, pubblicazione e note operative delle prossime sessioni."
            : "Check capacity, publication state, and operational notes for the next sessions."
          : isItalian
            ? "Aggiungi o pubblica una data per rimettere in moto il calendario."
            : "Create or publish a date to restart the live calendar.",
      href: `/${slug}/admin/calendar?view=week`,
      cta: isItalian ? "Apri programma" : "Open schedule"
    },
    {
      id: "payments",
      eyebrow: isItalian ? "Pagamenti" : "Payments",
      title:
        dashboard.summary.pendingPayments > 0
          ? isItalian
            ? `${dashboard.summary.pendingPayments} follow-up da gestire`
            : `${dashboard.summary.pendingPayments} payment follow-ups`
          : isItalian
            ? "Nessun pagamento in attesa"
            : "No payment follow-up needed",
      detail:
        dashboard.summary.pendingPayments > 0
          ? isItalian
            ? "Apri la coda con focus pagamenti per sollecitare o registrare gli incassi."
            : "Open the payment-focused queue to follow up or record venue collections."
          : isItalian
            ? "La coda pagamenti è pulita in questo momento."
            : "The payment queue is clear right now.",
      href: `/${slug}/admin/registrations?focus=payments&view=compact`,
      cta: isItalian ? "Apri pagamenti" : "Open payments"
    },
    {
      id: "restrictions",
      eyebrow: isItalian ? "Partecipanti" : "Participants",
      title:
        dietary.participantsWithRestrictions > 0
          ? isItalian
            ? `${dietary.participantsWithRestrictions} con esigenze alimentari`
            : `${dietary.participantsWithRestrictions} with dietary notes`
          : isItalian
            ? "Nessuna restrizione segnalata"
            : "No dietary restrictions reported",
      detail:
        dietary.participantsWithRestrictions > 0
          ? isItalian
            ? "Controlla chi ha allergie, intolleranze o note custom prima delle prossime date."
            : "Review allergies, intolerances, and custom notes before the next live dates."
          : isItalian
            ? "Qui vedrai subito le richieste alimentari appena arrivano nuove registrazioni."
            : "This area will surface dietary notes as soon as new registrations arrive.",
      href: `/${slug}/admin/registrations?focus=open&view=detail`,
      cta: isItalian ? "Apri registrazioni" : "Open registrations"
    }
  ];

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

      <div data-organizer-tour="dashboard-overview">
        <OrganizerAdminPageHeader
          basePath={`/${slug}/admin/dashboard`}
          description={
            isItalian
              ? "Apri qui ciò che richiede attenzione adesso: prossime date, nuove registrazioni e pagamenti."
              : "Open what needs attention now: upcoming dates, new registrations, and payment follow-up."
          }
          eyebrow={isItalian ? "Panoramica" : "Overview"}
          query={query}
          actions={
            <>
              <OrganizerTourControls
                setupLabel={isItalian ? "Avvia setup guidato" : "Start guided setup"}
                showcaseLabel={isItalian ? "Rivedi tour" : "Replay tour"}
              />
              <Link className="button button-secondary" href={`/${slug}/admin/calendar`}>
                {isItalian ? "Apri programma" : "Open schedule"}
              </Link>
              <Link className="button button-primary" href={`/${slug}/admin/registrations`}>
                {isItalian ? "Apri registrazioni" : "Open registrations"}
              </Link>
            </>
          }
          title={isItalian ? "Cosa richiede attenzione" : "What needs attention"}
        />
      </div>

      <section className="admin-action-grid" data-organizer-tour="dashboard-priorities">
        {attentionCards.map((card) => (
          <article className="panel section-card admin-section" key={card.id}>
            <div className="section-kicker">{card.eyebrow}</div>
            <h3>{card.title}</h3>
            <p className="admin-page-lead">{card.detail}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href={card.href}>
                {card.cta}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Metriche rapide" : "Quick metrics"}</div>
            <h3>{isItalian ? "Stato operativo in sintesi" : "Operational state at a glance"}</h3>
          </div>
        </div>
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
                  <div className="hero-actions">
                    <Link
                      className="button button-secondary button-small"
                      href={`/${slug}/admin/calendar?event=${encodeURIComponent(entry.eventSlug || "")}&edit=${encodeURIComponent(entry.id)}`}
                    >
                      {isItalian ? "Apri data" : "Open date"}
                    </Link>
                  </div>
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
                  <div className="hero-actions">
                    <Link
                      className="button button-secondary button-small"
                      href={`/${slug}/admin/registrations?event=${encodeURIComponent(
                        registration.eventSlug
                      )}&occurrence=${encodeURIComponent(registration.occurrenceId)}&view=detail`}
                    >
                      {isItalian ? "Apri coda" : "Open queue"}
                    </Link>
                  </div>
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
