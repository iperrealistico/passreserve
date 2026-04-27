import Link from "next/link";

import { getPlatformOrganizers } from "../../../../lib/passreserve-admin-service.js";
import {
  createOrganizerAction,
  openOrganizerDashboardAction
} from "../../actions.js";

export const metadata = {
  title: "Organizers"
};

export default async function PlatformOrganizersPage({ searchParams }) {
  const query = await searchParams;
  const organizers = await getPlatformOrganizers();

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {query.message === "deleted"
            ? "Organizer deleted successfully."
            : "Organizer workflow updated successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">
          {query.error}
        </div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="section-kicker">Manual organizer creation</div>
        <h3>Create an organizer directly</h3>
        <p className="admin-page-lead">
          Applications now live in <Link className="inline-link" href="/admin/applications">Applications</Link>. Use this form only when the platform team needs to bootstrap an organizer account directly.
        </p>
        <form action={createOrganizerAction} className="registration-field-grid">
          <label className="field">
            <span>Name</span>
            <input name="name" required type="text" />
          </label>
          <label className="field">
            <span>Slug</span>
            <input name="slug" placeholder="optional-clean-slug" type="text" />
          </label>
          <label className="field">
            <span>Public slug</span>
            <input name="publicSlug" placeholder="optional-public-slug" type="text" />
          </label>
          <label className="field">
            <span>Tagline</span>
            <input name="tagline" type="text" />
          </label>
          <label className="field">
            <span>City</span>
            <input name="city" required type="text" />
          </label>
          <label className="field">
            <span>Region</span>
            <input name="region" type="text" />
          </label>
          <label className="field">
            <span>Public email</span>
            <input name="publicEmail" required type="email" />
          </label>
          <label className="field">
            <span>Public phone</span>
            <input name="publicPhone" type="text" />
          </label>
          <label className="field">
            <span>Primary admin email</span>
            <input name="adminEmail" required type="email" />
          </label>
          <label className="field">
            <span>Primary admin name</span>
            <input name="adminName" type="text" />
          </label>
          <label className="field">
            <span>Primary venue title</span>
            <input name="venueTitle" type="text" />
          </label>
          <label className="field">
            <span>Primary venue map URL</span>
            <input name="venueMapHref" type="url" />
          </label>
          <label className="field field-span">
            <span>Description</span>
            <textarea name="description" rows="3" />
          </label>
          <label className="field field-span">
            <span>Primary venue detail</span>
            <textarea name="venueDetail" rows="3" />
          </label>
          <label className="field field-span">
            <span>Additional venues</span>
            <textarea name="venuesText" rows="5" />
            <small className="field-hint">
              Use one venue per line in this format: <code>Title | Detail | Map URL</code>
            </small>
          </label>
          <div className="hero-actions">
            <button className="button button-primary" type="submit">
              Create organizer
            </button>
          </div>
        </form>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer directory</div>
        <h3>Current organizer accounts</h3>
        <div className="admin-card-grid">
          {organizers.map((organizer) => (
            <article className="admin-card" key={organizer.slug}>
              <div className="admin-card-head">
                <div>
                  <div className="admin-badge-row">
                    <span className={`admin-badge admin-badge-${organizer.launchStatusTone}`}>
                      {organizer.launchStatusLabel}
                    </span>
                    <span className={`admin-badge admin-badge-${organizer.publicationStatusTone}`}>
                      {organizer.publicationStatusLabel}
                    </span>
                    <span className={`admin-badge admin-badge-${organizer.healthTone}`}>
                      {organizer.healthLabel}
                    </span>
                  </div>
                  <h4>{organizer.name}</h4>
                  <p>
                    {organizer.city}, {organizer.region}
                  </p>
                  <p>/{organizer.publicSlug}</p>
                </div>
              </div>
              <div className="admin-card-metrics">
                <div>
                  <span className="metric-label">Events</span>
                  <strong>{organizer.metrics.eventCount}</strong>
                </div>
                <div>
                  <span className="metric-label">Occurrences</span>
                  <strong>{organizer.metrics.publishedOccurrences}</strong>
                </div>
                <div>
                  <span className="metric-label">Online collected</span>
                  <strong>{organizer.summary.onlineCollectedLabel}</strong>
                </div>
                <div>
                  <span className="metric-label">Due at venue</span>
                  <strong>{organizer.summary.dueAtEventLabel}</strong>
                </div>
              </div>
              <div className="hero-actions">
                <Link className="button button-primary" href={organizer.detailHref}>
                  Open detail
                </Link>
                <form action={openOrganizerDashboardAction}>
                  <input name="slug" type="hidden" value={organizer.slug} />
                  <button className="button button-secondary" type="submit">
                    Open organizer dashboard
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
