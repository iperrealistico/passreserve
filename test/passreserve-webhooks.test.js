import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { mutatePersistentState, loadPersistentState } from "../lib/passreserve-state.js";
import { processStripeWebhook } from "../lib/passreserve-service.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-webhooks-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

describe("passreserve Stripe webhooks", () => {
  it("syncs organizer Stripe readiness from account.updated events", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");

      organizer.stripeAccountId = "acct_sync";
      organizer.stripeConnectionStatus = "PENDING";
    });

    await processStripeWebhook({
      id: "evt_account_updated",
      type: "account.updated",
      account: "acct_sync",
      data: {
        object: {
          id: "acct_sync",
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
          requirements: {
            disabled_reason: null
          }
        }
      }
    });

    const state = await loadPersistentState();
    const organizer = state.organizers.find((entry) => entry.slug === "alpine-trail-lab");

    expect(organizer).toMatchObject({
      stripeAccountId: "acct_sync",
      stripeConnectionStatus: "CONNECTED",
      stripeDetailsSubmitted: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true
    });
  });

  it("reconciles connected-account checkout completion back into the payment ledger", async () => {
    let registrationCode = null;

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const registration = draft.registrations.find((entry) => entry.status === "PENDING_PAYMENT");

      organizer.stripeAccountId = "acct_live";
      organizer.stripeConnectionStatus = "CONNECTED";
      organizer.stripeDetailsSubmitted = true;
      organizer.stripeChargesEnabled = true;
      organizer.stripePayoutsEnabled = true;
      registrationCode = registration.registrationCode;
    });

    await processStripeWebhook({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      account: "acct_live",
      data: {
        object: {
          id: "cs_live",
          client_reference_id: registrationCode,
          payment_intent: "pi_live"
        }
      }
    });

    const state = await loadPersistentState();
    const registration = state.registrations.find((entry) => entry.registrationCode === registrationCode);
    const capture = state.payments.find(
      (entry) => entry.registrationId === registration.id && entry.kind === "CAPTURE"
    );
    const confirmationEmail = state.emailDeliveries.find(
      (entry) =>
        entry.registrationId === registration.id &&
        entry.templateSlug === "attendee_registration_confirmed"
    );
    const paymentEmail = state.emailDeliveries.find(
      (entry) =>
        entry.registrationId === registration.id &&
        entry.templateSlug === "attendee_payment_received"
    );

    expect(registration.status).toBe("CONFIRMED_PARTIALLY_PAID");
    expect(capture).toMatchObject({
      provider: "STRIPE",
      stripeAccountId: "acct_live",
      stripeSessionId: "cs_live",
      stripePaymentIntentId: "pi_live"
    });
    expect(confirmationEmail).toBeTruthy();
    expect(paymentEmail).toBeTruthy();
  });

  it("reconciles a pending local refund request into the refunded ledger row", async () => {
    let registrationCode = null;
    let registrationId = null;

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const registration = draft.registrations.find((entry) => entry.status === "CONFIRMED_PARTIALLY_PAID");

      organizer.stripeAccountId = "acct_refund_live";
      organizer.stripeConnectionStatus = "CONNECTED";
      organizer.stripeDetailsSubmitted = true;
      organizer.stripeChargesEnabled = true;
      organizer.stripePayoutsEnabled = true;

      registrationId = registration.id;
      registrationCode = registration.registrationCode;
      registration.onlineCollectedCents = 3900;
      registration.refundedCents = 0;

      draft.payments = draft.payments.filter((entry) => entry.registrationId !== registration.id);
      draft.payments.unshift(
        {
          id: "refund_pending_local",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "REFUND",
          status: "PENDING",
          amountCents: 3900,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_refund_live",
          stripeSessionId: null,
          stripePaymentIntentId: "pi_refund_live",
          note: "Stripe refund requested by organizer admin.",
          metadata: {
            stripeRefundId: "re_local_123",
            stripeRefundStatus: "pending"
          },
          occurredAt: "2026-04-01T11:00:00.000Z",
          createdAt: "2026-04-01T11:00:00.000Z"
        },
        {
          id: "capture_refund_live",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "CAPTURE",
          status: "SUCCEEDED",
          amountCents: 3900,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_refund_live",
          stripeSessionId: "cs_refund_live",
          stripePaymentIntentId: "pi_refund_live",
          note: "Stripe payment captured.",
          metadata: null,
          occurredAt: "2026-04-01T10:55:00.000Z",
          createdAt: "2026-04-01T10:55:00.000Z"
        }
      );
    });

    await processStripeWebhook({
      id: "evt_charge_refunded_local",
      type: "charge.refunded",
      account: "acct_refund_live",
      data: {
        object: {
          id: "ch_refund_live",
          payment_intent: "pi_refund_live",
          amount_refunded: 3900,
          metadata: {
            registration_code: registrationCode
          },
          refunds: {
            data: [
              {
                id: "re_local_123"
              }
            ]
          }
        }
      }
    });

    const state = await loadPersistentState();
    const registration = state.registrations.find((entry) => entry.id === registrationId);
    const refundPayments = state.payments.filter(
      (entry) => entry.registrationId === registrationId && entry.kind === "REFUND"
    );
    const refundPayment = refundPayments[0];

    expect(registration.refundedCents).toBe(3900);
    expect(refundPayments).toHaveLength(1);
    expect(refundPayment).toMatchObject({
      id: "refund_pending_local",
      status: "REFUNDED",
      amountCents: 3900,
      externalEventId: "evt_charge_refunded_local",
      stripeAccountId: "acct_refund_live",
      stripePaymentIntentId: "pi_refund_live",
      note: "Stripe refund confirmed by webhook."
    });
    expect(refundPayment.metadata).toMatchObject({
      stripeRefundId: "re_local_123",
      stripeRefundStatus: "succeeded",
      stripeEventId: "evt_charge_refunded_local",
      type: "charge.refunded"
    });
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registrationId &&
          entry.eventType === "stripe_refund_confirmed" &&
          entry.metadata?.matchedPendingRefund === true &&
          entry.metadata?.refundDeltaCents === 3900
      )
    ).toBe(true);
  });

  it("keeps recording a refunded ledger row when no local refund request exists", async () => {
    let registrationCode = null;
    let registrationId = null;

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const registration = draft.registrations.find((entry) => entry.status === "CONFIRMED_PARTIALLY_PAID");

      organizer.stripeAccountId = "acct_refund_external";
      organizer.stripeConnectionStatus = "CONNECTED";
      organizer.stripeDetailsSubmitted = true;
      organizer.stripeChargesEnabled = true;
      organizer.stripePayoutsEnabled = true;

      registrationId = registration.id;
      registrationCode = registration.registrationCode;
      registration.onlineCollectedCents = 3900;
      registration.refundedCents = 0;

      draft.payments = draft.payments.filter((entry) => entry.registrationId !== registration.id);
      draft.payments.unshift({
        id: "capture_refund_external",
        registrationId: registration.id,
        provider: "STRIPE",
        kind: "CAPTURE",
        status: "SUCCEEDED",
        amountCents: 3900,
        currency: registration.currency,
        externalEventId: null,
        stripeAccountId: "acct_refund_external",
        stripeSessionId: "cs_refund_external",
        stripePaymentIntentId: "pi_refund_external",
        note: "Stripe payment captured.",
        metadata: null,
        occurredAt: "2026-04-01T10:55:00.000Z",
        createdAt: "2026-04-01T10:55:00.000Z"
      });
    });

    await processStripeWebhook({
      id: "evt_charge_refunded_external",
      type: "charge.refunded",
      account: "acct_refund_external",
      data: {
        object: {
          id: "ch_refund_external",
          payment_intent: "pi_refund_external",
          amount_refunded: 3900,
          metadata: {
            registration_code: registrationCode
          },
          refunds: {
            data: [
              {
                id: "re_external_123"
              }
            ]
          }
        }
      }
    });

    const state = await loadPersistentState();
    const registration = state.registrations.find((entry) => entry.id === registrationId);
    const refundPayments = state.payments.filter(
      (entry) => entry.registrationId === registrationId && entry.kind === "REFUND"
    );

    expect(registration.refundedCents).toBe(3900);
    expect(refundPayments).toHaveLength(1);
    expect(refundPayments[0]).toMatchObject({
      status: "REFUNDED",
      amountCents: 3900,
      externalEventId: "evt_charge_refunded_external",
      stripePaymentIntentId: "pi_refund_external",
      note: "Stripe refund recorded."
    });
  });
});
