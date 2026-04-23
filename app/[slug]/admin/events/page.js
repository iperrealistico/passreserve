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

function localizedValue(record, field, locale) {
  return getLocalizedFormText(record, field, locale);
}

function localizedListValue(record, field, locale) {
  return getLocalizedFormList(record, field, locale);
}

export default async function OrganizerEventsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const data = await getOrganizerEventsAdmin(slug);
  const editId = typeof query.edit === "string" ? query.edit : "";
  const selectedEvent = editId ? data.events.find((event) => event.id === editId) ?? null : null;
  const isEditing = Boolean(selectedEvent);
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
            ? "Qui gestisci la definizione dell'evento: contenuti, prezzo base, immagini reali, visibilità e finestra di vendita predefinita."
            : "Use this area for the event definition itself: content, base price, real imagery, visibility, and the default sales window."
        }
        eyebrow={isItalian ? "Eventi" : "Events"}
        query={query}
        tip={
          isItalian
            ? "Pensa all'evento come al template operativo. Le Date sono invece le sessioni reali prenotabili dal pubblico."
            : "Think of an event as the operational template. The Dates area holds the real bookable sessions under it."
        }
        title={
          isItalian ? "Gestisci catalogo eventi e regole di vendita" : "Manage event catalog and sales rules"
        }
      />

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Catalogo eventi" : "Event catalog"}</div>
            <h3>{isItalian ? "Eventi esistenti" : "Existing events"}</h3>
          </div>
          <div className="pill-list">
            <span className="pill">
              {data.events.length} {isItalian ? "eventi" : "events"}
            </span>
          </div>
        </div>

        <div className="admin-card-grid">
          {data.events.map((event) => (
            <article
              className={`admin-card${selectedEvent?.id === event.id ? " admin-card-active" : ""}`}
              key={event.id}
            >
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${event.visibility.toLowerCase()}`}>
                      {event.visibility}
                    </span>
                  </div>
                  <h4>{event.title}</h4>
                  <p>{event.summary || (isItalian ? "Nessun summary ancora." : "No summary yet.")}</p>
                </div>
              </div>

              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">{isItalian ? "Prezzo base" : "Base price"}</span>
                  <strong>{event.basePriceLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Date" : "Dates"}</span>
                  <strong>{event.occurrenceCount}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Date pubbliche" : "Public dates"}</span>
                  <strong>{event.publishedOccurrenceCount}</strong>
                </div>
                <div>
                  <span className="metric-label">{isItalian ? "Registrazioni" : "Registrations"}</span>
                  <strong>{event.registrationCount}</strong>
                </div>
              </div>

              <div className="admin-note-list">
                <div className="admin-note-item">
                  <span className="spotlight-label">
                    {isItalian ? "Finestra vendita da" : "Sales window start"}
                  </span>
                  <strong>{event.salesWindowStartsAtLabel}</strong>
                </div>
                <div className="admin-note-item">
                  <span className="spotlight-label">
                    {isItalian ? "Finestra vendita fino a" : "Sales window end"}
                  </span>
                  <strong>{event.salesWindowEndsAtLabel}</strong>
                </div>
              </div>

              <div className="hero-actions">
                <Link
                  className="button button-primary"
                  href={`/${slug}/admin/events?edit=${encodeURIComponent(event.id)}#event-form`}
                >
                  {isItalian ? "Modifica evento" : "Edit event"}
                </Link>
                <form action={suspendOrganizerEventAction}>
                  <input name="slug" type="hidden" value={slug} />
                  <input name="eventId" type="hidden" value={event.id} />
                  <button className="button button-secondary" type="submit">
                    {event.visibility === "ARCHIVED"
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
                  <input name="eventId" type="hidden" value={event.id} />
                  <button
                    className="button button-secondary button-danger"
                    disabled={event.registrationCount > 0}
                    type="submit"
                  >
                    {isItalian ? "Elimina" : "Delete"}
                  </button>
                </form>
              </div>

              {event.registrationCount > 0 ? (
                <p className="admin-page-tip">
                  {isItalian
                    ? "Questo evento ha già registrazioni: puoi sospenderlo, ma non eliminarlo."
                    : "This event already has registrations, so it can be suspended but not deleted."}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

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
            : "Set the base price, public details, and the default sales window here. Individual dates can override the sales window when needed."}
        </p>

        <form action={saveOrganizerEventAction} className="registration-field-grid">
          <input name="slug" type="hidden" value={slug} />
          <input name="id" type="hidden" value={selectedEvent?.id || ""} />
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
            <span>{isItalian ? "Prezzo base in centesimi" : "Base price cents"}</span>
            <input defaultValue={selectedEvent?.basePriceCents ?? ""} name="basePriceCents" type="number" />
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
          <div className="field field-span">
            <span className="metric-label">{isItalian ? "Contenuti pubblici bilingua" : "Bilingual public copy"}</span>
            <strong>
              {isItalian
                ? "Puoi compilare italiano, inglese, o solo una delle due."
                : "You can fill Italian, English, or only one of the two."}
            </strong>
            <small className="field-hint">
              {isItalian
                ? "Se una lingua manca, il frontend usa automaticamente quella disponibile."
                : "If one language is missing, the frontend automatically falls back to the available one."}
            </small>
          </div>
          <div className="locale-fieldset field-span">
            <div className="locale-field-column">
              <div className="section-kicker">Italiano</div>
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
            <div className="locale-field-column">
              <div className="section-kicker">English</div>
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
          </div>
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

          <div className="hero-actions">
            <button className="button button-primary" type="submit">
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
