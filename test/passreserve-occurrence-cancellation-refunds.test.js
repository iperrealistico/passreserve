import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/passreserve-payments.js", async () => {
  const actual = await vi.importActual("../lib/passreserve-payments.js");

  return {
    ...actual,
    createStripeRefund: vi.fn()
  };
});

import {
  retryOrganizerOccurrenceFailedRefunds,
  saveOrganizerOccurrence
} from "../lib/passreserve-admin-service.js";
import { createToken } from "../lib/passreserve-format.js";
import { createStripeRefund } from "../lib/passreserve-payments.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-10T09:00:00.000Z"));
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-occurrence-cancel-refunds-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
  vi.mocked(createStripeRefund).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function primeOccurrenceCancellationFixture() {
  const state = await loadPersistentState();
  const occurrence = state.occurrences.find((entry) => entry.id === "atl-clinic-2026-04-26");
  const event = state.events.find((entry) => entry.id === occurrence.eventTypeId);
  const baseRegistration = state.registrations.find(
    (entry) =>
      entry.occurrenceId === occurrence.id &&
      entry.attendeeEmail === "luca@example.com" &&
      entry.organizerId === "org-alpine-trail-lab"
  );

  await mutatePersistentState(async (draft) => {
    const primaryRegistration = draft.registrations.find((entry) => entry.id === baseRegistration.id);
    const now = new Date().toISOString();

    primaryRegistration.status = "CONFIRMED_PARTIALLY_PAID";
    primaryRegistration.onlineAmountCents = 3900;
    primaryRegistration.onlineCollectedCents = 3900;
    primaryRegistration.refundedCents = 0;
    primaryRegistration.confirmedAt = primaryRegistration.confirmedAt || now;
    primaryRegistration.updatedAt = now;

    const secondaryRegistration = structuredClone(primaryRegistration);
    secondaryRegistration.id = createToken();
    secondaryRegistration.registrationCode = createToken();
    secondaryRegistration.attendeeEmail = "occurrence-skip@example.com";
    secondaryRegistration.attendeeName = "Skip Refund";
    secondaryRegistration.status = "CONFIRMED_UNPAID";
    secondaryRegistration.onlineAmountCents = 0;
    secondaryRegistration.onlineCollectedCents = 0;
    secondaryRegistration.refundedCents = 0;
    secondaryRegistration.updatedAt = now;
    secondaryRegistration.cancelledAt = null;
    secondaryRegistration.attendees = Array.isArray(secondaryRegistration.attendees)
      ? secondaryRegistration.attendees.map((attendee, index) => ({
          ...attendee,
          id: createToken(),
          email: index === 0 ? "occurrence-skip@example.com" : attendee.email,
          fullName: index === 0 ? "Skip Refund" : attendee.fullName
        }))
      : [];
    secondaryRegistration.items = Array.isArray(secondaryRegistration.items)
      ? secondaryRegistration.items.map((item) => ({
          ...item,
          id: createToken()
        }))
      : [];

    draft.registrations.unshift(secondaryRegistration);
    draft.payments = draft.payments.filter(
      (entry) =>
        entry.registrationId !== primaryRegistration.id && entry.registrationId !== secondaryRegistration.id
    );
    draft.payments.unshift({
      id: createToken(),
      registrationId: primaryRegistration.id,
      provider: "STRIPE",
      kind: "CAPTURE",
      status: "SUCCEEDED",
      amountCents: 3900,
      currency: primaryRegistration.currency,
      externalEventId: null,
      stripeAccountId: "acct_occurrence_refund_123",
      stripeSessionId: "cs_occurrence_refund_123",
      stripePaymentIntentId: "pi_occurrence_refund_123",
      note: "Primed Stripe capture for occurrence cancellation refund test.",
      metadata: null,
      occurredAt: now,
      createdAt: now
    });
  });

  const nextState = await loadPersistentState();
  const registrations = nextState.registrations.filter((entry) => entry.occurrenceId === occurrence.id);

  return {
    event,
    occurrence,
    primaryRegistration: registrations.find((entry) => entry.attendeeEmail === "luca@example.com"),
    secondaryRegistration: registrations.find((entry) => entry.attendeeEmail === "occurrence-skip@example.com")
  };
}

describe("passreserve occurrence cancellation refunds", () => {
  it("cancels a published occurrence and requests refunds for the eligible registrations only", async () => {
    const fixture = await primeOccurrenceCancellationFixture();
    vi.mocked(createStripeRefund).mockResolvedValue({
      mode: "live",
      refundId: "re_occurrence_refund_123",
      status: "pending",
      amountCents: 3900,
      amountLabel: "EUR 39",
      currency: fixture.primaryRegistration.currency,
      chargeId: "ch_occurrence_refund_123",
      paymentIntentId: "pi_occurrence_refund_123",
      stripeAccountId: "acct_occurrence_refund_123",
      idempotencyKey: "passreserve:refund:occurrence_cancel:test",
      reason: "requested_by_customer",
      failureReason: null,
      metadata: {},
      createdAt: new Date().toISOString()
    });

    const savedOccurrence = await saveOrganizerOccurrence("alpine-trail-lab", {
      id: fixture.occurrence.id,
      eventTypeId: fixture.event.id,
      status: "CANCELLED",
      startsAt: fixture.occurrence.startsAt,
      endsAt: fixture.occurrence.endsAt,
      capacity: fixture.occurrence.capacity,
      prepayPercentage: fixture.occurrence.prepayPercentage,
      venueTitle: fixture.occurrence.venueTitle,
      note: fixture.occurrence.note,
      imageUrl: fixture.occurrence.imageUrl || "",
      published: fixture.occurrence.published,
      cancelMode: "CANCEL_AND_REFUND_ELIGIBLE"
    });

    expect(savedOccurrence.cancellationSummary).toMatchObject({
      cancelledCount: 2,
      refundRequestedCount: 1,
      refundRequestedCents: 3900,
      refundSkippedCount: 1,
      refundFailedCount: 0
    });
    expect(createStripeRefund).toHaveBeenCalledTimes(1);
    expect(createStripeRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 3900,
        paymentIntentId: "pi_occurrence_refund_123",
        stripeAccountId: "acct_occurrence_refund_123",
        metadata: expect.objectContaining({
          passreserve_surface: "organizer_occurrence_cancel",
          refund_action: "occurrence_cancel"
        })
      })
    );

    const state = await loadPersistentState();
    const updatedOccurrence = state.occurrences.find((entry) => entry.id === fixture.occurrence.id);
    const primaryRegistration = state.registrations.find(
      (entry) => entry.id === fixture.primaryRegistration.id
    );
    const secondaryRegistration = state.registrations.find(
      (entry) => entry.id === fixture.secondaryRegistration.id
    );
    const refundPayment = state.payments.find(
      (entry) =>
        entry.registrationId === fixture.primaryRegistration.id &&
        entry.kind === "REFUND" &&
        entry.status === "PENDING"
    );

    expect(updatedOccurrence.status).toBe("CANCELLED");
    expect(primaryRegistration.status).toBe("CANCELLED");
    expect(secondaryRegistration.status).toBe("CANCELLED");
    expect(refundPayment).toMatchObject({
      amountCents: 3900,
      stripePaymentIntentId: "pi_occurrence_refund_123",
      note: "Stripe refund requested after occurrence cancellation."
    });
    expect(
      state.emailDeliveries.filter(
        (entry) =>
          entry.templateSlug === "attendee_occurrence_cancelled" &&
          [fixture.primaryRegistration.id, fixture.secondaryRegistration.id].includes(entry.registrationId)
      )
    ).toHaveLength(2);
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.eventType === "organizer_occurrence_cancelled_with_refunds_requested" &&
          entry.entityId === fixture.occurrence.id &&
          entry.metadata?.refundRequestedCount === 1 &&
          entry.metadata?.refundSkippedCount === 1
      )
    ).toBe(true);
  });

  it("keeps occurrence cancellation in cancel-only mode without touching Stripe refunds", async () => {
    const fixture = await primeOccurrenceCancellationFixture();

    const savedOccurrence = await saveOrganizerOccurrence("alpine-trail-lab", {
      id: fixture.occurrence.id,
      eventTypeId: fixture.event.id,
      status: "CANCELLED",
      startsAt: fixture.occurrence.startsAt,
      endsAt: fixture.occurrence.endsAt,
      capacity: fixture.occurrence.capacity,
      prepayPercentage: fixture.occurrence.prepayPercentage,
      venueTitle: fixture.occurrence.venueTitle,
      note: fixture.occurrence.note,
      imageUrl: fixture.occurrence.imageUrl || "",
      published: fixture.occurrence.published,
      cancelMode: "CANCEL_ONLY"
    });

    expect(savedOccurrence.cancellationSummary).toMatchObject({
      cancelledCount: 2,
      refundRequestedCount: 0,
      refundSkippedCount: 0,
      refundFailedCount: 0
    });
    expect(createStripeRefund).not.toHaveBeenCalled();

    const state = await loadPersistentState();
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === fixture.primaryRegistration.id &&
          entry.kind === "REFUND"
      )
    ).toBe(false);
  });

  it("keeps the occurrence cancelled, records refund failures, and supports retrying only those failures", async () => {
    const fixture = await primeOccurrenceCancellationFixture();
    vi.mocked(createStripeRefund)
      .mockRejectedValueOnce(new Error("Stripe temporary outage"))
      .mockResolvedValueOnce({
        mode: "live",
        refundId: "re_occurrence_retry_123",
        status: "pending",
        amountCents: 3900,
        amountLabel: "EUR 39",
        currency: fixture.primaryRegistration.currency,
        chargeId: "ch_occurrence_retry_123",
        paymentIntentId: "pi_occurrence_refund_123",
        stripeAccountId: "acct_occurrence_refund_123",
        idempotencyKey: "passreserve:refund:occurrence_cancel:tok_1:3900:requested_by_customer",
        reason: "requested_by_customer",
        failureReason: null,
        metadata: {},
        createdAt: new Date().toISOString()
      });

    const failedSave = await saveOrganizerOccurrence("alpine-trail-lab", {
      id: fixture.occurrence.id,
      eventTypeId: fixture.event.id,
      status: "CANCELLED",
      startsAt: fixture.occurrence.startsAt,
      endsAt: fixture.occurrence.endsAt,
      capacity: fixture.occurrence.capacity,
      prepayPercentage: fixture.occurrence.prepayPercentage,
      venueTitle: fixture.occurrence.venueTitle,
      note: fixture.occurrence.note,
      imageUrl: fixture.occurrence.imageUrl || "",
      published: fixture.occurrence.published,
      cancelMode: "CANCEL_AND_REFUND_ELIGIBLE"
    });

    expect(failedSave.cancellationSummary).toMatchObject({
      cancelledCount: 2,
      refundRequestedCount: 0,
      refundSkippedCount: 1,
      refundFailedCount: 1
    });

    let state = await loadPersistentState();
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === fixture.primaryRegistration.id &&
          entry.kind === "REFUND" &&
          entry.status === "FAILED" &&
          entry.note === "Stripe refund request failed after occurrence cancellation."
      )
    ).toBe(true);

    const retrySummary = await retryOrganizerOccurrenceFailedRefunds(
      "alpine-trail-lab",
      fixture.occurrence.id,
      "organizer-admin-9"
    );

    expect(retrySummary).toMatchObject({
      retryableCount: 1,
      refundRequestedCount: 1,
      refundSkippedCount: 0,
      refundFailedCount: 0
    });

    state = await loadPersistentState();
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === fixture.primaryRegistration.id &&
          entry.kind === "REFUND" &&
          entry.status === "PENDING" &&
          entry.note === "Stripe refund retry requested by organizer admin."
      )
    ).toBe(true);
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === fixture.primaryRegistration.id &&
          entry.eventType === "organizer_refund_retry_requested"
      )
    ).toBe(true);
  });
});
