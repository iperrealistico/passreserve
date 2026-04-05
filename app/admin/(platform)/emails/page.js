import { emailDeliverySummary, emailTemplateCatalog, signupRequestCatalog } from "../../../../lib/passreserve-platform";

export const metadata = {
  title: "Platform emails"
};

export default function PlatformEmailsPage() {
  return (
    <div className="admin-page">
      <section className="hero admin-hero">
        <article className="panel hero-copy admin-hero-copy">
          <div className="section-kicker">Email scenarios</div>
          <h2>Registration, payment, organizer, and launch emails now share one vocabulary.</h2>
          <p>
            Phase 11 updates the template catalog so every scenario speaks in organizer, event,
            occurrence, registration, and payment terms. The same page also keeps the organizer
            join-request inbox visible, matching how the legacy email console grouped templates and
            operational inbox work.
          </p>
        </article>

        <aside className="panel hero-aside admin-hero-aside">
          <div className="status-block">
            <div className="status-label">Delivery summary</div>
            <h2>Email operations</h2>
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
        <h3>Every template now maps to a concrete Passreserve.com scenario.</h3>
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
        <h3>Join requests stay useful after the product rename.</h3>
        <div className="admin-card-grid">
          {signupRequestCatalog.map((request) => (
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
              <p>{request.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
