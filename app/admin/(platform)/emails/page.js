import {
  emailTemplateCatalog,
  getEmailDeliverySummary,
  getOrganizerRequestInbox
} from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Emails"
};

export default async function PlatformEmailsPage() {
  const [emailDeliverySummary, inbox] = await Promise.all([
    getEmailDeliverySummary(),
    getOrganizerRequestInbox()
  ]);

  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Emails</div>
          <h2>Host requests, registrations, and payments should sound like one product.</h2>
          <p>
            This catalog keeps host requests, guest confirmations, and payment follow-up in the
            same clear vocabulary.
          </p>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Delivery summary</div>
            <h2>Email status</h2>
            <p>{inbox.storage.detail}</p>
          </div>
          <div className="metrics">
            {emailDeliverySummary.map((metric) => (
              <div className="metric" key={metric.label}>
                <span className="metric-label">{metric.label}</span>
                <div className="metric-value">{metric.value}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Template catalog</div>
        <h3>Templates map cleanly to real moments in the product.</h3>
        <div className="admin-card-grid">
          {emailTemplateCatalog.map((template) => (
            <article className="admin-card" key={template.id}>
              <div className="admin-badge-row">
                <span className="admin-badge admin-badge-public">{template.category}</span>
                <span className="admin-badge admin-badge-unlisted">{template.audience}</span>
              </div>
              <h4>{template.subject}</h4>
              <p>{template.preview}</p>
              <div className="ops-inline-list">
                <span>{template.trigger}</span>
                {template.placeholders.map((placeholder) => (
                  <span key={placeholder}>{placeholder}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-card admin-section">
        <div className="section-kicker">Organizer request inbox</div>
        <h3>New host requests stay easy to review.</h3>
        {inbox.requests.length ? (
          <div className="admin-card-grid">
            {inbox.requests.map((request) => (
              <article className="admin-card" key={request.id}>
                <div className="admin-card-head">
                  <div>
                    <div className="admin-badge-row">
                      <span className={`admin-badge admin-badge-${request.statusTone}`}>
                        {request.statusLabel}
                      </span>
                    </div>
                    <h4>{request.organizerName}</h4>
                    <p>
                      {request.contactName} · {request.city}
                    </p>
                  </div>
                  <div className="admin-card-price">
                    <strong>{request.launchWindow}</strong>
                    <span>{request.paymentModel}</span>
                  </div>
                </div>
                <p>{request.eventFocus}</p>
                <p>{request.note || "No extra notes were added."}</p>
                <div className="ops-inline-list">
                  <span>{request.contactEmail}</span>
                  {request.contactPhone ? <span>{request.contactPhone}</span> : null}
                  <span>{new Date(request.createdAt).toLocaleString("en-GB")}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-note-list">
            <div className="admin-note-item">
              <strong>No host requests yet.</strong>
              <p>
                New host requests from the public homepage will appear here as soon as they are submitted.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
