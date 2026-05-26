import Link from "next/link";

import {
  getOrganizerEventsAdmin,
  getOrganizerRegistrationsAdmin,
  getOrganizerOccurrencesAdmin
} from "../../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../../lib/passreserve-auth.js";
import { getTranslations } from "../../../../../lib/passreserve-i18n.js";
import { ORGANIZER_MANUAL_REGISTRATION_MODE } from "../../../../../lib/passreserve-registrations.js";
import { OrganizerAdminPageHeader } from "../../organizer-admin-ui.js";
import { OrganizerManualRegistrationContextStep } from "./organizer-manual-registration-context-step.js";

const localeOptions = new Set(["en", "it"]);
const originOptions = new Set(["walk-in", "phone", "email", "staff"]);

function normalizeRegistrationLocale(value, fallback = "en") {
  return localeOptions.has(value) ? value : fallback;
}

function normalizeOrigin(value, fallback = "staff") {
  return originOptions.has(value) ? value : fallback;
}

function getDateMilliseconds(value) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getPreferredOccurrence(occurrences) {
  const now = Date.now();

  return (
    occurrences.find((occurrence) => {
      const occurrenceEndsAt = getDateMilliseconds(occurrence?.endsAt);
      const salesWindowStartsAt = getDateMilliseconds(occurrence?.salesWindowStartsAt);
      const salesWindowEndsAt = getDateMilliseconds(occurrence?.salesWindowEndsAt);

      if (occurrenceEndsAt && occurrenceEndsAt <= now) {
        return false;
      }

      if (salesWindowStartsAt && salesWindowStartsAt > now) {
        return false;
      }

      if (salesWindowEndsAt && salesWindowEndsAt < now) {
        return false;
      }

      return true;
    }) ||
    occurrences.find((occurrence) => {
      const occurrenceEndsAt = getDateMilliseconds(occurrence?.endsAt);

      return !occurrenceEndsAt || occurrenceEndsAt > now;
    }) ||
    occurrences[0] ||
    null
  );
}

export default async function OrganizerManualRegistrationPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const [eventsData, occurrencesData, registrationsData] = await Promise.all([
    getOrganizerEventsAdmin(slug),
    getOrganizerOccurrencesAdmin(slug),
    getOrganizerRegistrationsAdmin(slug, locale)
  ]);

  if (!eventsData || !occurrencesData || !registrationsData) {
    return null;
  }

  const selectedEventSlug =
    typeof query.event === "string" && query.event
      ? query.event
      : eventsData.events[0]?.slug || "";
  const selectedEvent =
    eventsData.events.find((event) => event.slug === selectedEventSlug) ??
    eventsData.events[0] ??
    null;
  const occurrenceOptions = occurrencesData.occurrences
    .filter((occurrence) => !selectedEvent?.slug || occurrence.eventSlug === selectedEvent.slug)
    .filter((occurrence) => occurrence.status !== "CANCELLED")
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const selectedOccurrenceId =
    typeof query.occurrence === "string" && query.occurrence
      ? query.occurrence
      : getPreferredOccurrence(occurrenceOptions)?.id || "";
  const selectedOccurrence =
    occurrenceOptions.find((occurrence) => occurrence.id === selectedOccurrenceId) ??
    getPreferredOccurrence(occurrenceOptions) ??
    null;
  const selectedRegistrationLocale = normalizeRegistrationLocale(
    typeof query.registrationLocale === "string" ? query.registrationLocale : locale,
    normalizeRegistrationLocale(locale)
  );
  const selectedMode = Object.values(ORGANIZER_MANUAL_REGISTRATION_MODE).includes(query.mode)
    ? query.mode
    : ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION;
  const selectedOrigin = normalizeOrigin(
    typeof query.origin === "string" ? query.origin : "",
    "staff"
  );
  const selectedStep = typeof query.step === "string" ? query.step : "";
  const registrationsHref =
    selectedEvent?.slug
      ? `/${slug}/admin/registrations?event=${encodeURIComponent(selectedEvent.slug)}`
      : `/${slug}/admin/registrations`;

  return (
    <div className="admin-page">
      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/registrations/new`}
        eyebrow={isItalian ? "Manual registration" : "Manual registration"}
        title={isItalian ? "Nuova registrazione manuale" : "New manual registration"}
        description={
          isItalian
            ? "Questo wizard costruirà una registrazione reale dentro la stessa coda organizer, partendo da evento, data e contesto operativo corretti."
            : "This wizard will create a real registration inside the existing organizer queue, starting from the right event, date, and operating context."
        }
        tip={
          isItalian
            ? "Fase 10: il wizard ora chiude davvero review, submit server action e stato di successo, restando dentro la stessa coda organizer del runtime pubblico."
            : "Phase 10 now closes the real review step, server-action submit, and success state while staying inside the same organizer queue as the public runtime."
        }
        events={eventsData.events}
        query={query}
        selectedEvent={selectedEvent?.slug || ""}
        filterLabel={isItalian ? "Evento in modifica" : "Event in context"}
        allEventsLabel={isItalian ? "Tutti gli eventi" : "All events"}
        actions={
          <Link className="button button-secondary" href={registrationsHref}>
            {isItalian ? "Torna alla coda" : "Back to queue"}
          </Link>
        }
      />

      {!eventsData.events.length ? (
        <section className="panel section-card admin-section">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Nessun evento attivo" : "No active events"}</div>
              <h3>{isItalian ? "Crea prima un evento e una data" : "Create an event and a date first"}</h3>
            </div>
          </div>
          <p className="admin-page-lead">
            {isItalian
              ? "La manual registration usa gli stessi ticket e le stesse date del runtime pubblico. Torna in Eventi o Programma e prepara almeno una data disponibile."
              : "Manual registration uses the same tickets and dates as the public runtime. Return to Events or Schedule and prepare at least one available date first."}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href={`/${slug}/admin/events`}>
              {isItalian ? "Apri eventi" : "Open events"}
            </Link>
            <Link className="button button-secondary" href={`/${slug}/admin/calendar`}>
              {isItalian ? "Apri programma" : "Open schedule"}
            </Link>
          </div>
        </section>
      ) : (
        <OrganizerManualRegistrationContextStep
          events={eventsData.events}
          initialEventSlug={selectedEvent?.slug || ""}
          initialMode={selectedMode}
          initialOccurrenceId={selectedOccurrence?.id || ""}
          initialOrigin={selectedOrigin}
          initialRegistrationLocale={selectedRegistrationLocale}
          initialStep={selectedStep}
          isItalian={isItalian}
          existingRegistrations={registrationsData.registrations}
          occurrences={occurrencesData.occurrences}
          registrationsHref={registrationsHref}
          slug={slug}
        />
      )}
    </div>
  );
}
