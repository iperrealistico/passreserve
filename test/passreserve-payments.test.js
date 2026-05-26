import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildStripeRefundIdempotencyKey,
  buildStripeRefundRequest,
  buildStripeCheckoutSessionRequest,
  createStripeRefund,
  formatCurrencyFromMinorUnits,
  getStripeEnvironmentState
} from "../lib/passreserve-payments";

const originalEnv = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_CURRENCY_DEFAULT: process.env.STRIPE_CURRENCY_DEFAULT,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("passreserve-payments", () => {
  it("formats minor units into the configured currency", () => {
    expect(formatCurrencyFromMinorUnits(9750, "eur")).toBe("€97.5");
  });

  it("stays in preview mode when Stripe env vars are missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    expect(getStripeEnvironmentState()).toMatchObject({
      mode: "preview",
      liveCheckoutEnabled: false,
      webhookEnabled: false,
      baseUrl: "http://localhost:3000"
    });
  });

  it("uses explicit Passreserve env vars when live Stripe config exists", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    process.env.STRIPE_CURRENCY_DEFAULT = "usd";
    process.env.NEXT_PUBLIC_BASE_URL = "https://passreserve.example.com/";

    expect(getStripeEnvironmentState()).toMatchObject({
      mode: "live",
      liveCheckoutEnabled: true,
      webhookEnabled: true,
      defaultCurrency: "usd",
      baseUrl: "https://passreserve.example.com"
    });
  });

  it("builds direct-charge Checkout requests against the organizer account", () => {
    process.env.STRIPE_CURRENCY_DEFAULT = "eur";

    const request = buildStripeCheckoutSessionRequest({
      attendeeEmail: "ada@example.com",
      dueAtEventMinor: 0,
      eventSlug: "spring-festival",
      eventTitle: "Spring Festival",
      holdExpiresAt: "2026-04-11T10:00:00.000Z",
      occurrenceId: "occ_123",
      occurrenceLabel: "11 Apr 2026",
      onlineAmountMinor: 10000,
      organizerName: "Festival House",
      payment: {
        dueAtEventLabel: "€0"
      },
      paymentFingerprint: "paytok_123",
      quantity: 2,
      registrationCode: "PR-123",
      resolvedBaseUrl: "https://passreserve.example.com",
      slug: "festival-house",
      stripeAccountId: "acct_123",
      ticketCategoryLabel: "General"
    });

    expect(request.requestOptions).toEqual({
      stripeAccount: "acct_123"
    });
    expect(request.params.payment_intent_data.application_fee_amount).toBeUndefined();
    expect(request.params.metadata.connected_account_id).toBe("acct_123");
  });

  it("builds a stable Stripe refund idempotency key within Stripe limits", () => {
    const key = buildStripeRefundIdempotencyKey({
      action: "organizer_cancel",
      registrationId: "reg_123",
      paymentIntentId:
        "pi_1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      amountCents: 3900,
      reason: "organizer_cancelled"
    });

    expect(key).toBe(
      buildStripeRefundIdempotencyKey({
        action: "organizer_cancel",
        registrationId: "reg_123",
        paymentIntentId:
          "pi_1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
        amountCents: 3900,
        reason: "organizer_cancelled"
      })
    );
    expect(key).toContain("passreserve:refund:organizer_cancel:reg_123:3900:organizer_cancelled");
    expect(key.length).toBeLessThanOrEqual(255);
  });

  it("builds direct-charge refund requests with account context and idempotency", () => {
    const request = buildStripeRefundRequest({
      amountCents: 3900,
      paymentIntentId: "pi_123",
      stripeAccountId: "acct_123",
      idempotencyKey: "passreserve:refund:reg_123:3900",
      metadata: {
        registration_id: "reg_123",
        actor_id: "admin_123",
        empty_value: ""
      },
      reason: "requested_by_customer"
    });

    expect(request).toEqual({
      params: {
        amount: 3900,
        payment_intent: "pi_123",
        metadata: {
          registration_id: "reg_123",
          actor_id: "admin_123"
        },
        reason: "requested_by_customer"
      },
      requestOptions: {
        stripeAccount: "acct_123",
        idempotencyKey: "passreserve:refund:reg_123:3900"
      }
    });
  });

  it("returns an explicit preview refund shape when Stripe is unavailable", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const refund = await createStripeRefund({
      amountCents: 3900,
      paymentIntentId: "pi_preview_123",
      stripeAccountId: "acct_preview_123",
      idempotencyKey: "refund-preview-key",
      metadata: {
        registration_id: "reg_preview_123"
      }
    });

    expect(refund).toMatchObject({
      mode: "preview",
      refundId: null,
      status: "preview",
      amountCents: 3900,
      paymentIntentId: "pi_preview_123",
      stripeAccountId: "acct_preview_123",
      idempotencyKey: "refund-preview-key"
    });
  });

  it("creates Stripe refunds against the connected account with idempotency", async () => {
    const fakeClient = {
      refunds: {
        create: vi.fn().mockResolvedValue({
          id: "re_123",
          status: "pending",
          amount: 3900,
          currency: "eur",
          charge: "ch_123",
          payment_intent: "pi_123",
          reason: null,
          failure_reason: null,
          metadata: {
            registration_id: "reg_123"
          },
          created: 1770000000
        })
      }
    };

    const refund = await createStripeRefund(
      {
        amountCents: 3900,
        paymentIntentId: "pi_123",
        stripeAccountId: "acct_123",
        idempotencyKey: "refund-live-key",
        metadata: {
          registration_id: "reg_123"
        }
      },
      {
        stripeClient: fakeClient
      }
    );

    expect(fakeClient.refunds.create).toHaveBeenCalledWith(
      {
        amount: 3900,
        payment_intent: "pi_123",
        metadata: {
          registration_id: "reg_123"
        }
      },
      {
        stripeAccount: "acct_123",
        idempotencyKey: "refund-live-key"
      }
    );
    expect(refund).toMatchObject({
      mode: "live",
      refundId: "re_123",
      status: "pending",
      amountCents: 3900,
      chargeId: "ch_123",
      paymentIntentId: "pi_123",
      stripeAccountId: "acct_123",
      idempotencyKey: "refund-live-key"
    });
  });
});
