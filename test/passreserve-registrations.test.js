import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  confirmRegistrationHold,
  createRegistrationHold,
  getConfirmedRegistrationView,
  getRegistrationExperienceBySlugs,
  getRegistrationHoldView,
  processRegistrationReminderDeliveries
} from "../lib/passreserve-registrations";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-registrations-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

async function createInput(slug, eventSlug, overrides = {}) {
  const experience = await getRegistrationExperienceBySlugs(slug, eventSlug);

  return {
    slug,
    eventSlug,
    occurrenceId: experience.selectedOccurrence.id,
    ticketCategoryId: experience.selectedTicketCategory.id,
    quantity: 2,
    attendeeName: "Ada Lovelace",
    attendeeEmail: "ADA@example.com",
    attendeePhone: "+39 333 555 1010",
    ...overrides
  };
}

describe("passreserve-registrations", () => {
  it("creates a verified registration hold for a live occurrence", async () => {
    const input = await createInput("alpine-trail-lab", "sunrise-ridge-session");
    const result = await createRegistrationHold(input);

    expect(result.ok).toBe(true);
    expect(result.redirectHref).toBe(
      "/alpine-trail-lab/events/sunrise-ridge-session/register/pending"
    );

    const holdToken = result.confirmationHref.split("/").at(-1);
    const holdView = await getRegistrationHoldView(input.slug, input.eventSlug, holdToken);
    const state = await loadPersistentState();

    expect(holdView.state).toBe("ready");
    expect(holdView.attendee).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com"
    });
    expect(holdView.payment.onlineAmount).toBeGreaterThan(0);
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.templateSlug === "attendee_pending_confirmation" &&
          entry.recipientEmail === "ada@example.com"
      )
    ).toBe(true);
  });

  it("routes payment-required confirmations into the preview payment handoff", async () => {
    const input = await createInput("alpine-trail-lab", "sunrise-ridge-session");
    const hold = await createRegistrationHold(input);
    const holdToken = hold.confirmationHref.split("/").at(-1);
    const confirmation = await confirmRegistrationHold({
      slug: input.slug,
      eventSlug: input.eventSlug,
      holdToken,
      termsAccepted: "yes",
      responsibilityAccepted: "yes",
      baseUrl: "http://localhost:3000"
    });

    expect(confirmation).toMatchObject({
      ok: true
    });
    expect(confirmation.redirectHref).toContain("/register/payment/preview/");
  });

  it("finalizes zero-online registrations without a payment handoff", async () => {
    const input = await createInput("officina-gravel-house", "gravel-social-camp", {
      quantity: 1
    });
    const hold = await createRegistrationHold(input);
    const holdToken = hold.confirmationHref.split("/").at(-1);
    const confirmation = await confirmRegistrationHold({
      slug: input.slug,
      eventSlug: input.eventSlug,
      holdToken,
      termsAccepted: "yes",
      responsibilityAccepted: "yes",
      baseUrl: "http://localhost:3000"
    });

    expect(confirmation).toMatchObject({
      ok: true
    });
    expect(confirmation.redirectHref).toContain("/register/confirmed/");

    const confirmationToken = confirmation.redirectHref.split("/").at(-1);
    const confirmationView = await getConfirmedRegistrationView(
      input.slug,
      input.eventSlug,
      confirmationToken
    );

    expect(confirmationView).toMatchObject({
      state: "ready",
      registrationStatus: "CONFIRMED_UNPAID",
      paymentStatus: "NONE"
    });

    const state = await loadPersistentState();
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.templateSlug === "attendee_registration_confirmed" &&
          entry.recipientEmail === "ada@example.com"
      )
    ).toBe(true);
    expect(
      state.emailDeliveries.some(
        (entry) => entry.templateSlug === "organizer_new_registration"
      )
    ).toBe(true);
  });

  it("blocks registrations that are too close to the event start", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");

      organizer.minAdvanceHours = 500;
      organizer.updatedAt = new Date().toISOString();
    });

    const input = await createInput("alpine-trail-lab", "sunrise-ridge-session");
    const result = await createRegistrationHold(input);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Registrations close 500 hours before this event starts.");
  });

  it("blocks registrations that are too far ahead of the allowed booking window", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");

      organizer.maxAdvanceDays = 2;
      organizer.updatedAt = new Date().toISOString();
    });

    const input = await createInput("alpine-trail-lab", "sunrise-ridge-session");
    const result = await createRegistrationHold(input);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Registrations only open within 2 days of the event date.");
  });

  it("sends organizer-scoped reminders only when both platform and organizer reminders are enabled", async () => {
    await mutatePersistentState(async (draft) => {
      draft.siteSettings.registrationRemindersEnabled = true;

      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      organizer.registrationRemindersEnabled = true;
      organizer.registrationReminderLeadHours = 24;
      organizer.registrationReminderNote = "Parking opens 20 minutes before the event starts.";

      const registration = draft.registrations.find(
        (entry) =>
          entry.attendeeEmail === "luca@example.com" &&
          entry.organizerId === "org-alpine-trail-lab"
      );
      registration.status = "CONFIRMED_PARTIALLY_PAID";
      registration.confirmedAt = "2026-04-13T09:00:00.000Z";
      const occurrence = draft.occurrences.find((entry) => entry.id === registration.occurrenceId);
      occurrence.startsAt = "2026-04-14T12:00:00.000Z";
      occurrence.endsAt = "2026-04-14T15:00:00.000Z";
    });

    const result = await processRegistrationReminderDeliveries(new Date("2026-04-13T12:30:00.000Z"));
    const state = await loadPersistentState();

    expect(result).toMatchObject({
      ok: true,
      disabled: false,
      sent: 1
    });
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.templateSlug === "attendee_occurrence_reminder" &&
          entry.recipientEmail === "luca@example.com"
      )
    ).toBe(true);
  });
});
