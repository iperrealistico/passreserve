import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  recordVenuePayment,
  updateOrganizerRegistration
} from "../lib/passreserve-admin-service.js";
import {
  createOrganizerRegistration,
  ORGANIZER_MANUAL_REGISTRATION_MODE
} from "../lib/passreserve-registrations.js";
import { loadPersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-01T09:00:00.000Z"));
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-manual-registration-actions-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function createManualRegistration({
  email,
  firstName = "Ada",
  lastName = "Lovelace",
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
        address: "Via Test 1, Bologna",
        phone: "+39 333 555 1010",
        email,
        dietaryFlags: [],
        dietaryOther: ""
      }
    ],
    mode,
    note: "Organizer manual action parity test."
  });

  expect(result).toMatchObject({
    ok: true
  });

  const nextState = await loadPersistentState();
  const registration = nextState.registrations.find((entry) => entry.attendeeEmail === email);

  expect(registration).toBeTruthy();
  return registration;
}

describe("passreserve admin actions for organizer manual registrations", () => {
  it("cancels organizer-created registrations with the same attendee cancellation email flow", async () => {
    const registration = await createManualRegistration({
      email: "manual-cancel@example.com",
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION
    });

    await updateOrganizerRegistration("alpine-trail-lab", registration.id, "cancel");

    const state = await loadPersistentState();
    const updated = state.registrations.find((entry) => entry.id === registration.id);

    expect(updated).toMatchObject({
      status: "CANCELLED",
      source: "ORGANIZER_MANUAL"
    });
    expect(updated.cancelledAt).toEqual(expect.any(String));
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.templateSlug === "attendee_registration_cancelled"
      )
    ).toBe(true);
  });

  it("supports venue reconciliation and attended closeout on organizer-created registrations", async () => {
    const registration = await createManualRegistration({
      email: "manual-attended@example.com",
      firstName: "Venue",
      lastName: "Flow",
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID
    });

    const paidAtVenue = await recordVenuePayment(
      "alpine-trail-lab",
      registration.id,
      registration.dueAtEventCents
    );

    expect(paidAtVenue).toMatchObject({
      status: "CONFIRMED_PAID",
      venueCollectedCents: registration.dueAtEventCents
    });

    await updateOrganizerRegistration("alpine-trail-lab", registration.id, "mark_attended");

    const state = await loadPersistentState();
    const updated = state.registrations.find((entry) => entry.id === registration.id);

    expect(updated).toMatchObject({
      status: "ATTENDED",
      source: "ORGANIZER_MANUAL",
      onlineCollectedCents: registration.onlineAmountCents,
      venueCollectedCents: registration.dueAtEventCents
    });
    expect(updated.attendedAt).toEqual(expect.any(String));
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.provider === "VENUE" &&
          entry.amountCents === registration.dueAtEventCents
      )
    ).toBe(true);
    expect(
      state.auditLogs.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.eventType === "venue_payment_recorded"
      )
    ).toBe(true);
  });

  it("keeps mark_paid parity when the venue balance was already reconciled on a manual registration", async () => {
    const registration = await createManualRegistration({
      email: "manual-mark-paid@example.com",
      firstName: "Parity",
      lastName: "Check",
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION
    });

    await recordVenuePayment("alpine-trail-lab", registration.id, registration.dueAtEventCents);
    await updateOrganizerRegistration("alpine-trail-lab", registration.id, "mark_paid");

    const state = await loadPersistentState();
    const updated = state.registrations.find((entry) => entry.id === registration.id);

    expect(updated).toMatchObject({
      status: "CONFIRMED_PAID",
      source: "ORGANIZER_MANUAL",
      onlineCollectedCents: registration.onlineAmountCents,
      venueCollectedCents: registration.dueAtEventCents
    });
    expect(
      state.payments.some(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.provider === "MANUAL" &&
          entry.amountCents === registration.onlineAmountCents
      )
    ).toBe(true);
  });

  it("supports no-show closeout on organizer-created registrations", async () => {
    const registration = await createManualRegistration({
      email: "manual-no-show@example.com",
      firstName: "No",
      lastName: "Show",
      mode: ORGANIZER_MANUAL_REGISTRATION_MODE.CONFIRM_UNPAID
    });

    await updateOrganizerRegistration("alpine-trail-lab", registration.id, "mark_no_show");

    const state = await loadPersistentState();
    const updated = state.registrations.find((entry) => entry.id === registration.id);

    expect(updated).toMatchObject({
      status: "NO_SHOW",
      source: "ORGANIZER_MANUAL"
    });
    expect(updated.noShowAt).toEqual(expect.any(String));
  });
});
