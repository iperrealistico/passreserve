import { describe, expect, it } from "vitest";

import {
  ORGANIZER_ADMIN_TOUR_MODES,
  ORGANIZER_ADMIN_TOUR_VERSION,
  getOrganizerAdminTourDefinition
} from "../lib/organizer-admin-tour.js";

describe("organizer admin tour definition", () => {
  it("builds the showcase tour in English across the full organizer admin flow", () => {
    const definition = getOrganizerAdminTourDefinition({
      locale: "en",
      mode: ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE,
      slug: "sillico"
    });

    expect(ORGANIZER_ADMIN_TOUR_VERSION).toBeTruthy();
    expect(definition.labels.replay).toBe("Replay tour");
    expect(definition.labels.language).toBe("Tour language");
    expect(definition.localeOptions).toEqual([
      {
        value: "it",
        label: "Italiano",
        shortLabel: "IT"
      },
      {
        value: "en",
        label: "English",
        shortLabel: "EN"
      }
    ]);
    expect(definition.steps.map((step) => step.id)).toEqual([
      "dashboard-overview",
      "dashboard-priorities",
      "settings-navigation",
      "settings-organization",
      "settings-account",
      "billing-setup",
      "event-core",
      "event-tickets",
      "event-copy",
      "event-publish",
      "date-form",
      "schedule-views",
      "registrations-queue",
      "tour-replay"
    ]);
    expect(definition.steps[0].route).toBe("/sillico/admin/dashboard");
    expect(definition.steps.at(-1)?.target).toBe(
      '[data-organizer-tour="dashboard-tour-replay"]'
    );
  });

  it("localizes the CTA labels in Italian", () => {
    const definition = getOrganizerAdminTourDefinition({
      locale: "it",
      mode: ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE,
      slug: "sillico"
    });

    expect(definition.labels.next).toBe("Avanti");
    expect(definition.labels.previous).toBe("Indietro");
    expect(definition.labels.skip).toBe("Salta tour");
    expect(definition.labels.replay).toBe("Rivedi tour");
    expect(definition.labels.language).toBe("Lingua tour");
    expect(definition.steps[5].route).toBe("/sillico/admin/billing");
  });

  it("builds the setup mode with real interaction checkpoints", () => {
    const definition = getOrganizerAdminTourDefinition({
      locale: "en",
      mode: ORGANIZER_ADMIN_TOUR_MODES.SETUP,
      slug: "sillico"
    });

    expect(definition.steps.map((step) => step.id)).toEqual([
      "setup-intro",
      "setup-open-settings",
      "setup-organization",
      "setup-notifications",
      "setup-account",
      "setup-save-settings",
      "setup-open-billing",
      "setup-billing",
      "setup-open-events",
      "setup-event-form",
      "setup-event-core",
      "setup-event-tickets",
      "setup-event-copy",
      "setup-event-publish",
      "setup-save-event",
      "setup-event-created"
    ]);
    expect(definition.steps[1]).toMatchObject({
      advanceOn: "target-click",
      route: "/sillico/admin/dashboard",
      target: '[data-organizer-tour="nav-settings"]'
    });
    expect(definition.steps[5]).toMatchObject({
      advanceOn: "form-submit",
      advanceSelector: '[data-organizer-tour="settings-form"]',
      target: '[data-organizer-tour="settings-save"]'
    });
    expect(definition.steps[14]).toMatchObject({
      advanceOn: "form-submit",
      advanceSelector: '[data-organizer-tour="event-edit-form"]',
      target: '[data-organizer-tour="event-save"]'
    });
    expect(definition.steps.at(-1)?.target).toBe(
      '[data-organizer-tour="event-created-state"]'
    );
  });
});
