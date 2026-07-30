import { describe, expect, it } from "vitest";

import {
  buildCapacityRegistrationWhere,
  isRegistrationConsumingCapacity,
  summarizeOccurrenceCapacity
} from "../lib/passreserve-capacity.js";

const now = new Date("2026-08-01T12:00:00.000Z");

describe("public occurrence capacity", () => {
  it("preserves confirmed, pending, expiry, and cancellation semantics", () => {
    const registrations = [
      { status: "CONFIRMED_PAID", quantity: 2 },
      {
        status: "PENDING_CONFIRM",
        quantity: 2,
        expiresAt: "2026-08-01T13:00:00.000Z"
      },
      {
        status: "PENDING_CONFIRM",
        quantity: 3,
        expiresAt: "2026-08-01T11:00:00.000Z"
      },
      {
        status: "PENDING_PAYMENT",
        quantity: 1,
        expiresAt: null
      },
      {
        status: "PENDING_PAYMENT",
        quantity: 4,
        expiresAt: "2026-08-01T10:00:00.000Z"
      },
      { status: "CANCELLED", quantity: 5 }
    ];

    expect(
      registrations.map((registration) =>
        isRegistrationConsumingCapacity(registration, now)
      )
    ).toEqual([true, true, false, true, false, false]);
    expect(
      summarizeOccurrenceCapacity({
        registrations,
        occurrence: {
          capacity: 8
        },
        event: {
          visibility: "PUBLIC"
        },
        now
      })
    ).toEqual({
      totalCapacity: 8,
      confirmedCount: 2,
      pendingHoldCount: 2,
      pendingPaymentCount: 1,
      reservedQuantity: 5,
      remaining: 3,
      capacityLabel: "3 spots left",
      statusLabel: "Open",
      registrationStatusLabel: "Live"
    });
  });

  it("builds a database predicate with the same capacity statuses", () => {
    const where = buildCapacityRegistrationWhere(now);

    expect(where.OR[0].status.in).toEqual([
      "CONFIRMED_UNPAID",
      "CONFIRMED_PARTIALLY_PAID",
      "CONFIRMED_PAID",
      "ATTENDED",
      "NO_SHOW"
    ]);
    expect(where.OR[1]).toMatchObject({
      status: "PENDING_CONFIRM"
    });
    expect(where.OR[2]).toMatchObject({
      status: "PENDING_PAYMENT"
    });
    expect(where.OR[1].OR[1].expiresAt.gt).toEqual(now);
    expect(where.OR[2].OR[1].expiresAt.gt).toEqual(now);
  });
});
