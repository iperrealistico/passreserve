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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const focusOptions = ["all", "open", "payments", "history"];
const registrationViews = new Set(["compact", "table", "detail", "event-day"]);

function formatCurrencyFromCents(cents) {
  return currencyFormatter.format((cents || 0) / 100);
}

function buildRegistrationsHref(slug, query = {}, updates = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "string" && value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  const serialized = params.toString();
  return `/${slug}/admin/registrations${serialized ? `?${serialized}` : ""}`;
}

function getVisibleRegistrations(registrations, focus) {
  switch (focus) {
    case "open":
      return registrations.filter(
        (registration) =>
          !["ATTENDED", "CANCELLED", "NO_SHOW"].includes(registration.status)
      );
    case "payments":
      return registrations.filter(
        (registration) =>
          registration.dueAtEventOpenCents > 0 || registration.status === "PENDING_PAYMENT"
      );
    case "history":
      return registrations.filter((registration) =>
        ["ATTENDED", "CANCELLED", "NO_SHOW"].includes(registration.status)
      );
    default:
      return registrations;
  }
}

function formatRegistrationActionLabel(action, isItalian) {
  const labels = {
    mark_paid: isItalian ? "Segna come pagata" : "Mark paid",
    mark_attended: isItalian ? "Segna presente" : "Mark attended",
    mark_no_show: isItalian ? "Segna no-show" : "Mark no-show",
    cancel: isItalian ? "Cancella" : "Cancel"
  };

  return labels[action] || action.replaceAll("_", " ");
}

function getParticipantCount(registration) {
  if (Array.isArray(registration.attendees) && registration.attendees.length > 0) {
    return registration.attendees.length;
  }

  if (Array.isArray(registration.ticketItems) && registration.ticketItems.length > 0) {
    return registration.ticketItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  return 1;
}

function getEventDayRank(registration) {
  const ranks = {
    CONFIRMED_PAID: 0,
    CONFIRMED_PARTIALLY_PAID: 1,
    CONFIRMED_UNPAID: 2,
    PENDING_PAYMENT: 3,
    PENDING_CONFIRM: 4,
    ATTENDED: 5,
    NO_SHOW: 6,
    CANCELLED: 7
  };

  return ranks[registration.status] ?? 99;
}

function isClosedRegistration(registration) {
  return ["ATTENDED", "NO_SHOW", "CANCELLED"].includes(registration.status);
}

function RegistrationDetailPanel({
  registration,
  isItalian,
  slug,
  selectedEvent,
  selectedOccurrence
}) {
  const canRecordVenuePayment =
    registration.dueAtEventOpenCents > 0 &&
    !["PENDING_CONFIRM", "CANCELLED", "NO_SHOW"].includes(registration.status);

  return (
    <article className="panel section-card admin-section admin-side-editor">
      <div className="admin-section-header">
        <div>
          <div className="section-kicker">{isItalian ? "Dettaglio registrazione" : "Registration detail"}</div>
          <h3>
            {registration.registrationCode} · {registration.attendeeName}
          </h3>
        </div>
        <div className="pill-list">
          <span className={`admin-badge admin-badge-${registration.status.toLowerCase()}`}>
            {registration.status}
          </span>
          <span className="admin-badge admin-badge-public">
            {registration.registrationLocale.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="admin-card-metrics">
        <div>
          <span className="metric-label">{isItalian ? "Evento" : "Event"}</span>
          <strong>{registration.eventTitle}</strong>
        </div>
        <div>
          <span className="metric-label">{isItalian ? "Data" : "Date"}</span>
          <strong>{registration.occurrenceLabel}</strong>
        </div>
        <div>
          <span className="metric-label">{isItalian ? "Ticket" : "Ticket"}</span>
          <strong>{registration.ticketLabel}</strong>
        </div>
        <div>
          <span className="metric-label">{isItalian ? "Partecipanti" : "Participants"}</span>
          <strong>{getParticipantCount(registration)}</strong>
        </div>
        <div>
          <span className="metric-label">{isItalian ? "Incassato online" : "Online collected"}</span>
          <strong>{registration.onlineCollectedLabel}</strong>
        </div>
        <div>
          <span className="metric-label">{isItalian ? "Ancora da incassare" : "Still due"}</span>
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

      <details className="admin-disclosure" open>
        <summary className="admin-disclosure-summary">
          {isItalian ? "Ticket e partecipanti" : "Tickets and participants"}
        </summary>
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
      </details>

      {registration.ledger.length > 0 ? (
        <details className="admin-disclosure">
          <summary className="admin-disclosure-summary">
            {isItalian ? "Storico pagamenti" : "Payment history"}
          </summary>
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
        </details>
      ) : null}

      {registration.dietary.customNotes.length ? (
        <details className="admin-disclosure">
          <summary className="admin-disclosure-summary">
            {isItalian ? "Note alimentari custom" : "Custom dietary notes"}
          </summary>
          <div className="admin-note-list">
            {registration.dietary.customNotes.map((note, index) => (
              <div className="admin-note-item" key={`${registration.id}-dietary-${index}`}>
                <span className="spotlight-label">
                  {note.attendeeName || (isItalian ? "Nota custom" : "Custom note")}
                </span>
                <strong>{note.detail}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {canRecordVenuePayment ? (
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
              {formatRegistrationActionLabel(action, isItalian)}
            </button>
          </form>
        ))}
      </div>
    </article>
  );
}

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
  const requestedView =
    typeof query.view === "string" && registrationViews.has(query.view) ? query.view : "compact";
  const currentFocus =
    typeof query.focus === "string" && focusOptions.includes(query.focus) ? query.focus : "all";
  const occurrenceOptions = selectedEvent
    ? data.occurrences.filter((occurrence) => occurrence.eventSlug === selectedEvent)
    : data.occurrences;
  const scopedRegistrations = data.registrations.filter((registration) => {
    if (selectedEvent && registration.eventSlug !== selectedEvent) {
      return false;
    }

    if (selectedOccurrence && registration.occurrenceId !== selectedOccurrence) {
      return false;
    }

    return true;
  });
  const registrations = getVisibleRegistrations(scopedRegistrations, currentFocus);
  const currentView =
    requestedView === "event-day" && !selectedOccurrence ? "compact" : requestedView;
  const eventDayMode = currentView === "event-day" && Boolean(selectedOccurrence);
  const canRecordVenuePayment = (registration) =>
    registration.dueAtEventOpenCents > 0 &&
    !["PENDING_CONFIRM", "CANCELLED", "NO_SHOW"].includes(registration.status);
  const selectedOccurrenceRecord =
    occurrenceOptions.find((occurrence) => occurrence.id === selectedOccurrence) ?? null;
  const exportBaseHref = `/${slug}/admin/registrations/export?event=${encodeURIComponent(
    selectedEvent
  )}&occurrence=${encodeURIComponent(selectedOccurrence)}&locale=${encodeURIComponent(locale)}`;
  const summary = registrations.reduce(
    (accumulator, registration) => {
      const participantCount = getParticipantCount(registration);

      accumulator.registrationCount += 1;
      accumulator.participantCount += participantCount;
      accumulator.restrictionsCount += registration.dietary.participantsWithRestrictions || 0;
      accumulator.dueAtVenueCents += registration.dueAtEventOpenCents || 0;

      return accumulator;
    },
    {
      registrationCount: 0,
      participantCount: 0,
      restrictionsCount: 0,
      dueAtVenueCents: 0
    }
  );
  const orderedRegistrations = [...registrations].sort((left, right) => {
    const rankDifference = getEventDayRank(left) - getEventDayRank(right);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return left.attendeeName.localeCompare(right.attendeeName);
  });
  const eventDayOpenRegistrations = orderedRegistrations.filter((registration) => !isClosedRegistration(registration));
  const eventDayClosedRegistrations = orderedRegistrations.filter((registration) => isClosedRegistration(registration));
  const eventDaySummary = orderedRegistrations.reduce(
    (accumulator, registration) => {
      const participantCount = getParticipantCount(registration);

      if (registration.status === "ATTENDED") {
        accumulator.checkedInParticipants += participantCount;
      }

      if (registration.status === "PENDING_PAYMENT" || registration.dueAtEventOpenCents > 0) {
        accumulator.paymentFollowUps += 1;
      }

      if (!isClosedRegistration(registration)) {
        accumulator.openRegistrations += 1;
      }

      return accumulator;
    },
    {
      openRegistrations: 0,
      checkedInParticipants: 0,
      paymentFollowUps: 0
    }
  );
  const selectedDetailId = typeof query.detail === "string" ? query.detail : "";
  const selectedDetailRegistration =
    currentView === "detail"
      ? registrations.find((registration) => registration.id === selectedDetailId) ||
        registrations[0] ||
        null
      : null;

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
            ? "Questa è la coda operativa dei partecipanti: stato, pagamenti e questionari compilati."
            : "This is the live participant queue: status, payments, and completed questionnaires."
        }
        eyebrow={isItalian ? "Registrazioni" : "Registrations"}
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent}
        filterLabel={isItalian ? "Filtra per evento" : "Filter by event"}
        allEventsLabel={isItalian ? "Tutti gli eventi" : "All events"}
        actions={
          <Link
            className="button button-secondary"
            href={
              selectedEvent
                ? `/${slug}/admin/calendar?event=${encodeURIComponent(selectedEvent)}`
                : `/${slug}/admin/calendar`
            }
          >
            {isItalian ? "Apri programma" : "Open schedule"}
          </Link>
        }
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
              ? "Coda partecipanti"
              : "Participant queue"
        }
      />

      <section className="panel section-card admin-section">
        <div className="admin-filter-strip">
          <span className="admin-filter-label">{isItalian ? "Focus coda" : "Queue focus"}</span>
          <div className="filter-row">
            <Link
              className={`filter-pill ${currentFocus === "all" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { focus: "all" })}
            >
              {isItalian ? "Tutto" : "All"}
            </Link>
            <Link
              className={`filter-pill ${currentFocus === "open" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { focus: "open" })}
            >
              {isItalian ? "Lavoro aperto" : "Open work"}
            </Link>
            <Link
              className={`filter-pill ${currentFocus === "payments" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { focus: "payments" })}
            >
              {isItalian ? "Pagamenti" : "Payments"}
            </Link>
            <Link
              className={`filter-pill ${currentFocus === "history" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { focus: "history" })}
            >
              {isItalian ? "Storico" : "History"}
            </Link>
          </div>
        </div>

        <div className="admin-filter-strip">
          <span className="admin-filter-label">{isItalian ? "Vista" : "View"}</span>
          <div className="filter-row">
            <Link
              className={`filter-pill ${currentView === "compact" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { view: "compact" })}
            >
              {isItalian ? "Compatta" : "Compact"}
            </Link>
            <Link
              className={`filter-pill ${currentView === "table" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { view: "table" })}
            >
              {isItalian ? "Tabella" : "Table"}
            </Link>
            <Link
              className={`filter-pill ${currentView === "detail" ? "filter-pill-active" : ""}`}
              href={buildRegistrationsHref(slug, query, { view: "detail" })}
            >
              {isItalian ? "Dettaglio" : "Detail"}
            </Link>
            {selectedOccurrence ? (
              <Link
                className={`filter-pill ${currentView === "event-day" ? "filter-pill-active" : ""}`}
                href={buildRegistrationsHref(slug, query, { view: "event-day" })}
              >
                {isItalian ? "Giornata evento" : "Event day"}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="admin-summary-grid">
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Registrazioni" : "Registrations"}</span>
          <strong>{summary.registrationCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Partecipanti" : "Participants"}</span>
          <strong>{summary.participantCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">
            {isItalian ? "Con restrizioni" : "With restrictions"}
          </span>
          <strong>{summary.restrictionsCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Da incassare" : "Still due"}</span>
          <strong>{formatCurrencyFromCents(summary.dueAtVenueCents)}</strong>
        </article>
      </section>

      {selectedEvent && occurrenceOptions.length ? (
        <section className="panel section-card admin-section">
          <div className="admin-filter-strip">
            <span className="admin-filter-label">
              {isItalian ? "Filtra per data" : "Filter by date"}
            </span>
            <div className="filter-row">
              <Link
                className={`filter-pill ${selectedOccurrence ? "" : "filter-pill-active"}`}
                href={buildRegistrationsHref(slug, query, {
                  event: selectedEvent,
                  occurrence: null
                })}
              >
                {isItalian ? "Tutte le date" : "All dates"}
              </Link>
              {occurrenceOptions.map((occurrence) => (
                <Link
                  className={`filter-pill ${
                    selectedOccurrence === occurrence.id ? "filter-pill-active" : ""
                  }`}
                  href={buildRegistrationsHref(slug, query, {
                    event: selectedEvent,
                    occurrence: occurrence.id
                  })}
                  key={occurrence.id}
                >
                  {occurrence.label}
                </Link>
              ))}
            </div>
          </div>

          {selectedOccurrenceRecord ? (
            <>
              <div className="admin-summary-grid">
                <article className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Data selezionata" : "Selected date"}</span>
                  <strong>{selectedOccurrenceRecord.label}</strong>
                </article>
                <article className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Orario" : "Time"}</span>
                  <strong>{selectedOccurrenceRecord.startsAtLabel}</strong>
                </article>
                <article className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Registrazioni filtrate" : "Filtered registrations"}</span>
                  <strong>{summary.registrationCount}</strong>
                </article>
                <article className="admin-summary-card">
                  <span className="metric-label">{isItalian ? "Partecipanti filtrati" : "Filtered participants"}</span>
                  <strong>{summary.participantCount}</strong>
                </article>
              </div>

              <div className="hero-actions">
                <a className="button button-secondary" href={buildRegistrationsHref(slug, query, { view: "event-day" })}>
                  {isItalian ? "Apri modalità evento" : "Open event-day mode"}
                </a>
                <a className="button button-secondary" href={`${exportBaseHref}&variant=operational`}>
                  {isItalian ? "Esporta PDF operativo" : "Export operational PDF"}
                </a>
                <a className="button button-primary" href={`${exportBaseHref}&variant=full`}>
                  {isItalian ? "Esporta PDF completo" : "Export full PDF"}
                </a>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {eventDayMode ? (
        <section className="panel section-card admin-section">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Modalità evento" : "Event-day mode"}</div>
              <h3>
                {selectedOccurrenceRecord
                  ? `${selectedOccurrenceRecord.eventTitle} · ${selectedOccurrenceRecord.label}`
                  : isItalian
                    ? "Seleziona una data per il check-in"
                    : "Select one date for check-in mode"}
              </h3>
            </div>
          </div>

          <p className="admin-page-tip">
            {isItalian
              ? "Questa vista serve durante l’evento: arrivi, saldo sul posto, check-in e chiusura rapida dei partecipanti."
              : "Use this mode during the live event: arrivals, venue balance, quick check-in, and fast attendee closure."}
          </p>

          <div className="admin-summary-grid">
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Arrivi aperti" : "Open arrivals"}</span>
              <strong>{eventDaySummary.openRegistrations}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Partecipanti check-in" : "Checked-in participants"}</span>
              <strong>{eventDaySummary.checkedInParticipants}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Follow-up pagamenti" : "Payment follow-ups"}</span>
              <strong>{eventDaySummary.paymentFollowUps}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Da incassare" : "Still due"}</span>
              <strong>{formatCurrencyFromCents(summary.dueAtVenueCents)}</strong>
            </article>
          </div>

          <div className="checkin-section">
            <div className="admin-section-header">
              <div>
                <div className="section-kicker">{isItalian ? "Coda arrivi" : "Arrival queue"}</div>
                <h3>{isItalian ? "Registrazioni da gestire ora" : "Registrations to handle now"}</h3>
              </div>
              <div className="pill-list">
                <span className="pill">
                  {eventDayOpenRegistrations.length} {isItalian ? "registrazioni" : "registrations"}
                </span>
              </div>
            </div>

            <div className="checkin-grid">
              {eventDayOpenRegistrations.map((registration) => (
                <article className="checkin-card" key={registration.id}>
                  <div className="checkin-card-head">
                    <div>
                      <div className="admin-badge-row">
                        <span className={`admin-badge admin-badge-${registration.status.toLowerCase()}`}>
                          {registration.status}
                        </span>
                        {registration.dietary.participantsWithRestrictions > 0 ? (
                          <span className="admin-badge admin-badge-capacity-watch">
                            {registration.dietary.participantsWithRestrictions}{" "}
                            {isItalian ? "restrizioni" : "restrictions"}
                          </span>
                        ) : null}
                      </div>
                      <h4>
                        {registration.registrationCode} · {registration.attendeeName}
                      </h4>
                      <p>
                        {registration.ticketLabel} · {getParticipantCount(registration)}{" "}
                        {isItalian ? "partecipanti" : "participants"}
                      </p>
                    </div>
                    <div className="registration-ticket-price">
                      <strong>{registration.dueAtEventOpenLabel}</strong>
                      <span>{isItalian ? "da incassare" : "still due"}</span>
                    </div>
                  </div>

                  <div className="ops-inline-list">
                    <span>{registration.attendeeEmail}</span>
                    <span>{registration.attendeePhone}</span>
                    <span>{registration.onlineCollectedLabel}</span>
                    <span>{registration.venueCollectedLabel}</span>
                  </div>

                  <div className="admin-note-list">
                    <div className="admin-note-item">
                      <span className="spotlight-label">{isItalian ? "Partecipanti" : "Attendees"}</span>
                      <strong>
                        {registration.attendees
                          .map((attendee, index) =>
                            attendee.fullName ||
                            `${isItalian ? "Partecipante" : "Participant"} ${index + 1}`
                          )
                          .join(", ")}
                      </strong>
                    </div>
                    <div className="admin-note-item">
                      <span className="spotlight-label">{isItalian ? "Restrizioni" : "Restrictions"}</span>
                      <strong>
                        {registration.dietary.breakdown.length
                          ? registration.dietary.breakdown
                              .map((item) => `${item.label} (${item.count})`)
                              .join(", ")
                          : isItalian
                            ? "Nessuna"
                            : "None"}
                      </strong>
                    </div>
                  </div>

                  {registration.dietary.customNotes.length ? (
                    <div className="admin-note-list">
                      {registration.dietary.customNotes.map((note, index) => (
                        <div className="admin-note-item" key={`${registration.id}-event-day-${index}`}>
                          <span className="spotlight-label">
                            {note.attendeeName || (isItalian ? "Nota custom" : "Custom note")}
                          </span>
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
                          <span>{isItalian ? "Incasso sul posto" : "Venue payment"}</span>
                          <input
                            inputMode="decimal"
                            name="amountEuros"
                            placeholder={(registration.dueAtEventOpenCents / 100).toFixed(2)}
                            step="0.01"
                            type="number"
                          />
                        </label>
                        <button className="button button-primary" type="submit">
                          {isItalian ? "Registra" : "Record"}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  <div className="hero-actions">
                    {registration.actions.map((action) => (
                      <form action={updateOrganizerRegistrationAction} key={action}>
                        <input name="eventFilter" type="hidden" value={selectedEvent} />
                        <input name="occurrenceFilter" type="hidden" value={selectedOccurrence} />
                        <input name="slug" type="hidden" value={slug} />
                        <input name="registrationId" type="hidden" value={registration.id} />
                        <input name="action" type="hidden" value={action} />
                        <button className="button button-secondary" type="submit">
                          {formatRegistrationActionLabel(action, isItalian)}
                        </button>
                      </form>
                    ))}
                  </div>
                </article>
              ))}

              {eventDayOpenRegistrations.length === 0 ? (
                <article className="checkin-card">
                  <h4>{isItalian ? "Nessun arrivo aperto" : "No open arrivals"}</h4>
                  <p>
                    {isItalian
                      ? "Le registrazioni ancora da gestire compariranno qui."
                      : "Registrations that still need live handling will appear here."}
                  </p>
                </article>
              ) : null}
            </div>
          </div>

          <div className="checkin-section">
            <div className="admin-section-header">
              <div>
                <div className="section-kicker">{isItalian ? "Chiuse" : "Closed out"}</div>
                <h3>{isItalian ? "Registrazioni già chiuse" : "Registrations already closed"}</h3>
              </div>
            </div>

            <div className="checkin-grid checkin-grid-compact">
              {eventDayClosedRegistrations.map((registration) => (
                <article className="checkin-card checkin-card-compact" key={registration.id}>
                  <div className="checkin-card-head">
                    <div>
                      <div className="admin-badge-row">
                        <span className={`admin-badge admin-badge-${registration.status.toLowerCase()}`}>
                          {registration.status}
                        </span>
                      </div>
                      <h4>
                        {registration.registrationCode} · {registration.attendeeName}
                      </h4>
                    </div>
                    <div className="ops-inline-list">
                      <span>{registration.ticketLabel}</span>
                      <span>{registration.quantityLabel}</span>
                    </div>
                  </div>
                </article>
              ))}

              {eventDayClosedRegistrations.length === 0 ? (
                <article className="checkin-card checkin-card-compact">
                  <h4>{isItalian ? "Nessuna chiusura ancora" : "Nothing closed yet"}</h4>
                  <p>
                    {isItalian
                      ? "Attended, no-show e cancellazioni compariranno qui."
                      : "Attended, no-show, and cancelled registrations will surface here."}
                  </p>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      ) : currentView === "detail" ? (
        <section className="panel section-card admin-section">
          <div className="admin-workspace-grid">
            <aside className="admin-list-panel">
              {registrations.map((registration) => (
                <Link
                  className={`admin-list-item${
                    selectedDetailRegistration?.id === registration.id ? " admin-list-item-active" : ""
                  }`}
                  href={buildRegistrationsHref(slug, query, { detail: registration.id })}
                  key={registration.id}
                >
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${registration.status.toLowerCase()}`}>
                      {registration.status}
                    </span>
                    {registration.dietary.participantsWithRestrictions > 0 ? (
                      <span className="admin-badge admin-badge-capacity-watch">
                        {registration.dietary.participantsWithRestrictions}{" "}
                        {isItalian ? "restrizioni" : "restrictions"}
                      </span>
                    ) : null}
                  </div>
                  <strong className="admin-list-item-title">
                    {registration.registrationCode} · {registration.attendeeName}
                  </strong>
                  <p>
                    {registration.eventTitle} · {registration.occurrenceLabel}
                  </p>
                  <div className="admin-list-item-meta">
                    <span>{registration.ticketLabel}</span>
                    <span>{registration.dueAtEventOpenLabel}</span>
                    <span>
                      {getParticipantCount(registration)} {isItalian ? "pax" : "pax"}
                    </span>
                  </div>
                </Link>
              ))}

              {registrations.length === 0 ? (
                <article className="admin-list-item">
                  <strong className="admin-list-item-title">
                    {isItalian
                      ? "Nessuna registrazione corrisponde a questo filtro."
                      : "No registrations match this filter."}
                  </strong>
                  <p>
                    {isItalian
                      ? "Scegli un altro evento o rimuovi il filtro per vedere l'intera coda."
                      : "Choose another event or clear the filter to see the full queue."}
                  </p>
                </article>
              ) : null}
            </aside>

            <div className="admin-detail-stack">
              {selectedDetailRegistration ? (
                <RegistrationDetailPanel
                  isItalian={isItalian}
                  registration={selectedDetailRegistration}
                  selectedEvent={selectedEvent}
                  selectedOccurrence={selectedOccurrence}
                  slug={slug}
                />
              ) : (
                <article className="panel section-card admin-section admin-side-editor">
                  <h3>{isItalian ? "Nessuna registrazione selezionata" : "No registration selected"}</h3>
                  <p className="admin-page-lead">
                    {isItalian
                      ? "Scegli una registrazione dalla colonna sinistra per vedere il dettaglio completo."
                      : "Choose one registration from the left column to inspect the full detail."}
                  </p>
                </article>
              )}
            </div>
          </div>
        </section>
      ) : currentView === "table" ? (
        <section className="panel section-card admin-section">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Vista tabellare" : "Table view"}</div>
              <h3>{isItalian ? "Coda partecipanti più densa" : "Denser participant queue"}</h3>
            </div>
          </div>

          {registrations.length > 0 ? (
            <div className="registration-table-wrap">
              <table className="registration-table">
                <thead>
                  <tr>
                    <th>{isItalian ? "Registrazione" : "Registration"}</th>
                    <th>{isItalian ? "Evento" : "Event"}</th>
                    <th>{isItalian ? "Stato" : "Status"}</th>
                    <th>{isItalian ? "Ticket" : "Ticket"}</th>
                    <th>{isItalian ? "Partecipanti" : "Participants"}</th>
                    <th>{isItalian ? "Online" : "Online"}</th>
                    <th>{isItalian ? "Da incassare" : "Still due"}</th>
                    <th>{isItalian ? "Restrizioni" : "Restrictions"}</th>
                    <th>{isItalian ? "Azione" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr
                      className={`registration-table-row${
                        registration.dietary.participantsWithRestrictions > 0
                          ? " registration-table-row-attention"
                          : ""
                      }${registration.dueAtEventOpenCents > 0 ? " registration-table-row-payment" : ""}`}
                      key={registration.id}
                    >
                      <td>
                        <div className="registration-table-primary">
                          <strong>{registration.registrationCode}</strong>
                          <span>{registration.attendeeName}</span>
                          <small>{registration.attendeeEmail}</small>
                        </div>
                      </td>
                      <td>
                        <div className="registration-table-primary">
                          <strong>{registration.eventTitle}</strong>
                          <span>{registration.occurrenceLabel}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge-${registration.status.toLowerCase()}`}>
                          {registration.status}
                        </span>
                      </td>
                      <td>{registration.ticketLabel}</td>
                      <td>{getParticipantCount(registration)}</td>
                      <td>{registration.onlineCollectedLabel}</td>
                      <td>{registration.dueAtEventOpenLabel}</td>
                      <td>
                        {registration.dietary.participantsWithRestrictions > 0
                          ? `${registration.dietary.participantsWithRestrictions} ${
                              isItalian ? "con restrizioni" : "with restrictions"
                            }`
                          : isItalian
                            ? "Nessuna"
                            : "None"}
                      </td>
                      <td>
                        <Link
                          className="button button-secondary button-small"
                          href={buildRegistrationsHref(slug, query, {
                            view: "detail",
                            detail: registration.id
                          })}
                        >
                          {isItalian ? "Apri" : "Open"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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
          )}
        </section>
      ) : (
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

              <div className="ops-inline-list">
                <span>{registration.attendeeEmail}</span>
                <span>{registration.attendeePhone}</span>
                <span>
                  {registration.dietary.participantsWithRestrictions > 0
                    ? isItalian
                      ? `${registration.dietary.participantsWithRestrictions} con restrizioni`
                      : `${registration.dietary.participantsWithRestrictions} with restrictions`
                    : isItalian
                      ? "Nessuna restrizione"
                      : "No restrictions"}
                </span>
                <span>{registration.createdAtLabel}</span>
              </div>

              <div className="hero-actions">
                <Link
                  className="button button-secondary"
                  href={buildRegistrationsHref(slug, query, {
                    view: "detail",
                    detail: registration.id
                  })}
                >
                  {isItalian ? "Apri dettaglio" : "Open detail"}
                </Link>
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
      )}
    </div>
  );
}
