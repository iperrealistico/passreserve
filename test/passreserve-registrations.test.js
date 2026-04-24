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
  const defaultTicketId = experience.selectedTicketCategory.id;
  const items =
    overrides.items ??
    [
      {
        ticketCategoryId: defaultTicketId,
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
    slug,
    eventSlug,
    occurrenceId: experience.selectedOccurrence.id,
    items,
    registrationLocale: "en",
    attendees,
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
    expect(state.registrations[0].items).toHaveLength(1);
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

  it("supports mixed ticket carts in a single registration", async () => {
    await mutatePersistentState(async (draft) => {
      const event = draft.events.find((entry) => entry.slug === "sunrise-ridge-session");

      draft.ticketCategories.push({
        id: "ticket-sunrise-ridge-session-vip",
        eventTypeId: event.id,
        slug: "vip",
        name: "VIP access",
        description: "Priority seating and hosted arrival.",
        contentI18n: null,
        included: ["Priority seating", "Hosted arrival"],
        unitPriceCents: 8900,
        isDefault: false,
        isActive: true,
        sortOrder: 1,
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: "2026-04-01T09:00:00.000Z"
      });
    });

    const input = await createInput("alpine-trail-lab", "sunrise-ridge-session", {
      items: [
        {
          ticketCategoryId: "ticket-event-alpine-trail-lab-sunrise-ridge-session-general",
          quantity: 1
        },
        {
          ticketCategoryId: "ticket-sunrise-ridge-session-vip",
          quantity: 1
        }
      ]
    });
    const result = await createRegistrationHold(input);
    const state = await loadPersistentState();

    expect(result.ok).toBe(true);
    expect(state.registrations[0].items).toHaveLength(2);
    expect(state.registrations[0].quantity).toBe(2);
    expect(state.registrations[0].attendees.map((attendee) => attendee.ticketCategoryId)).toEqual([
      "ticket-event-alpine-trail-lab-sunrise-ridge-session-general",
      "ticket-sunrise-ridge-session-vip"
    ]);
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
