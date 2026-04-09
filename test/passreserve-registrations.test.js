import { describe, expect, it } from "vitest";

import {
  confirmRegistrationHold,
  createRegistrationHold,
  getConfirmedRegistrationView,
  getRegistrationExperienceBySlugs,
  getRegistrationHoldView
} from "../lib/passreserve-registrations";

function createInput(slug, eventSlug, overrides = {}) {
  const experience = getRegistrationExperienceBySlugs(slug, eventSlug);

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
  it("creates a verified registration hold for a live occurrence", () => {
    const input = createInput("alpine-trail-lab", "sunrise-ridge-session");
    const result = createRegistrationHold(input);

    expect(result.ok).toBe(true);

    const holdToken = result.redirectHref.split("/").at(-1);
    const holdView = getRegistrationHoldView(input.slug, input.eventSlug, holdToken);

    expect(holdView.state).toBe("ready");
    expect(holdView.attendee).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com"
    });
    expect(holdView.payment.onlineAmount).toBeGreaterThan(0);
  });

  it("routes payment-required confirmations into the preview payment handoff", async () => {
    const input = createInput("alpine-trail-lab", "sunrise-ridge-session");
    const hold = createRegistrationHold(input);
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
    const input = createInput("officina-gravel-house", "gravel-social-camp", {
      quantity: 1
    });
    const hold = createRegistrationHold(input);
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
    const confirmationView = getConfirmedRegistrationView(
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
});
