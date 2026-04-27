import Link from "next/link";

import { getPlatformEmailConsole } from "../../../../lib/passreserve-admin-service.js";
import { getTranslations } from "../../../../lib/passreserve-i18n.js";
import {
  sendMailboxReplyAction,
  updateEmailTemplateAction
} from "../../actions.js";

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
  const tab = typeof query.tab === "string" ? query.tab : "mailbox";
  const threadId = typeof query.thread === "string" ? query.thread : "";
  const { locale, dictionary } = await getTranslations();
  const isItalian = locale === "it";
  const consoleData = await getPlatformEmailConsole({
    threadId
  });

  return (
    <div className="admin-page">
      {query.message === "saved" ? (
        <div className="registration-message registration-message-success">
          {isItalian ? "Template email salvato." : "Email template saved successfully."}
        </div>
      ) : null}
      {query.message === "reply-sent" ? (
        <div className="registration-message registration-message-success">
          {isItalian ? "Reply inviata correttamente." : "Reply sent successfully."}
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
                ? "Mailbox condivisa, delivery log e template nello stesso punto."
                : "Shared mailbox, delivery logs, and templates in one place."}
            </h2>
            <p className="admin-page-lead">{dictionary.email.outboundOnly}</p>
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
              {consoleData.inboundConfigured
                ? isItalian
                  ? "Inbound attivo"
                  : "Inbound active"
                : isItalian
                  ? "Webhook inbox da configurare"
                  : "Inbox webhook pending"}
            </span>
            <span className="pill">
              {consoleData.totalUnreadCount} {isItalian ? "non lette" : "unread"}
            </span>
          </div>
        </div>

        <div className="hero-actions" role="tablist" aria-label={isItalian ? "Tab email" : "Email tabs"}>
          <Link
            aria-current={tab === "mailbox" ? "page" : undefined}
            className={`button ${tab === "mailbox" ? "button-primary" : "button-secondary"}`}
            href={`/admin/emails?tab=mailbox${consoleData.selectedThread ? `&thread=${encodeURIComponent(consoleData.selectedThread.id)}` : ""}`}
          >
            {dictionary.email.inbox}
          </Link>
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

      {tab === "mailbox" ? (
        <section className="admin-grid">
          <article className="panel section-card admin-section">
            <div className="section-kicker">{isItalian ? "Threads" : "Threads"}</div>
            <h3>{consoleData.mailboxAddress || "contact@"}</h3>
            <div className="admin-note-list">
              {consoleData.threads.length ? (
                consoleData.threads.map((thread) => (
                  <div className="admin-note-item" key={thread.id}>
                    <div className="admin-badge-row">
                      <span className={`admin-badge admin-badge-${thread.unreadCount ? "capacity-watch" : "public"}`}>
                        {thread.unreadCount ? `${thread.unreadCount} unread` : "Read"}
                      </span>
                      <span className="admin-badge admin-badge-unlisted">{thread.status}</span>
                    </div>
                    <strong>{thread.participantName || thread.participantEmail}</strong>
                    <p>{thread.subject}</p>
                    <span>{thread.latestSnippet || (isItalian ? "Nessun testo disponibile." : "No preview available.")}</span>
                    <div className="hero-actions">
                      <Link
                        className="button button-secondary"
                        href={`/admin/emails?tab=mailbox&thread=${encodeURIComponent(thread.id)}`}
                      >
                        {isItalian ? "Apri thread" : "Open thread"}
                      </Link>
                      <span className="spotlight-label">
                        {formatDateTime(thread.latestMessageAtLabel, locale)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-note-item">
                  <strong>{isItalian ? "Mailbox vuota" : "Mailbox is empty"}</strong>
                  <p>
                    {isItalian
                      ? "Le email ricevute su contact@ compariranno qui dopo il webhook inbound di Resend."
                      : "Emails received at contact@ will appear here after the Resend inbound webhook runs."}
                  </p>
                </div>
              )}
            </div>
          </article>

          <article className="panel section-card admin-section admin-section-wide">
            <div className="section-kicker">{isItalian ? "Thread aperto" : "Open thread"}</div>
            <h3>
              {consoleData.selectedThread
                ? consoleData.selectedThread.subject
                : isItalian
                  ? "Seleziona un thread"
                  : "Select a thread"}
            </h3>

            {consoleData.selectedThread ? (
              <>
                <div className="pill-list">
                  <span className="pill">
                    {consoleData.selectedThread.participantName || consoleData.selectedThread.participantEmail}
                  </span>
                  <span className="pill">{consoleData.selectedThread.participantEmail}</span>
                </div>

                <div className="admin-note-list">
                  {consoleData.selectedMessages.map((message) => (
                    <div className="admin-note-item" key={message.id}>
                      <div className="admin-badge-row">
                        <span className={`admin-badge admin-badge-${message.direction === "INBOUND" ? "capacity-watch" : "public"}`}>
                          {message.direction}
                        </span>
                        <span className="admin-badge admin-badge-unlisted">
                          {formatDateTime(message.receivedAt || message.sentAt, locale)}
                        </span>
                      </div>
                      <strong>
                        {message.direction === "INBOUND"
                          ? `${message.fromName || message.fromEmail} <${message.fromEmail || ""}>`
                          : `${message.fromName || "Passreserve"} <${message.fromEmail || ""}>`}
                      </strong>
                      <div className="admin-card-metrics">
                        <div>
                          <span className="metric-label">To</span>
                          <strong>{message.toEmails.map((entry) => entry.email).join(", ") || "-"}</strong>
                        </div>
                        <div>
                          <span className="metric-label">CC</span>
                          <strong>{message.ccEmails.map((entry) => entry.email).join(", ") || "-"}</strong>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap rounded-[1.25rem] bg-muted/50 p-4 text-sm text-foreground">
                        {message.plainTextBody || (isItalian ? "Nessun testo disponibile." : "No plain-text body available.")}
                      </pre>
                      {message.attachments.length ? (
                        <div className="hero-actions">
                          {message.attachments.map((attachment) => (
                            <Link
                              className="button button-secondary"
                              href={attachment.href}
                              key={attachment.id}
                            >
                              {attachment.filename || "Attachment"}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <form action={sendMailboxReplyAction} className="registration-panel-stack">
                  <input name="threadId" type="hidden" value={consoleData.selectedThread.id} />
                  <label className="field">
                    <span>{isItalian ? "Reply testo semplice" : "Plain-text reply"}</span>
                    <textarea name="body" rows="8" />
                  </label>
                  <div className="hero-actions">
                    <button className="button button-primary" type="submit">
                      {isItalian ? "Invia reply" : "Send reply"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <article className="admin-card">
                <h4>{isItalian ? "Nessun thread selezionato" : "No thread selected"}</h4>
                <p>
                  {isItalian
                    ? "Apri un thread dalla colonna sinistra per leggere il plain text e inviare una reply da contact@."
                    : "Open a thread from the left column to read plain text and send a reply from contact@."}
                </p>
              </article>
            )}
          </article>
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
