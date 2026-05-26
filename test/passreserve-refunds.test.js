import { describe, expect, it } from "vitest";

import { getRegistrationRefundStateLabel } from "../lib/passreserve-email-delivery.js";
import {
  getLatestRefundableStripePayment,
  getRegistrationPendingRefundPayments,
  getRegistrationRefundSummary
} from "../lib/passreserve-refunds.js";

function buildRegistration(overrides = {}) {
  return {
    currency: "EUR",
    onlineCollectedCents: 4500,
    refundedCents: 0,
    dueAtEventCents: 3000,
    ...overrides
  };
}

function buildPayment(overrides = {}) {
  return {
    id: "pay_default",
    provider: "STRIPE",
    kind: "CAPTURE",
    status: "SUCCEEDED",
    amountCents: 4500,
    currency: "EUR",
    stripeAccountId: "acct_live_123",
    stripeSessionId: "cs_live_123",
    stripePaymentIntentId: "pi_live_123",
    occurredAt: "2026-05-26T10:00:00.000Z",
    createdAt: "2026-05-26T10:00:00.000Z",
    ...overrides
  };
}

describe("passreserve refunds helpers", () => {
  it("recognizes registrations that are ready for automatic Stripe refund", () => {
    const payments = [buildPayment()];
    const summary = getRegistrationRefundSummary(buildRegistration(), payments);

    expect(getLatestRefundableStripePayment(payments)).toMatchObject({
      id: "pay_default",
      stripePaymentIntentId: "pi_live_123"
    });
    expect(summary).toMatchObject({
      eligible: true,
      reason: "ready",
      onlineCollectedCents: 4500,
      refundableOnlineAmountCents: 4500,
      pendingRefundCents: 0,
      stripeAccountId: "acct_live_123",
      stripePaymentIntentId: "pi_live_123"
    });
  });

  it("blocks automatic refunds while a Stripe refund request is already pending", () => {
    const payments = [
      buildPayment(),
      buildPayment({
        id: "refund_pending_1",
        kind: "REFUND",
        status: "PENDING",
        amountCents: 4500,
        stripeSessionId: null,
        occurredAt: "2026-05-26T10:05:00.000Z",
        createdAt: "2026-05-26T10:05:00.000Z"
      })
    ];
    const summary = getRegistrationRefundSummary(buildRegistration(), payments);

    expect(getRegistrationPendingRefundPayments(payments)).toHaveLength(1);
    expect(summary).toMatchObject({
      eligible: false,
      reason: "refund_pending",
      pendingRefundCents: 4500,
      refundableOnlineAmountCents: 4500
    });
    expect(getRegistrationRefundStateLabel(buildRegistration(), "EUR", payments)).toBe(
      "Refund initiated: €45 has been requested on Stripe and is waiting for confirmation."
    );
  });

  it("explains when a collected online amount cannot be auto-refunded yet", () => {
    const payments = [
      buildPayment({
        id: "pay_missing_reference",
        stripePaymentIntentId: null
      })
    ];
    const summary = getRegistrationRefundSummary(buildRegistration(), payments);

    expect(summary).toMatchObject({
      eligible: false,
      reason: "missing_payment_reference",
      hasStripeCapture: true,
      hasStripePaymentIntentReference: false
    });
  });

  it("marks failed refund attempts as retryable when the online amount is still refundable", () => {
    const summary = getRegistrationRefundSummary(buildRegistration(), [
      buildPayment(),
      buildPayment({
        id: "refund_failed_1",
        kind: "REFUND",
        status: "FAILED",
        amountCents: 4500,
        stripeSessionId: null,
        note: "Stripe refund request failed.",
        metadata: {
          errorMessage: "Stripe temporary outage",
          idempotencyKey: "retry-key-123"
        },
        occurredAt: "2026-05-26T10:05:00.000Z",
        createdAt: "2026-05-26T10:05:00.000Z"
      })
    ]);

    expect(summary).toMatchObject({
      eligible: false,
      reason: "refund_failed",
      retryable: true,
      latestFailedRefundReason: "Stripe temporary outage",
      latestFailedRefundIdempotencyKey: "retry-key-123"
    });
  });

  it("falls back to non-refundable states when no online amount was collected", () => {
    const summary = getRegistrationRefundSummary(
      buildRegistration({
        onlineCollectedCents: 0,
        dueAtEventCents: 3000
      }),
      []
    );

    expect(summary).toMatchObject({
      eligible: false,
      reason: "no_online_collection",
      refundableOnlineAmountCents: 0
    });
    expect(
      getRegistrationRefundStateLabel(
        buildRegistration({
          onlineCollectedCents: 0,
          dueAtEventCents: 3000
        })
      )
    ).toBe("No online refund: no online amount was collected. Any balance was due at the event only.");
  });
});
