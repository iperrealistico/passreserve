import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  PASSRESERVE_PUBLIC_READ_MODEL: process.env.PASSRESERVE_PUBLIC_READ_MODEL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV
};

function createPrismaFixture() {
  const organizer = {
    id: "org_sillico",
    slug: "sillico",
    publicSlug: "sillico",
    name: "Sillico",
    status: "ACTIVE",
    publicationState: "PUBLISHED",
    description: "Local event organizer",
    tagline: "Calm events",
    city: "Lucca",
    region: "Tuscany",
    timeZone: "Europe/Rome",
    publicEmail: "hello@example.com",
    publicPhone: "",
    venueTitle: "Sillico",
    venueDetail: "",
    venueMapHref: "",
    interestEmail: "hello@example.com",
    contentI18n: null,
    minAdvanceHours: 0,
    maxAdvanceDays: null
  };
  const event = {
    id: "event_divini",
    organizerId: organizer.id,
    slug: "divini-sapori",
    title: "Divini Sapori",
    visibility: "PUBLIC",
    summary: "Dinner event",
    description: "Dinner event description",
    category: "Dinner",
    basePriceCents: 5000,
    prepayPercentage: 40,
    collectDietaryInfo: true,
    contentI18n: null
  };
  const ticketCategory = {
    id: "ticket_adult",
    eventTypeId: event.id,
    slug: "adult",
    name: "Adult",
    description: "",
    contentI18n: null,
    included: [],
    unitPriceCents: 5000,
    isDefault: true,
    isActive: true,
    sortOrder: 0
  };
  const occurrence = {
    id: "occ_divini",
    eventTypeId: event.id,
    status: "SCHEDULED",
    startsAt: new Date("2026-08-10T18:00:00.000Z"),
    endsAt: new Date("2026-08-10T21:00:00.000Z"),
    capacity: 10,
    priceCents: 5000,
    prepayPercentage: 40,
    contentI18n: null,
    note: "",
    published: true
  };
  const registration = {
    id: "reg_confirmed",
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
    prisma
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
  process.env.DATABASE_URL =
    "postgresql://passreserve:test@localhost:5432/passreserve";
  process.env.PASSRESERVE_PUBLIC_READ_MODEL = "v2";
  process.env.SESSION_SECRET = "test-session-secret";
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
});

afterEach(() => {
  vi.useRealTimers();

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("public read model v2 service integration", () => {
  it("builds the existing public registration view from the bounded query", async () => {
    const fixture = createPrismaFixture();
    const loadPersistentState = vi.fn(async () => {
      throw new Error("database v2 should not fall back to the file state");
    });

    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => fixture.prisma,
      hasCompatibleDatabaseSchema: () => true,
      logDatabaseFallback: vi.fn()
    }));
    vi.doMock("../lib/passreserve-state.js", () => ({
      loadFileBackedState: vi.fn(),
      loadPersistentState,
      mutatePersistentState: vi.fn()
    }));

    const {
      getOrganizerPage,
      getRegistrationExperienceBySlugs
    } = await import("../lib/passreserve-service.js");
    const organizer = await getOrganizerPage("sillico", {
      locale: "en"
    });
    const experience = await getRegistrationExperienceBySlugs(
      "sillico",
      "divini-sapori",
      {
        locale: "en",
        occurrenceId: "occ_divini"
      }
    );

    expect(organizer).toMatchObject({
      name: "Sillico",
      publicSlug: "sillico",
      organizerHref: "/sillico"
    });
    expect(experience).toMatchObject({
      organizer: {
        name: "Sillico"
      },
      event: {
        title: "Divini Sapori",
        detailHref: "/sillico/events/divini-sapori",
        collectionLabel: "40% online"
      },
      selectedOccurrence: {
        id: "occ_divini",
        capacity: {
          reservedQuantity: 2,
          remaining: 8
        },
        registrationAvailable: true
      },
      selectedTicketCategory: {
        id: "ticket_adult",
        unitPriceLabel: "€50"
      }
    });
    expect(fixture.prisma.registrationPayment.findMany).not.toHaveBeenCalled();
    expect(loadPersistentState).not.toHaveBeenCalled();
  });
});
