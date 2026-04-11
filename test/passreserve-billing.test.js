import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { saveOrganizerOccurrence } from "../lib/passreserve-admin-service.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-billing-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

async function getOrganizerEventId(slug) {
  const state = await loadPersistentState();
  const organizer = state.organizers.find((entry) => entry.slug === slug);
  const event = state.events.find((entry) => entry.organizerId === organizer.id);

  return event.id;
}

describe("passreserve billing gates", () => {
  it("blocks publishing paid occurrences until Stripe and billing are ready", async () => {
    const eventTypeId = await getOrganizerEventId("alpine-trail-lab");

    await expect(
      saveOrganizerOccurrence("alpine-trail-lab", {
        eventTypeId,
        status: "SCHEDULED",
        startsAt: "2026-06-01T18:30:00+02:00",
        endsAt: "2026-06-01T20:30:00+02:00",
        capacity: 30,
        priceCents: 10000,
        prepayPercentage: 100,
        venueTitle: "Festival Hall",
        published: true
      })
    ).rejects.toThrow("Connect a Stripe account before publishing paid dates.");
  });

  it("still allows published pay-at-event occurrences without Stripe", async () => {
    const eventTypeId = await getOrganizerEventId("alpine-trail-lab");

    await saveOrganizerOccurrence("alpine-trail-lab", {
      eventTypeId,
      status: "SCHEDULED",
      startsAt: "2026-06-05T18:30:00+02:00",
      endsAt: "2026-06-05T20:30:00+02:00",
      capacity: 20,
      priceCents: 9000,
      prepayPercentage: 0,
      venueTitle: "Venue Hall",
      published: true
    });

    const state = await loadPersistentState();
    const created = state.occurrences.find((entry) => entry.startsAt === "2026-06-05T18:30:00+02:00");

    expect(created?.published).toBe(true);
    expect(created?.prepayPercentage).toBe(0);
  });

  it("allows paid published occurrences once Stripe is ready and billing is active", async () => {
    const eventTypeId = await getOrganizerEventId("alpine-trail-lab");

    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");

      organizer.stripeAccountId = "acct_123";
      organizer.stripeConnectionStatus = "CONNECTED";
      organizer.stripeDetailsSubmitted = true;
      organizer.stripeChargesEnabled = true;
      organizer.stripePayoutsEnabled = true;
      organizer.onlinePaymentsMonthlyFeeCents = 2500;
      organizer.onlinePaymentsBillingStatus = "ACTIVE";
      organizer.onlinePaymentsBillingActivatedAt = "2026-04-11T09:00:00.000Z";
      organizer.updatedAt = "2026-04-11T09:00:00.000Z";
    });

    await saveOrganizerOccurrence("alpine-trail-lab", {
      eventTypeId,
      status: "SCHEDULED",
      startsAt: "2026-06-10T18:30:00+02:00",
      endsAt: "2026-06-10T20:30:00+02:00",
      capacity: 25,
      priceCents: 12000,
      prepayPercentage: 100,
      venueTitle: "Summit Hall",
      published: true
    });

    const state = await loadPersistentState();
    const created = state.occurrences.find((entry) => entry.startsAt === "2026-06-10T18:30:00+02:00");

    expect(created?.published).toBe(true);
    expect(created?.prepayPercentage).toBe(100);
  });
});
