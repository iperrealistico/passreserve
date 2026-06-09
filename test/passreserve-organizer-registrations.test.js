import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    `passreserve-organizer-registrations-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function createOrganizerInput(slug, eventSlug, overrides = {}) {
  const state = await loadPersistentState();
  const organizer = state.organizers.find((entry) => entry.slug === slug);
  const event = state.events.find(
    (entry) => entry.organizerId === organizer.id && entry.slug === eventSlug
  );
  const occurrence =
    overrides.occurrenceId
      ? state.occurrences.find((entry) => entry.id === overrides.occurrenceId)
      : state.occurrences
          .filter((entry) => entry.eventTypeId === event.id)
          .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
  const defaultTicket =
    state.ticketCategories.find(
      (entry) => entry.eventTypeId === event.id && entry.isDefault
    ) ??
    state.ticketCategories.find((entry) => entry.eventTypeId === event.id);
  const items =
    overrides.items ??
    [
      {
        ticketCategoryId: defaultTicket.id,
        quantity: overrides.quantity ?? 2
      }
    ];
  const expandedTicketIds = items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => item.ticketCategoryId)
  );
  const attendees =
    overrides.attendees ??
    expandedTicketIds.map((ticketCategoryId, index) => ({
      ticketCategoryId,
      firstName: index === 0 ? "Ada" : `Guest${index + 1}`,
      lastName: index === 0 ? "Lovelace" : "Tester",
      address: `Via Test ${index + 1}, Bologna`,
      phone: index === 0 ? "+39 333 555 1010" : `+39 333 555 101${index}`,
      email: index === 0 ? "ADA@example.com" : `guest${index + 1}@example.com`,
      dietaryFlags: index === 0 ? ["gluten_free"] : [],
      dietaryOther: index === 0 ? "Needs a gluten-free menu." : ""
    }));

  return {
    eventTypeId: event.id,
    occurrenceId: occurrence.id,
    items,
    registrationLocale: "en",
    attendees,
    mode: ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION,
    ...overrides
  };
}

describe("passreserve organizer manual registrations", () => {
  it("creates a pending confirmation registration for the organizer flow", async () => {
    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      origin: "walk-in"
    });
    const stateBefore = await loadPersistentState();
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();
    const registration = state.registrations[0];

    expect(result).toMatchObject({
      ok: true,
      registrationStatus: "PENDING_CONFIRM"
    });
    expect(result.confirmationHref).toContain("/register/confirm/");
    expect(registration.status).toBe("PENDING_CONFIRM");
    expect(registration.registrationCode).toBeNull();
    expect(registration.holdToken).toHaveLength(48);
    expect(registration.source).toBe("ORGANIZER_MANUAL");
    expect(registration.origin).toBe("walk-in");
    expect(state.payments).toHaveLength(stateBefore.payments.length);
    expect(
      state.payments.some((payment) => payment.registrationId === registration.id)
    ).toBe(false);
    expect(state.emailDeliveries[0]).toMatchObject({
      registrationId: registration.id,
      templateSlug: "attendee_pending_confirmation"
    });
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.eventType === "organizer_registration_created"
      )
    ).toBe(true);
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.eventType === "organizer_registration_confirmation_requested" &&
          entry.metadata?.origin === "walk-in"
      )
    ).toBe(true);
  });

  it("supports organizer confirm unpaid by rewriting the whole balance to venue collection", async () => {
    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.CONFIRM_UNPAID
    });
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();
    const registration = state.registrations[0];

    expect(result).toMatchObject({
      ok: true,
      registrationStatus: "CONFIRMED_UNPAID"
    });
    expect(registration.onlineAmountCents).toBe(0);
    expect(registration.dueAtEventCents).toBe(registration.subtotalCents);
    expect(registration.items.every((item) => item.onlineAmountCents === 0)).toBe(true);
    expect(
      registration.items.every((item) => item.dueAtEventCents === item.subtotalCents)
    ).toBe(true);
  });

  it("creates a pending payment registration and preview payment link for organizers", async () => {
    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK,
      quantity: 1,
      origin: "email"
    });
    const stateBefore = await loadPersistentState();
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();
    const registration = state.registrations[0];

    expect(result).toMatchObject({
      ok: true,
      registrationStatus: "PENDING_PAYMENT",
      checkoutMode: "preview"
    });
    expect(result.redirectHref).toContain("/register/payment/preview/");
    expect(registration.status).toBe("PENDING_PAYMENT");
    expect(registration.paymentToken).toHaveLength(48);
    expect(registration.registrationCode).toMatch(/^PR-/);
    expect(registration.source).toBe("ORGANIZER_MANUAL");
    expect(registration.origin).toBe("email");
    expect(state.payments).toHaveLength(stateBefore.payments.length);
    expect(
      state.payments.some((payment) => payment.registrationId === registration.id)
    ).toBe(false);
    expect(
      state.emailDeliveries
        .filter((delivery) => delivery.registrationId === registration.id)
        .map((delivery) => delivery.templateSlug)
    ).toEqual(["organizer_new_registration", "attendee_payment_requested"]);
  });

  it("records the online amount as an offline manual deposit when requested", async () => {
    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID,
      quantity: 1
    });
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();
    const registration = state.registrations[0];
    const payment = state.payments[0];

    expect(result).toMatchObject({
      ok: true,
      registrationStatus: "CONFIRMED_PARTIALLY_PAID"
    });
    expect(registration.onlineCollectedCents).toBe(registration.onlineAmountCents);
    expect(registration.venueCollectedCents).toBe(0);
    expect(payment).toMatchObject({
      provider: "MANUAL",
      kind: "ADJUSTMENT",
      status: "SUCCEEDED",
      amountCents: registration.onlineAmountCents
    });
  });

  it("records both online and venue settlement for fully paid manual registrations", async () => {
    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_FULLY_PAID,
      quantity: 1
    });
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();
    const registration = state.registrations[0];
    const payments = state.payments.slice(0, 2);

    expect(result).toMatchObject({
      ok: true,
      registrationStatus: "CONFIRMED_PAID"
    });
    expect(registration.onlineCollectedCents).toBe(registration.onlineAmountCents);
    expect(registration.venueCollectedCents).toBe(registration.dueAtEventCents);
    expect(payments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "MANUAL",
          kind: "ADJUSTMENT",
          amountCents: registration.onlineAmountCents
        }),
        expect.objectContaining({
          provider: "VENUE",
          kind: "CAPTURE",
          amountCents: registration.dueAtEventCents
        })
      ])
    );
  });

  it("blocks payment-link mode when the occurrence does not require any online amount", async () => {
    const input = await createOrganizerInput("officina-gravel-house", "gravel-social-camp", {
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK,
      quantity: 1
    });
    const result = await createOrganizerRegistration("officina-gravel-house", input);

    expect(result).toMatchObject({
      ok: false
    });
    expect(result.message).toContain("does not require an online amount");
  });

  it("shares the public capacity guardrails and blocks oversold manual registrations", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const event = draft.events.find(
        (entry) =>
          entry.organizerId === organizer.id && entry.slug === "sunrise-ridge-session"
      );
      const occurrence = draft.occurrences.find((entry) => entry.eventTypeId === event.id);
      occurrence.capacity = 1;
      occurrence.updatedAt = new Date().toISOString();
    });

    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      quantity: 2
    });
    const result = await createOrganizerRegistration("alpine-trail-lab", input);

    expect(result).toMatchObject({
      ok: false
    });
    expect(result.message).toContain("no longer available");
  });

  it("drops dietary payload details when the event disables dietary collection", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const event = draft.events.find(
        (entry) =>
          entry.organizerId === organizer.id && entry.slug === "sunrise-ridge-session"
      );

      event.collectDietaryInfo = false;
      event.updatedAt = new Date().toISOString();
    });

    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      quantity: 1,
      attendees: [
        {
          ticketCategoryId: "ticket-event-alpine-trail-lab-sunrise-ridge-session-general",
          firstName: "Ada",
          lastName: "Lovelace",
          address: "Via Test 1, Bologna",
          phone: "+39 333 555 1010",
          email: "ada@example.com",
          dietaryFlags: ["gluten_free"],
          dietaryOther: "No onion"
        }
      ]
    });
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();
    const registration = state.registrations[0];

    expect(result).toMatchObject({
      ok: true
    });
    expect(registration.attendees[0]).toMatchObject({
      dietaryFlags: [],
      dietaryOther: ""
    });
  });

  it("reuses the organizer questionnaire defaults inside manual registration", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");

      organizer.registrationQuestionnaireConfig = {
        participant: {
          address: "hidden",
          phone: "hidden",
          email: "hidden",
          dietaryFlags: "hidden",
          dietaryOther: "hidden"
        }
      };
      organizer.updatedAt = new Date().toISOString();
    });

    const input = await createOrganizerInput("alpine-trail-lab", "sunrise-ridge-session", {
      attendees: [
        {
          ticketCategoryId: "ticket-event-alpine-trail-lab-sunrise-ridge-session-general",
          firstName: "Ada",
          lastName: "Lovelace",
          address: "Via Test 1, Bologna",
          phone: "+39 333 555 1010",
          email: "ADA@example.com",
          dietaryFlags: [],
          dietaryOther: ""
        },
        {
          ticketCategoryId: "ticket-event-alpine-trail-lab-sunrise-ridge-session-general",
          firstName: "Grace",
          lastName: "Hopper",
          address: "",
          phone: "",
          email: "",
          dietaryFlags: [],
          dietaryOther: ""
        }
      ]
    });
    const result = await createOrganizerRegistration("alpine-trail-lab", input);
    const state = await loadPersistentState();

    expect(result).toMatchObject({
      ok: true
    });
    expect(state.registrations[0].attendees[1]).toMatchObject({
      firstName: "Grace",
      lastName: "Hopper",
      address: "",
      phone: "",
      email: "",
      dietaryFlags: [],
      dietaryOther: ""
    });
  });
});
