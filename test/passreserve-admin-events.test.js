import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { getDetailEditId } from "../app/[slug]/admin/events/page-state.js";
import {
  getOrganizerEventsAdmin,
  saveOrganizerEvent
} from "../lib/passreserve-admin-service.js";
import { mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-events-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

describe("passreserve organizer admin events payload", () => {
  it("keeps the events page render-safe when no event is selected", () => {
    expect(getDetailEditId(null, null)).toBe("");
    expect(getDetailEditId({ id: "event-1" }, null)).toBe("");
    expect(getDetailEditId({ id: "event-1" }, { id: "event-1" })).toBe("event-1");
  });

  it("normalizes legacy event fields so the events page stays render-safe", async () => {
    await mutatePersistentState(async (draft) => {
      const event = draft.events.find((entry) => entry.id === "event-sillico-prova");

      event.visibility = null;
      event.gallery = "https://images.example.com/sillico-cover.jpg";
    });

    const data = await getOrganizerEventsAdmin("sillico");
    const event = data.events.find((entry) => entry.id === "event-sillico-prova");

    expect(event.visibility).toBe("DRAFT");
    expect(event.ticketCategories).toBeInstanceOf(Array);
    expect(event.gallery).toEqual([
      {
        imageUrl: "https://images.example.com/sillico-cover.jpg",
        title: "",
        caption: ""
      }
    ]);
  });

  it("persists and clears the event-level booking language override", async () => {
    const before = await getOrganizerEventsAdmin("sillico");
    const event = before.events.find((entry) => entry.id === "event-sillico-prova");

    expect(event.resolvedRegistrationLanguagePromptEnabled).toBe(true);
    expect(event.hasRegistrationLanguagePromptOverride).toBe(false);

    const baseInput = {
      id: event.id,
      title: event.title,
      slug: event.slug,
      category: event.category,
      visibility: event.visibility,
      summary: event.summary,
      description: event.description,
      audience: event.audience,
      durationMinutes: String(event.durationMinutes || 180),
      venueTitle: event.venueTitle,
      venueDetail: event.venueDetail,
      mapHref: event.mapHref || "",
      basePriceCents: String(event.basePriceCents || 0),
      ticketCatalogJson: JSON.stringify(event.ticketCategories || []),
      prepayPercentage: String(event.prepayPercentage || 0),
      attendeeInstructions: event.attendeeInstructions || "",
      organizerNotes: event.organizerNotes || "",
      refundPolicyType: event.refundPolicyType || "",
      cancellationPolicy: event.cancellationPolicy || "",
      highlights: (event.highlights || []).join("\n"),
      included: (event.included || []).join("\n"),
      policies: (event.policies || []).join("\n"),
      galleryJson: JSON.stringify(event.gallery || []),
      imageUrl: event.imageUrl || ""
    };

    await saveOrganizerEvent("sillico", {
      ...baseInput,
      registrationLanguagePromptEnabled: "false"
    });

    let after = await getOrganizerEventsAdmin("sillico");
    let updated = after.events.find((entry) => entry.id === "event-sillico-prova");

    expect(updated.registrationLanguagePromptEnabled).toBe(false);
    expect(updated.resolvedRegistrationLanguagePromptEnabled).toBe(false);
    expect(updated.hasRegistrationLanguagePromptOverride).toBe(true);

    await saveOrganizerEvent("sillico", {
      ...baseInput,
      registrationLanguagePromptEnabled: ""
    });

    after = await getOrganizerEventsAdmin("sillico");
    updated = after.events.find((entry) => entry.id === "event-sillico-prova");

    expect(updated.registrationLanguagePromptEnabled).toBeNull();
    expect(updated.resolvedRegistrationLanguagePromptEnabled).toBe(true);
    expect(updated.hasRegistrationLanguagePromptOverride).toBe(false);
  });

  it("persists the structured refund policy type alongside the detailed policy text", async () => {
    const before = await getOrganizerEventsAdmin("sillico");
    const event = before.events.find((entry) => entry.id === "event-sillico-prova");

    await saveOrganizerEvent("sillico", {
      id: event.id,
      title: event.title,
      slug: event.slug,
      category: event.category,
      visibility: event.visibility,
      summary: event.summary,
      description: event.description,
      audience: event.audience,
      durationMinutes: String(event.durationMinutes || 180),
      venueTitle: event.venueTitle,
      venueDetail: event.venueDetail,
      mapHref: event.mapHref || "",
      basePriceCents: String(event.basePriceCents || 0),
      ticketCatalogJson: JSON.stringify(event.ticketCategories || []),
      prepayPercentage: String(event.prepayPercentage || 0),
      attendeeInstructions: event.attendeeInstructions || "",
      organizerNotes: event.organizerNotes || "",
      refundPolicyType: "NON_REFUNDABLE",
      cancellationPolicy: "Tickets are not refundable once the booking is confirmed.",
      highlights: (event.highlights || []).join("\n"),
      included: (event.included || []).join("\n"),
      policies: (event.policies || []).join("\n"),
      galleryJson: JSON.stringify(event.gallery || []),
      imageUrl: event.imageUrl || ""
    });

    const after = await getOrganizerEventsAdmin("sillico");
    const updated = after.events.find((entry) => entry.id === "event-sillico-prova");

    expect(updated.refundPolicyType).toBe("NON_REFUNDABLE");
    expect(updated.cancellationPolicy).toBe("Tickets are not refundable once the booking is confirmed.");
  });

  it("allows events to leave duration unset without forcing the legacy 180-minute default", async () => {
    const before = await getOrganizerEventsAdmin("sillico");
    const event = before.events.find((entry) => entry.id === "event-sillico-prova");

    await saveOrganizerEvent("sillico", {
      id: event.id,
      title: event.title,
      slug: event.slug,
      category: event.category,
      visibility: event.visibility,
      summary: event.summary,
      description: event.description,
      audience: event.audience,
      durationMinutes: "",
      venueTitle: event.venueTitle,
      venueDetail: event.venueDetail,
      mapHref: event.mapHref || "",
      basePriceCents: String(event.basePriceCents || 0),
      ticketCatalogJson: JSON.stringify(event.ticketCategories || []),
      prepayPercentage: String(event.prepayPercentage || 0),
      attendeeInstructions: event.attendeeInstructions || "",
      organizerNotes: event.organizerNotes || "",
      refundPolicyType: event.refundPolicyType || "",
      cancellationPolicy: event.cancellationPolicy || "",
      highlights: (event.highlights || []).join("\n"),
      included: (event.included || []).join("\n"),
      policies: (event.policies || []).join("\n"),
      galleryJson: JSON.stringify(event.gallery || []),
      imageUrl: event.imageUrl || ""
    });

    const after = await getOrganizerEventsAdmin("sillico");
    const updated = after.events.find((entry) => entry.id === "event-sillico-prova");

    expect(updated.durationMinutes).toBeNull();
  });
});
