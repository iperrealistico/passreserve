import Link from "next/link";

import { getOrganizerEventsAdmin } from "../../../../lib/passreserve-admin-service.js";
import {
  getLocalizedFormList,
  getLocalizedFormText
} from "../../../../lib/passreserve-content.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import {
  deleteOrganizerEventAction,
  saveOrganizerEventAction,
  suspendOrganizerEventAction
} from "../actions.js";
import { EventGalleryEditor } from "../event-gallery-editor.js";
import { TicketCatalogEditor } from "./ticket-catalog-editor.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

const allowedEventTabs = new Set(["overview", "basics", "tickets", "publish"]);

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

function localizedValue(record, field, locale) {
  return getLocalizedFormText(record, field, locale);
}

function localizedListValue(record, field, locale) {
  return getLocalizedFormList(record, field, locale);
}

function buildEventsHref(slug, query = {}, updates = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (["message", "error"].includes(key)) {
      continue;
    }

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
  return `/${slug}/admin/events${serialized ? `?${serialized}` : ""}`;
}

function EventFormSection({ id, title, description, defaultOpen, children }) {
  return (
    <details className="admin-disclosure" id={id} open={defaultOpen}>
      <summary className="admin-disclosure-summary">{title}</summary>
      <div className="admin-disclosure-body">
        {description ? <p className="admin-page-lead">{description}</p> : null}
        {children}
      </div>
    </details>
  );
}

function LocaleFormSection({ id, title, status, defaultOpen, children }) {
  return (
    <details className="admin-disclosure" id={id} open={defaultOpen}>
      <summary className="admin-disclosure-summary">
        <span>{title}</span>
        {status ? <span className="admin-disclosure-hint">{status}</span> : null}
      </summary>
      <div className="admin-disclosure-body">{children}</div>
    </details>
  );
}

function hasLocalizedContentStarted(record, locale) {
  if (!record) {
    return false;
  }

  return Boolean(
    localizedValue(record, "title", locale) ||
      localizedValue(record, "summary", locale) ||
      localizedValue(record, "description", locale) ||
      localizedValue(record, "audience", locale) ||
      localizedValue(record, "venueTitle", locale) ||
      localizedValue(record, "venueDetail", locale) ||
      localizedValue(record, "attendeeInstructions", locale) ||
      localizedValue(record, "cancellationPolicy", locale) ||
      localizedListValue(record, "highlights", locale) ||
      localizedListValue(record, "included", locale) ||
      localizedListValue(record, "policies", locale)
  );
}

export default async function OrganizerEventsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const data = await getOrganizerEventsAdmin(slug);
  const editId = typeof query.edit === "string" ? query.edit : "";
  const selectedEventSlug = typeof query.event === "string" ? query.event : "";
  const contentLocale =
    typeof query.lang === "string" && ["it", "en"].includes(query.lang)
      ? query.lang
      : isItalian
        ? "it"
        : "en";
  const activeTab =
    typeof query.tab === "string" && allowedEventTabs.has(query.tab) ? query.tab : "overview";
  const selectedEvent = editId ? data.events.find((event) => event.id === editId) ?? null : null;
  const focusedEvent =
    selectedEvent ||
    data.events.find((event) => event.slug === selectedEventSlug) ||
    data.events[0] ||
    null;
  const detailEditId = selectedEvent?.id === focusedEvent?.id ? selectedEvent.id : "";
  const isEditing = Boolean(selectedEvent);
  const selectedEventScheduleHref = focusedEvent
    ? `/${slug}/admin/calendar?event=${encodeURIComponent(focusedEvent.slug)}`
    : null;
  const selectedEventRegistrationsHref = focusedEvent
    ? `/${slug}/admin/registrations?event=${encodeURIComponent(focusedEvent.slug)}`
    : null;
  const focusedEventPublicHref = focusedEvent ? `/${slug}/events/${focusedEvent.slug}` : "";
  const italianCopyStarted = hasLocalizedContentStarted(selectedEvent, "it");
  const englishCopyStarted = hasLocalizedContentStarted(selectedEvent, "en");
  const initialGalleryItems =
    selectedEvent?.gallery?.length
      ? selectedEvent.gallery
      : selectedEvent?.imageUrl
        ? [
            {
              imageUrl: selectedEvent.imageUrl
            }
          ]
        : [];

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "status-updated"
            ? isItalian
              ? "Visibilità evento aggiornata."
              : "Event visibility updated successfully."
            : query.message === "deleted"
              ? isItalian
                ? "Evento eliminato."
                : "Event deleted successfully."
              : isItalian
                ? "Evento salvato."
                : "Event saved successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/events`}
        description={
          isItalian
            ? "Definisci ogni evento una volta sola: contenuti, ticket, visibilità e regole di vendita."
            : "Define each event once: content, tickets, visibility, and sales rules."
        }
        eyebrow={isItalian ? "Eventi" : "Events"}
        query={query}
        actions={
          <>
            <Link className="button button-secondary" href={`/${slug}/admin/calendar`}>
              {isItalian ? "Apri programma" : "Open schedule"}
            </Link>
            <Link
              className="button button-primary"
              data-organizer-tour="events-create-link"
              href={`/${slug}/admin/events#event-form`}
            >
              {isItalian ? "Nuovo evento" : "Create event"}
            </Link>
          </>
        }
        title={isItalian ? "Eventi e catalogo ticket" : "Events and ticket catalog"}
      />

      {data.events.length > 0 ? (
        <section className="panel section-card admin-section">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Workspace eventi" : "Event workspace"}</div>
              <h3>{isItalian ? "Seleziona un evento e lavoraci dentro" : "Select an event and work inside it"}</h3>
            </div>
            <div className="pill-list">
              <span className="pill">
                {data.events.length} {isItalian ? "eventi" : "events"}
              </span>
            </div>
          </div>

          <div className="admin-workspace-grid">
            <aside className="admin-list-panel">
              {data.events.map((event) => (
                <Link
                  className={`admin-list-item${focusedEvent?.id === event.id ? " admin-list-item-active" : ""}`}
                  href={buildEventsHref(slug, query, {
                    event: event.slug,
                    edit: null
                  })}
                  key={event.id}
                >
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${event.visibility.toLowerCase()}`}>
                      {event.visibility}
                    </span>
                  </div>
                  <strong className="admin-list-item-title">{event.title}</strong>
                  <p>{event.summary || (isItalian ? "Nessun summary ancora." : "No summary yet.")}</p>
                  <div className="admin-list-item-meta">
                    <span>{event.occurrenceCount} {isItalian ? "date" : "dates"}</span>
                    <span>{event.ticketCount || 0} {isItalian ? "ticket" : "tickets"}</span>
                    <span>{event.registrationCount} {isItalian ? "reg" : "regs"}</span>
                  </div>
                </Link>
              ))}
            </aside>

            {focusedEvent ? (
              <div className="admin-detail-stack">
                <section
                  className="admin-section admin-detail-panel"
                  data-organizer-tour="event-created-state"
                >
                  <div className="admin-section-header">
                    <div>
                      <div className="section-kicker">{isItalian ? "Evento selezionato" : "Selected event"}</div>
                      <h3>{focusedEvent.title}</h3>
                    </div>
                    <div className="hero-actions">
                      <Link className="button button-secondary" href={selectedEventScheduleHref}>
                        {isItalian ? "Apri programma" : "Open schedule"}
                      </Link>
                      <Link className="button button-secondary" href={selectedEventRegistrationsHref}>
                        {isItalian ? "Apri partecipanti" : "Open participants"}
                      </Link>
                      <Link
                        className="button button-primary"
                        href={`${buildEventsHref(slug, query, {
                          event: focusedEvent.slug,
                          edit: focusedEvent.id,
                          tab: activeTab
                        })}#event-form`}
                      >
                        {isItalian ? "Modifica evento" : "Edit event"}
                      </Link>
                    </div>
                  </div>

                  <div className="admin-filter-strip">
                    <span className="admin-filter-label">{isItalian ? "Area" : "Area"}</span>
                    <div className="filter-row">
                      {[
                        ["overview", isItalian ? "Overview" : "Overview"],
                        ["basics", isItalian ? "Contenuti" : "Basics"],
                        ["tickets", isItalian ? "Ticket" : "Tickets"],
                        ["publish", isItalian ? "Pubblicazione" : "Publish"]
                      ].map(([tabKey, label]) => (
                        <Link
                          className={`filter-pill ${activeTab === tabKey ? "filter-pill-active" : ""}`}
                          href={buildEventsHref(slug, query, {
                            event: focusedEvent.slug,
                            tab: tabKey,
                            edit: detailEditId
                          })}
                          key={tabKey}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {activeTab === "overview" ? (
                    <>
                      <div className="admin-summary-grid">
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Ticket attivi" : "Active tickets"}</span>
                          <strong>{focusedEvent.ticketCount || 0}</strong>
                        </div>
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Date" : "Dates"}</span>
                          <strong>{focusedEvent.occurrenceCount}</strong>
                        </div>
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Date pubbliche" : "Public dates"}</span>
                          <strong>{focusedEvent.publishedOccurrenceCount}</strong>
                        </div>
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Registrazioni" : "Registrations"}</span>
                          <strong>{focusedEvent.registrationCount}</strong>
                        </div>
                      </div>

                      <div className="admin-note-list">
                        <div className="admin-note-item">
                          <span className="spotlight-label">
                            {isItalian ? "Finestra vendita da" : "Sales window start"}
                          </span>
                          <strong>{focusedEvent.salesWindowStartsAtLabel}</strong>
                        </div>
                        <div className="admin-note-item">
                          <span className="spotlight-label">
                            {isItalian ? "Finestra vendita fino a" : "Sales window end"}
                          </span>
                          <strong>{focusedEvent.salesWindowEndsAtLabel}</strong>
                        </div>
                      </div>

                      <div className="ops-link-row">
                        <Link href={`/${slug}/admin/calendar?event=${encodeURIComponent(focusedEvent.slug)}`}>
                          {isItalian ? "Programma" : "Schedule"}
                        </Link>
                        <Link href={`/${slug}/admin/registrations?event=${encodeURIComponent(focusedEvent.slug)}`}>
                          {isItalian ? "Partecipanti" : "Participants"}
                        </Link>
                        {focusedEventPublicHref ? (
                          <Link href={focusedEventPublicHref}>
                            {isItalian ? "Pagina pubblica" : "Public page"}
                          </Link>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {activeTab === "basics" ? (
                    <>
                      <div className="admin-note-list">
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Summary" : "Summary"}</span>
                          <strong>{focusedEvent.summary || (isItalian ? "Da completare" : "To be completed")}</strong>
                          <p>{focusedEvent.description || (isItalian ? "Nessuna descrizione ancora." : "No description yet.")}</p>
                        </div>
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Categoria e durata" : "Category and duration"}</span>
                          <strong>{focusedEvent.category || (isItalian ? "Nessuna categoria" : "No category yet")}</strong>
                          <p>
                            {focusedEvent.durationMinutes
                              ? `${focusedEvent.durationMinutes} ${isItalian ? "minuti" : "minutes"}`
                              : isItalian
                                ? "Durata non definita."
                                : "Duration not defined yet."}
                          </p>
                        </div>
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Venue" : "Venue"}</span>
                          <strong>{focusedEvent.venueTitle || (isItalian ? "Venue da definire" : "Venue not set yet")}</strong>
                          <p>{focusedEvent.venueDetail || (isItalian ? "Nessun dettaglio venue ancora." : "No venue detail yet.")}</p>
                        </div>
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Questionario alimentare" : "Dietary questionnaire"}</span>
                          <strong>
                            {focusedEvent.collectDietaryInfo
                              ? isItalian
                                ? "Attivo"
                                : "Enabled"
                              : isItalian
                                ? "Disattivato"
                                : "Disabled"}
                          </strong>
                          <p>
                            {focusedEvent.collectDietaryInfo
                              ? isItalian
                                ? "Le registrazioni raccolgono allergie, intolleranze e note alimentari."
                                : "Registrations currently collect allergies, intolerances, and dietary notes."
                              : isItalian
                                ? "Le registrazioni raccolgono solo i dati base dei partecipanti."
                                : "Registrations currently collect only the core participant details."}
                          </p>
                        </div>
                      </div>

                      <p className="admin-page-tip">
                        {isItalian
                          ? "Usa il form sotto per aggiornare slug, copy bilingua, venue e regole base."
                          : "Use the form below to update slug, bilingual copy, venue, and baseline rules."}
                      </p>
                    </>
                  ) : null}

                  {activeTab === "tickets" ? (
                    <>
                      <div className="admin-card-grid">
                        {focusedEvent.ticketCategories.length > 0 ? (
                          focusedEvent.ticketCategories.map((ticket) => (
                            <article className="admin-card" key={ticket.id}>
                              <div className="admin-card-head">
                                <div>
                                  <div className="admin-badge-row">
                                    <span className={`admin-badge admin-badge-${ticket.isActive === false ? "draft" : "public"}`}>
                                      {ticket.isActive === false
                                        ? isItalian
                                          ? "Non attivo"
                                          : "Inactive"
                                        : isItalian
                                          ? "Attivo"
                                          : "Active"}
                                    </span>
                                    {ticket.isDefault ? (
                                      <span className="admin-badge admin-badge-public">
                                        {isItalian ? "Default" : "Default"}
                                      </span>
                                    ) : null}
                                  </div>
                                  <h4>{ticket.label}</h4>
                                  <p>{ticket.summary || (isItalian ? "Nessun summary ticket." : "No ticket summary yet.")}</p>
                                </div>
                              </div>
                              <div className="admin-card-metrics">
                                <div>
                                  <span className="metric-label">{isItalian ? "Prezzo" : "Price"}</span>
                                  <strong>{ticket.unitPriceLabel}</strong>
                                </div>
                                <div>
                                  <span className="metric-label">{isItalian ? "Inclusioni" : "Included items"}</span>
                                  <strong>{ticket.includedList.length}</strong>
                                </div>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="timeline-step">
                            <strong>{isItalian ? "Nessun ticket ancora" : "No tickets yet"}</strong>
                            <span>
                              {isItalian
                                ? "Crea il primo ticket nel form qui sotto."
                                : "Create the first ticket in the form below."}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="admin-page-tip">
                        {isItalian
                          ? "Il catalogo ticket resta nel form sotto, ma qui puoi leggere velocemente cosa è attivo e con che prezzo."
                          : "The ticket catalog stays in the form below, but this area now gives you a quick read of what is live and at what price."}
                      </p>
                    </>
                  ) : null}

                  {activeTab === "publish" ? (
                    <>
                      <div className="admin-summary-grid">
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Visibilità" : "Visibility"}</span>
                          <strong>{focusedEvent.visibility}</strong>
                        </div>
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Pagina pubblica" : "Public page"}</span>
                          <strong>{focusedEventPublicHref ? (isItalian ? "Disponibile" : "Available") : "—"}</strong>
                        </div>
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Date pubbliche" : "Public dates"}</span>
                          <strong>{focusedEvent.publishedOccurrenceCount}</strong>
                        </div>
                        <div className="admin-summary-card">
                          <span className="metric-label">{isItalian ? "Registrazioni" : "Registrations"}</span>
                          <strong>{focusedEvent.registrationCount}</strong>
                        </div>
                      </div>

                      <div className="admin-note-list">
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Mappa" : "Map"}</span>
                          <strong>{focusedEvent.mapHref || (isItalian ? "Nessuna mappa ancora." : "No map set yet.")}</strong>
                        </div>
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Gallery reale" : "Real gallery"}</span>
                          <strong>
                            {focusedEvent.gallery?.length || 0} {isItalian ? "asset" : "assets"}
                          </strong>
                        </div>
                        <div className="admin-note-item">
                          <span className="spotlight-label">{isItalian ? "Note organizer" : "Organizer notes"}</span>
                          <strong>
                            {focusedEvent.organizerNotes || (isItalian ? "Nessuna nota interna ancora." : "No internal notes yet.")}
                          </strong>
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div className="hero-actions">
                    <form action={suspendOrganizerEventAction}>
                      <input name="slug" type="hidden" value={slug} />
                      <input name="eventId" type="hidden" value={focusedEvent.id} />
                      <button className="button button-secondary" type="submit">
                        {focusedEvent.visibility === "ARCHIVED"
                          ? isItalian
                            ? "Ripristina come draft"
                            : "Restore as draft"
                          : isItalian
                            ? "Sospendi evento"
                            : "Suspend event"}
                      </button>
                    </form>
                    <form action={deleteOrganizerEventAction}>
                      <input name="slug" type="hidden" value={slug} />
                      <input name="eventId" type="hidden" value={focusedEvent.id} />
                      <button
                        className="button button-secondary button-danger"
                        disabled={focusedEvent.registrationCount > 0}
                        type="submit"
                      >
                        {isItalian ? "Elimina" : "Delete"}
                      </button>
                    </form>
                  </div>

                  {focusedEvent.registrationCount > 0 ? (
                    <p className="admin-page-tip">
                      {isItalian
                        ? "Questo evento ha già registrazioni: puoi sospenderlo, ma non eliminarlo."
                        : "This event already has registrations, so it can be suspended but not deleted."}
                    </p>
                  ) : null}
                </section>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel section-card admin-section" id="event-form">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">
              {isEditing
                ? isItalian
                  ? "Modifica evento"
                  : "Edit event"
                : isItalian
                  ? "Nuovo evento"
                  : "Create event"}
            </div>
            <h3>
              {isEditing
                ? selectedEvent.title
                : isItalian
                  ? "Crea una nuova pagina evento"
                  : "Create a new event page"}
            </h3>
          </div>
          {isEditing ? (
            <Link className="button button-secondary" href={`/${slug}/admin/events#event-form`}>
              {isItalian ? "Nuovo evento" : "Create new event"}
            </Link>
          ) : null}
        </div>

        <p className="admin-page-tip">
          {isItalian
            ? "Imposta prezzo base, dettagli pubblici e finestra di vendita di default. Le singole date potranno sovrascrivere la finestra quando serve."
            : "Set the base price, public details, and the default sales window here. Then move to Schedule for the real bookable dates under this event."}
        </p>

        <form
          action={saveOrganizerEventAction}
          className="admin-page"
          data-organizer-tour="event-edit-form"
        >
          <input name="slug" type="hidden" value={slug} />
          <input name="id" type="hidden" value={selectedEvent?.id || ""} />
          <div className="filter-row">
            <a className="filter-pill" href="#event-core">
              {isItalian ? "Core" : "Core"}
            </a>
            <a className="filter-pill" href="#event-tickets">
              {isItalian ? "Ticket" : "Tickets"}
            </a>
            <a className="filter-pill" href="#event-copy">
              {isItalian ? "Contenuti" : "Copy"}
            </a>
            <a className="filter-pill" href="#event-publish">
              {isItalian ? "Pubblicazione" : "Publish"}
            </a>
          </div>

          <EventFormSection
            defaultOpen={!isEditing || activeTab === "overview" || activeTab === "basics"}
            description={
              isItalian
                ? "Slug, visibilità, pricing di base e regole vendita. Questa è la configurazione minima dell’evento."
                : "Slug, visibility, baseline pricing, and sales rules. This is the minimum event setup."
            }
            id="event-core"
            title={isItalian ? "Core setup" : "Core setup"}
          >
            <div className="registration-field-grid">
              <label className="field">
                <span>{isItalian ? "Slug evento" : "Event slug"}</span>
                <input defaultValue={selectedEvent?.slug || ""} name="eventSlug" type="text" />
              </label>
              <label className="field">
                <span>{isItalian ? "Categoria" : "Category"}</span>
                <input defaultValue={selectedEvent?.category || ""} name="category" type="text" />
              </label>
              <label className="field">
                <span>{isItalian ? "Visibilità" : "Visibility"}</span>
                <select defaultValue={selectedEvent?.visibility || "DRAFT"} name="visibility">
                  <option value="DRAFT">{isItalian ? "Draft" : "Draft"}</option>
                  <option value="PUBLIC">{isItalian ? "Pubblico" : "Public"}</option>
                  <option value="UNLISTED">{isItalian ? "Non in elenco" : "Unlisted"}</option>
                  <option value="ARCHIVED">{isItalian ? "Archiviato" : "Archived"}</option>
                </select>
              </label>
              <label className="field">
                <span>{isItalian ? "Prezzo di partenza" : "Starting price"}</span>
                <input
                  defaultValue={
                    selectedEvent?.basePriceLabel ||
                    (isItalian ? "Derivato dai ticket" : "Derived from ticket catalog")
                  }
                  disabled
                  readOnly
                  type="text"
                />
              </label>
              <label className="field">
                <span>{isItalian ? "Percentuale prepagata" : "Prepay percentage"}</span>
                <input
                  defaultValue={selectedEvent?.prepayPercentage ?? ""}
                  name="prepayPercentage"
                  type="number"
                />
              </label>
              <label className="field">
                <span>{isItalian ? "Durata in minuti" : "Duration minutes"}</span>
                <input
                  defaultValue={selectedEvent?.durationMinutes ?? ""}
                  name="durationMinutes"
                  type="number"
                />
              </label>
              <label className="field">
                <span>{isItalian ? "Vendita da" : "Sales open from"}</span>
                <input
                  defaultValue={formatDateTimeLocal(selectedEvent?.salesWindowStartsAt, data.organizer.timeZone)}
                  name="salesWindowStartsAt"
                  type="datetime-local"
                />
              </label>
              <label className="field">
                <span>{isItalian ? "Vendita fino a" : "Sales close at"}</span>
                <input
                  defaultValue={formatDateTimeLocal(selectedEvent?.salesWindowEndsAt, data.organizer.timeZone)}
                  name="salesWindowEndsAt"
                  type="datetime-local"
                />
              </label>
              <div className="field field-span checkbox-field">
                <span>{isItalian ? "Questionario alimentare" : "Dietary questionnaire"}</span>
                <label className="checkbox-row">
                  <input
                    defaultChecked={selectedEvent?.collectDietaryInfo !== false}
                    name="collectDietaryInfo"
                    type="checkbox"
                  />
                  <div className="checkbox-copy">
                    <strong>
                      {isItalian
                        ? "Raccogli allergie, intolleranze e note alimentari per questo evento."
                        : "Collect allergies, intolerances, and food notes for this event."}
                    </strong>
                    <span>
                      {isItalian
                        ? "Se lo disattivi, nel frontend verranno richiesti solo i dati base dei partecipanti."
                        : "If you turn it off, the frontend will only ask for the core participant details."}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </EventFormSection>

          <EventFormSection
            defaultOpen={!isEditing || activeTab === "tickets"}
            description={
              isItalian
                ? "Definisci il mix di biglietti disponibili per questo evento."
                : "Define the mix of tickets available for this event."
            }
            id="event-tickets"
            title={isItalian ? "Ticket catalog" : "Ticket catalog"}
          >
            <TicketCatalogEditor
              defaultPriceCents={selectedEvent?.basePriceCents ?? 0}
              initialTickets={selectedEvent?.ticketCategories || []}
              isItalian={isItalian}
            />
          </EventFormSection>

          <EventFormSection
            defaultOpen={!isEditing || activeTab === "basics"}
            description={
              isItalian
                ? "Compila solo le lingue che vuoi davvero pubblicare. Se una manca, il frontend usa quella disponibile."
                : "Fill only the languages you actually want to publish. If one is missing, the frontend uses the available one."
            }
            id="event-copy"
            title={isItalian ? "Bilingual content" : "Bilingual content"}
          >
            <div className="admin-filter-strip">
              <span className="admin-filter-label">
                {isItalian ? "Lingua in modifica" : "Editing language"}
              </span>
              <div className="filter-row">
                <Link
                  className={`filter-pill ${contentLocale === "it" ? "filter-pill-active" : ""}`}
                  href={`${buildEventsHref(slug, query, { lang: "it" })}#event-copy-it`}
                >
                  {italianCopyStarted
                    ? "Italiano"
                    : isItalian
                      ? "Aggiungi italiano"
                      : "Add Italian"}
                </Link>
                <Link
                  className={`filter-pill ${contentLocale === "en" ? "filter-pill-active" : ""}`}
                  href={`${buildEventsHref(slug, query, { lang: "en" })}#event-copy-en`}
                >
                  {englishCopyStarted
                    ? "English"
                    : isItalian
                      ? "Aggiungi English"
                      : "Add English"}
                </Link>
              </div>
            </div>
            <div className="admin-subsection-stack">
              <LocaleFormSection
                defaultOpen={contentLocale === "it"}
                id="event-copy-it"
                status={
                  italianCopyStarted
                    ? isItalian
                      ? "Gia compilato"
                      : "Content started"
                    : isItalian
                      ? "Opzionale"
                      : "Optional"
                }
                title="Italiano"
              >
                <div className="locale-field-column">
                  <label className="field">
                    <span>{isItalian ? "Titolo" : "Title"}</span>
                    <input
                      defaultValue={localizedValue(selectedEvent, "title", "it")}
                      name="titleIt"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "summary", "it")}
                      name="summaryIt"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Descrizione" : "Description"}</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "description", "it")}
                      name="descriptionIt"
                      rows="4"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Pubblico ideale" : "Audience"}</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "audience", "it")}
                      name="audienceIt"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Titolo venue" : "Venue title"}</span>
                    <input
                      defaultValue={localizedValue(selectedEvent, "venueTitle", "it")}
                      name="venueTitleIt"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Dettaglio venue" : "Venue detail"}</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "venueDetail", "it")}
                      name="venueDetailIt"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Istruzioni partecipanti" : "Attendee instructions"}</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "attendeeInstructions", "it")}
                      name="attendeeInstructionsIt"
                      rows="3"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Policy cancellazione" : "Cancellation policy"}</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "cancellationPolicy", "it")}
                      name="cancellationPolicyIt"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Highlights (uno per riga)" : "Highlights (one per line)"}</span>
                    <textarea
                      defaultValue={localizedListValue(selectedEvent, "highlights", "it")}
                      name="highlightsIt"
                      rows="3"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Incluso (uno per riga)" : "Included (one per line)"}</span>
                    <textarea
                      defaultValue={localizedListValue(selectedEvent, "included", "it")}
                      name="includedIt"
                      rows="3"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Policy (una per riga)" : "Policies (one per line)"}</span>
                    <textarea
                      defaultValue={localizedListValue(selectedEvent, "policies", "it")}
                      name="policiesIt"
                      rows="3"
                    />
                  </label>
                </div>
              </LocaleFormSection>

              <LocaleFormSection
                defaultOpen={contentLocale === "en"}
                id="event-copy-en"
                status={
                  englishCopyStarted
                    ? isItalian
                      ? "Gia compilato"
                      : "Content started"
                    : isItalian
                      ? "Opzionale"
                      : "Optional"
                }
                title="English"
              >
                <div className="locale-field-column">
                  <label className="field">
                    <span>Title</span>
                    <input
                      defaultValue={localizedValue(selectedEvent, "title", "en")}
                      name="titleEn"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "summary", "en")}
                      name="summaryEn"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "description", "en")}
                      name="descriptionEn"
                      rows="4"
                    />
                  </label>
                  <label className="field">
                    <span>Audience</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "audience", "en")}
                      name="audienceEn"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>Venue title</span>
                    <input
                      defaultValue={localizedValue(selectedEvent, "venueTitle", "en")}
                      name="venueTitleEn"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>Venue detail</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "venueDetail", "en")}
                      name="venueDetailEn"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>Attendee instructions</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "attendeeInstructions", "en")}
                      name="attendeeInstructionsEn"
                      rows="3"
                    />
                  </label>
                  <label className="field">
                    <span>Cancellation policy</span>
                    <textarea
                      defaultValue={localizedValue(selectedEvent, "cancellationPolicy", "en")}
                      name="cancellationPolicyEn"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>Highlights (one per line)</span>
                    <textarea
                      defaultValue={localizedListValue(selectedEvent, "highlights", "en")}
                      name="highlightsEn"
                      rows="3"
                    />
                  </label>
                  <label className="field">
                    <span>Included (one per line)</span>
                    <textarea
                      defaultValue={localizedListValue(selectedEvent, "included", "en")}
                      name="includedEn"
                      rows="3"
                    />
                  </label>
                  <label className="field">
                    <span>Policies (one per line)</span>
                    <textarea
                      defaultValue={localizedListValue(selectedEvent, "policies", "en")}
                      name="policiesEn"
                      rows="3"
                    />
                  </label>
                </div>
              </LocaleFormSection>
            </div>
          </EventFormSection>

          <EventFormSection
            defaultOpen={!isEditing || activeTab === "publish"}
            description={
              isItalian
                ? "Mappa, note interne e gallery reale. Qui tieni l’evento pronto per la pubblicazione."
                : "Map, internal notes, and the real image gallery. Keep the event publication-ready here."
            }
            id="event-publish"
            title={isItalian ? "Publish assets" : "Publish assets"}
          >
            <div className="registration-field-grid">
              <label className="field">
                <span>{isItalian ? "URL mappa" : "Map URL"}</span>
                <input defaultValue={selectedEvent?.mapHref || ""} name="mapHref" type="url" />
              </label>
              <label className="field field-span">
                <span>{isItalian ? "Note interne organizer" : "Organizer notes"}</span>
                <textarea
                  defaultValue={selectedEvent?.organizerNotes || ""}
                  name="organizerNotes"
                  rows="2"
                />
              </label>
              <div className="field field-span">
                <span>{isItalian ? "Gallery immagini reali" : "Real image gallery"}</span>
                <EventGalleryEditor initialItems={initialGalleryItems} />
              </div>
              <div className="field field-span">
                <span className="metric-label">{isItalian ? "Nota finestra vendita" : "Sales window note"}</span>
                <strong>
                  {isItalian
                    ? "Se lasci i campi vuoti, Passreserve userà solo le regole organizer o gli override delle singole date."
                    : "If you leave these fields empty, Passreserve falls back to organizer-level rules or single-date overrides."}
                </strong>
              </div>
            </div>
          </EventFormSection>

          <div className="hero-actions">
            <button
              className="button button-primary"
              data-organizer-tour="event-save"
              type="submit"
            >
              {isEditing
                ? isItalian
                  ? "Salva modifiche"
                  : "Save changes"
                : isItalian
                  ? "Crea evento"
                  : "Create event"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
