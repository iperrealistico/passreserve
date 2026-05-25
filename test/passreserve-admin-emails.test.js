import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  getOrganizerSettingsAdmin,
  saveOrganizerOccurrence,
  updateOrganizerRegistration,
  updateOrganizerSettings
} from "../lib/passreserve-admin-service.js";
import { DEFAULT_LOCAL_PASSWORD } from "../lib/passreserve-config.js";
import { authenticateOrganizerAdmin } from "../lib/passreserve-service.js";
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

  it("keeps organizer settings bound to an active admin account", async () => {
    const stateBefore = await loadPersistentState();
    const organizer = stateBefore.organizers.find((entry) => entry.slug === "alpine-trail-lab");
    const originalPrimaryAdmin = stateBefore.organizerAdmins.find(
      (entry) => entry.organizerId === organizer.id && entry.isPrimary
    );
    const activeAdminId = "admin-active-secondary";
    const activeAdminEmail = "current@alpine-trail-lab.passreserve.local";
    const renamedAdminEmail = "renamed@alpine-trail-lab.passreserve.local";

    await mutatePersistentState(async (draft) => {
      const inactivePrimary = draft.organizerAdmins.find(
        (entry) => entry.id === originalPrimaryAdmin.id
      );
      const now = new Date().toISOString();
      const nextCreatedAt = new Date(Date.now() + 1000).toISOString();

      inactivePrimary.isActive = false;
      inactivePrimary.updatedAt = now;
      draft.organizerAdmins.push({
        ...inactivePrimary,
        id: activeAdminId,
        email: activeAdminEmail,
        name: "Current Admin",
        isPrimary: false,
        isActive: true,
        lastLoginAt: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: nextCreatedAt,
        updatedAt: nextCreatedAt
      });
    });

    const settingsBefore = await getOrganizerSettingsAdmin("alpine-trail-lab");

    expect(settingsBefore.primaryAdmin.email).toBe(activeAdminEmail);

    await updateOrganizerSettings(
      "alpine-trail-lab",
      {
        name: organizer.name,
        city: organizer.city,
        region: organizer.region,
        publicEmail: organizer.publicEmail,
        interestEmail: organizer.interestEmail,
        adminEmail: renamedAdminEmail,
        adminName: "Renamed Admin"
      },
      activeAdminId
    );

    const state = await loadPersistentState();
    const inactivePrimary = state.organizerAdmins.find(
      (entry) => entry.id === originalPrimaryAdmin.id
    );
    const activeAdmin = state.organizerAdmins.find((entry) => entry.id === activeAdminId);
    const settingsAfter = await getOrganizerSettingsAdmin("alpine-trail-lab");
    const login = await authenticateOrganizerAdmin(
      "alpine-trail-lab",
      renamedAdminEmail,
      DEFAULT_LOCAL_PASSWORD
    );

    expect(inactivePrimary.email).toBe(originalPrimaryAdmin.email);
    expect(activeAdmin.email).toBe(renamedAdminEmail);
    expect(activeAdmin.name).toBe("Renamed Admin");
    expect(settingsAfter.primaryAdmin.email).toBe(renamedAdminEmail);
    expect(login?.admin.id).toBe(activeAdminId);
    expect(
      await authenticateOrganizerAdmin(
        "alpine-trail-lab",
        activeAdminEmail,
        DEFAULT_LOCAL_PASSWORD
      )
    ).toBeNull();
  });
});
