import Link from "next/link";

import { getOrganizerSettingsAdmin } from "../../../../lib/passreserve-admin-service.js";
import { getLocalizedFormText } from "../../../../lib/passreserve-content.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { REGISTRATION_REMINDER_LEAD_OPTIONS } from "../../../../lib/passreserve-email-delivery.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import {
  organizerChangePasswordAction,
  saveOrganizerSettingsAction
} from "../actions.js";
import { OrganizerAdminPageHeader } from "../organizer-admin-ui.js";

export const metadata = {
  title: "Organizer settings"
};

function buildSettingsHref(query = {}, updates = {}) {
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
  return serialized ? `?${serialized}` : "";
}

function LocaleSettingsSection({ id, title, status, defaultOpen, children }) {
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

function localizedValue(record, field, locale) {
  return getLocalizedFormText(record, field, locale);
}

function formatVenuesForTextarea(venues = []) {
  return venues
    .map((venue) => [venue.title, venue.detail, venue.mapHref].map((value) => value || "").join(" | "))
    .join("\n");
}

function hasOrganizerLocalizedContentStarted(record, locale) {
  return Boolean(
    localizedValue(record, "name", locale) ||
      localizedValue(record, "tagline", locale) ||
      localizedValue(record, "venueTitle", locale) ||
      localizedValue(record, "description", locale) ||
      localizedValue(record, "venueDetail", locale)
  );
}

function resolveMessage(value, isItalian) {
  switch (value) {
    case "saved":
      return isItalian
        ? "Impostazioni organizer salvate correttamente."
        : "Organizer settings saved successfully.";
    case "password-updated":
      return isItalian ? "Password aggiornata correttamente." : "Password updated successfully.";
    default:
      return "";
  }
}

export default async function OrganizerSettingsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const { locale } = await getTranslations();
  const isItalian = locale === "it";
  const data = await getOrganizerSettingsAdmin(slug);
  const contentLocale =
    typeof query.lang === "string" && ["it", "en"].includes(query.lang)
      ? query.lang
      : isItalian
        ? "it"
        : "en";
  const italianCopyStarted = hasOrganizerLocalizedContentStarted(data.organizer, "it");
  const englishCopyStarted = hasOrganizerLocalizedContentStarted(data.organizer, "en");
  const successMessage = resolveMessage(typeof query.message === "string" ? query.message : "", isItalian);
  const errorMessage = typeof query.error === "string" ? query.error : "";
  const settingsAnchors = [
    ["organization", isItalian ? "Organization" : "Organization"],
    ["notifications", isItalian ? "Notifications" : "Notifications"],
    ["account", isItalian ? "Account" : "Account"],
    ["billing", isItalian ? "Billing" : "Billing"],
    ["security", isItalian ? "Security" : "Security"]
  ];

  return (
    <div className="admin-page">
      {successMessage ? (
        <div className="registration-message registration-message-success">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="registration-message registration-message-error">{errorMessage}</div>
      ) : null}

      <OrganizerAdminPageHeader
        basePath={`/${slug}/admin/settings`}
        description={
          isItalian
            ? "Tieni profilo pubblico, notifiche, account e billing nello stesso posto, ma separati in blocchi più chiari."
            : "Keep public profile, notifications, account, and billing in one place, but split into clearer blocks."
        }
        eyebrow={isItalian ? "Impostazioni" : "Settings"}
        query={query}
        actions={
          <>
            <Link
              className="button button-secondary"
              data-organizer-tour="settings-open-billing"
              href={`/${slug}/admin/billing`}
            >
              {isItalian ? "Apri billing" : "Open billing"}
            </Link>
            <Link className="button button-primary" href={`#organization`}>
              {isItalian ? "Vai al profilo" : "Go to profile"}
            </Link>
          </>
        }
        title={isItalian ? "Configura il backend organizer senza dispersione" : "Configure the organizer backend without the sprawl"}
      />

      <section className="panel section-card admin-section" data-organizer-tour="settings-navigation">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Navigazione impostazioni" : "Settings navigation"}</div>
            <h3>{isItalian ? "Scegli l’area che vuoi aggiornare" : "Jump to the area you want to update"}</h3>
          </div>
        </div>
        <div className="filter-row">
          {settingsAnchors.map(([anchor, label]) => (
            <Link className="filter-pill" href={`#${anchor}`} key={anchor}>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <form
        action={saveOrganizerSettingsAction}
        className="admin-page"
        data-organizer-tour="settings-form"
      >
        <input name="slug" type="hidden" value={slug} />

        <section className="panel section-card admin-section" id="organization">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Organization" : "Organization"}</div>
              <h3>{isItalian ? "Profilo pubblico e location" : "Public profile and location"}</h3>
            </div>
          </div>

          <div className="field field-span">
            <span className="metric-label">{isItalian ? "Contenuti pubblici bilingua" : "Bilingual public copy"}</span>
            <strong>
              {isItalian
                ? "Italiano e inglese sono opzionali e indipendenti."
                : "Italian and English stay optional and independent."}
            </strong>
            <small className="field-hint">
              {isItalian
                ? "Se compili una sola lingua, il frontend mostrerà solo quella versione come fallback."
                : "If you fill only one language, the frontend falls back to that version everywhere."}
            </small>
          </div>

          <div className="admin-filter-strip">
            <span className="admin-filter-label">
              {isItalian ? "Lingua in modifica" : "Editing language"}
            </span>
            <div className="filter-row">
              <Link
                className={`filter-pill ${contentLocale === "it" ? "filter-pill-active" : ""}`}
                href={`${buildSettingsHref(query, { lang: "it" })}#organization-copy-it`}
              >
                {italianCopyStarted
                  ? "Italiano"
                  : isItalian
                    ? "Aggiungi italiano"
                    : "Add Italian"}
              </Link>
              <Link
                className={`filter-pill ${contentLocale === "en" ? "filter-pill-active" : ""}`}
                href={`${buildSettingsHref(query, { lang: "en" })}#organization-copy-en`}
              >
                {englishCopyStarted
                  ? "English"
                  : isItalian
                    ? "Aggiungi English"
                    : "Add English"}
              </Link>
            </div>
          </div>

          <div className="admin-subsection-stack field-span">
            <LocaleSettingsSection
              defaultOpen={contentLocale === "it"}
              id="organization-copy-it"
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
                  <span>{isItalian ? "Nome organizer" : "Organizer name"}</span>
                  <input
                    defaultValue={localizedValue(data.organizer, "name", "it")}
                    name="nameIt"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>{isItalian ? "Tagline" : "Tagline"}</span>
                  <input
                    defaultValue={localizedValue(data.organizer, "tagline", "it")}
                    name="taglineIt"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>{isItalian ? "Titolo venue" : "Venue title"}</span>
                  <input
                    defaultValue={localizedValue(data.organizer, "venueTitle", "it")}
                    name="venueTitleIt"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>{isItalian ? "Descrizione organizer" : "Organizer description"}</span>
                  <textarea
                    defaultValue={localizedValue(data.organizer, "description", "it")}
                    name="descriptionIt"
                    rows="4"
                  />
                </label>
                <label className="field">
                  <span>{isItalian ? "Dettaglio venue" : "Venue detail"}</span>
                  <textarea
                    defaultValue={localizedValue(data.organizer, "venueDetail", "it")}
                    name="venueDetailIt"
                    rows="3"
                  />
                </label>
              </div>
            </LocaleSettingsSection>

            <LocaleSettingsSection
              defaultOpen={contentLocale === "en"}
              id="organization-copy-en"
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
                  <span>Organizer name</span>
                  <input
                    defaultValue={localizedValue(data.organizer, "name", "en")}
                    name="nameEn"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>Tagline</span>
                  <input
                    defaultValue={localizedValue(data.organizer, "tagline", "en")}
                    name="taglineEn"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>Venue title</span>
                  <input
                    defaultValue={localizedValue(data.organizer, "venueTitle", "en")}
                    name="venueTitleEn"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>Organizer description</span>
                  <textarea
                    defaultValue={localizedValue(data.organizer, "description", "en")}
                    name="descriptionEn"
                    rows="4"
                  />
                </label>
                <label className="field">
                  <span>Venue detail</span>
                  <textarea
                    defaultValue={localizedValue(data.organizer, "venueDetail", "en")}
                    name="venueDetailEn"
                    rows="3"
                  />
                </label>
              </div>
            </LocaleSettingsSection>
          </div>

          <div className="registration-field-grid">
            <label className="field">
              <span>{isItalian ? "Città" : "City"}</span>
              <input defaultValue={data.organizer.city} name="city" type="text" />
            </label>
            <label className="field">
              <span>{isItalian ? "Regione" : "Region"}</span>
              <input defaultValue={data.organizer.region} name="region" type="text" />
            </label>
            <label className="field">
              <span>{isItalian ? "Email pubblica" : "Public email"}</span>
              <input defaultValue={data.organizer.publicEmail} name="publicEmail" type="email" />
            </label>
            <label className="field">
              <span>{isItalian ? "Telefono pubblico" : "Public phone"}</span>
              <input defaultValue={data.organizer.publicPhone} name="publicPhone" type="text" />
            </label>
            <label className="field">
              <span>{isItalian ? "Email richieste" : "Interest email"}</span>
              <input defaultValue={data.organizer.interestEmail} name="interestEmail" type="email" />
            </label>
            <label className="field">
              <span>{isItalian ? "Venue primaria" : "Primary venue title"}</span>
              <input defaultValue={data.organizer.venueTitle} name="venueTitle" type="text" />
            </label>
            <label className="field field-span">
              <span>{isItalian ? "URL mappa venue primaria" : "Primary venue map URL"}</span>
              <input defaultValue={data.organizer.venueMapHref} name="venueMapHref" type="url" />
            </label>
            <label className="field field-span">
              <span>{isItalian ? "Venue aggiuntive" : "Additional venues"}</span>
              <textarea
                defaultValue={formatVenuesForTextarea(data.organizer.venues)}
                name="venuesText"
                rows="5"
              />
              <small className="field-hint">
                {isItalian
                  ? "Una venue per riga in questo formato: Titolo | Dettaglio | Map URL"
                  : "Use one venue per line in this format: Title | Detail | Map URL"}
              </small>
            </label>
          </div>
        </section>

        <section className="panel section-card admin-section" id="notifications">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Notifications" : "Notifications"}</div>
              <h3>{isItalian ? "Regole di prenotazione e reminder" : "Booking rules and reminders"}</h3>
            </div>
          </div>

          <div className="registration-field-grid">
            <label className="field">
              <span>{isItalian ? "Ore minime di anticipo" : "Minimum advance hours"}</span>
              <input
                defaultValue={data.organizer.minAdvanceHours}
                min="0"
                name="minAdvanceHours"
                type="number"
              />
            </label>
            <label className="field">
              <span>{isItalian ? "Giorni massimi di anticipo" : "Maximum advance days"}</span>
              <input
                defaultValue={data.organizer.maxAdvanceDays || ""}
                min="1"
                name="maxAdvanceDays"
                type="number"
              />
            </label>

            <div className="field field-span">
              <span className="metric-label">{isItalian ? "Disponibilità reminder" : "Reminder availability"}</span>
              <strong>
                {data.siteSettings?.registrationRemindersEnabled
                  ? isItalian
                    ? "I reminder piattaforma sono attivi."
                    : "Platform reminders are enabled."
                  : isItalian
                    ? "I reminder piattaforma sono attualmente disattivati."
                    : "Platform reminders are currently turned off."}
              </strong>
              <small className="field-hint">
                {isItalian
                  ? "Gli organizer possono inviare reminder solo quando il team platform li ha abilitati."
                  : "Organizers can only send reminder emails when the platform team has enabled them."}
              </small>
            </div>

            <div className="field field-span checkbox-field">
              <span>{isItalian ? "Reminder partecipanti" : "Guest reminder email"}</span>
              <label className="checkbox-row">
                <input
                  defaultChecked={
                    Boolean(data.siteSettings?.registrationRemindersEnabled) &&
                    Boolean(data.organizer.registrationRemindersEnabled)
                  }
                  disabled={!data.siteSettings?.registrationRemindersEnabled}
                  name="registrationRemindersEnabled"
                  type="checkbox"
                />
                <div className="checkbox-copy">
                  <strong>
                    {isItalian
                      ? "Invia un reminder prima di ogni data confermata."
                      : "Send a reminder email before each confirmed event date."}
                  </strong>
                  <span>
                    {isItalian
                      ? "Ogni partecipante confermato riceve il reminder prima della data prenotata."
                      : "Each confirmed attendee receives the scheduled reminder before their booked event date."}
                  </span>
                </div>
              </label>
            </div>

            <label className="field">
              <span>{isItalian ? "Timing reminder" : "Reminder timing"}</span>
              <select
                defaultValue={String(data.organizer.registrationReminderLeadHours || 24)}
                disabled={!data.siteSettings?.registrationRemindersEnabled}
                name="registrationReminderLeadHours"
              >
                {REGISTRATION_REMINDER_LEAD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-span">
              <span>{isItalian ? "Nota reminder" : "Reminder note"}</span>
              <textarea
                defaultValue={data.organizer.registrationReminderNote || ""}
                disabled={!data.siteSettings?.registrationRemindersEnabled}
                name="registrationReminderNote"
                rows="4"
              />
              <small className="field-hint">
                {isItalian
                  ? "Questa nota viene aggiunta sotto il template reminder della piattaforma."
                  : "This note is appended below the platform reminder template."}
              </small>
            </label>
          </div>
        </section>

        <section className="panel section-card admin-section" id="account">
          <div className="admin-section-header">
            <div>
              <div className="section-kicker">{isItalian ? "Account" : "Account"}</div>
              <h3>{isItalian ? "Contatto primario organizer" : "Primary organizer admin contact"}</h3>
            </div>
          </div>

          <div className="registration-field-grid">
            <div className="field field-span">
              <span className="metric-label">{isItalian ? "Admin corrente" : "Current primary admin"}</span>
              <strong>
                {data.primaryAdmin
                  ? `${data.primaryAdmin.name} · ${data.primaryAdmin.email}`
                  : isItalian
                    ? "Nessun organizer admin trovato"
                    : "No organizer admin found"}
              </strong>
            </div>
            <label className="field">
              <span>{isItalian ? "Email admin primaria" : "Primary admin email"}</span>
              <input defaultValue={data.primaryAdmin?.email || ""} name="adminEmail" type="email" />
            </label>
            <label className="field">
              <span>{isItalian ? "Nome admin primario" : "Primary admin name"}</span>
              <input defaultValue={data.primaryAdmin?.name || ""} name="adminName" type="text" />
            </label>
          </div>
        </section>

        <section className="panel section-card admin-section">
          <div className="hero-actions">
            <button
              className="button button-primary"
              data-organizer-tour="settings-save"
              type="submit"
            >
              {isItalian ? "Salva impostazioni" : "Save settings"}
            </button>
          </div>
        </section>
      </form>

      <section className="panel section-card admin-section" id="billing">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Billing" : "Billing"}</div>
            <h3>{isItalian ? "Setup pagamenti e payout" : "Payments and payout setup"}</h3>
          </div>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              data-organizer-tour="settings-open-billing"
              href={`/${slug}/admin/billing`}
            >
              {isItalian ? "Apri billing" : "Open billing"}
            </Link>
          </div>
        </div>
        <p className="admin-page-lead">
          {isItalian
            ? "Billing resta una superficie separata perché include Stripe Connect, payout e stato checkout. Da qui devi solo sapere dove trovarlo."
            : "Billing remains a separate surface because it handles Stripe Connect, payouts, and checkout readiness. From here, you just need a clear way to reach it."}
        </p>
      </section>

      <section className="panel section-card admin-section" id="security">
        <div className="section-kicker">{isItalian ? "Security" : "Security"}</div>
        <h3>{isItalian ? "Cambia password admin organizer" : "Change organizer admin password"}</h3>
        <p className="admin-page-lead">
          {isItalian
            ? "La password attuale è richiesta prima di salvarne una nuova. I reset via email continuano a funzionare dalla login e dalla platform admin."
            : "The current password is required before saving a new one. Reset emails still work from the login screen and from platform admin."}
        </p>
        <form action={organizerChangePasswordAction} className="registration-field-grid">
          <input name="slug" type="hidden" value={slug} />
          <label className="field">
            <span>{isItalian ? "Password attuale" : "Current password"}</span>
            <input name="currentPassword" type="password" />
          </label>
          <label className="field">
            <span>{isItalian ? "Nuova password" : "New password"}</span>
            <input minLength="8" name="newPassword" type="password" />
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              {isItalian ? "Aggiorna password" : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
