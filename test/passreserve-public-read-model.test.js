import { describe, expect, it, vi } from "vitest";

import {
  readPrismaPublicOrganizerStateV2
} from "../lib/passreserve-public-read-model.js";

function createFixture() {
  const organizer = {
    id: "org_1",
    slug: "sillico",
    publicSlug: "sillico",
    name: "Sillico",
    status: "ACTIVE",
    publicationState: "PUBLISHED",
    timeZone: "Europe/Rome"
  };
  const event = {
    id: "event_1",
    organizerId: organizer.id,
    slug: "divini-sapori",
    title: "Divini Sapori",
    visibility: "PUBLIC"
  };
  const occurrence = {
    id: "occ_1",
    eventTypeId: event.id,
    published: true,
    startsAt: new Date("2026-08-10T18:00:00.000Z"),
    endsAt: new Date("2026-08-10T21:00:00.000Z"),
    capacity: 10
  };
  const ticketCategory = {
    id: "ticket_1",
    eventTypeId: event.id,
    slug: "adult",
    name: "Adult",
    isActive: true,
    sortOrder: 0
  };
  const registration = {
    id: "registration_1",
    occurrenceId: occurrence.id,
    status: "CONFIRMED_PAID",
    quantity: 2,
    expiresAt: null
  };
  const prisma = {
    organizer: {
      findFirst: vi.fn(async () => organizer)
    },
    eventType: {
      findMany: vi.fn(async () => [event])
    },
    ticketCategory: {
      findMany: vi.fn(async () => [ticketCategory])
    },
    eventOccurrence: {
      findMany: vi.fn(async () => [occurrence])
    },
    registration: {
      findMany: vi.fn(async () => [registration])
    },
    registrationPayment: {
      findMany: vi.fn(async () => {
        throw new Error("public read model must not query payments");
      })
    }
  };

  return {
    prisma,
    organizer,
    event,
    occurrence,
    ticketCategory,
    registration
  };
}

describe("public read model v2", () => {
  it("loads only public future rendering data and minimal capacity fields", async () => {
    const fixture = createFixture();
    const now = new Date("2026-08-01T12:00:00.000Z");
    const state = await readPrismaPublicOrganizerStateV2(
      fixture.prisma,
      "sillico",
      now
    );

    expect(state).toMatchObject({
      organizers: [fixture.organizer],
      events: [fixture.event],
      ticketCategories: [fixture.ticketCategory],
      registrations: [fixture.registration],
      payments: []
    });
    expect(state.occurrences[0].startsAt).toBe(
      "2026-08-10T18:00:00.000Z"
    );
    expect(fixture.prisma.registrationPayment.findMany).not.toHaveBeenCalled();

    const registrationQuery =
      fixture.prisma.registration.findMany.mock.calls[0][0];
    expect(registrationQuery.include).toBeUndefined();
    expect(registrationQuery.select).toEqual({
      id: true,
      occurrenceId: true,
      status: true,
      quantity: true,
      expiresAt: true
    });
    expect(registrationQuery.where.occurrence).toMatchObject({
      published: true,
      startsAt: {
        gt: now
      },
      eventType: {
        organizerId: fixture.organizer.id,
        visibility: "PUBLIC"
      }
    });
    expect(fixture.prisma.eventType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizerId: fixture.organizer.id,
          visibility: "PUBLIC"
        },
        select: expect.any(Object)
      })
    );
  });

  it("returns null without fan-out queries when the organizer is not published", async () => {
    const fixture = createFixture();
    fixture.prisma.organizer.findFirst.mockResolvedValue(null);

    expect(
      await readPrismaPublicOrganizerStateV2(
        fixture.prisma,
        "private-organizer"
      )
    ).toBeNull();
    expect(fixture.prisma.eventType.findMany).not.toHaveBeenCalled();
    expect(fixture.prisma.registration.findMany).not.toHaveBeenCalled();
  });
});
