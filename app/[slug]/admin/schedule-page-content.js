import Link from "next/link";

import { getOrganizerOccurrencesAdmin } from "../../../lib/passreserve-admin-service.js";
import { getLocalizedFormText } from "../../../lib/passreserve-content.js";
import { requireOrganizerAdminSession } from "../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../lib/passreserve-i18n.js";
import { saveOrganizerOccurrenceAction } from "./actions.js";
import { OrganizerAdminPageHeader } from "./organizer-admin-ui.js";

const allowedViews = new Set(["month", "week", "list"]);

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

function localizedValue(record, field, locale) {
  return getLocalizedFormText(record, field, locale);
}

function getDateParts(value, timeZone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(value)).map((part) => [part.type, part.value])
  );
}

function formatDayKey(value, timeZone) {
  const parts = getDateParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isValidDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isValidMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(value || "");
}

function dayKeyToDate(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function monthKeyToDate(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
}

function toUtcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = getDateParts(date.toISOString(), timeZone);
  return `${parts.year}-${parts.month}`;
}

function addDaysToDayKey(dayKey, amount) {
  const date = dayKeyToDate(dayKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toUtcDayKey(date);
}

function addMonthsToMonthKey(monthKey, amount) {
  const date = monthKeyToDate(monthKey);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function startOfWeek(dayKey) {
  const date = dayKeyToDate(dayKey);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + offset);
  return toUtcDayKey(date);
}

function formatCalendarDateLabel(value, locale, timeZone) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(value));
}

function formatMonthLabel(monthKey, locale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(monthKeyToDate(monthKey));
}

function formatWeekdayShort(dayKey, locale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    weekday: "short",
    timeZone: "UTC"
  }).format(dayKeyToDate(dayKey));
}

function groupOccurrencesByDay(occurrences, locale, timeZone) {
  const groups = new Map();

  for (const occurrence of occurrences) {
    const key = formatDayKey(occurrence.startsAt, timeZone);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatCalendarDateLabel(occurrence.startsAt, locale, timeZone),
        occurrences: []
      });
    }

    groups.get(key).occurrences.push(occurrence);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      occurrences: group.occurrences.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
      publishedCount: group.occurrences.filter((occurrence) => occurrence.published).length,
      draftCount: group.occurrences.filter((occurrence) => occurrence.uiState.isDraft).length,
      capacityWatchCount: group.occurrences.filter((occurrence) => occurrence.uiState.isCapacityWatch)
        .length,
      paymentsBlockedCount: group.occurrences.filter((occurrence) => occurrence.uiState.isPaymentsBlocked)
        .length
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function getOccurrenceUiState(occurrence, billingEnabled) {
  return {
    isDraft: occurrence.status === "DRAFT" || occurrence.published !== true,
    isPublished: occurrence.published === true,
    isCapacityWatch: occurrence.capacitySummary.remaining <= 3,
    isPaymentsBlocked: occurrence.usesOnlinePayments && !billingEnabled
  };
}

function buildScheduleHref(slug, query = {}, updates = {}) {
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
  return `/${slug}/admin/calendar${serialized ? `?${serialized}` : ""}`;
}

function buildMonthCells(monthKey, dayGroupMap) {
  const monthDate = monthKeyToDate(monthKey);
  const monthIndex = monthDate.getUTCMonth();
  const firstDay = new Date(monthDate);
  const startOffset = (firstDay.getUTCDay() + 6) % 7;
  firstDay.setUTCDate(firstDay.getUTCDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(firstDay);
    cellDate.setUTCDate(firstDay.getUTCDate() + index);
    const key = toUtcDayKey(cellDate);
    const group = dayGroupMap.get(key) || null;

    return {
      key,
      label: String(cellDate.getUTCDate()),
      inMonth: cellDate.getUTCMonth() === monthIndex,
      group
    };
  });
}

function buildWeekDays(anchorDayKey, dayGroupMap, locale) {
  const weekStart = startOfWeek(anchorDayKey);

  return Array.from({ length: 7 }, (_, index) => {
    const dayKey = addDaysToDayKey(weekStart, index);
    const date = dayKeyToDate(dayKey);

    return {
      key: dayKey,
      label: formatWeekdayShort(dayKey, locale),
      dayNumber: String(date.getUTCDate()),
      group: dayGroupMap.get(dayKey) || null
    };
  });
}

function getDefaultDayKey(view, selectedDayKey, dayGroups, weekDays, monthKey) {
  if (selectedDayKey) {
    return selectedDayKey;
  }

  if (view === "week") {
    return weekDays.find((day) => day.group)?.key || "";
  }

  if (view === "month") {
    return dayGroups.find((group) => group.key.startsWith(`${monthKey}-`))?.key || "";
  }

  return "";
}

function ScheduleOccurrenceCard({ occurrence, isItalian, query, slug, timeZone }) {
  const occurrenceDayKey = formatDayKey(occurrence.startsAt, timeZone);
  const occurrenceMonthKey = formatMonthKey(occurrence.startsAt, timeZone);

  return (
    <article
      className={`schedule-occurrence-card${query.edit === occurrence.id ? " schedule-occurrence-card-active" : ""}${
        occurrence.uiState.isCapacityWatch ? " schedule-occurrence-card-watch" : ""
      }${occurrence.uiState.isPaymentsBlocked ? " schedule-occurrence-card-blocked" : ""}`}
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
            {occurrence.uiState.isCapacityWatch ? (
              <span className="admin-badge admin-badge-capacity-watch">
                {isItalian ? "Low capacity" : "Low capacity"}
              </span>
            ) : null}
            {occurrence.uiState.isPaymentsBlocked ? (
              <span className="admin-badge admin-badge-unlisted">
                {isItalian ? "Pagamenti bloccati" : "Payments blocked"}
              </span>
            ) : null}
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

      <div className="ops-inline-list">
        <span>
          {occurrence.usesOnlinePayments
            ? `${occurrence.prepayPercentage}% online`
            : isItalian
              ? "Pagamento sul posto"
              : "Pay at the event"}
        </span>
        <span>
          {isItalian ? "Vendita da" : "Sales start"}: {occurrence.salesWindowStartsAtLabel}
        </span>
        <span>
          {isItalian ? "Vendita fino a" : "Sales end"}: {occurrence.salesWindowEndsAtLabel}
        </span>
      </div>

      <div className="hero-actions">
        <Link
          className="button button-primary"
          href={buildScheduleHref(slug, query, {
            event: occurrence.eventSlug,
            edit: occurrence.id,
            day: occurrenceDayKey,
            month: occurrenceMonthKey
          })}
        >
          {isItalian ? "Modifica data" : "Edit date"}
        </Link>
        <Link
          className="button button-secondary"
          href={`/${slug}/admin/registrations?event=${encodeURIComponent(
            occurrence.eventSlug
          )}&occurrence=${encodeURIComponent(occurrence.id)}`}
        >
          {isItalian ? "Vedi partecipanti" : "View participants"}
        </Link>
      </div>
    </article>
  );
}

function ScheduleDayFocusSection({
  detailGroup,
  isItalian,
  query,
  slug,
  timeZone,
  currentView
}) {
  const eventCount = detailGroup
    ? new Set(detailGroup.occurrences.map((occurrence) => occurrence.eventSlug)).size
    : 0;
  const seatsRemaining = detailGroup
    ? detailGroup.occurrences.reduce(
        (sum, occurrence) => sum + occurrence.capacitySummary.remaining,
        0
      )
    : 0;
  const paymentsBlockedCount = detailGroup
    ? detailGroup.occurrences.filter((occurrence) => occurrence.uiState.isPaymentsBlocked).length
    : 0;

  return (
    <section className="panel section-card admin-section">
      <div className="admin-section-header">
        <div>
          <div className="section-kicker">{isItalian ? "Focus giorno" : "Day focus"}</div>
          <h3>
            {detailGroup
              ? detailGroup.label
              : isItalian
                ? "Seleziona un giorno per vedere le date"
                : "Select a day to inspect the dates"}
          </h3>
        </div>
        {detailGroup ? (
          <div className="pill-list">
            <span className="pill">
              {detailGroup.occurrences.length} {isItalian ? "date" : "dates"}
            </span>
            <span className="pill">
              {detailGroup.publishedCount} {isItalian ? "pubblicate" : "published"}
            </span>
          </div>
        ) : null}
      </div>

      {detailGroup ? (
        <>
          <div className="admin-summary-grid">
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Eventi attivi" : "Events in focus"}</span>
              <strong>{eventCount}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Posti rimasti" : "Seats left"}</span>
              <strong>{seatsRemaining}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "In watch" : "Capacity watch"}</span>
              <strong>{detailGroup.capacityWatchCount}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Pagamenti bloccati" : "Payments blocked"}</span>
              <strong>{paymentsBlockedCount}</strong>
            </article>
            <article className="admin-summary-card">
              <span className="metric-label">{isItalian ? "Vista attiva" : "Active view"}</span>
              <strong>
                {currentView === "month"
                  ? isItalian
                    ? "Mese"
                    : "Month"
                  : isItalian
                    ? "Settimana"
                    : "Week"}
              </strong>
            </article>
          </div>

          <div className="schedule-occurrence-list">
            {detailGroup.occurrences.map((occurrence) => (
              <ScheduleOccurrenceCard
                isItalian={isItalian}
                key={occurrence.id}
                occurrence={occurrence}
                query={query}
                slug={slug}
                timeZone={timeZone}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="timeline-step">
          <strong>{isItalian ? "Nessun giorno selezionato" : "No day selected"}</strong>
          <span>
            {isItalian
              ? "Scegli un giorno dal calendario o dalla vista settimanale per modificare una data."
              : "Choose a day from the calendar or week view to edit an occurrence."}
          </span>
        </div>
      )}
    </section>
  );
}

function ScheduleFormSection({
  slug,
  isItalian,
  data,
  isEditing,
  selectedOccurrence,
  createHref,
  defaultEventTypeId,
  activeEvent,
  selectedEvent
}) {
  return (
    <section className="panel section-card admin-section admin-side-editor" id="date-form">
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
                ? "Aggiungi una nuova data"
                : "Add a new date"}
          </h3>
        </div>
        {isEditing ? (
          <Link className="button button-secondary" href={`${createHref}#date-form`}>
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
          <span>{isItalian ? "Prezzo ticket" : "Ticket pricing"}</span>
          <input
            defaultValue={
              isItalian
                ? "Derivato dal catalogo ticket dell'evento"
                : "Derived from the event ticket catalog"
            }
            disabled
            readOnly
            type="text"
          />
        </label>
        <label className="field">
          <span>{isItalian ? "Percentuale prepagata" : "Prepay percentage"}</span>
          <input
            defaultValue={selectedOccurrence?.prepayPercentage ?? activeEvent?.prepayPercentage ?? 0}
            max="100"
            min="0"
            name="prepayPercentage"
            type="number"
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
        <div className="field field-span">
          <span className="metric-label">{isItalian ? "Testi pubblici bilingua" : "Bilingual public text"}</span>
          <strong>
            {isItalian
              ? "Compila solo le lingue che vuoi davvero pubblicare."
              : "Only fill the languages you actually want to publish."}
          </strong>
          <small className="field-hint">
            {isItalian
              ? "Se una lingua manca, la pagina userà automaticamente quella disponibile."
              : "If one language is missing, the page automatically uses the one that exists."}
          </small>
        </div>
        <div className="locale-fieldset field-span">
          <div className="locale-field-column">
            <div className="section-kicker">Italiano</div>
            <label className="field">
              <span>{isItalian ? "Titolo venue" : "Venue title"}</span>
              <input
                defaultValue={localizedValue(selectedOccurrence || activeEvent, "venueTitle", "it")}
                name="venueTitleIt"
                type="text"
              />
            </label>
            <label className="field">
              <span>{isItalian ? "Nota" : "Note"}</span>
              <textarea
                defaultValue={localizedValue(selectedOccurrence, "note", "it")}
                name="noteIt"
                rows="2"
              />
            </label>
          </div>
          <div className="locale-field-column">
            <div className="section-kicker">English</div>
            <label className="field">
              <span>Venue title</span>
              <input
                defaultValue={localizedValue(selectedOccurrence || activeEvent, "venueTitle", "en")}
                name="venueTitleEn"
                type="text"
              />
            </label>
            <label className="field">
              <span>Note</span>
              <textarea
                defaultValue={localizedValue(selectedOccurrence, "note", "en")}
                name="noteEn"
                rows="2"
              />
            </label>
          </div>
        </div>
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
  );
}

export default async function OrganizerSchedulePageContent({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const data = await getOrganizerOccurrencesAdmin(slug);
  const selectedEventFilter = typeof query.event === "string" ? query.event : "";
  const editId = typeof query.edit === "string" ? query.edit : "";
  const currentView =
    typeof query.view === "string" && allowedViews.has(query.view) ? query.view : "week";
  const occurrencesWithUiState = data.occurrences.map((occurrence) => ({
    ...occurrence,
    uiState: getOccurrenceUiState(occurrence, data.billing.enabled)
  }));
  const selectedOccurrence = editId
    ? occurrencesWithUiState.find((occurrence) => occurrence.id === editId) ?? null
    : null;
  const selectedEvent = selectedOccurrence?.eventSlug || selectedEventFilter;
  const activeEvent =
    data.events.find((event) => event.id === selectedOccurrence?.eventTypeId) ||
    data.events.find((event) => event.slug === selectedEvent) ||
    data.events[0] ||
    null;
  const occurrences = selectedEvent
    ? occurrencesWithUiState.filter((occurrence) => occurrence.eventSlug === selectedEvent)
    : occurrencesWithUiState;
  const dayGroups = groupOccurrencesByDay(occurrences, locale, data.organizer.timeZone);
  const dayGroupMap = new Map(dayGroups.map((group) => [group.key, group]));
  const selectedDayKey =
    (typeof query.day === "string" && isValidDayKey(query.day) ? query.day : "") ||
    (selectedOccurrence ? formatDayKey(selectedOccurrence.startsAt, data.organizer.timeZone) : "");
  const fallbackDayKey =
    selectedDayKey ||
    dayGroups[0]?.key ||
    toUtcDayKey(new Date());
  const currentMonthKey =
    typeof query.month === "string" && isValidMonthKey(query.month)
      ? query.month
      : formatMonthKey(dayKeyToDate(fallbackDayKey), "UTC");
  const monthCells = buildMonthCells(currentMonthKey, dayGroupMap);
  const weekDays = buildWeekDays(fallbackDayKey, dayGroupMap, locale);
  const detailDayKey = getDefaultDayKey(
    currentView,
    selectedDayKey,
    dayGroups,
    weekDays,
    currentMonthKey
  );
  const detailGroup = detailDayKey ? dayGroupMap.get(detailDayKey) || null : null;
  const upcomingOccurrencesCount = occurrences.filter(
    (occurrence) => new Date(occurrence.startsAt).getTime() > Date.now()
  ).length;
  const publishedOccurrencesCount = occurrences.filter((occurrence) => occurrence.published).length;
  const draftOccurrencesCount = occurrences.filter((occurrence) => !occurrence.published).length;
  const capacityWatchCount = occurrences.filter(
    (occurrence) => occurrence.uiState.isCapacityWatch
  ).length;
  const paymentsBlockedCount = occurrences.filter(
    (occurrence) => occurrence.uiState.isPaymentsBlocked
  ).length;
  const defaultEventTypeId = selectedOccurrence?.eventTypeId || activeEvent?.id || "";
  const isEditing = Boolean(selectedOccurrence);
  const createHref = buildScheduleHref(slug, query, {
    edit: null
  });
  const monthSummaryGroups = dayGroups.filter((group) =>
    group.key.startsWith(`${currentMonthKey}-`)
  );
  const previousMonthHref = buildScheduleHref(slug, query, {
    month: addMonthsToMonthKey(currentMonthKey, -1),
    day: null,
    edit: null
  });
  const nextMonthHref = buildScheduleHref(slug, query, {
    month: addMonthsToMonthKey(currentMonthKey, 1),
    day: null,
    edit: null
  });
  const currentWeekStart = startOfWeek(fallbackDayKey);
  const previousWeekHref = buildScheduleHref(slug, query, {
    day: addDaysToDayKey(currentWeekStart, -7),
    edit: null
  });
  const nextWeekHref = buildScheduleHref(slug, query, {
    day: addDaysToDayKey(currentWeekStart, 7),
    edit: null
  });

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
        basePath={`/${slug}/admin/calendar`}
        description={
          isItalian
            ? "Qui lavori su date, capienza, vendita e note operative senza passare tra pagine separate."
            : "Handle dates, capacity, sales windows, and operational notes here without bouncing between separate pages."
        }
        eyebrow={isItalian ? "Programma" : "Schedule"}
        events={data.events}
        query={query}
        selectedEvent={selectedEvent}
        filterLabel={isItalian ? "Filtra per evento" : "Filter by event"}
        allEventsLabel={isItalian ? "Tutti gli eventi" : "All events"}
        actions={
          <>
            <Link
              className="button button-secondary"
              href={`/${slug}/admin/registrations${selectedEvent ? `?event=${encodeURIComponent(selectedEvent)}` : ""}`}
            >
              {isItalian ? "Apri partecipanti" : "Open participants"}
            </Link>
            <Link className="button button-primary" href={`${createHref}#date-form`}>
              {isItalian ? "Nuova data" : "Create date"}
            </Link>
          </>
        }
        title={
          selectedEvent
            ? isItalian
              ? "Programma di un singolo evento"
              : "Schedule for one event"
            : isItalian
              ? "Programma di tutti gli eventi"
              : "Schedule across your events"
        }
      />

      <section className="admin-summary-grid">
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Date future" : "Upcoming dates"}</span>
          <strong>{upcomingOccurrencesCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Pubblicate" : "Published"}</span>
          <strong>{publishedOccurrencesCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "In bozza" : "Draft"}</span>
          <strong>{draftOccurrencesCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Capacity watch" : "Capacity watch"}</span>
          <strong>{capacityWatchCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span className="metric-label">{isItalian ? "Pagamenti bloccati" : "Payments blocked"}</span>
          <strong>{paymentsBlockedCount}</strong>
        </article>
      </section>

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Viste programma" : "Schedule views"}</div>
            <h3>{isItalian ? "Scegli come navigare le date" : "Choose how to navigate dates"}</h3>
          </div>
        </div>

        <div className="admin-filter-strip">
          <span className="admin-filter-label">{isItalian ? "Vista" : "View"}</span>
          <div className="filter-row">
            <Link
              className={`filter-pill ${currentView === "month" ? "filter-pill-active" : ""}`}
              href={buildScheduleHref(slug, query, { view: "month", edit: null })}
            >
              {isItalian ? "Mese" : "Month"}
            </Link>
            <Link
              className={`filter-pill ${currentView === "week" ? "filter-pill-active" : ""}`}
              href={buildScheduleHref(slug, query, { view: "week", edit: null })}
            >
              {isItalian ? "Settimana" : "Week"}
            </Link>
            <Link
              className={`filter-pill ${currentView === "list" ? "filter-pill-active" : ""}`}
              href={buildScheduleHref(slug, query, { view: "list", edit: null })}
            >
              {isItalian ? "Lista" : "List"}
            </Link>
          </div>
        </div>

        {selectedDayKey ? (
          <div className="admin-filter-strip">
            <span className="admin-filter-label">{isItalian ? "Giorno attivo" : "Active day"}</span>
            <div className="filter-row">
              <span className="filter-pill filter-pill-active">
                {detailGroup?.label || selectedDayKey}
              </span>
              <Link
                className="filter-pill"
                href={buildScheduleHref(slug, query, { day: null, edit: null })}
              >
                {isItalian ? "Rimuovi focus giorno" : "Clear day focus"}
              </Link>
            </div>
          </div>
        ) : null}

        {!data.billing.enabled ? (
          <p className="admin-page-tip">
            {isItalian
              ? "Puoi pubblicare date gratuite o pay-at-event. Le date con pagamento online restano bloccate finché il billing non è pronto."
              : "You can publish free or pay-at-event dates now. Dates using online payments stay blocked until billing is ready."}
          </p>
        ) : null}

        {currentView === "month" ? (
          <>
            <div className="schedule-view-bar">
              <Link className="button button-secondary button-compact" href={previousMonthHref}>
                {isItalian ? "Mese precedente" : "Previous month"}
              </Link>
              <strong className="schedule-view-title">{formatMonthLabel(currentMonthKey, locale)}</strong>
              <Link className="button button-secondary button-compact" href={nextMonthHref}>
                {isItalian ? "Mese successivo" : "Next month"}
              </Link>
            </div>

            <div className="schedule-month-scroller">
              <div className="schedule-month-grid">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <div className="schedule-month-label" key={label}>
                    {label}
                  </div>
                ))}
                {monthCells.map((cell) => (
                  <Link
                    className={`schedule-month-cell${cell.inMonth ? "" : " schedule-month-cell-muted"}${
                      selectedDayKey === cell.key ? " schedule-month-cell-active" : ""
                    }`}
                    href={buildScheduleHref(slug, query, {
                      day: cell.key,
                      month: currentMonthKey,
                      edit: null
                    })}
                    key={cell.key}
                  >
                    <span className="schedule-month-day">{cell.label}</span>
                    {cell.group ? (
                      <>
                        <span className="schedule-month-count">
                          {cell.group.occurrences.length} {isItalian ? "date" : "dates"}
                        </span>
                        <div className="schedule-state-strip">
                          {cell.group.publishedCount > 0 ? (
                            <span className="schedule-state-chip schedule-state-chip-published">
                              {cell.group.publishedCount}P
                            </span>
                          ) : null}
                          {cell.group.draftCount > 0 ? (
                            <span className="schedule-state-chip schedule-state-chip-draft">
                              {cell.group.draftCount}D
                            </span>
                          ) : null}
                          {cell.group.capacityWatchCount > 0 ? (
                            <span className="schedule-state-chip schedule-state-chip-watch">
                              {cell.group.capacityWatchCount}!
                            </span>
                          ) : null}
                          {cell.group.paymentsBlockedCount > 0 ? (
                            <span className="schedule-state-chip schedule-state-chip-blocked">
                              {cell.group.paymentsBlockedCount}$
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>

            <div className="admin-note-list">
              {monthSummaryGroups.length > 0 ? (
                monthSummaryGroups.slice(0, 4).map((group) => (
                  <div className="admin-note-item" key={group.key}>
                    <strong>{group.label}</strong>
                    <p>
                      {group.occurrences.length} {isItalian ? "date" : "dates"} · {group.publishedCount}{" "}
                      {isItalian ? "pubblicate" : "published"}
                      {group.paymentsBlockedCount > 0
                        ? ` · ${group.paymentsBlockedCount} ${
                            isItalian ? "pagamenti bloccati" : "payments blocked"
                          }`
                        : ""}
                    </p>
                  </div>
                ))
              ) : (
                <div className="admin-note-item">
                  <strong>{isItalian ? "Nessuna data in questo mese" : "No dates in this month"}</strong>
                  <p>
                    {isItalian
                      ? "Passa a un altro mese o crea una nuova data."
                      : "Move to another month or create a new date."}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}

        {currentView === "week" ? (
          <>
            <div className="schedule-view-bar">
              <Link className="button button-secondary button-compact" href={previousWeekHref}>
                {isItalian ? "Settimana precedente" : "Previous week"}
              </Link>
              <strong className="schedule-view-title">
                {isItalian ? "Settimana in corso" : "Current week focus"}
              </strong>
              <Link className="button button-secondary button-compact" href={nextWeekHref}>
                {isItalian ? "Settimana successiva" : "Next week"}
              </Link>
            </div>

            <div className="schedule-week-grid">
              {weekDays.map((day) => (
                <Link
                  className={`schedule-week-cell${selectedDayKey === day.key ? " schedule-week-cell-active" : ""}`}
                  href={buildScheduleHref(slug, query, {
                    day: day.key,
                    month: formatMonthKey(dayKeyToDate(day.key), "UTC"),
                    edit: null
                  })}
                  key={day.key}
                >
                  <span className="schedule-week-label">{day.label}</span>
                  <strong>{day.dayNumber}</strong>
                  <span className="schedule-week-meta">
                    {day.group
                      ? `${day.group.occurrences.length} ${isItalian ? "date" : "dates"}`
                      : isItalian
                        ? "Nessuna data"
                        : "No dates"}
                  </span>
                  {day.group ? (
                    <div className="schedule-state-strip">
                      {day.group.publishedCount > 0 ? (
                        <span className="schedule-state-chip schedule-state-chip-published">
                          {day.group.publishedCount}P
                        </span>
                      ) : null}
                      {day.group.draftCount > 0 ? (
                        <span className="schedule-state-chip schedule-state-chip-draft">
                          {day.group.draftCount}D
                        </span>
                      ) : null}
                      {day.group.capacityWatchCount > 0 ? (
                        <span className="schedule-state-chip schedule-state-chip-watch">
                          {day.group.capacityWatchCount}!
                        </span>
                      ) : null}
                      {day.group.paymentsBlockedCount > 0 ? (
                        <span className="schedule-state-chip schedule-state-chip-blocked">
                          {day.group.paymentsBlockedCount}$
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {currentView === "list" ? (
        <>
        <section className="panel section-card admin-section">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Date attive" : "Current dates"}</div>
              <h3>
                {selectedEvent
                  ? isItalian
                    ? "Date filtrate per evento"
                    : "Dates filtered to one event"
                  : isItalian
                    ? "Tutte le date programmate"
                    : "All scheduled dates"}
              </h3>
            </div>
            <div className="pill-list">
              <span className="pill">
                {occurrences.length} {isItalian ? "date" : "dates"}
              </span>
              <span className="pill">
                {upcomingOccurrencesCount} {isItalian ? "future" : "upcoming"}
              </span>
            </div>
          </div>

          <div className="schedule-day-grid">
            {dayGroups.map((group) => (
              <article className="schedule-day-card" key={group.key}>
                <div className="schedule-day-head">
                  <div>
                    <div className="section-kicker">
                      {group.occurrences.length} {isItalian ? "date" : "dates"}
                    </div>
                    <h4>{group.label}</h4>
                  </div>
                  <div className="pill-list">
                    <span className="pill">
                      {group.publishedCount} {isItalian ? "pubblicate" : "published"}
                    </span>
                    {group.draftCount > 0 ? (
                      <span className="pill">
                        {group.draftCount} {isItalian ? "draft" : "draft"}
                      </span>
                    ) : null}
                    {group.capacityWatchCount > 0 ? (
                      <span className="pill">
                        {group.capacityWatchCount} {isItalian ? "in watch" : "on watch"}
                      </span>
                    ) : null}
                    {group.paymentsBlockedCount > 0 ? (
                      <span className="pill">
                        {group.paymentsBlockedCount}{" "}
                        {isItalian ? "pagamenti bloccati" : "payments blocked"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="schedule-occurrence-list">
                  {group.occurrences.map((occurrence) => (
                    <ScheduleOccurrenceCard
                      isItalian={isItalian}
                      key={occurrence.id}
                      occurrence={occurrence}
                      query={query}
                      slug={slug}
                      timeZone={data.organizer.timeZone}
                    />
                  ))}
                </div>
              </article>
            ))}

            {dayGroups.length === 0 ? (
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

        <ScheduleFormSection
          activeEvent={activeEvent}
          createHref={createHref}
          data={data}
          defaultEventTypeId={defaultEventTypeId}
          isEditing={isEditing}
          isItalian={isItalian}
          selectedEvent={selectedEvent}
          selectedOccurrence={selectedOccurrence}
          slug={slug}
        />
        </>
      ) : (
        <div className="admin-workbench-grid">
          <ScheduleDayFocusSection
            currentView={currentView}
            detailGroup={detailGroup}
            isItalian={isItalian}
            query={query}
            slug={slug}
            timeZone={data.organizer.timeZone}
          />
          <ScheduleFormSection
            activeEvent={activeEvent}
            createHref={createHref}
            data={data}
            defaultEventTypeId={defaultEventTypeId}
            isEditing={isEditing}
            isItalian={isItalian}
            selectedEvent={selectedEvent}
            selectedOccurrence={selectedOccurrence}
            slug={slug}
          />
        </div>
      )}
    </div>
  );
}
