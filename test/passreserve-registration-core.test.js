import { describe, expect, it } from "vitest";

import { HOLD_DURATION_MINUTES } from "../lib/passreserve-config.js";
import { addMinutes } from "../lib/passreserve-format.js";
import {
  buildPendingConfirmationRegistration,
  buildRegistrationLineItems,
  buildRegistrationRecord,
  buildRegistrationPaymentTotals,
  normalizeRegistrationAttendees,
  normalizeRequestedItems
} from "../lib/passreserve-registration-core.js";

describe("passreserve-registration-core", () => {
  it("aggregates requested items and drops invalid rows", () => {
    expect(
      normalizeRequestedItems([
        {
          ticketCategoryId: "general",
          quantity: 1
        },
        {
          ticketCategoryId: "general",
          quantity: 2
        },
        {
          ticketCategoryId: "vip",
          quantity: 1
        },
        {
          ticketCategoryId: "",
          quantity: 99
        },
        {
          ticketCategoryId: "general",
          quantity: 0
        }
      ])
    ).toEqual([
      {
        ticketCategoryId: "general",
        quantity: 3,
        sortOrder: 0
      },
      {
        ticketCategoryId: "vip",
        quantity: 1,
        sortOrder: 1
      }
    ]);
  });

  it("normalizes attendees and drops dietary answers when collection is disabled", () => {
    const attendees = normalizeRegistrationAttendees(
      [
        {
          ticketCategoryId: "general",
          firstName: " Ada ",
          lastName: " Lovelace ",
          address: " Via Test 1 ",
          phone: " +39 333 555 1010 ",
          email: "ADA@example.com",
          dietaryFlags: ["gluten_free", "not-real"],
          dietaryOther: " No onion "
        }
      ],
      "2026-05-26T08:00:00.000Z",
      {
        collectDietaryInfo: false
      }
    );

    expect(attendees[0]).toMatchObject({
      ticketCategoryId: "general",
      firstName: "Ada",
      lastName: "Lovelace",
      address: "Via Test 1",
      phone: "+39 333 555 1010",
      email: "ada@example.com",
      dietaryFlags: [],
      dietaryOther: ""
    });
  });

  it("builds pending confirmation registrations with shared totals and hold expiry", () => {
    const nowIso = "2026-05-26T08:00:00.000Z";
    const requestedItems = normalizeRequestedItems([
      {
        ticketCategoryId: "general",
        quantity: 2
      },
      {
        ticketCategoryId: "vip",
        quantity: 1
      }
    ]);
    const attendees = normalizeRegistrationAttendees(
      [
        {
          ticketCategoryId: "general",
          firstName: "Ada",
          lastName: "Lovelace",
          address: "Via Test 1",
          phone: "+39 333 555 1010",
          email: "ada@example.com"
        },
        {
          ticketCategoryId: "general",
          firstName: "Grace",
          lastName: "Hopper",
          address: "Via Test 2",
          phone: "+39 333 555 1011",
          email: "grace@example.com"
        },
        {
          ticketCategoryId: "vip",
          firstName: "Katherine",
          lastName: "Johnson",
          address: "Via Test 3",
          phone: "+39 333 555 1012",
          email: "katherine@example.com"
        }
      ],
      nowIso
    );
    const lineItems = buildRegistrationLineItems(
      requestedItems,
      new Map([
        [
          "general",
          {
            unitPriceCents: 2500
          }
        ],
        [
          "vip",
          {
            unitPriceCents: 4000
          }
        ]
      ]),
      40,
      nowIso
    );
    const registration = buildPendingConfirmationRegistration({
      organizerId: "org-1",
      eventTypeId: "event-1",
      occurrenceId: "occ-1",
      registrationLocale: "IT",
      requestedItems,
      attendees,
      lineItems,
      currency: "eur",
      nowIso
    });

    expect(buildRegistrationPaymentTotals(lineItems)).toEqual({
      subtotalCents: 9000,
      onlineAmountCents: 3600,
      dueAtEventCents: 5400
    });
    expect(registration).toMatchObject({
      organizerId: "org-1",
      eventTypeId: "event-1",
      occurrenceId: "occ-1",
      ticketCategoryId: "general",
      status: "PENDING_CONFIRM",
      attendeeName: "Ada Lovelace",
      attendeeEmail: "ada@example.com",
      attendeePhone: "+39 333 555 1010",
      registrationLocale: "it",
      source: "PUBLIC",
      origin: "",
      quantity: 3,
      currency: "EUR",
      subtotalCents: 9000,
      onlineAmountCents: 3600,
      dueAtEventCents: 5400,
      onlineCollectedCents: 0,
      venueCollectedCents: 0,
      refundedCents: 0,
      confirmationToken: null,
      registrationCode: null,
      confirmedAt: null,
      cancelledAt: null,
      attendedAt: null,
      noShowAt: null,
      termsAcceptedAt: null,
      responsibilityAt: null,
      note: "",
      expiresAt: addMinutes(nowIso, HOLD_DURATION_MINUTES)
    });
    expect(registration.holdToken).toHaveLength(48);
    expect(registration.items.every((item) => item.registrationId === registration.id)).toBe(true);
    expect(registration.items).toHaveLength(2);
    expect(registration.attendees).toHaveLength(3);
  });

  it("builds reusable registration records for future organizer-created flows", () => {
    const nowIso = "2026-05-26T09:30:00.000Z";
    const requestedItems = normalizeRequestedItems([
      {
        ticketCategoryId: "walk-in",
        quantity: 1
      }
    ]);
    const attendees = normalizeRegistrationAttendees(
      [
        {
          ticketCategoryId: "walk-in",
          firstName: "Niki",
          lastName: "Lauda",
          address: "Via Test 4",
          phone: "+39 333 555 1013",
          email: "niki@example.com"
        }
      ],
      nowIso
    );
    const lineItems = buildRegistrationLineItems(
      requestedItems,
      new Map([
        [
          "walk-in",
          {
            unitPriceCents: 1800
          }
        ]
      ]),
      0,
      nowIso
    );
    const registration = buildRegistrationRecord({
      organizerId: "org-1",
      eventTypeId: "event-2",
      occurrenceId: "occ-2",
      status: "CONFIRMED_UNPAID",
      registrationLocale: "EN",
      requestedItems,
      attendees,
      lineItems,
      currency: "eur",
      nowIso,
      confirmationToken: "confirmation-token",
      confirmedAt: nowIso,
      note: "Manual organizer entry",
      source: "ORGANIZER_MANUAL",
      origin: ""
    });

    expect(registration).toMatchObject({
      organizerId: "org-1",
      eventTypeId: "event-2",
      occurrenceId: "occ-2",
      status: "CONFIRMED_UNPAID",
      registrationLocale: "en",
      quantity: 1,
      subtotalCents: 1800,
      onlineAmountCents: 0,
      dueAtEventCents: 1800,
      confirmationToken: "confirmation-token",
      confirmedAt: nowIso,
      note: "Manual organizer entry",
      source: "ORGANIZER_MANUAL"
    });
    expect(registration.holdToken).toBeNull();
    expect(registration.items[0].registrationId).toBe(registration.id);
  });
});
