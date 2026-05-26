import { describe, expect, it } from "vitest";

import { getRegistrationRefundStateLabel } from "../lib/passreserve-email-delivery.js";

function buildRegistration(overrides = {}) {
  return {
    currency: "EUR",
    onlineCollectedCents: 3900,
    refundedCents: 0,
    dueAtEventCents: 0,
    ...overrides
  };
}

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
});
