import Link from "next/link";

import { getOrganizerSettingsAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { REGISTRATION_REMINDER_LEAD_OPTIONS } from "../../../../lib/passreserve-email-delivery.js";
import {
  organizerChangePasswordAction,
  saveOrganizerSettingsAction
} from "../actions.js";

export const metadata = {
  title: "Organizer settings"
};

function formatVenuesForTextarea(venues = []) {
  return venues
    .map((venue) => [venue.title, venue.detail, venue.mapHref].map((value) => value || "").join(" | "))
    .join("\n");
}

function resolveMessage(value) {
  switch (value) {
    case "saved":
      return "Organizer settings saved successfully.";
    case "password-updated":
      return "Password updated successfully.";
    default:
      return "";
  }
}

export default async function OrganizerSettingsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const tab = typeof query.tab === "string" ? query.tab : "general";
  const data = await getOrganizerSettingsAdmin(slug);
  const successMessage = resolveMessage(typeof query.message === "string" ? query.message : "");
  const errorMessage = typeof query.error === "string" ? query.error : "";

  return (
    <div className="admin-page">
      {successMessage ? (
        <div className="registration-message registration-message-success">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="registration-message registration-message-error">{errorMessage}</div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer settings</div>
        <h2>{data.organizer.name}</h2>
        <p>Manage your public organizer profile, booking rules, and account security.</p>
        <div className="hero-actions">
          <Link
            className={`button ${tab === "general" ? "button-primary" : "button-secondary"}`}
            href={`/${slug}/admin/settings?tab=general`}
          >
            General
          </Link>
          <Link
            className={`button ${tab === "security" ? "button-primary" : "button-secondary"}`}
            href={`/${slug}/admin/settings?tab=security`}
          >
            Security
          </Link>
        </div>
      </section>

      {tab === "security" ? (
        <section className="panel section-card admin-section">
          <div className="section-kicker">Security</div>
          <h3>Change organizer admin password</h3>
          <p>
            The current password is required before saving a new one. Reset emails still work from
            the login screen and from platform admin.
          </p>
          <form action={organizerChangePasswordAction} className="registration-field-grid">
            <input name="slug" type="hidden" value={slug} />
            <label className="field">
              <span>Current password</span>
              <input name="currentPassword" type="password" />
            </label>
            <label className="field">
              <span>New password</span>
              <input minLength="8" name="newPassword" type="password" />
            </label>
            <div className="hero-actions">
              <button className="button button-primary" type="submit">
                Update password
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="panel section-card admin-section">
          <div className="section-kicker">General</div>
          <h3>Public profile and registration rules</h3>
          <p>
            Update the public organizer profile, booking window, and the guest reminder settings
            tied to your registrations.
          </p>
          <form action={saveOrganizerSettingsAction} className="registration-field-grid">
            <input name="slug" type="hidden" value={slug} />
            <label className="field">
              <span>Organizer name</span>
              <input defaultValue={data.organizer.name} name="name" type="text" />
            </label>
            <label className="field">
              <span>Tagline</span>
              <input defaultValue={data.organizer.tagline} name="tagline" type="text" />
            </label>
            <label className="field">
              <span>City</span>
              <input defaultValue={data.organizer.city} name="city" type="text" />
            </label>
            <label className="field">
              <span>Region</span>
              <input defaultValue={data.organizer.region} name="region" type="text" />
            </label>
            <label className="field">
              <span>Public email</span>
              <input defaultValue={data.organizer.publicEmail} name="publicEmail" type="email" />
            </label>
            <label className="field">
              <span>Public phone</span>
              <input defaultValue={data.organizer.publicPhone} name="publicPhone" type="text" />
            </label>
            <label className="field">
              <span>Interest email</span>
              <input defaultValue={data.organizer.interestEmail} name="interestEmail" type="email" />
            </label>
            <label className="field">
              <span>Primary venue title</span>
              <input defaultValue={data.organizer.venueTitle} name="venueTitle" type="text" />
            </label>
            <label className="field">
              <span>Primary admin email</span>
              <input defaultValue={data.primaryAdmin?.email || ""} name="adminEmail" type="email" />
            </label>
            <label className="field">
              <span>Primary admin name</span>
              <input defaultValue={data.primaryAdmin?.name || ""} name="adminName" type="text" />
            </label>
            <label className="field field-span">
              <span>Description</span>
              <textarea defaultValue={data.organizer.description} name="description" rows="3" />
            </label>
            <label className="field field-span">
              <span>Primary venue detail</span>
              <textarea defaultValue={data.organizer.venueDetail} name="venueDetail" rows="3" />
            </label>
            <label className="field field-span">
              <span>Primary venue map URL</span>
              <input defaultValue={data.organizer.venueMapHref} name="venueMapHref" type="url" />
            </label>
            <label className="field field-span">
              <span>Additional venues</span>
              <textarea
                defaultValue={formatVenuesForTextarea(data.organizer.venues)}
                name="venuesText"
                rows="5"
              />
              <small className="field-hint">
                Use one venue per line in this format: <code>Title | Detail | Map URL</code>
              </small>
            </label>
            <label className="field">
              <span>Minimum advance hours</span>
              <input
                defaultValue={data.organizer.minAdvanceHours}
                min="0"
                name="minAdvanceHours"
                type="number"
              />
            </label>
            <label className="field">
              <span>Maximum advance days</span>
              <input
                defaultValue={data.organizer.maxAdvanceDays || ""}
                min="1"
                name="maxAdvanceDays"
                type="number"
              />
            </label>
            <div className="field field-span">
              <span className="metric-label">Reminder availability</span>
              <strong>
                {data.siteSettings?.registrationRemindersEnabled
                  ? "Platform reminders are enabled."
                  : "Platform reminders are currently turned off."}
              </strong>
              <small className="field-hint">
                Organizers can only send reminder emails when the platform team has enabled them.
              </small>
            </div>
            <div className="field field-span checkbox-field">
              <span>Guest reminder email</span>
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
                <span>
                  Send a reminder email before each confirmed event date.
                </span>
              </label>
            </div>
            <label className="field">
              <span>Reminder timing</span>
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
              <span>Reminder note</span>
              <textarea
                defaultValue={data.organizer.registrationReminderNote || ""}
                disabled={!data.siteSettings?.registrationRemindersEnabled}
                name="registrationReminderNote"
                rows="4"
              />
              <small className="field-hint">
                This note is added below the platform reminder template, so you can share arrival
                tips, parking guidance, or what guests should bring.
              </small>
            </label>
            <div className="field field-span">
              <span className="metric-label">Current primary admin</span>
              <strong>
                {data.primaryAdmin
                  ? `${data.primaryAdmin.name} · ${data.primaryAdmin.email}`
                  : "No organizer admin found"}
              </strong>
            </div>
            <div className="hero-actions">
              <button className="button button-primary" type="submit">
                Save settings
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
