import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  confirmRegistrationHold,
  createRegistrationHold,
  getConfirmedRegistrationView,
  getRegistrationExperienceBySlugs,
  getRegistrationHoldView
} from "../lib/passreserve-registrations";
import { mutatePersistentState } from "../lib/passreserve-state.js";

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

    const holdToken = result.redirectHref.split("/").at(-1);
    const holdView = await getRegistrationHoldView(input.slug, input.eventSlug, holdToken);

    expect(holdView.state).toBe("ready");
    expect(holdView.attendee).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com"
    });
    expect(holdView.payment.onlineAmount).toBeGreaterThan(0);
  });

  it("routes payment-required confirmations into the preview payment handoff", async () => {
    const input = await createInput("alpine-trail-lab", "sunrise-ridge-session");
    const hold = await createRegistrationHold(input);
    const holdToken = hold.redirectHref.split("/").at(-1);
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
    const holdToken = hold.redirectHref.split("/").at(-1);
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
});
