import Link from "next/link";

import { listOrganizerRequests } from "../../../../lib/passreserve-admin-service.js";
import { resendOrganizerAccessAction } from "../../actions.js";

export const metadata = {
  title: "Applications"
};

export default async function PlatformApplicationsPage({ searchParams }) {
  const query = await searchParams;
  const requests = await listOrganizerRequests();

  return (
    <div className="admin-page">
      {query.message === "resent" ? (
        <div className="registration-message registration-message-success">
          Organizer access email queued successfully.
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">Applications</div>
            <h2>Provisioning audit and signup outcomes</h2>
            <p className="admin-page-lead">
              This view tracks organizer signup outcomes separately from the shared mailbox. Use it to inspect duplicates, failed onboarding email deliveries, and linked organizer records.
            </p>
          </div>
          <div className="pill-list">
            <span className="pill">
              {requests.filter((request) => request.provisioningStatus === "EMAIL_FAILED").length} email follow-ups
            </span>
            <span className="pill">
              {requests.filter((request) => request.provisioningStatus === "DUPLICATE").length} duplicates
            </span>
          </div>
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="admin-card-grid">
          {requests.length ? (
            requests.map((request) => (
              <article className="admin-card" key={request.id}>
                <div className="admin-card-head">
                  <div>
                    <div className="admin-badge-row">
                      <span className={`admin-badge admin-badge-${request.statusTone}`}>
                        {request.statusLabel}
                      </span>
                      <span className={`admin-badge admin-badge-${request.provisioningStatusTone}`}>
                        {request.provisioningStatusLabel}
                      </span>
                    </div>
                    <h4>{request.organizerName}</h4>
                    <p>
                      {request.contactName} · {request.contactEmail}
                    </p>
                  </div>
                </div>

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
                    <span className="metric-label">Public slug</span>
                    <strong>{request.organizer?.publicSlug || request.requestedPublicSlug || "Not set"}</strong>
                  </div>
                  <div>
                    <span className="metric-label">Access sends</span>
                    <strong>{request.accessEmailSendCount || 0}</strong>
                  </div>
                </div>

                <p>{request.eventFocus}</p>

                {request.note ? (
                  <div className="admin-note-item">
                    <span className="spotlight-label">Note</span>
                    <strong>{request.note}</strong>
                  </div>
                ) : null}

                {request.accessEmailLastError ? (
                  <div className="registration-message registration-message-error">
                    {request.accessEmailLastError}
                  </div>
                ) : null}

                <div className="hero-actions">
                  {request.organizer ? (
                    <Link className="button button-secondary" href={`/admin/organizers/${request.organizer.slug}`}>
                      Open organizer
                    </Link>
                  ) : null}
                  {request.organizer ? (
                    <form action={resendOrganizerAccessAction}>
                      <input name="requestId" type="hidden" value={request.id} />
                      <button className="button button-primary" type="submit">
                        Resend access
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <article className="admin-card">
              <h4>No applications yet</h4>
              <p>Organizer signup submissions will appear here with provisioning status and linked organizer records.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
