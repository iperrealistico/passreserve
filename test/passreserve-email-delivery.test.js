import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendTransactionalEmail } = vi.hoisted(() => ({
  sendTransactionalEmail: vi.fn()
}));

vi.mock("../lib/passreserve-email.js", () => ({
  sendTransactionalEmail
}));

import {
  getRegistrationRefundStateLabel,
  sendStateTemplateEmail
} from "../lib/passreserve-email-delivery.js";
import { resolveLocalizedEmailTemplate } from "../lib/passreserve-email-templates.js";

function buildRegistration(overrides = {}) {
  return {
    currency: "EUR",
    onlineCollectedCents: 3900,
    refundedCents: 0,
    dueAtEventCents: 0,
    ...overrides
  };
}

beforeEach(() => {
  sendTransactionalEmail.mockReset();
  sendTransactionalEmail.mockResolvedValue({
    ok: true,
    mode: "log",
    id: null
  });
});

describe("passreserve localized email templates", () => {
  it("resolves italian template variants when present", () => {
    const template = resolveLocalizedEmailTemplate(
      {
        subject: "Fallback subject",
        preview: "Fallback preview",
        bodyHtml: "<p>Fallback</p>",
        subjectTranslations: {
          en: "English subject",
          it: "Oggetto italiano"
        },
        previewTranslations: {
          it: "Anteprima italiana"
        },
        bodyHtmlTranslations: {
          it: "<p>Corpo italiano</p>"
        }
      },
      "it"
    );

    expect(template.subject).toBe("Oggetto italiano");
    expect(template.preview).toBe("Anteprima italiana");
    expect(template.bodyHtml).toBe("<p>Corpo italiano</p>");
  });

  it("falls back to legacy values when a locale override is missing", () => {
    const template = resolveLocalizedEmailTemplate(
      {
        subject: "Fallback subject",
        preview: "Fallback preview",
        bodyHtml: "<p>Fallback</p>",
        subjectTranslations: {
          en: "English subject"
        }
      },
      "it"
    );

    expect(template.subject).toBe("English subject");
    expect(template.preview).toBe("Fallback preview");
    expect(template.bodyHtml).toBe("<p>Fallback</p>");
  });

  it("sends the localized attendee template when a registration locale is provided", async () => {
    const state = {
      emailTemplates: [
        {
          id: "template-1",
          slug: "attendee_registration_confirmed",
          subject: "Fallback subject",
          preview: "Fallback preview",
          bodyHtml: "<p>Fallback body</p>",
          subjectTranslations: {
            it: "Registrazione confermata"
          },
          bodyHtmlTranslations: {
            it: "<p>Corpo italiano</p>"
          }
        }
      ],
      emailDeliveries: []
    };

    await sendStateTemplateEmail(state, {
      templateSlug: "attendee_registration_confirmed",
      to: "ada@example.com",
      locale: "it",
      replacements: {}
    });

    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@example.com",
        subject: "Registrazione confermata",
        html: "<p>Corpo italiano</p>"
      })
    );
    expect(state.emailDeliveries[0].metadata.locale).toBe("it");
  });
});

describe("passreserve email refund state copy", () => {
  it("labels pending Stripe refunds as initiated", () => {
    const registration = buildRegistration();
    const copy = getRegistrationRefundStateLabel(registration, "EUR", [
      {
        id: "capture_1",
        provider: "STRIPE",
        kind: "CAPTURE",
        status: "SUCCEEDED",
        amountCents: 3900,
        stripePaymentIntentId: "pi_123",
        occurredAt: "2026-04-01T10:00:00.000Z",
        createdAt: "2026-04-01T10:00:00.000Z"
      },
      {
        id: "refund_pending_1",
        provider: "STRIPE",
        kind: "REFUND",
        status: "PENDING",
        amountCents: 3900,
        stripePaymentIntentId: "pi_123",
        occurredAt: "2026-04-01T10:05:00.000Z",
        createdAt: "2026-04-01T10:05:00.000Z"
      }
    ]);

    expect(copy).toContain("Refund initiated:");
    expect(copy).toContain("waiting for confirmation");
  });

  it("labels completed refunds explicitly", () => {
    const registration = buildRegistration({
      refundedCents: 3900
    });
    const copy = getRegistrationRefundStateLabel(registration, "EUR", []);

    expect(copy).toContain("Refund completed:");
    expect(copy).toContain("confirmed as refunded online");
  });

  it("labels collected online amounts as manual follow-up when no refund started", () => {
    const registration = buildRegistration();
    const copy = getRegistrationRefundStateLabel(registration, "EUR", []);

    expect(copy).toContain("Manual follow-up:");
    expect(copy).toContain("arrange the refund manually");
  });

  it("supports italian refund-state copy for attendee cancellation emails", () => {
    const registration = buildRegistration();
    const copy = getRegistrationRefundStateLabel(registration, "EUR", [], "it");

    expect(copy).toContain("Follow-up manuale:");
  });
});
