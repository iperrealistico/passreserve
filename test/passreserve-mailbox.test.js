import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

function buildReceivedEmail(overrides = {}) {
  return {
    from: "Taylor Guest <taylor@example.com>",
    to: ["Passreserve <contact@leonardofiori.it>"],
    cc: [],
    reply_to: ["Taylor Guest <taylor@example.com>"],
    subject: "Question about workshops",
    text: "Hello from the guest.",
    html: "<p>Hello from the guest.</p>",
    message_id: "message-in-1",
    headers: {},
    created_at: "2026-04-27T09:00:00.000Z",
    attachments: [
      {
        id: "resend-attachment-1",
        filename: "brief.pdf",
        content_type: "application/pdf",
        content_disposition: "attachment",
        content_id: "cid-1",
        size: 1024
      }
    ],
    ...overrides
  };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("../lib/passreserve-resend.js");
  vi.doUnmock("../lib/passreserve-auth.js");
  vi.doUnmock("../lib/passreserve-mailbox.js");
  delete process.env.RESEND_API_KEY;
  delete process.env.FROM_EMAIL;
  delete process.env.RESEND_WEBHOOK_SECRET;
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-mailbox-${Date.now()}-${Math.random()}.json`
  );

  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shared mailbox", () => {
  it("stores inbound Resend webhook emails as mailbox threads, messages, and attachment metadata", async () => {
    const verifiedEvent = {
      type: "email.received",
      data: {
        email_id: "email-received-1"
      }
    };

    vi.doMock("../lib/passreserve-resend.js", async () => {
      const actual = await vi.importActual("../lib/passreserve-resend.js");

      return {
        ...actual,
        verifyResendWebhookPayload: vi.fn().mockResolvedValue(verifiedEvent),
        getReceivedEmailById: vi.fn().mockResolvedValue(buildReceivedEmail())
      };
    });

    const { POST } = await import("../app/api/resend/inbound/route.js");

    const response = await POST(
      new Request("http://localhost/api/resend/inbound", {
        method: "POST",
        headers: {
          "svix-id": "msg_1",
          "svix-timestamp": "1714208400",
          "svix-signature": "v1,test"
        },
        body: JSON.stringify(verifiedEvent)
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      received: true
    });

    const state = await loadPersistentState();
    const thread = state.mailboxThreads[0];
    const message = state.mailboxMessages[0];
    const attachment = state.mailboxAttachments[0];

    expect(thread).toMatchObject({
      participantEmail: "taylor@example.com",
      subject: "Question about workshops",
      unreadCount: 1
    });
    expect(message).toMatchObject({
      threadId: thread.id,
      direction: "INBOUND",
      resendEmailId: "email-received-1",
      messageId: "message-in-1",
      textBody: "Hello from the guest."
    });
    expect(attachment).toMatchObject({
      messageId: message.id,
      resendAttachmentId: "resend-attachment-1",
      resendEmailId: "email-received-1",
      filename: "brief.pdf",
      contentType: "application/pdf"
    });
  });

  it("sends shared mailbox replies through Resend and stores the outbound reply history", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.FROM_EMAIL = "contact@leonardofiori.it";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "email-outbound-1"
        })
      })
    );

    await mutatePersistentState(async (draft) => {
      draft.mailboxThreads.unshift({
        id: "thread-1",
        mailboxAddress: "contact@leonardofiori.it",
        participantName: "Taylor Guest",
        participantEmail: "taylor@example.com",
        subject: "Question about workshops",
        normalizedSubject: "question about workshops",
        status: "OPEN",
        unreadCount: 1,
        latestMessageAt: "2026-04-27T09:00:00.000Z",
        createdAt: "2026-04-27T09:00:00.000Z",
        updatedAt: "2026-04-27T09:00:00.000Z"
      });
      draft.mailboxMessages.push({
        id: "message-1",
        threadId: "thread-1",
        direction: "INBOUND",
        resendEmailId: "email-received-1",
        messageId: "message-in-1",
        inReplyTo: null,
        references: [],
        fromName: "Taylor Guest",
        fromEmail: "taylor@example.com",
        toEmails: [
          {
            raw: "Passreserve <contact@leonardofiori.it>",
            email: "contact@leonardofiori.it",
            name: "Passreserve"
          }
        ],
        ccEmails: [],
        replyToEmails: [],
        subject: "Question about workshops",
        textBody: "Hello from the guest.",
        htmlBody: "<p>Hello from the guest.</p>",
        receivedAt: "2026-04-27T09:00:00.000Z",
        sentAt: null,
        createdAt: "2026-04-27T09:00:00.000Z",
        updatedAt: "2026-04-27T09:00:00.000Z"
      });
    });

    const { sendSharedMailboxReply } = await import("../lib/passreserve-mailbox.js");
    const result = await sendSharedMailboxReply(
      "thread-1",
      "Thanks, here is the answer you need.",
      "platform-admin-1"
    );

    expect(result).toMatchObject({
      ok: true,
      threadId: "thread-1"
    });
    expect(fetch).toHaveBeenCalledOnce();

    const [, request] = fetch.mock.calls[0];
    const payload = JSON.parse(request.body);

    expect(payload).toMatchObject({
      from: "contact@leonardofiori.it",
      to: "taylor@example.com",
      subject: "Re: Question about workshops",
      text: "Thanks, here is the answer you need."
    });
    expect(payload.headers).toMatchObject({
      "In-Reply-To": "message-in-1",
      References: "message-in-1"
    });

    const state = await loadPersistentState();
    const thread = state.mailboxThreads.find((entry) => entry.id === "thread-1");
    const outboundMessage = state.mailboxMessages.find(
      (entry) => entry.threadId === "thread-1" && entry.direction === "OUTBOUND"
    );

    expect(thread.unreadCount).toBe(0);
    expect(outboundMessage).toMatchObject({
      resendEmailId: "email-outbound-1",
      fromEmail: "contact@leonardofiori.it",
      subject: "Re: Question about workshops",
      textBody: "Thanks, here is the answer you need."
    });
  });

  it("redirects authenticated platform admins to a fresh attachment URL", async () => {
    const attachmentRedirect = vi.fn().mockResolvedValue({
      downloadUrl: "https://download.resend.dev/attachment-1"
    });

    vi.doMock("../lib/passreserve-auth.js", () => ({
      getValidatedStoredPlatformSessionUser: vi.fn().mockResolvedValue({
        id: "platform-admin-1",
        email: "admin@example.com"
      })
    }));
    vi.doMock("../lib/passreserve-mailbox.js", () => ({
      getSharedMailboxAttachmentRedirect: attachmentRedirect
    }));

    const { GET } = await import("../app/admin/emails/attachments/[attachmentId]/route.js");
    const response = await GET(
      new Request("http://localhost/admin/emails/attachments/attachment-1"),
      {
        params: Promise.resolve({
          attachmentId: "attachment-1"
        })
      }
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://download.resend.dev/attachment-1"
    );
    expect(attachmentRedirect).toHaveBeenCalledWith("attachment-1");
  });
});
