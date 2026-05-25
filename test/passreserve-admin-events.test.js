import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { getOrganizerEventsAdmin } from "../lib/passreserve-admin-service.js";
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
});
