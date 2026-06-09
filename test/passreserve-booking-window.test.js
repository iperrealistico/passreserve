import { describe, expect, it } from "vitest";

import { getRegistrationAvailabilityGate } from "../lib/passreserve-booking-window.js";

describe("passreserve booking window precedence", () => {
  it("lets an explicit sales-window opening override organizer maxAdvanceDays", () => {
    const gate = getRegistrationAvailabilityGate(
      {
        maxAdvanceDays: 1,
        minAdvanceHours: 0
      },
      {
        salesWindowStartsAt: "2026-06-09T06:33:00.000Z",
        salesWindowEndsAt: "2026-07-03T16:00:00.000Z"
      },
      {
        startsAt: "2026-07-03T16:30:00.000Z",
        salesWindowStartsAt: "2026-06-09T06:33:00.000Z",
        salesWindowEndsAt: "2026-07-02T19:59:00.000Z"
      },
      new Date("2026-06-09T08:45:23.419Z")
    );

    expect(gate.allowed).toBe(true);
    expect(gate.gateState).toBe("open");
  });

  it("lets an explicit sales-window closing override organizer minAdvanceHours", () => {
    const gate = getRegistrationAvailabilityGate(
      {
        maxAdvanceDays: null,
        minAdvanceHours: 500
      },
      {
        salesWindowStartsAt: null,
        salesWindowEndsAt: "2026-07-03T15:00:00.000Z"
      },
      {
        startsAt: "2026-07-03T16:30:00.000Z",
        salesWindowStartsAt: null,
        salesWindowEndsAt: "2026-07-03T15:00:00.000Z"
      },
      new Date("2026-07-03T14:00:00.000Z")
    );

    expect(gate.allowed).toBe(true);
    expect(gate.gateState).toBe("open");
  });

  it("still applies organizer maxAdvanceDays when no explicit sales-window opening exists", () => {
    const gate = getRegistrationAvailabilityGate(
      {
        maxAdvanceDays: 2,
        minAdvanceHours: 0
      },
      {},
      {
        startsAt: "2026-07-03T16:30:00.000Z"
      },
      new Date("2026-06-09T08:45:23.419Z")
    );

    expect(gate.allowed).toBe(false);
    expect(gate.gateState).toBe("organizer_window");
    expect(gate.reason).toContain("Registrations only open within 2 days of the event date.");
  });
});
