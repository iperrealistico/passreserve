import { getOrganizerPaymentsAdmin } from "../../../../lib/passreserve-admin-service.js";
import { requireOrganizerAdminSession } from "../../../../lib/passreserve-auth.js";
import { recordVenuePaymentAction } from "../actions.js";

export default async function OrganizerPaymentsPage({ params, searchParams }) {
  const { slug } = await params;
  await requireOrganizerAdminSession(slug);
  const query = await searchParams;
  const data = await getOrganizerPaymentsAdmin(slug);

  return (
    <section className="panel section-card admin-section">
      {query.message ? (
        <div className="registration-message registration-message-success">
          Venue payment recorded successfully.
        </div>
      ) : null}
      <div className="section-kicker">Payments</div>
      <h2>Online and venue-side payment tracking</h2>
      <div className="admin-card-grid">
        {data.payments.map((payment) => (
          <article className="admin-card" key={payment.id}>
            <div className="admin-card-head">
              <div>
                <h4>{payment.registrationCode}</h4>
                <p>
                  {payment.attendeeName} · {payment.eventTitle}
                </p>
              </div>
            </div>
            <div className="admin-card-metrics">
              <div>
                <span className="metric-label">Online collected</span>
                <strong>{payment.onlineCollectedLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Venue collected</span>
                <strong>{payment.venueCollectedLabel}</strong>
              </div>
              <div>
                <span className="metric-label">Still due</span>
                <strong>{payment.dueAtEventOpenLabel}</strong>
              </div>
            </div>
            {payment.dueAtEventOpenCents > 0 ? (
              <form action={recordVenuePaymentAction} className="registration-panel-stack">
                <input name="slug" type="hidden" value={slug} />
                <input name="registrationId" type="hidden" value={payment.id} />
                <label className="field">
                  <span>Venue payment cents</span>
                  <input name="amountCents" placeholder={String(payment.dueAtEventOpenCents)} type="number" />
                </label>
                <div className="hero-actions">
                  <button className="button button-primary" type="submit">
                    Record venue payment
                  </button>
                </div>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
