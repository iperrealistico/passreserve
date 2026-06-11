import Link from "next/link";

import { getPlatformEmailConsole } from "../../../../lib/passreserve-admin-service.js";
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
  const tab = query.tab === "templates" ? "templates" : "delivery";
  const { locale, dictionary } = await getTranslations();
  const isItalian = locale === "it";
  const consoleData = await getPlatformEmailConsole();

  return (
    <div className="admin-page">
      {query.message === "saved" ? (
        <div className="registration-message registration-message-success">
          {isItalian ? "Template email salvato." : "Email template saved successfully."}
        </div>
      ) : null}
      {query.error ? (
        <div className="registration-message registration-message-error">{query.error}</div>
      ) : null}

      <section className="panel section-card admin-section">
        <div className="admin-section-header">
          <div>
            <div className="section-kicker">{isItalian ? "Console email" : "Email console"}</div>
            <h2>
              {isItalian
                ? "Log delivery e template email in un unico punto."
                : "Delivery logs and email templates in one place."}
            </h2>
            <p className="admin-page-lead">
              {isItalian
                ? "Le email dirette agli organizer partono dalla loro scheda admin. L'inbound è gestito esternamente via Cloudflare Workers."
                : "Direct organizer emails are sent from each organizer detail page. Inbound mail is handled externally through Cloudflare Workers."}
            </p>
          </div>
          <div className="pill-list">
            <span className="pill">
              {consoleData.outboundConfigured
                ? isItalian
                  ? "Resend outbound ok"
                  : "Resend outbound ok"
                : isItalian
                  ? "Solo log outbound"
                  : "Outbound log only"}
            </span>
            <span className="pill">
              {consoleData.directSenderConfigured
                ? consoleData.defaultDirectFromEmail
                : isItalian
                  ? "Mittente direct non pronto"
                  : "Direct sender not ready"}
            </span>
            <span className="pill">
              {isItalian ? "Inbound esterno" : "Inbound external"}
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
            aria-current={tab === "templates" ? "page" : undefined}
            className={`button ${tab === "templates" ? "button-primary" : "button-secondary"}`}
            href="/admin/emails?tab=templates"
          >
            {dictionary.email.templateEditor}
          </Link>
        </div>
      </section>

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
                  <div className="admin-note-item">
                    <span className="spotlight-label">
                      {isItalian ? "Fallback / default" : "Fallback / default"}
                    </span>
                    <strong>
                      {isItalian
                        ? "Se un campo per lingua resta vuoto, l'email usa questi valori di default."
                        : "If a locale-specific field stays empty, the email falls back to these default values."}
                    </strong>
                  </div>
                  <label className="field">
                    <span>{isItalian ? "Oggetto default" : "Default subject"}</span>
                    <input defaultValue={template.subject} name="subject" type="text" />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Preview default" : "Default preview"}</span>
                    <textarea defaultValue={template.preview} name="preview" rows="2" />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Body HTML default" : "Default HTML body"}</span>
                    <textarea defaultValue={template.bodyHtml} name="bodyHtml" rows="8" />
                  </label>
                  <div className="admin-note-list">
                    <div className="admin-note-item">
                      <span className="spotlight-label">Italiano</span>
                      <strong>
                        {isItalian
                          ? "Questi override vengono usati quando la registrazione è in italiano."
                          : "These overrides are used when the registration locale is Italian."}
                      </strong>
                    </div>
                  </div>
                  <label className="field">
                    <span>{isItalian ? "Oggetto IT" : "Italian subject"}</span>
                    <input
                      defaultValue={template.subjectTranslations?.it || ""}
                      name="subject_it"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Preview IT" : "Italian preview"}</span>
                    <textarea
                      defaultValue={template.previewTranslations?.it || ""}
                      name="preview_it"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Body HTML IT" : "Italian HTML body"}</span>
                    <textarea
                      defaultValue={template.bodyHtmlTranslations?.it || ""}
                      name="bodyHtml_it"
                      rows="8"
                    />
                  </label>
                  <div className="admin-note-list">
                    <div className="admin-note-item">
                      <span className="spotlight-label">English</span>
                      <strong>
                        {isItalian
                          ? "Questi override vengono usati quando la registrazione è in inglese."
                          : "These overrides are used when the registration locale is English."}
                      </strong>
                    </div>
                  </div>
                  <label className="field">
                    <span>{isItalian ? "Oggetto EN" : "English subject"}</span>
                    <input
                      defaultValue={template.subjectTranslations?.en || ""}
                      name="subject_en"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Preview EN" : "English preview"}</span>
                    <textarea
                      defaultValue={template.previewTranslations?.en || ""}
                      name="preview_en"
                      rows="2"
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Body HTML EN" : "English HTML body"}</span>
                    <textarea
                      defaultValue={template.bodyHtmlTranslations?.en || ""}
                      name="bodyHtml_en"
                      rows="8"
                    />
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
