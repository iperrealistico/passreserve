import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV
};

function createPreviewFixture() {
  const organizer = {
    id: "org_sillico",
    slug: "sillico",
    publicSlug: "sillico",
    name: "Sillico",
    timeZone: "Europe/Rome",
    contentI18n: null
  };
  const eventType = {
    id: "event_divini",
    organizerId: organizer.id,
    slug: "divini-sapori",
    title: "Divini & Sapori",
    prepayPercentage: 40,
    contentI18n: null
  };
  const occurrence = {
    id: "occ_divini_1",
    eventTypeId: eventType.id,
    startsAt: new Date("2026-07-03T18:30:00.000Z"),
    endsAt: new Date("2026-07-03T21:30:00.000Z")
  };
  const ticketCategory = {
    id: "ticket_adulto",
    eventTypeId: eventType.id,
    name: "Adulto",
    contentI18n: null
  };
  const registration = {
    id: "reg_divini_1",
    organizerId: organizer.id,
    eventTypeId: eventType.id,
    occurrenceId: occurrence.id,
    ticketCategoryId: ticketCategory.id,
    status: "PENDING_PAYMENT",
    attendeeName: "Silvia Biagioni",
    attendeeEmail: "silvia@example.com",
    attendeePhone: "+39 333 000 0000",
    registrationLocale: "en",
    quantity: 2,
    currency: "EUR",
    subtotalCents: 10000,
    onlineAmountCents: 4000,
    dueAtEventCents: 6000,
    onlineCollectedCents: 0,
    paymentToken: "paytok_live_1",
    registrationCode: "REG-DIVINI-1",
    confirmedAt: new Date("2026-07-01T10:00:00.000Z"),
    expiresAt: new Date("2026-07-01T22:00:00.000Z"),
    organizer,
    eventType,
    occurrence,
    ticketCategory,
    attendees: [
      {
        id: "att_1",
        registrationId: "reg_divini_1",
        ticketCategoryId: ticketCategory.id,
        firstName: "Silvia",
        lastName: "Biagioni",
        address: "",
        phone: "+39 333 000 0000",
        email: "silvia@example.com",
        dietaryFlags: [],
        dietaryOther: "",
        ticketCategory
      }
    ],
    items: [
      {
        id: "item_1",
        registrationId: "reg_divini_1",
        ticketCategoryId: ticketCategory.id,
        sortOrder: 0,
        quantity: 2,
        unitPriceCents: 5000,
        subtotalCents: 10000,
        onlineAmountCents: 4000,
        dueAtEventCents: 6000,
        ticketCategory
      }
    ]
  };

  const prisma = {
    registration: {
      findUnique: vi.fn(async ({ where }) =>
        where.paymentToken === registration.paymentToken ? registration : null
      )
    }
  };

  return {
    prisma,
    registration
  };
}

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://passreserve:test@localhost:5432/passreserve";
  process.env.SESSION_SECRET = "test-session-secret";
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
});

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("passreserve payment preview in database mode", () => {
  it("returns a friendly error for a missing payment token without reading the file-backed state", async () => {
    const fixture = createPreviewFixture();
    const loadPersistentState = vi.fn(async () => {
      throw new Error("loadPersistentState should not run in database mode for preview lookup");
    });

    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => fixture.prisma,
      hasCompatibleDatabaseSchema: () => true,
      logDatabaseFallback: vi.fn()
    }));
    vi.doMock("../lib/passreserve-state.js", () => ({
      loadPersistentState,
      mutatePersistentState: vi.fn(),
      loadFileBackedState: vi.fn(),
      readPrismaState: vi.fn()
    }));

    const { getRegistrationPaymentPreviewView } = await import(
      "../lib/passreserve-service.js"
    );
    const view = await getRegistrationPaymentPreviewView(
      "sillico",
      "divini-sapori",
      "missing-token"
    );

    expect(view).toEqual({
      state: "error",
      title: "This payment preview could not be found.",
      message: "The payment link is no longer available."
    });
    expect(loadPersistentState).not.toHaveBeenCalled();
  });

  it("builds the payment preview directly from Prisma relations in database mode", async () => {
    const fixture = createPreviewFixture();
    const loadPersistentState = vi.fn(async () => {
      throw new Error("loadPersistentState should not run in database mode for preview lookup");
    });

    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => fixture.prisma,
      hasCompatibleDatabaseSchema: () => true,
      logDatabaseFallback: vi.fn()
    }));
    vi.doMock("../lib/passreserve-state.js", () => ({
      loadPersistentState,
      mutatePersistentState: vi.fn(),
      loadFileBackedState: vi.fn(),
      readPrismaState: vi.fn()
    }));

    const { getRegistrationPaymentPreviewView } = await import(
      "../lib/passreserve-service.js"
    );
    const view = await getRegistrationPaymentPreviewView(
      "sillico",
      "divini-sapori",
      fixture.registration.paymentToken
    );

    expect(view.state).toBe("ready");
    expect(view.locale).toBe("en");
    expect(view.organizer.name).toBe("Sillico");
    expect(view.organizer.organizerHref).toBe("/sillico");
    expect(view.event.title).toBe("Divini & Sapori");
    expect(view.event.detailHref).toBe("/sillico/events/divini-sapori");
    expect(view.event.collectionLabel).toBe("40% online");
    expect(view.attendee.name).toBe("Silvia Biagioni");
    expect(view.payment.onlineAmountLabel).toBe("€40");
    expect(view.payment.dueAtEventLabel).toBe("€60");
    expect(view.ticketSummaryLabel).toBe("Adulto x2");
    expect(loadPersistentState).not.toHaveBeenCalled();
  });
});
