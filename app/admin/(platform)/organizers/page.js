import Link from "next/link";

import {
  getPlatformOrganizers,
  listOrganizerRequests
} from "../../../../lib/passreserve-admin-service.js";
import {
  approveOrganizerRequestAction,
  createOrganizerAction
} from "../../actions.js";

export const metadata = {
  title: "Organizers"
};

export default async function PlatformOrganizersPage({ searchParams }) {
  const query = await searchParams;
  const organizers = await getPlatformOrganizers();
  const requests = await listOrganizerRequests();

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Organizer workflow updated successfully.
        </div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="section-kicker">Join requests</div>
        <h3>Approve organizer requests</h3>
        <div className="admin-card-grid">
          {requests.length ? (
            requests.map((request) => (
              <article className="admin-card" key={request.id}>
                <div className="admin-card-head">
                  <div>
                    <div className={`admin-badge admin-badge-${request.statusTone}`}>
                      {request.statusLabel}
                    </div>
                    <h4>{request.organizerName}</h4>
                    <p>
                      {request.contactName} · {request.contactEmail}
                    </p>
                  </div>
                </div>
                <p>{request.eventFocus}</p>
                <div className="admin-card-metrics">
                  <div>
                    <span className="metric-label">City</span>
                    <strong>{request.city}</strong>
                  </div>
                  <div>
                    <span className="metric-label">Launch window</span>
                    <strong>{request.launchWindow}</strong>
                  </div>
                  <div>
                    <span className="metric-label">Payment model</span>
                    <strong>{request.paymentModel}</strong>
                  </div>
                </div>
                {request.status === "PENDING" ? (
                  <form action={approveOrganizerRequestAction}>
                    <input name="requestId" type="hidden" value={request.id} />
                    <button className="button button-primary" type="submit">
                      Approve organizer
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          ) : (
            <p>No organizer requests are waiting right now.</p>
          )}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Manual organizer creation</div>
        <h3>Create an organizer directly</h3>
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
            <span>Venue title</span>
            <input name="venueTitle" type="text" />
          </label>
          <label className="field">
            <span>Venue map URL</span>
            <input name="venueMapHref" type="url" />
          </label>
          <label className="field field-span">
            <span>Description</span>
            <textarea name="description" rows="3" />
          </label>
          <label className="field field-span">
            <span>Venue detail</span>
            <textarea name="venueDetail" rows="3" />
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
                    <span className={`admin-badge admin-badge-${organizer.healthTone}`}>
                      {organizer.healthLabel}
                    </span>
                  </div>
                  <h4>{organizer.name}</h4>
                  <p>
                    {organizer.city}, {organizer.region}
                  </p>
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
                <Link className="button button-secondary" href={organizer.dashboardHref}>
                  Organizer dashboard
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
