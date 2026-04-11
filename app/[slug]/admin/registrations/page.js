import { getOrganizerRegistrationsAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { updateOrganizerRegistrationAction } from "../actions.js";

export default async function OrganizerRegistrationsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerRegistrationsAdmin(slug);

  return (
    <section className="panel section-card admin-section">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Registration updated successfully.
        </div>
      ) : null}
      <div className="section-kicker">Registrations</div>
      <h2>Organizer registration queue</h2>
      <div className="admin-card-grid">
        {data.registrations.map((registration) => (
          <article className="admin-card" key={registration.id}>
            <div className="admin-card-head">
              <div>
                <h4>
                  {registration.registrationCode} · {registration.attendeeName}
                </h4>
                <p>{registration.eventTitle}</p>
              </div>
            </div>
            <div className="admin-card-metrics">
              <div>
                <span className="metric-label">Status</span>
                <strong>{registration.status}</strong>
              </div>
              <div>
                <span className="metric-label">Date</span>
                <strong>{registration.occurrenceLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Online collected</span>
                <strong>{registration.onlineCollectedLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Open at venue</span>
                <strong>{registration.dueAtEventOpenLabel}</strong>
              </div>
            </div>
            <div className="hero-actions">
              {registration.actions.map((action) => (
                <form action={updateOrganizerRegistrationAction} key={action}>
                  <input name="slug" type="hidden" value={slug} />
                  <input name="registrationId" type="hidden" value={registration.id} />
                  <input name="action" type="hidden" value={action} />
                  <button className="button button-secondary" type="submit">
                    {action.replaceAll("_", " ")}
                  </button>
                </form>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
