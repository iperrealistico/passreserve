import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV
};

function createConfirmedViewFixture() {
  const organizer = {
    id: "org_sillico",
    slug: "sillico",
    publicSlug: "sillico",
    name: "Sillico",
    timeZone: "Europe/Rome",
    publicEmail: "hello@sillico.test",
    interestEmail: "",
    venueTitle: "Palazzo Carli",
    contentI18n: null
  };
  const eventType = {
    id: "event_divini",
    organizerId: organizer.id,
    slug: "divini-sapori",
    title: "Divini & Sapori",
    prepayPercentage: 40,
    venueTitle: "Palazzo Carli",
    contentI18n: null
  };
  const occurrence = {
    id: "occ_divini_1",
    eventTypeId: eventType.id,
    startsAt: new Date("2026-07-03T18:30:00.000Z"),
    endsAt: new Date("2026-07-03T21:30:00.000Z"),
    venueTitle: "Palazzo Carli",
    contentI18n: null
  };
  const ticketCategory = {
    id: "ticket_adulto",
    eventTypeId: eventType.id,
    slug: "adulto",
    name: "Adulto",
    contentI18n: null,
    sortOrder: 0,
    isDefault: true,
    isActive: true
  };
  const registration = {
    id: "reg_divini_1",
    organizerId: organizer.id,
    eventTypeId: eventType.id,
    occurrenceId: occurrence.id,
    ticketCategoryId: ticketCategory.id,
    status: "CONFIRMED_PAID",
    attendeeName: "Silvia Biagioni",
    attendeeEmail: "silvia@example.com",
    attendeePhone: "+39 333 000 0000",
    registrationLocale: "en",
    quantity: 2,
    currency: "EUR",
    subtotalCents: 10000,
    onlineAmountCents: 4000,
    dueAtEventCents: 6000,
    onlineCollectedCents: 4000,
    venueCollectedCents: 0,
    refundedCents: 0,
    confirmationToken: "confirmtok_live_1",
    registrationCode: "PR-53AE41",
    confirmedAt: new Date("2026-07-01T10:00:00.000Z"),
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:05:00.000Z"),
    attendees: [
      {
        id: "att_1",
        registrationId: "reg_divini_1",
        ticketCategoryId: ticketCategory.id,
        sortOrder: 0,
        firstName: "Silvia",
        lastName: "Biagioni",
        address: "",
        phone: "+39 333 000 0000",
        email: "silvia@example.com",
        dietaryFlags: [],
        dietaryOther: "",
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        updatedAt: new Date("2026-07-01T10:00:00.000Z")
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
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        updatedAt: new Date("2026-07-01T10:00:00.000Z")
      }
    ]
  };
  const siteSettings = {
    id: "site-settings",
    platformEmail: "ops@passreserve.test"
  };
  const payments = [
    {
      id: "pay_capture_1",
      registrationId: registration.id,
      provider: "STRIPE",
      kind: "CAPTURE",
      status: "SUCCEEDED",
      amountCents: 4000,
      currency: "EUR",
      occurredAt: new Date("2026-07-01T10:04:00.000Z"),
      createdAt: new Date("2026-07-01T10:04:00.000Z"),
      updatedAt: new Date("2026-07-01T10:04:00.000Z")
    }
  ];

  const registrationFindFirst = vi.fn(async ({ where }) =>
    where.confirmationToken === registration.confirmationToken
      ? {
          ...registration,
          attendees: registration.attendees.map((entry) => ({ ...entry })),
          items: registration.items.map((entry) => ({ ...entry }))
        }
      : null
  );
  const organizerFindUnique = vi.fn(async ({ where }) =>
    where.id === organizer.id ? { ...organizer } : null
  );
  const eventTypeFindUnique = vi.fn(async ({ where }) =>
    where.id === eventType.id ? { ...eventType } : null
  );
  const occurrenceFindUnique = vi.fn(async ({ where }) =>
    where.id === occurrence.id ? { ...occurrence } : null
  );
  const organizerAdminsFindMany = vi.fn(async () => []);
  const ticketCategoryFindMany = vi.fn(async () => [{ ...ticketCategory }]);
  const siteSettingsFindUnique = vi.fn(async ({ where }) =>
    where.id === siteSettings.id ? { ...siteSettings } : null
  );
  const registrationPaymentFindMany = vi.fn(async ({ where }) =>
    where.registrationId === registration.id ? payments.map((entry) => ({ ...entry })) : []
  );

  const prisma = {
    registration: {
      findFirst: registrationFindFirst
    },
    organizer: {
      findUnique: organizerFindUnique
    },
    eventType: {
      findUnique: eventTypeFindUnique
    },
    eventOccurrence: {
      findUnique: occurrenceFindUnique
    },
    organizerAdminUser: {
      findMany: organizerAdminsFindMany
    },
    ticketCategory: {
      findMany: ticketCategoryFindMany
    },
    siteSettings: {
      findUnique: siteSettingsFindUnique
    },
    registrationPayment: {
      findMany: registrationPaymentFindMany
    }
  };

  return {
    prisma,
    registration,
    registrationPaymentFindMany
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

describe("passreserve confirmed registration view in database mode", () => {
  it("returns a friendly error for a missing confirmation token without reading the file-backed state", async () => {
    const fixture = createConfirmedViewFixture();
    const loadPersistentState = vi.fn(async () => {
      throw new Error("loadPersistentState should not run in database mode for confirmed lookup");
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

    const { getConfirmedRegistrationView } = await import("../lib/passreserve-service.js");
    const view = await getConfirmedRegistrationView("sillico", "divini-sapori", "missing-token");

    expect(view).toEqual({
      state: "error",
      title: "This confirmation could not be found.",
      message: "The registration confirmation link is no longer available."
    });
    expect(loadPersistentState).not.toHaveBeenCalled();
  });

  it("builds the confirmed view directly from the scoped Prisma snapshot in database mode", async () => {
    const fixture = createConfirmedViewFixture();
    const loadPersistentState = vi.fn(async () => {
      throw new Error("loadPersistentState should not run in database mode for confirmed lookup");
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

    const { getConfirmedRegistrationView } = await import("../lib/passreserve-service.js");
    const view = await getConfirmedRegistrationView(
      "sillico",
      "divini-sapori",
      fixture.registration.confirmationToken
    );

    expect(view.state).toBe("ready");
    expect(view.locale).toBe("en");
    expect(view.organizer.name).toBe("Sillico");
    expect(view.organizer.organizerHref).toBe("/sillico");
    expect(view.event.title).toBe("Divini & Sapori");
    expect(view.event.detailHref).toBe("/sillico/events/divini-sapori");
    expect(view.ticketSummaryLabel).toBe("Adulto x2");
    expect(view.paymentStatus).toBe("PAID");
    expect(view.payment.onlineAmountLabel).toBe("€40");
    expect(view.payment.dueAtEventLabel).toBe("€60");
    expect(view.reconciledAtLabel).toBeTruthy();
    expect(fixture.registrationPaymentFindMany).toHaveBeenCalled();
    expect(loadPersistentState).not.toHaveBeenCalled();
  });
});
