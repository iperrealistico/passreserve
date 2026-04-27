import { describe, expect, it } from "vitest";

import {
  ORGANIZER_ADMIN_TOUR_VERSION,
  getOrganizerAdminTourDefinition
} from "../lib/organizer-admin-tour.js";

describe("organizer admin tour definition", () => {
  it("builds the full English tour across the organizer admin flow", () => {
    const definition = getOrganizerAdminTourDefinition({
      locale: "en",
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
      slug: "sillico"
    });

    expect(definition.labels.next).toBe("Avanti");
    expect(definition.labels.previous).toBe("Indietro");
    expect(definition.labels.skip).toBe("Salta tour");
    expect(definition.labels.replay).toBe("Rivedi tour");
    expect(definition.labels.language).toBe("Lingua tour");
    expect(definition.steps[5].route).toBe("/sillico/admin/billing");
  });
});
