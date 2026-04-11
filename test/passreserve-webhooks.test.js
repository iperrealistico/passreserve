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

    expect(registration.status).toBe("CONFIRMED_PARTIALLY_PAID");
    expect(capture).toMatchObject({
      provider: "STRIPE",
      stripeAccountId: "acct_live",
      stripeSessionId: "cs_live",
      stripePaymentIntentId: "pi_live"
    });
  });
});
