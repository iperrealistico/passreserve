import Link from "next/link";

import { getOrganizerOccurrencesAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { saveOrganizerOccurrenceAction } from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

function formatDateTimeLocal(value, timeZone) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function formatEurosInput(cents) {
  if (typeof cents !== "number") {
    return "";
  }

  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
}

export default async function OrganizerOccurrencesPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const data = await getOrganizerOccurrencesAdmin(slug);
  const selectedEventFilter = typeof query.event === "string" ? query.event : "";
  const editId = typeof query.edit === "string" ? query.edit : "";
  const selectedOccurrence = editId
    ? data.occurrences.find((occurrence) => occurrence.id === editId) ?? null
    : null;
  const selectedEvent = selectedOccurrence?.eventSlug || selectedEventFilter;
  const activeEvent =
    data.events.find((event) => event.id === selectedOccurrence?.eventTypeId) ||
    data.events.find((event) => event.slug === selectedEvent) ||
    data.events[0] ||
    null;
  const occurrences = selectedEvent
    ? data.occurrences.filter((occurrence) => occurrence.eventSlug === selectedEvent)
    : data.occurrences;
  const defaultEventTypeId = selectedOccurrence?.eventTypeId || activeEvent?.id || "";
  const isEditing = Boolean(selectedOccurrence);

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {isItalian ? "Data salvata." : "Date saved successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/occurrences`}
        description={
          isItalian
            ? "Ogni data è un'istanza reale prenotabile di un evento. Qui gestisci orari, capienza, prezzo e override della finestra di vendita."
            : "Each date is a real bookable session under an event. Use this area for timing, capacity, price, and sales-window overrides."
        }
        eyebrow={isItalian ? "Date" : "Dates"}
        events={data.events}
        query={query}
        selectedEvent={selectedEvent}
        tip={
          isItalian
            ? "Se una data ha esigenze particolari, puoi sovrascrivere la finestra di vendita dell'evento e bloccare la registrazione con precisione."
            : "If one date has special needs, override the event sales window here and block registration precisely when needed."
        }
        title={
          selectedEvent
            ? isItalian
              ? "Gestisci le date di un singolo evento"
              : "Manage dates for one event"
            : isItalian
              ? "Gestisci tutte le date programmate"
              : "Manage all scheduled dates"
        }
      />

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Planner date" : "Date planner"}</div>
            <h3>
              {selectedEvent
                ? isItalian
                  ? "Date correnti per questo evento"
                  : "Current dates for this event"
                : isItalian
                  ? "Date correnti"
                  : "Current dates"}
            </h3>
          </div>
          <div className="pill-list">
            <span className="pill">
              {occurrences.length} {isItalian ? "date" : "dates"}
            </span>
          </div>
        </div>

        {!data.billing.enabled ? (
          <p className="admin-page-tip">
            {isItalian
              ? "Puoi pubblicare date gratuite o pay-at-event. Le date con pagamento online restano bloccate finché il billing non è pronto."
              : "You can publish free or pay-at-event dates now. Dates using online payments stay blocked until billing is ready."}
          </p>
        ) : null}

        <div className="admin-card-grid">
          {occurrences.map((occurrence) => (
            <article
              className={`admin-card${selectedOccurrence?.id === occurrence.id ? " admin-card-active" : ""}`}
              key={occurrence.id}
            >
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${occurrence.status.toLowerCase()}`}>
                      {occurrence.status}
                    </span>
                    <span className={`admin-badge admin-badge-${occurrence.published ? "public" : "draft"}`}>
                      {occurrence.published
                        ? isItalian
                          ? "Pubblicata"
                          : "Published"
                        : isItalian
                          ? "Solo draft"
                          : "Draft only"}
                    </span>
                  </div>
                  <h4>{occurrence.eventTitle}</h4>
                  <p>{occurrence.startsAtLabel}</p>
                </div>
              </div>

              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">{isItalian ? "Fine" : "Ends"}</span>
                  <strong>{occurrence.endsAtLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Posti rimasti" : "Seats left"}</span>
                  <strong>{occurrence.capacitySummary.remaining}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Capienza" : "Capacity"}</span>
                  <strong>{occurrence.capacity}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Prezzo" : "Price"}</span>
                  <strong>{formatEurosInput(occurrence.priceCents)} EUR</strong>
                </div>
              </div>

              <div className="admin-note-list">
                <div className="admin-note-item">
                  <span className="spotlight-label">{isItalian ? "Incasso" : "Collection"}</span>
                  <strong>
                    {occurrence.usesOnlinePayments
                      ? `${occurrence.prepayPercentage}% ${
                          isItalian ? "raccolto online" : "collected online"
                        }`
                      : isItalian
                        ? "Pagamento sul posto"
                        : "Pay at the event"}
                  </strong>
                </div>
                <div className="admin-note-item">
                  <span className="spotlight-label">{isItalian ? "Vendita da" : "Sales window start"}</span>
                  <strong>{occurrence.salesWindowStartsAtLabel}</strong>
                </div>
                <div className="admin-note-item">
                  <span className="spotlight-label">{isItalian ? "Vendita fino a" : "Sales window end"}</span>
                  <strong>{occurrence.salesWindowEndsAtLabel}</strong>
                </div>
              </div>

              <div className="hero-actions">
                <Link
                  className="button button-primary"
                  href={`/${slug}/admin/occurrences?event=${encodeURIComponent(occurrence.eventSlug)}&edit=${encodeURIComponent(occurrence.id)}#date-form`}
                >
                  {isItalian ? "Modifica data" : "Edit date"}
                </Link>
              </div>
            </article>
          ))}

          {occurrences.length === 0 ? (
            <div className="timeline-step">
              <strong>
                {isItalian
                  ? "Nessuna data corrisponde ancora a questo filtro."
                  : "No dates match this event filter yet."}
              </strong>
              <span>
                {isItalian
                  ? "Scegli un altro evento o rimuovi il filtro per vedere tutte le date."
                  : "Choose another event or clear the filter to review every scheduled date."}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel section-card admin-section" id="date-form">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">
              {isEditing
                ? isItalian
                  ? "Modifica data"
                  : "Edit date"
                : isItalian
                  ? "Nuova data"
                  : "Create date"}
            </div>
            <h3>
              {isEditing
                ? `${selectedOccurrence.eventTitle}`
                : isItalian
                  ? "Crea una nuova data"
                  : "Create a new date"}
            </h3>
          </div>
          {isEditing ? (
            <Link
              className="button button-secondary"
              href={
                selectedEvent
                  ? `/${slug}/admin/occurrences?event=${encodeURIComponent(selectedEvent)}#date-form`
                  : `/${slug}/admin/occurrences#date-form`
              }
            >
              {isItalian ? "Nuova data" : "Create new date"}
            </Link>
          ) : null}
        </div>

        <p className="admin-page-tip">
          {isItalian
            ? `Gli orari seguono ${data.organizer.timeZone}. Lascia vuota la finestra di vendita se vuoi usare quella di default dell'evento.`
            : `Times follow ${data.organizer.timeZone}. Leave the sales window blank if you want to inherit the event default.`}
        </p>

        <form action={saveOrganizerOccurrenceAction} className="registration-field-grid">
          <input name="eventFilter" type="hidden" value={selectedEvent} />
          <input name="slug" type="hidden" value={slug} />
          <input name="id" type="hidden" value={selectedOccurrence?.id || ""} />
          <label className="field">
            <span>{isItalian ? "Evento" : "Event"}</span>
            <select defaultValue={defaultEventTypeId} name="eventTypeId">
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{isItalian ? "Stato" : "Status"}</span>
            <select defaultValue={selectedOccurrence?.status || "SCHEDULED"} name="status">
              <option value="SCHEDULED">{isItalian ? "Programmato" : "Scheduled"}</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">{isItalian ? "Cancellato" : "Cancelled"}</option>
              <option value="COMPLETED">{isItalian ? "Completato" : "Completed"}</option>
            </select>
          </label>
          <label className="field">
            <span>{isItalian ? "Inizio" : "Starts"}</span>
            <input
              defaultValue={formatDateTimeLocal(selectedOccurrence?.startsAt, data.organizer.timeZone)}
              name="startsAt"
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Fine" : "Ends"}</span>
            <input
              defaultValue={formatDateTimeLocal(selectedOccurrence?.endsAt, data.organizer.timeZone)}
              name="endsAt"
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Capienza" : "Capacity"}</span>
            <input
              defaultValue={selectedOccurrence?.capacity ?? 12}
              min="1"
              name="capacity"
              type="number"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Prezzo (EUR)" : "Price (EUR)"}</span>
            <input
              defaultValue={formatEurosInput(selectedOccurrence?.priceCents ?? activeEvent?.basePriceCents)}
              min="0"
              name="priceEuros"
              step="0.01"
              type="number"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Percentuale prepagata" : "Prepay percentage"}</span>
            <input
              defaultValue={
                selectedOccurrence?.prepayPercentage ?? activeEvent?.prepayPercentage ?? 0
              }
              max="100"
              min="0"
              name="prepayPercentage"
              type="number"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Venue title" : "Venue title"}</span>
            <input
              defaultValue={selectedOccurrence?.venueTitle || activeEvent?.venueTitle || ""}
              name="venueTitle"
              type="text"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Pubblicazione" : "Published"}</span>
            <select
              defaultValue={selectedOccurrence ? String(Boolean(selectedOccurrence.published)) : "false"}
              name="published"
            >
              <option value="false">{isItalian ? "Solo draft" : "Draft only"}</option>
              <option value="true">{isItalian ? "Pubblicata" : "Published"}</option>
            </select>
          </label>
          <label className="field">
            <span>{isItalian ? "Vendita da" : "Sales open from"}</span>
            <input
              defaultValue={formatDateTimeLocal(selectedOccurrence?.salesWindowStartsAt, data.organizer.timeZone)}
              name="salesWindowStartsAt"
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>{isItalian ? "Vendita fino a" : "Sales close at"}</span>
            <input
              defaultValue={formatDateTimeLocal(selectedOccurrence?.salesWindowEndsAt, data.organizer.timeZone)}
              name="salesWindowEndsAt"
              type="datetime-local"
            />
          </label>
          <label className="field field-span">
            <span>{isItalian ? "Nota" : "Note"}</span>
            <textarea defaultValue={selectedOccurrence?.note || ""} name="note" rows="2" />
          </label>
          <label className="field field-span">
            <span>{isItalian ? "Image URL" : "Image URL"}</span>
            <input defaultValue={selectedOccurrence?.imageUrl || ""} name="imageUrl" type="url" />
          </label>
          <div className="field field-span">
            <span className="metric-label">{isItalian ? "Regola override" : "Override rule"}</span>
            <strong>
              {isItalian
                ? "Se imposti questi campi, questa data sovrascrive la finestra vendita di default dell'evento."
                : "If these fields are set, this date overrides the event's default sales window."}
            </strong>
          </div>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              {isEditing
                ? isItalian
                  ? "Salva modifiche"
                  : "Save changes"
                : isItalian
                  ? "Crea data"
                  : "Create date"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
