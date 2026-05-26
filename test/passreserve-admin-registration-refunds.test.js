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
  cancelOrganizerRegistration,
  ORGANIZER_REGISTRATION_CANCEL_MODE,
  retryOrganizerRegistrationRefund,
  updateOrganizerRegistration
} from "../lib/passreserve-admin-service.js";
import { createToken } from "../lib/passreserve-format.js";
import {
  createOrganizerRegistration,
  ORGANIZER_MANUAL_REGISTRATION_MODE
} from "../lib/passreserve-registrations.js";
import { createStripeRefund } from "../lib/passreserve-payments.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T11:00:00.000Z"));
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-registration-refunds-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
  vi.mocked(createStripeRefund).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

async function createManualRegistration({
  email,
  firstName = "Refund",
  lastName = "Flow",
  mode = ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION
}) {
  const state = await loadPersistentState();
  const organizer = state.organizers.find((entry) => entry.slug === "alpine-trail-lab");
  const event = state.events.find(
    (entry) => entry.organizerId === organizer.id && entry.slug === "sunrise-ridge-session"
  );
  const occurrence = state.occurrences
    .filter((entry) => entry.eventTypeId === event.id)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
  const ticketCategory =
    state.ticketCategories.find((entry) => entry.eventTypeId === event.id && entry.isDefault) ??
    state.ticketCategories.find((entry) => entry.eventTypeId === event.id);

  const result = await createOrganizerRegistration("alpine-trail-lab", {
    eventTypeId: event.id,
    occurrenceId: occurrence.id,
    items: [
      {
        ticketCategoryId: ticketCategory.id,
        quantity: 1
      }
    ],
    registrationLocale: "en",
    origin: "staff",
    attendees: [
      {
        ticketCategoryId: ticketCategory.id,
        firstName,
        lastName,
        address: "Via Refund 10, Bologna",
        phone: "+39 333 000 2020",
        email,
        dietaryFlags: [],
        dietaryOther: ""
      }
    ],
    mode,
    note: "Stripe auto-refund cancellation test."
  });

  expect(result).toMatchObject({
    ok: true
  });

  const nextState = await loadPersistentState();
  return nextState.registrations.find((entry) => entry.attendeeEmail === email);
}

async function primeRefundEligibleRegistration(email, overrides = {}) {
  const registration = await createManualRegistration({
    email
  });

  await mutatePersistentState(async (draft) => {
    const nextRegistration = draft.registrations.find((entry) => entry.id === registration.id);
    const now = new Date().toISOString();
    const onlineAmountCents = overrides.onlineAmountCents ?? 3900;
    const onlineCollectedCents = overrides.onlineCollectedCents ?? onlineAmountCents;
    const refundedCents = overrides.refundedCents ?? 0;

    nextRegistration.onlineAmountCents = onlineAmountCents;
    nextRegistration.onlineCollectedCents = onlineCollectedCents;
    nextRegistration.refundedCents = refundedCents;
    nextRegistration.status = overrides.status || "CONFIRMED_PARTIALLY_PAID";
    nextRegistration.confirmedAt = nextRegistration.confirmedAt || now;
    nextRegistration.updatedAt = now;

    draft.payments = draft.payments.filter((payment) => payment.registrationId !== registration.id);
    draft.payments.unshift({
      id: createToken(),
      registrationId: registration.id,
      provider: "STRIPE",
      kind: "CAPTURE",
      status: "SUCCEEDED",
      amountCents: onlineCollectedCents,
      currency: nextRegistration.currency,
      externalEventId: null,
      stripeAccountId: overrides.stripeAccountId || "acct_test_refund_123",
      stripeSessionId: overrides.stripeSessionId || "cs_test_refund_123",
      stripePaymentIntentId: overrides.stripePaymentIntentId || "pi_test_refund_123",
      note: "Primed Stripe capture for organizer cancel refund test.",
      metadata: null,
      occurredAt: now,
      createdAt: now
    });

    if (overrides.pendingRefundAmountCents) {
      draft.payments.unshift({
        id: createToken(),
        registrationId: registration.id,
        provider: "STRIPE",
        kind: "REFUND",
        status: "PENDING",
        amountCents: overrides.pendingRefundAmountCents,
        currency: nextRegistration.currency,
        externalEventId: null,
        stripeAccountId: overrides.stripeAccountId || "acct_test_refund_123",
        stripeSessionId: null,
        stripePaymentIntentId: overrides.stripePaymentIntentId || "pi_test_refund_123",
        note: "Existing pending refund for conflict test.",
        metadata: null,
        occurredAt: now,
        createdAt: now
      });
    }
  });

  const nextState = await loadPersistentState();
  return nextState.registrations.find((entry) => entry.id === registration.id);
}

async function primeFailedRefundRegistration(email, overrides = {}) {
  const registration = await primeRefundEligibleRegistration(email, overrides);

  await mutatePersistentState(async (draft) => {
    const nextRegistration = draft.registrations.find((entry) => entry.id === registration.id);
    const now = new Date().toISOString();

    nextRegistration.status = "CANCELLED";
    nextRegistration.cancelledAt = now;
    nextRegistration.updatedAt = now;

    draft.payments.unshift({
      id: createToken(),
      registrationId: registration.id,
      provider: "STRIPE",
      kind: "REFUND",
      status: "FAILED",
      amountCents: nextRegistration.onlineCollectedCents,
      currency: nextRegistration.currency,
      externalEventId: null,
      stripeAccountId: overrides.stripeAccountId || "acct_test_refund_123",
      stripeSessionId: null,
      stripePaymentIntentId: overrides.stripePaymentIntentId || "pi_test_refund_123",
      note: "Stripe refund request failed after occurrence cancellation.",
      metadata: {
        refundAction: "occurrence_cancel",
        cancelMode: "CANCEL_AND_REFUND_ELIGIBLE",
        passreserveSurface: "organizer_occurrence_cancel",
        idempotencyKey: "passreserve:refund:occurrence_cancel:failed",
        errorMessage: "Stripe temporary outage"
      },
      occurredAt: now,
      createdAt: now
    });
  });

  const nextState = await loadPersistentState();
  return nextState.registrations.find((entry) => entry.id === registration.id);
}

describe("passreserve organizer cancellation refunds", () => {
  it("cancels a registration and writes a pending Stripe refund ledger row", async () => {
    const registration = await primeRefundEligibleRegistration("refund-success@example.com");
    vi.mocked(createStripeRefund).mockResolvedValue({
      mode: "live",
      refundId: "re_test_auto_refund",
      status: "pending",
      amountCents: registration.onlineCollectedCents,
      amountLabel: "EUR 39",
      currency: registration.currency,
      chargeId: "ch_test_refund_123",
      paymentIntentId: "pi_test_refund_123",
      stripeAccountId: "acct_test_refund_123",
      idempotencyKey: "passreserve:refund:organizer_cancel:test",
      reason: "requested_by_customer",
      failureReason: null,
      metadata: {},
      createdAt: new Date().toISOString()
    });

    await cancelOrganizerRegistration(
      "alpine-trail-lab",
      registration.id,
      {
        cancelMode: ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
      },
      "organizer-admin-1"
    );

    expect(createStripeRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: registration.onlineCollectedCents,
        paymentIntentId: "pi_test_refund_123",
        stripeAccountId: "acct_test_refund_123",
        reason: "requested_by_customer",
        metadata: expect.objectContaining({
          registration_id: registration.id,
          organizer_slug: "alpine-trail-lab",
          actor_id: "organizer-admin-1",
          cancel_mode: ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
        })
      })
    );

    const state = await loadPersistentState();
    const updated = state.registrations.find((entry) => entry.id === registration.id);
    const refundPayment = state.payments.find(
      (entry) =>
        entry.registrationId === registration.id &&
        entry.provider === "STRIPE" &&
        entry.kind === "REFUND" &&
        entry.status === "PENDING"
    );

    expect(updated).toMatchObject({
      status: "CANCELLED",
      source: "ORGANIZER_MANUAL"
    });
    expect(refundPayment).toMatchObject({
      amountCents: registration.onlineCollectedCents,
      stripeAccountId: "acct_test_refund_123",
      stripePaymentIntentId: "pi_test_refund_123",
      note: "Stripe refund requested by organizer admin."
    });
    expect(refundPayment.metadata).toMatchObject({
      requestedByActorId: "organizer-admin-1",
      requestedAmountCents: registration.onlineCollectedCents,
      refundAction: "organizer_cancel",
      cancelMode: ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE,
      stripeRefundId: "re_test_auto_refund",
      stripeRefundStatus: "pending",
      stripeRefundMode: "live"
    });
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.templateSlug === "attendee_registration_cancelled"
      )
    ).toBe(true);
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.eventType === "organizer_registration_cancelled_with_refund_requested" &&
          entry.metadata?.cancelMode === ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
      )
    ).toBe(true);
  });

  it("keeps the legacy cancel-only flow without touching Stripe refunds", async () => {
    const registration = await primeRefundEligibleRegistration("refund-cancel-only@example.com");

    await updateOrganizerRegistration("alpine-trail-lab", registration.id, "cancel");

    const state = await loadPersistentState();
    expect(createStripeRefund).not.toHaveBeenCalled();
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.kind === "REFUND" &&
          entry.status === "PENDING"
      )
    ).toBe(false);
    expect(state.registrations.find((entry) => entry.id === registration.id)).toMatchObject({
      status: "CANCELLED"
    });
  });

  it("blocks cancel-plus-refund when no online amount was collected", async () => {
    const registration = await primeRefundEligibleRegistration("refund-no-online@example.com", {
      onlineAmountCents: 0,
      onlineCollectedCents: 0
    });

    await expect(
      cancelOrganizerRegistration(
        "alpine-trail-lab",
        registration.id,
        {
          cancelMode: ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
        },
        "organizer-admin-2"
      )
    ).rejects.toThrow("No online payment was collected for this registration.");

    expect(createStripeRefund).not.toHaveBeenCalled();

    const state = await loadPersistentState();
    expect(state.registrations.find((entry) => entry.id === registration.id)).toMatchObject({
      status: "CONFIRMED_PARTIALLY_PAID"
    });
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.eventType === "organizer_refund_request_failed" &&
          entry.metadata?.action === "organizer_cancel"
      )
    ).toBe(true);
  });

  it("blocks duplicate cancel-plus-refund attempts while a refund is already pending", async () => {
    const registration = await primeRefundEligibleRegistration("refund-pending@example.com", {
      pendingRefundAmountCents: 3900
    });

    await expect(
      cancelOrganizerRegistration(
        "alpine-trail-lab",
        registration.id,
        {
          cancelMode: ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
        },
        "organizer-admin-3"
      )
    ).rejects.toThrow("A Stripe refund has already been requested and is still pending.");

    expect(createStripeRefund).not.toHaveBeenCalled();
  });

  it("retries a failed Stripe refund on a cancelled registration using the stored idempotency key", async () => {
    const registration = await primeFailedRefundRegistration("refund-retry@example.com");
    vi.mocked(createStripeRefund).mockResolvedValue({
      mode: "live",
      refundId: "re_test_retry_123",
      status: "pending",
      amountCents: registration.onlineCollectedCents,
      amountLabel: "EUR 39",
      currency: registration.currency,
      chargeId: "ch_test_retry_123",
      paymentIntentId: "pi_test_refund_123",
      stripeAccountId: "acct_test_refund_123",
      idempotencyKey: "passreserve:refund:occurrence_cancel:failed",
      reason: "requested_by_customer",
      failureReason: null,
      metadata: {},
      createdAt: new Date().toISOString()
    });

    await retryOrganizerRegistrationRefund("alpine-trail-lab", registration.id, "organizer-admin-4");

    expect(createStripeRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: "pi_test_refund_123",
        stripeAccountId: "acct_test_refund_123",
        idempotencyKey: "passreserve:refund:occurrence_cancel:failed"
      })
    );

    const state = await loadPersistentState();
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.kind === "REFUND" &&
          entry.status === "PENDING" &&
          entry.note === "Stripe refund retry requested by organizer admin."
      )
    ).toBe(true);
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.eventType === "organizer_refund_retry_requested"
      )
    ).toBe(true);
  });
});
