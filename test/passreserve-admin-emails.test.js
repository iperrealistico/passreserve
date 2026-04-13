import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  saveOrganizerOccurrence,
  updateOrganizerRegistration,
  updateOrganizerSettings
} from "../lib/passreserve-admin-service.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-emails-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

describe("passreserve admin email lifecycle", () => {
  it("emails the attendee when an organizer cancels a single registration", async () => {
    const stateBefore = await loadPersistentState();
    const registration = stateBefore.registrations.find(
      (entry) =>
        entry.attendeeEmail === "marco@example.com" &&
        entry.organizerId === "org-officina-gravel-house"
    );

    await updateOrganizerRegistration(
      "officina-gravel-house",
      registration.id,
      "cancel"
    );

    const state = await loadPersistentState();
    const updated = state.registrations.find((entry) => entry.id === registration.id);

    expect(updated.status).toBe("CANCELLED");
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.templateSlug === "attendee_registration_cancelled" &&
          entry.registrationId === registration.id
      )
    ).toBe(true);
  });

  it("cancels active date registrations and sends occurrence-cancelled emails once", async () => {
    const stateBefore = await loadPersistentState();
    const occurrence = stateBefore.occurrences.find((entry) => entry.id === "atl-clinic-2026-04-26");
    const event = stateBefore.events.find((entry) => entry.id === occurrence.eventTypeId);

    await saveOrganizerOccurrence("alpine-trail-lab", {
      id: occurrence.id,
      eventTypeId: event.id,
      status: "CANCELLED",
      startsAt: occurrence.startsAt,
      endsAt: occurrence.endsAt,
      capacity: occurrence.capacity,
      priceCents: occurrence.priceCents,
      prepayPercentage: occurrence.prepayPercentage,
      venueTitle: occurrence.venueTitle,
      note: occurrence.note,
      imageUrl: occurrence.imageUrl || "",
      published: occurrence.published
    });

    const state = await loadPersistentState();
    const updatedRegistration = state.registrations.find(
      (entry) =>
        entry.attendeeEmail === "luca@example.com" &&
        entry.organizerId === "org-alpine-trail-lab"
    );

    expect(updatedRegistration.status).toBe("CANCELLED");
    expect(
      state.emailDeliveries.some(
        (entry) =>
          entry.templateSlug === "attendee_occurrence_cancelled" &&
          entry.registrationId === updatedRegistration.id
      )
    ).toBe(true);
  });

  it("only allows organizer reminder opt-in when platform reminders are enabled", async () => {
    await updateOrganizerSettings("alpine-trail-lab", {
      registrationRemindersEnabled: true,
      registrationReminderLeadHours: "48",
      registrationReminderNote: "Bring a light layer.",
      name: "Alpine Trail Lab",
      publicEmail: "hello@alpinetraillab.com",
      interestEmail: "hello@alpinetraillab.com"
    });

    let state = await loadPersistentState();
    let organizer = state.organizers.find((entry) => entry.slug === "alpine-trail-lab");
    expect(organizer.registrationRemindersEnabled).toBe(false);

    await mutatePersistentState(async (draft) => {
      draft.siteSettings.registrationRemindersEnabled = true;
    });

    await updateOrganizerSettings("alpine-trail-lab", {
      registrationRemindersEnabled: true,
      registrationReminderLeadHours: "48",
      registrationReminderNote: "Bring a light layer.",
      name: "Alpine Trail Lab",
      publicEmail: "hello@alpinetraillab.com",
      interestEmail: "hello@alpinetraillab.com"
    });

    state = await loadPersistentState();
    organizer = state.organizers.find((entry) => entry.slug === "alpine-trail-lab");
    expect(organizer.registrationRemindersEnabled).toBe(true);
    expect(organizer.registrationReminderLeadHours).toBe(48);
  });
});
