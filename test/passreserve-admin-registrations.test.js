import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOrganizerRegistrationsAdmin } from "../lib/passreserve-admin-service.js";
import {
  createOrganizerRegistration,
  ORGANIZER_MANUAL_REGISTRATION_MODE
} from "../lib/passreserve-registrations.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T09:00:00.000Z"));
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-registrations-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function createManualOrganizerRegistration(overrides = {}) {
  const state = await loadPersistentState();
  const organizer = state.organizers.find((entry) => entry.slug === "alpine-trail-lab");
  const event = state.events.find(
    (entry) => entry.organizerId === organizer.id && entry.slug === "sunrise-ridge-session"
  );
  const occurrence = state.occurrences
    .filter((entry) => entry.eventTypeId === event.id)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
  const ticketCategory = state.ticketCategories.find(
    (entry) => entry.eventTypeId === event.id && entry.isDefault
  );

  const input = {
    eventTypeId: event.id,
    occurrenceId: occurrence.id,
    items: [
      {
        ticketCategoryId: ticketCategory.id,
        quantity: 1
      }
    ],
    registrationLocale: "it",
    origin: "walk-in",
    attendees: [
      {
        ticketCategoryId: ticketCategory.id,
        firstName: "Ada",
        lastName: "Lovelace",
        address: "Via Test 1, Bologna",
        phone: "+39 333 555 1010",
        email: "ada@example.com",
        dietaryFlags: ["gluten_free"],
        dietaryOther: "No onion"
      }
    ],
    mode: ORGANIZER_MANUAL_REGISTRATION_MODE.CONFIRM_UNPAID,
    note: "Desk registration created by staff.",
    ...overrides
  };

  await createOrganizerRegistration("alpine-trail-lab", input);
}

describe("passreserve organizer admin registrations payload", () => {
  it("surfaces source, origin, and manual note metadata for organizer-created registrations", async () => {
    await createManualOrganizerRegistration();

    const data = await getOrganizerRegistrationsAdmin("alpine-trail-lab", "it");
    const registration = data.registrations.find((entry) => entry.attendeeEmail === "ada@example.com");

    expect(registration).toMatchObject({
      source: "ORGANIZER_MANUAL",
      sourceLabel: "Inserita dallo staff",
      sourceTone: "capacity-watch",
      origin: "walk-in",
      originLabel: "Walk-in",
      originTone: "pending_confirm",
      note: "Desk registration created by staff."
    });
  });

  it("surfaces refund readiness metadata from the Stripe payment ledger", async () => {
    let registrationId = null;
    let expectedOnlineCollectedCents = 0;

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const registration = draft.registrations.find(
        (entry) => entry.organizerId === organizer.id && Number(entry.onlineAmountCents || 0) > 0
      );

      registrationId = registration.id;
      registration.status = "CONFIRMED_PARTIALLY_PAID";
      registration.onlineCollectedCents = registration.onlineAmountCents || 4500;
      registration.refundedCents = 0;
      expectedOnlineCollectedCents = registration.onlineCollectedCents;
      draft.payments = draft.payments.filter((entry) => entry.registrationId !== registration.id);

      draft.payments.unshift(
        {
          id: "refund_pending_test",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "REFUND",
          status: "PENDING",
          amountCents: registration.onlineCollectedCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_ready_123",
          stripeSessionId: null,
          stripePaymentIntentId: "pi_ready_123",
          note: "Stripe refund requested.",
          metadata: {
            reason: "organizer_cancelled"
          },
          occurredAt: "2026-12-01T10:05:00.000Z",
          createdAt: "2026-12-01T10:05:00.000Z"
        },
        {
          id: "capture_ready_test",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "CAPTURE",
          status: "SUCCEEDED",
          amountCents: registration.onlineCollectedCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_ready_123",
          stripeSessionId: "cs_ready_123",
          stripePaymentIntentId: "pi_ready_123",
          note: "Stripe payment captured.",
          metadata: null,
          occurredAt: "2026-12-01T10:00:00.000Z",
          createdAt: "2026-12-01T10:00:00.000Z"
        }
      );
    });

    const data = await getOrganizerRegistrationsAdmin("alpine-trail-lab", "en");
    const registration = data.registrations.find((entry) => entry.id === registrationId);

    expect(registration.refundSummary).toMatchObject({
      eligible: false,
      highlighted: true,
      reason: "refund_pending",
      status: "PENDING",
      statusLabel: "Refund pending",
      pendingRefundCents: expectedOnlineCollectedCents,
      refundableOnlineAmountCents: expectedOnlineCollectedCents,
      stripeAccountId: "acct_ready_123",
      stripePaymentIntentId: "pi_ready_123",
      tone: "refund-pending"
    });
    expect(registration.refundedLabel).toBe("€0");
    expect(registration.refundSummary.detailLabel).toContain("Waiting for webhook confirmation");
    expect(registration.ledger[0]).toMatchObject({
      kind: "REFUND",
      kindLabel: "Stripe refund",
      status: "PENDING",
      statusLabel: "Refund pending",
      statusTone: "refund-pending"
    });
    expect(registration.ledger[0].detailLabel).toContain("Request accepted by Stripe");
    expect(registration.ledger[0].referenceLabel).toContain("PI pi_ready_123");

    const italianData = await getOrganizerRegistrationsAdmin("alpine-trail-lab", "it");
    const italianRegistration = italianData.registrations.find((entry) => entry.id === registrationId);

    expect(italianRegistration.refundSummary.statusLabel).toBe("Rimborso in attesa");
    expect(italianRegistration.refundSummary.detailLabel).toContain("In attesa della conferma webhook");
    expect(italianRegistration.ledger[0].statusLabel).toBe("Rimborso in attesa");
    expect(italianRegistration.ledger[0].detailLabel).toContain("Richiesta accettata da Stripe");
  });

  it("surfaces failed Stripe refunds as retryable backoffice work", async () => {
    let registrationId = null;

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const registration = draft.registrations.find(
        (entry) => entry.organizerId === organizer.id && Number(entry.onlineAmountCents || 0) > 0
      );
      const now = new Date().toISOString();

      registrationId = registration.id;
      registration.status = "CANCELLED";
      registration.cancelledAt = now;
      registration.onlineCollectedCents = registration.onlineAmountCents || 4500;
      registration.refundedCents = 0;
      draft.payments = draft.payments.filter((entry) => entry.registrationId !== registration.id);

      draft.payments.unshift(
        {
          id: "refund_failed_test",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "REFUND",
          status: "FAILED",
          amountCents: registration.onlineCollectedCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_failed_123",
          stripeSessionId: null,
          stripePaymentIntentId: "pi_failed_123",
          note: "Stripe refund request failed after occurrence cancellation.",
          metadata: {
            refundAction: "occurrence_cancel",
            cancelMode: "CANCEL_AND_REFUND_ELIGIBLE",
            passreserveSurface: "organizer_occurrence_cancel",
            idempotencyKey: "retry-key-123",
            errorMessage: "Stripe temporary outage"
          },
          occurredAt: now,
          createdAt: now
        },
        {
          id: "capture_failed_test",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "CAPTURE",
          status: "SUCCEEDED",
          amountCents: registration.onlineCollectedCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_failed_123",
          stripeSessionId: "cs_failed_123",
          stripePaymentIntentId: "pi_failed_123",
          note: "Stripe payment captured.",
          metadata: null,
          occurredAt: "2026-12-01T10:00:00.000Z",
          createdAt: "2026-12-01T10:00:00.000Z"
        }
      );
    });

    const data = await getOrganizerRegistrationsAdmin("alpine-trail-lab", "en");
    const registration = data.registrations.find((entry) => entry.id === registrationId);

    expect(registration.refundSummary).toMatchObject({
      reason: "refund_failed",
      status: "FAILED",
      statusLabel: "Refund failed",
      retryAvailable: true
    });
    expect(registration.refundSummary.detailLabel).toContain("Stripe temporary outage");
    expect(registration.actions).toContain("retry_refund");
    expect(
      registration.ledger.find((entry) => entry.kind === "REFUND" && entry.status === "FAILED")
    ).toMatchObject({
      kind: "REFUND",
      status: "FAILED",
      statusLabel: "Refund failed",
      statusTone: "danger"
    });
  });

  it("treats fully refunded cancelled registrations as closed financial work even if a stale pending refund row exists", async () => {
    let registrationId = null;

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const registration = draft.registrations.find(
        (entry) => entry.organizerId === organizer.id && Number(entry.onlineAmountCents || 0) > 0
      );

      registrationId = registration.id;
      registration.status = "CANCELLED";
      registration.onlineCollectedCents = registration.onlineAmountCents || 4500;
      registration.refundedCents = registration.onlineCollectedCents;
      registration.dueAtEventCents = 9000;
      registration.venueCollectedCents = 0;
      draft.payments = draft.payments.filter((entry) => entry.registrationId !== registration.id);

      draft.payments.unshift(
        {
          id: "refund_pending_stale_test",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "REFUND",
          status: "PENDING",
          amountCents: registration.onlineCollectedCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_stale_123",
          stripeSessionId: null,
          stripePaymentIntentId: "pi_stale_123",
          note: "Stale pending refund row kept for regression coverage.",
          metadata: {
            reason: "organizer_cancelled"
          },
          occurredAt: "2026-12-01T10:05:00.000Z",
          createdAt: "2026-12-01T10:05:00.000Z"
        },
        {
          id: "capture_stale_test",
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "CAPTURE",
          status: "SUCCEEDED",
          amountCents: registration.onlineCollectedCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: "acct_stale_123",
          stripeSessionId: "cs_stale_123",
          stripePaymentIntentId: "pi_stale_123",
          note: "Stripe payment captured.",
          metadata: null,
          occurredAt: "2026-12-01T10:00:00.000Z",
          createdAt: "2026-12-01T10:00:00.000Z"
        }
      );
    });

    const data = await getOrganizerRegistrationsAdmin("alpine-trail-lab", "it");
    const registration = data.registrations.find((entry) => entry.id === registrationId);

    expect(registration.refundSummary).toMatchObject({
      reason: "already_fully_refunded",
      status: "REFUNDED",
      statusLabel: "Rimborso completato"
    });
    expect(registration.dueAtEventOpenCents).toBe(0);
    expect(registration.dueAtEventOpenLabel).toBe("€0");
  });
});
