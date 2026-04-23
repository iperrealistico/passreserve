import Link from "next/link";

import {
  getPlatformEmailConsole
} from "../../../../lib/passreserve-admin-service.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import { updateEmailTemplateAction } from "../../actions.js";

export const metadata = {
  title: "Emails"
};

function formatDateTime(value, locale) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default async function PlatformEmailsPage({ searchParams }) {
  const query = await searchParams;
  const tab = typeof query.tab === "string" ? query.tab : "delivery";
  const { locale, dictionary } = await getTranslations();
  const isItalian = locale === "it";
  const consoleData = await getPlatformEmailConsole();

  return (
    <div className="admin-page">
      {query.message ? (
        <div className="registration-message registration-message-success">
          {isItalian ? "Template email salvato." : "Email template saved successfully."}
        </div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Console email" : "Email console"}</div>
            <h2>
              {isItalian
                ? "Consegne, inbox operativa e template nello stesso punto."
                : "Delivery logs, operational inbox, and templates in one place."}
            </h2>
            <p className="admin-page-lead">{dictionary.email.outboundOnly}</p>
          </div>
          <div className="pill-list">
            <span className="pill">
              {consoleData.outboundConfigured
                ? isItalian
                  ? "Resend configurato"
                  : "Resend configured"
                : isItalian
                  ? "Solo log"
                  : "Log only"}
            </span>
            <span className="pill">
              {consoleData.inboxOpenCount} {isItalian ? "richieste aperte" : "open requests"}
            </span>
          </div>
        </div>

        <div className="hero-actions" role="tablist" aria-label={isItalian ? "Tab email" : "Email tabs"}>
          <Link
            aria-current={tab === "delivery" ? "page" : undefined}
            className={`button ${tab === "delivery" ? "button-primary" : "button-secondary"}`}
            href="/admin/emails?tab=delivery"
          >
            {dictionary.email.deliveryLogs}
          </Link>
          <Link
            aria-current={tab === "inbox" ? "page" : undefined}
            className={`button ${tab === "inbox" ? "button-primary" : "button-secondary"}`}
            href="/admin/emails?tab=inbox"
          >
            {dictionary.email.inbox}
          </Link>
          <Link
            aria-current={tab === "templates" ? "page" : undefined}
            className={`button ${tab === "templates" ? "button-primary" : "button-secondary"}`}
            href="/admin/emails?tab=templates"
          >
            {dictionary.email.templateEditor}
          </Link>
        </div>
      </section>

      {tab === "inbox" ? (
        <section className="panel section-card admin-section">
          <div className="section-kicker">{dictionary.email.inbox}</div>
          <h3>
            {isItalian
              ? "Richieste organizer e code operative"
              : "Organizer requests and operational queues"}
          </h3>
          <div className="admin-card-grid">
            {consoleData.inbox.length ? (
              consoleData.inbox.map((request) => (
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
                  <div className="admin-card-metrics">
                    <div>
                      <span className="metric-label">{isItalian ? "Città" : "City"}</span>
                      <strong>{request.city}</strong>
                    </div>
                    <div>
                      <span className="metric-label">{isItalian ? "Finestra lancio" : "Launch window"}</span>
                      <strong>{request.launchWindow}</strong>
                    </div>
                    <div>
                      <span className="metric-label">{isItalian ? "Modello pagamenti" : "Payment model"}</span>
                      <strong>{request.paymentModel}</strong>
                    </div>
                  </div>
                  <p>{request.eventFocus}</p>
                  {request.note ? (
                    <div className="admin-note-item">
                      <span className="spotlight-label">{isItalian ? "Nota" : "Note"}</span>
                      <strong>{request.note}</strong>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <article className="admin-card">
                <h4>{isItalian ? "Inbox vuota" : "Inbox is clear"}</h4>
                <p>
                  {isItalian
                    ? "Non ci sono richieste organizer aperte in questo momento."
                    : "There are no open organizer requests right now."}
                </p>
              </article>
            )}
          </div>
        </section>
      ) : null}

      {tab === "templates" ? (
        <section className="panel section-card admin-section">
          <div className="section-kicker">{dictionary.email.templateEditor}</div>
          <h3>{isItalian ? "Template email live" : "Live email templates"}</h3>
          <div className="admin-card-grid">
            {consoleData.emailTemplates.map((template) => (
              <article className="admin-card" key={template.id}>
                <div className="admin-card-head">
                  <div>
                    <div className="admin-badge-row">
                      <span className="admin-badge admin-badge-public">{template.category}</span>
                      <span className="admin-badge admin-badge-unlisted">{template.audience}</span>
                    </div>
                    <h4>{template.slug}</h4>
                    <p>{template.trigger}</p>
                  </div>
                </div>

                <form action={updateEmailTemplateAction} className="registration-panel-stack">
                  <input name="id" type="hidden" value={template.id} />
                  <label className="field">
                    <span>{isItalian ? "Oggetto" : "Subject"}</span>
                    <input defaultValue={template.subject} name="subject" type="text" />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Preview" : "Preview"}</span>
                    <textarea defaultValue={template.preview} name="preview" rows="2" />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Body HTML" : "HTML body"}</span>
                    <textarea defaultValue={template.bodyHtml} name="bodyHtml" rows="8" />
                  </label>
                  <div className="hero-actions">
                    <button className="button button-primary" type="submit">
                      {isItalian ? "Salva template" : "Save template"}
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "delivery" ? (
        <section className="panel section-card admin-section">
          <div className="section-kicker">{dictionary.email.deliveryLogs}</div>
          <h3>{isItalian ? "Ultime consegne email" : "Recent email deliveries"}</h3>
          <div className="admin-card-grid">
            {consoleData.deliveryLogs.length ? (
              consoleData.deliveryLogs.map((entry) => (
                <article className="admin-card" key={entry.id}>
                  <div className="admin-card-head">
                    <div>
                      <div className={`admin-badge admin-badge-${entry.statusTone}`}>
                        {entry.deliveryStatus}
                      </div>
                      <h4>{entry.templateSlug}</h4>
                      <p>{entry.recipientEmail}</p>
                    </div>
                  </div>
                  <div className="admin-note-list">
                    <div className="admin-note-item">
                      <span className="spotlight-label">{isItalian ? "Inviata il" : "Sent at"}</span>
                      <strong>{formatDateTime(entry.sentAt, locale)}</strong>
                    </div>
                    {entry.metadata ? (
                      <div className="admin-note-item">
                        <span className="spotlight-label">Metadata</span>
                        <strong>{JSON.stringify(entry.metadata)}</strong>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <article className="admin-card">
                <h4>{isItalian ? "Nessun log email ancora" : "No email logs yet"}</h4>
                <p>
                  {isItalian
                    ? "I log di invio compariranno qui quando partiranno email transazionali."
                    : "Delivery logs will appear here once transactional emails are sent."}
                </p>
              </article>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
