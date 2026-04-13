import { getEditablePlatformContent } from "../../../../lib/passreserve-admin-service.js";
import { updateSiteSettingsAction } from "../../actions.js";

export const metadata = {
  title: "Settings"
};

export default async function PlatformSettingsPage({ searchParams }) {
  const query = await searchParams;
  const { siteSettings } = await getEditablePlatformContent();

  return (
    <section className="panel section-card admin-section">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Settings saved successfully.
        </div>
      ) : null}
      <div className="section-kicker">Site settings</div>
      <h2>Update core platform settings</h2>
      <form action={updateSiteSettingsAction} className="registration-field-grid">
        <label className="field">
          <span>Site name</span>
          <input defaultValue={siteSettings.siteName} name="siteName" type="text" />
        </label>
        <label className="field">
          <span>Platform email</span>
          <input defaultValue={siteSettings.platformEmail} name="platformEmail" type="email" />
        </label>
        <label className="field">
          <span>Launch inbox</span>
          <input defaultValue={siteSettings.launchInbox} name="launchInbox" type="email" />
        </label>
        <label className="field">
          <span>Admin notifications</span>
          <input
            defaultValue={siteSettings.adminNotifications}
            name="adminNotifications"
            type="email"
          />
        </label>
        <div className="field field-span checkbox-field">
          <span>Guest reminders</span>
          <label className="checkbox-row">
            <input
              defaultChecked={siteSettings.registrationRemindersEnabled}
              name="registrationRemindersEnabled"
              type="checkbox"
            />
            <span>
              Let organizers send reminder emails before an event date starts.
            </span>
          </label>
        </div>
        <label className="field field-span">
          <span>Site description</span>
          <textarea defaultValue={siteSettings.siteDescription} name="siteDescription" rows="3" />
        </label>
        <label className="field field-span">
          <span>Support response target</span>
          <textarea
            defaultValue={siteSettings.supportResponseTarget}
            name="supportResponseTarget"
            rows="2"
          />
        </label>
        <label className="field field-span">
          <span>Custom domain</span>
          <input defaultValue={siteSettings.customDomain || ""} name="customDomain" type="text" />
        </label>
        <div className="hero-actions">
          <button className="button button-primary" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </section>
  );
}
