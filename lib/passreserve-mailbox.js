import {
  asIso,
  createToken,
  formatDateTimeLabel,
  normalizeEmail,
  normalizeText
} from "./passreserve-format.js";
import { hasResend } from "./passreserve-config.js";
import { sendTransactionalEmail } from "./passreserve-email.js";
import {
  getReceivedEmailAttachment,
  getReceivedEmailById,
  getResendWebhookSecret
} from "./passreserve-resend.js";
import { loadPersistentState, mutatePersistentState } from "./passreserve-state.js";

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeMailboxAddress(value) {
  return normalizeEmail(value);
}

function normalizeMailboxSubject(subject) {
  return normalizeText(subject).replace(/^((re|fw|fwd|aw)\s*:\s*)+/i, "").trim();
}

function ensureReplySubject(subject) {
  const resolved = normalizeText(subject) || "Reply";
  return /^re:/i.test(resolved) ? resolved : `Re: ${resolved}`;
}

function parseMailboxAddress(value) {
  const raw = normalizeText(value);

  if (!raw) {
    return {
      raw: "",
      email: "",
      name: ""
    };
  }

  const match = raw.match(/^(.*?)(?:<([^>]+)>)$/);

  if (match) {
    return {
      raw,
      email: normalizeMailboxAddress(match[2]),
      name: normalizeText(match[1]).replace(/^"|"$/g, "")
    };
  }

  return {
    raw,
    email: normalizeMailboxAddress(raw),
    name: ""
  };
}

function parseMailboxAddressList(values) {
  return ensureArray(values)
    .map(parseMailboxAddress)
    .filter((entry) => entry.email);
}

function splitReferences(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getHeaderValue(headers, ...keys) {
  if (!headers || typeof headers !== "object") {
    return "";
  }

  for (const key of keys) {
    const exact = headers[key];

    if (typeof exact === "string" && exact.trim()) {
      return exact.trim();
    }

    const lower = headers[String(key).toLowerCase()];

    if (typeof lower === "string" && lower.trim()) {
      return lower.trim();
    }
  }

  return "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlToPlainText(html) {
  return normalizeText(
    String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
  );
}

function plainTextToHtml(text) {
  return `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`;
}

function appendAuditLog(draft, input) {
  draft.auditLogs.unshift({
    id: createToken(),
    createdAt: input.createdAt || new Date().toISOString(),
    actorType: input.actorType,
    actorId: input.actorId || null,
    organizerId: input.organizerId || null,
    registrationId: input.registrationId || null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId || null,
    message: input.message,
    metadata: input.metadata || null
  });
}

function getMailboxAddress(state) {
  return (
    normalizeMailboxAddress(state?.siteSettings?.launchInbox) ||
    normalizeMailboxAddress(process.env.FROM_EMAIL)
  );
}

function getMailboxThreads(state) {
  return ensureArray(state.mailboxThreads);
}

function getMailboxMessages(state) {
  return ensureArray(state.mailboxMessages);
}

function getMailboxAttachments(state) {
  return ensureArray(state.mailboxAttachments);
}

function getThreadMessages(state, threadId) {
  return getMailboxMessages(state)
    .filter((message) => message.threadId === threadId)
    .sort((left, right) =>
      String(left.createdAt || left.receivedAt || left.sentAt || "").localeCompare(
        String(right.createdAt || right.receivedAt || right.sentAt || "")
      )
    );
}

function findThreadByHeaders(state, participantEmail, normalizedSubject, references, inReplyTo) {
  const referenceSet = new Set([inReplyTo, ...ensureArray(references)].filter(Boolean));

  if (referenceSet.size) {
    const matchingMessage = getMailboxMessages(state).find((message) =>
      referenceSet.has(message.messageId)
    );

    if (matchingMessage) {
      return getMailboxThreads(state).find((thread) => thread.id === matchingMessage.threadId) || null;
    }
  }

  return (
    getMailboxThreads(state).find(
      (thread) =>
        thread.participantEmail === participantEmail &&
        thread.normalizedSubject === normalizedSubject
    ) || null
  );
}

function getLatestMailboxMessage(state, threadId) {
  const messages = getThreadMessages(state, threadId);
  return messages[messages.length - 1] || null;
}

function getLatestInboundMessage(state, threadId) {
  const messages = getThreadMessages(state, threadId).filter(
    (message) => message.direction === "INBOUND"
  );
  return messages[messages.length - 1] || null;
}

function buildReferenceHeader(messages) {
  return Array.from(
    new Set(messages.map((message) => message.messageId).filter(Boolean))
  );
}

function buildMailboxAttachmentLink(attachmentId) {
  return `/admin/emails/attachments/${attachmentId}`;
}

function buildMailboxThreadView(state, thread) {
  const messages = getThreadMessages(state, thread.id);
  const latestMessage = messages[messages.length - 1] || null;

  return {
    ...thread,
    messageCount: messages.length,
    latestSnippet: normalizeText(
      latestMessage?.textBody || htmlToPlainText(latestMessage?.htmlBody || "")
    ).slice(0, 180),
    latestDirection: latestMessage?.direction || null,
    latestMessageAtLabel: latestMessage?.receivedAt || latestMessage?.sentAt || thread.latestMessageAt
  };
}

function buildMailboxMessageView(state, message) {
  const attachments = getMailboxAttachments(state)
    .filter((attachment) => attachment.messageId === message.id)
    .map((attachment) => ({
      ...attachment,
      href: buildMailboxAttachmentLink(attachment.id)
    }));

  return {
    ...message,
    plainTextBody: message.textBody || htmlToPlainText(message.htmlBody || ""),
    attachments
  };
}

function getMailboxParticipantReplyAddress(message, thread) {
  const replyTo = ensureArray(message?.replyToEmails)[0];

  if (replyTo?.email) {
    return replyTo.email;
  }

  if (message?.fromEmail) {
    return message.fromEmail;
  }

  return thread.participantEmail;
}

function getMailboxSupportName() {
  return "Passreserve";
}

export function isMailboxConfigured(state) {
  return Boolean(getMailboxAddress(state));
}

export function isMailboxInboundConfigured(state) {
  return Boolean(isMailboxConfigured(state) && getResendWebhookSecret());
}

export async function ingestSharedMailboxEmail(event) {
  if (event?.type !== "email.received" || !event?.data?.email_id) {
    return {
      ok: true,
      ignored: true
    };
  }

  const email = await getReceivedEmailById(event.data.email_id);
  const sender = parseMailboxAddress(email.from);
  const recipients = parseMailboxAddressList(email.to);
  const ccRecipients = parseMailboxAddressList(email.cc);
  const replyToRecipients = parseMailboxAddressList(email.reply_to);
  const mailboxAddress = recipients[0]?.email || "";
  const subject = normalizeText(email.subject);
  const normalizedSubject = normalizeMailboxSubject(subject) || "(no subject)";
  const headers = email.headers || {};
  const inReplyTo = getHeaderValue(headers, "in-reply-to", "In-Reply-To");
  const references = splitReferences(getHeaderValue(headers, "references", "References"));
  const receivedAt = asIso(email.created_at) || new Date().toISOString();
  const textBody = normalizeText(email.text) || htmlToPlainText(email.html || "");
  const htmlBody = normalizeText(email.html);

  return mutatePersistentState(async (draft) => {
    const configuredMailbox = getMailboxAddress(draft);

    if (
      configuredMailbox &&
      !recipients.some((recipient) => recipient.email === configuredMailbox)
    ) {
      return {
        ok: true,
        ignored: true
      };
    }

    const existing = getMailboxMessages(draft).find(
      (message) => message.resendEmailId === event.data.email_id
    );

    if (existing) {
      return {
        ok: true,
        duplicate: true,
        threadId: existing.threadId
      };
    }

    let thread = findThreadByHeaders(
      draft,
      sender.email,
      normalizedSubject,
      references,
      inReplyTo
    );
    const now = new Date().toISOString();

    if (!thread) {
      thread = {
        id: createToken(),
        mailboxAddress: configuredMailbox || mailboxAddress,
        participantName: sender.name,
        participantEmail: sender.email,
        subject: subject || normalizedSubject,
        normalizedSubject,
        status: "OPEN",
        unreadCount: 0,
        latestMessageAt: receivedAt,
        createdAt: now,
        updatedAt: now
      };
      draft.mailboxThreads.unshift(thread);
    }

    const message = {
      id: createToken(),
      threadId: thread.id,
      direction: "INBOUND",
      resendEmailId: event.data.email_id,
      messageId: normalizeText(email.message_id) || null,
      inReplyTo: inReplyTo || null,
      references,
      fromName: sender.name,
      fromEmail: sender.email,
      toEmails: recipients,
      ccEmails: ccRecipients,
      replyToEmails: replyToRecipients,
      subject: subject || thread.subject,
      textBody,
      htmlBody,
      receivedAt,
      sentAt: null,
      createdAt: receivedAt,
      updatedAt: receivedAt
    };

    draft.mailboxMessages.push(message);

    for (const attachment of ensureArray(email.attachments)) {
      draft.mailboxAttachments.push({
        id: createToken(),
        messageId: message.id,
        resendAttachmentId: attachment.id,
        resendEmailId: event.data.email_id,
        filename: attachment.filename,
        contentType: attachment.content_type || "",
        contentDisposition: attachment.content_disposition || null,
        contentId: attachment.content_id || null,
        sizeBytes:
          typeof attachment.size === "number" && Number.isFinite(attachment.size)
            ? attachment.size
            : null,
        createdAt: receivedAt,
        updatedAt: receivedAt
      });
    }

    thread.participantName = sender.name || thread.participantName;
    thread.participantEmail = sender.email || thread.participantEmail;
    thread.subject = subject || thread.subject;
    thread.normalizedSubject = normalizedSubject;
    thread.unreadCount = Number(thread.unreadCount || 0) + 1;
    thread.latestMessageAt = receivedAt;
    thread.updatedAt = receivedAt;

    appendAuditLog(draft, {
      actorType: "SYSTEM",
      eventType: "mailbox_message_received",
      entityType: "mailbox_thread",
      entityId: thread.id,
      message: `Stored inbound mailbox message from ${sender.email || "unknown sender"}.`,
      metadata: {
        resendEmailId: event.data.email_id,
        mailboxAddress: thread.mailboxAddress
      }
    });

    return {
      ok: true,
      threadId: thread.id,
      messageId: message.id
    };
  });
}

export async function getSharedMailboxConsole(options = {}) {
  const state = await loadPersistentState();
  const threads = getMailboxThreads(state)
    .slice()
    .sort((left, right) => String(right.latestMessageAt).localeCompare(String(left.latestMessageAt)))
    .map((thread) => buildMailboxThreadView(state, thread));
  const selectedThread =
    threads.find((thread) => thread.id === options.threadId) || threads[0] || null;
  const selectedMessages = selectedThread
    ? getThreadMessages(state, selectedThread.id).map((message) =>
        buildMailboxMessageView(state, message)
      )
    : [];

  return {
    mailboxAddress: getMailboxAddress(state),
    outboundConfigured: Boolean(hasResend() && process.env.FROM_EMAIL?.trim()),
    inboundConfigured: isMailboxInboundConfigured(state),
    threads,
    selectedThread,
    selectedMessages,
    totalUnreadCount: threads.reduce((sum, thread) => sum + Number(thread.unreadCount || 0), 0)
  };
}

export async function sendSharedMailboxReply(threadId, body, actorId = null) {
  const trimmedBody = normalizeText(body);

  if (!trimmedBody) {
    return {
      ok: false,
      message: "Add a reply before sending."
    };
  }

  return mutatePersistentState(async (draft) => {
    const thread = getMailboxThreads(draft).find((entry) => entry.id === threadId) || null;

    if (!thread) {
      return {
        ok: false,
        message: "This mailbox thread could not be found."
      };
    }

    const mailboxAddress = getMailboxAddress(draft) || normalizeMailboxAddress(process.env.FROM_EMAIL);

    if (!mailboxAddress || !hasResend()) {
      return {
        ok: false,
        message: "Mailbox sending is not configured in this environment."
      };
    }

    const messages = getThreadMessages(draft, thread.id);
    const latestInboundMessage = getLatestInboundMessage(draft, thread.id);
    const latestMessage = getLatestMailboxMessage(draft, thread.id);
    const recipient = getMailboxParticipantReplyAddress(latestInboundMessage, thread);
    const referenceValues = buildReferenceHeader(messages);
    const headers = {};

    if (latestMessage?.messageId) {
      headers["In-Reply-To"] = latestMessage.messageId;
    }

    if (referenceValues.length) {
      headers.References = referenceValues.join(" ");
    }

    const subject = ensureReplySubject(thread.subject || latestMessage?.subject || "Reply");
    const result = await sendTransactionalEmail({
      from: mailboxAddress,
      to: recipient,
      subject,
      text: trimmedBody,
      html: plainTextToHtml(trimmedBody),
      headers
    });

    if (!result.ok) {
      return {
        ok: false,
        message: "The reply could not be sent through Resend."
      };
    }

    const now = new Date().toISOString();
    draft.mailboxMessages.push({
      id: createToken(),
      threadId: thread.id,
      direction: "OUTBOUND",
      resendEmailId: result.id,
      messageId: null,
      inReplyTo: latestMessage?.messageId || null,
      references: referenceValues,
      fromName: getMailboxSupportName(),
      fromEmail: mailboxAddress,
      toEmails: [
        {
          raw: recipient,
          email: recipient,
          name: thread.participantName || ""
        }
      ],
      ccEmails: [],
      replyToEmails: [],
      subject,
      textBody: trimmedBody,
      htmlBody: plainTextToHtml(trimmedBody),
      receivedAt: null,
      sentAt: now,
      createdAt: now,
      updatedAt: now
    });

    thread.subject = subject;
    thread.unreadCount = 0;
    thread.latestMessageAt = now;
    thread.updatedAt = now;

    appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "mailbox_reply_sent",
      entityType: "mailbox_thread",
      entityId: thread.id,
      message: `Sent a shared mailbox reply to ${recipient}.`,
      metadata: {
        resendEmailId: result.id
      }
    });

    return {
      ok: true,
      threadId: thread.id
    };
  });
}

export async function getSharedMailboxAttachmentRedirect(attachmentId) {
  const state = await loadPersistentState();
  const attachment = getMailboxAttachments(state).find((entry) => entry.id === attachmentId) || null;

  if (!attachment) {
    return null;
  }

  const resolved = await getReceivedEmailAttachment(
    attachment.resendEmailId,
    attachment.resendAttachmentId
  );

  return {
    attachment,
    downloadUrl: resolved.download_url,
    expiresAt: resolved.expires_at
  };
}

export function formatMailboxDateTime(value, timeZone = "Europe/Rome") {
  return value ? formatDateTimeLabel(value, timeZone) : "";
}
