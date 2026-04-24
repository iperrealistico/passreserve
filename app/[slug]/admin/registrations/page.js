import Link from "next/link";

import {
  getOrganizerEventsAdmin,
  getOrganizerRegistrationsAdmin
} from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import {
  recordVenuePaymentAction,
  updateOrganizerRegistrationAction
} from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export default async function OrganizerRegistrationsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const [data, eventsData] = await Promise.all([
    getOrganizerRegistrationsAdmin(slug, locale),
    getOrganizerEventsAdmin(slug)
  ]);
  const selectedEvent = typeof query.event === "string" ? query.event : "";
  const selectedOccurrence = typeof query.occurrence === "string" ? query.occurrence : "";
  const occurrenceOptions = selectedEvent
    ? data.occurrences.filter((occurrence) => occurrence.eventSlug === selectedEvent)
    : data.occurrences;
  const registrations = data.registrations.filter((registration) => {
    if (selectedEvent && registration.eventSlug !== selectedEvent) {
      return false;
    }

    if (selectedOccurrence && registration.occurrenceId !== selectedOccurrence) {
      return false;
    }

    return true;
  });
  const canRecordVenuePayment = (registration) =>
    registration.dueAtEventOpenCents > 0 &&
    !["PENDING_CONFIRM", "CANCELLED", "NO_SHOW"].includes(registration.status);
  const selectedOccurrenceRecord =
    occurrenceOptions.find((occurrence) => occurrence.id === selectedOccurrence) ?? null;
  const exportBaseHref = `/${slug}/admin/registrations/export?event=${encodeURIComponent(
    selectedEvent
  )}&occurrence=${encodeURIComponent(selectedOccurrence)}&locale=${encodeURIComponent(locale)}`;

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "recorded"
            ? isItalian
              ? "Pagamento registrato correttamente."
              : "Venue payment recorded successfully."
            : isItalian
              ? "Registrazione aggiornata."
              : "Registration updated successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/registrations`}
        description={
          isItalian
            ? "Qui gestisci stato partecipanti, pagamenti, questionario obbligatorio e restrizioni alimentari registrate per ogni persona."
            : "Use this queue for attendee status, payments, the required questionnaire, and dietary restrictions captured for each participant."
        }
        eyebrow={isItalian ? "Registrazioni" : "Registrations"}
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        tip={
          isItalian
            ? "Ogni card mostra il partecipante principale per compatibilità, ma sotto trovi il dettaglio completo di tutti i partecipanti registrati."
            : "Each card still shows the lead attendee for compatibility, but the full participant breakdown appears underneath."}
        title={
          selectedOccurrence
            ? isItalian
              ? "Partecipanti di una singola data"
              : "Participants for one date"
            : selectedEvent
            ? isItalian
              ? "Registrazioni di un singolo evento"
              : "Registrations for one event"
            : isItalian
              ? "Coda registrazioni e pagamenti"
              : "Registration and payment queue"
        }
      />

      {selectedEvent && occurrenceOptions.length ? (
        <section className="panel section-card admin-section">
          <div className="admin-filter-strip">
            <span className="admin-filter-label">
              {isItalian ? "Filtra per data" : "Filter by date"}
            </span>
            <div className="filter-row">
              <Link
                className={`filter-pill ${selectedOccurrence ? "" : "filter-pill-active"}`}
                href={`/${slug}/admin/registrations?event=${encodeURIComponent(selectedEvent)}`}
              >
                {isItalian ? "Tutte le date" : "All dates"}
              </Link>
              {occurrenceOptions.map((occurrence) => (
                <Link
                  className={`filter-pill ${
                    selectedOccurrence === occurrence.id ? "filter-pill-active" : ""
                  }`}
                  href={`/${slug}/admin/registrations?event=${encodeURIComponent(
                    selectedEvent
                  )}&occurrence=${encodeURIComponent(occurrence.id)}`}
                  key={occurrence.id}
                >
                  {occurrence.label}
                </Link>
              ))}
            </div>
          </div>

          {selectedOccurrenceRecord ? (
            <div className="hero-actions">
              <a className="button button-secondary" href={`${exportBaseHref}&variant=operational`}>
                {isItalian ? "Esporta PDF operativo" : "Export operational PDF"}
              </a>
              <a className="button button-primary" href={`${exportBaseHref}&variant=full`}>
                {isItalian ? "Esporta PDF completo" : "Export full PDF"}
              </a>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="admin-card-grid">
          {registrations.map((registration) => (
            <article className="admin-card" key={registration.id}>
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${registration.dietary.participantsWithRestrictions > 0 ? "capacity-watch" : "public"}`}>
                      {registration.quantityLabel}
                    </span>
                    <span className="admin-badge admin-badge-public">
                      {registration.registrationLocale.toUpperCase()}
                    </span>
                  </div>
                  <h4>
                    {registration.registrationCode} · {registration.attendeeName}
                  </h4>
                  <p>
                    {registration.eventTitle} · {registration.occurrenceLabel}
                  </p>
                </div>
              </div>

              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">{isItalian ? "Stato" : "Status"}</span>
                  <strong>{registration.status}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Ticket" : "Ticket"}</span>
                  <strong>{registration.ticketLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Incassato online" : "Online collected"}</span>
                  <strong>{registration.onlineCollectedLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Incassato sul posto" : "Collected at venue"}</span>
                  <strong>{registration.venueCollectedLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Ancora da incassare" : "Still due at venue"}</span>
                  <strong>{registration.dueAtEventOpenLabel}</strong>
                </div>
              </div>

              <div className="admin-note-list">
                <div className="admin-note-item">
                  <span className="spotlight-label">{isItalian ? "Lead contact" : "Lead contact"}</span>
                  <strong>{registration.attendeeEmail}</strong>
                  <p>{registration.attendeePhone}</p>
                </div>
                <div className="admin-note-item">
                  <span className="spotlight-label">
                    {isItalian ? "Partecipanti con restrizioni" : "Participants with restrictions"}
                  </span>
                  <strong>{registration.dietary.participantsWithRestrictions}</strong>
                  <p>
                    {registration.dietary.breakdown.length
                      ? registration.dietary.breakdown.map((item) => `${item.label} (${item.count})`).join(", ")
                      : isItalian
                        ? "Nessuna restrizione"
                        : "No restrictions"}
                  </p>
                </div>
              </div>

              <div className="timeline">
                {registration.ticketItems.map((item) => (
                  <div className="timeline-step" key={`${registration.id}-${item.id}`}>
                    <strong>
                      {item.label} x{item.quantity}
                    </strong>
                    <span>
                      {item.subtotalLabel} · {item.onlineAmountLabel} online
                    </span>
                  </div>
                ))}
                {registration.attendees.map((attendee, index) => (
                  <div className="timeline-step" key={`${registration.id}-${attendee.email}-${index}`}>
                    <strong>
                      {attendee.fullName || `${isItalian ? "Partecipante" : "Participant"} ${index + 1}`}
                    </strong>
                    <span>{attendee.ticketLabel}</span>
                    <span>{attendee.email}</span>
                    <span>{attendee.phone}</span>
                    <span>{attendee.address}</span>
                    {attendee.dietaryFlagLabels.length ? (
                      <span>{attendee.dietaryFlagLabels.join(", ")}</span>
                    ) : (
                      <span>{isItalian ? "Nessuna intolleranza selezionata" : "No selected intolerance"}</span>
                    )}
                    {attendee.dietaryOther ? <span>{attendee.dietaryOther}</span> : null}
                  </div>
                ))}
              </div>

              {registration.ledger.length > 0 ? (
                <div className="timeline admin-payment-ledger">
                  {registration.ledger.map((entry) => (
                    <div className="timeline-step" key={entry.id}>
                      <strong>
                        {entry.amountLabel} · {entry.provider}
                      </strong>
                      <span>{entry.note}</span>
                      <span>{entry.occurredAtLabel}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {registration.dietary.customNotes.length ? (
                <div className="admin-note-list">
                  {registration.dietary.customNotes.map((note, index) => (
                    <div className="admin-note-item" key={`${registration.id}-dietary-${index}`}>
                      <span className="spotlight-label">{note.attendeeName || (isItalian ? "Nota custom" : "Custom note")}</span>
                      <strong>{note.detail}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              {canRecordVenuePayment(registration) ? (
                <form action={recordVenuePaymentAction} className="admin-inline-form">
                  <input name="eventFilter" type="hidden" value={selectedEvent} />
                  <input name="occurrenceFilter" type="hidden" value={selectedOccurrence} />
                  <input name="slug" type="hidden" value={slug} />
                  <input name="registrationId" type="hidden" value={registration.id} />
                  <div className="admin-inline-form-row">
                    <label className="field admin-inline-field">
                      <span>{isItalian ? "Importo incassato sul posto" : "Amount collected at venue"}</span>
                      <input
                        inputMode="decimal"
                        name="amountEuros"
                        placeholder={(registration.dueAtEventOpenCents / 100).toFixed(2)}
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <button className="button button-primary" type="submit">
                      {isItalian ? "Registra pagamento" : "Record venue payment"}
                    </button>
                  </div>
                  <p className="admin-form-hint">
                    {isItalian
                      ? `Inserisci l'importo in euro, ad esempio ${(registration.dueAtEventOpenCents / 100).toFixed(2)}.`
                      : `Enter the amount in euros, for example ${(registration.dueAtEventOpenCents / 100).toFixed(2)}.`}
                  </p>
                </form>
              ) : registration.dueAtEventOpenCents > 0 ? (
                <p className="admin-page-tip">
                  {isItalian
                    ? "Registra il saldo sul posto dopo la conferma o quando l'evento è in corso."
                    : "Record the venue balance after this attendee is confirmed or once the event is underway."}
                </p>
              ) : (
                <p className="admin-page-tip">
                  {isItalian
                    ? "Non resta nessun saldo aperto da incassare sul posto."
                    : "No venue balance is left open for this registration."}
                </p>
              )}

              <div className="hero-actions">
                {registration.actions.map((action) => (
                  <form action={updateOrganizerRegistrationAction} key={action}>
                    <input name="eventFilter" type="hidden" value={selectedEvent} />
                    <input name="occurrenceFilter" type="hidden" value={selectedOccurrence} />
                    <input name="slug" type="hidden" value={slug} />
                    <input name="registrationId" type="hidden" value={registration.id} />
                    <input name="action" type="hidden" value={action} />
                    <button className="button button-secondary" type="submit">
                      {action.replaceAll("_", " ")}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}

          {registrations.length === 0 ? (
            <article className="admin-card">
              <h4>
                {isItalian
                  ? "Nessuna registrazione corrisponde a questo filtro."
                  : "No registrations match this filter."}
              </h4>
              <p>
                {isItalian
                  ? "Scegli un altro evento o rimuovi il filtro per vedere l'intera coda."
                  : "Choose another event or clear the filter to see the full queue."}
              </p>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
