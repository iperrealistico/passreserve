import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV
};

function createPaymentSuccessFixture() {
  const organizer = {
    id: "org_sillico",
    slug: "sillico",
    publicSlug: "sillico",
    name: "Sillico",
    timeZone: "Europe/Rome",
    publicEmail: "hello@sillico.test",
    interestEmail: "",
    venueTitle: "Palazzo Carli",
    stripeAccountId: "acct_sillico_live",
    registrationQuestionnaireConfig: null,
    registrationLanguagePromptEnabled: true,
    registrationConfirmationMode: "DIRECT_CONFIRM",
    contentI18n: null
  };
  const eventType = {
    id: "event_divini",
    organizerId: organizer.id,
    slug: "divini-sapori",
    title: "Divini & Sapori",
    venueTitle: "Palazzo Carli",
    prepayPercentage: 100,
    contentI18n: null
  };
  const occurrence = {
    id: "occ_divini_1",
    eventTypeId: eventType.id,
    startsAt: new Date("2026-07-04T18:30:00.000Z"),
    endsAt: new Date("2026-07-04T21:30:00.000Z"),
    venueTitle: "Palazzo Carli",
    contentI18n: null
  };
  const registration = {
    id: "reg_divini_1",
    organizerId: organizer.id,
    eventTypeId: eventType.id,
    occurrenceId: occurrence.id,
    ticketCategoryId: "ticket_adulto",
    status: "PENDING_PAYMENT",
    attendeeName: "Denise Orsi",
    attendeeEmail: "denise@example.com",
    attendeePhone: "+39 333 123 4567",
    registrationLocale: "it",
    source: "PUBLIC",
    origin: "",
    quantity: 2,
    currency: "EUR",
    subtotalCents: 4000,
    onlineAmountCents: 4000,
    dueAtEventCents: 0,
    onlineCollectedCents: 0,
    venueCollectedCents: 0,
    refundedCents: 0,
    holdToken: null,
    paymentToken: "paytok_live_1",
    confirmationToken: "confirmtok_live_1",
    registrationCode: "PR-53AE41",
    expiresAt: "2026-07-01T22:00:00.000Z",
    confirmedAt: "2026-07-01T10:00:00.000Z",
    cancelledAt: null,
    attendedAt: null,
    noShowAt: null,
    termsAcceptedAt: "2026-07-01T10:00:00.000Z",
    responsibilityAt: "2026-07-01T10:00:00.000Z",
    refundPolicyAcceptedAt: null,
    refundPolicySnapshot: null,
    note: "",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    attendees: [
      {
        id: "att_1",
        registrationId: "reg_divini_1",
        ticketCategoryId: "ticket_adulto",
        sortOrder: 0,
        firstName: "Denise",
        lastName: "Orsi",
        address: "",
        phone: "+39 333 123 4567",
        email: "denise@example.com",
        dietaryFlags: [],
        dietaryOther: "",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z"
      }
    ],
    items: [
      {
        id: "item_1",
        registrationId: "reg_divini_1",
        ticketCategoryId: "ticket_adulto",
        sortOrder: 0,
        quantity: 2,
        unitPriceCents: 2000,
        subtotalCents: 4000,
        onlineAmountCents: 4000,
        dueAtEventCents: 0,
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z"
      }
    ]
  };
  const registrationUpdates = [];
  const paymentCreates = [];
  const auditCreates = [];
  const siteSettings = {
    id: "site-settings",
    platformEmail: "ops@passreserve.test"
  };

  const registrationFindFirst = vi.fn(async ({ where }) =>
    where.paymentToken === registration.paymentToken
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
  const ticketCategoryFindMany = vi.fn(async () => []);
  const siteSettingsFindUnique = vi.fn(async ({ where }) =>
    where.id === siteSettings.id ? { ...siteSettings } : null
  );

  const tx = {
    $executeRawUnsafe: vi.fn(async () => 1),
    registration: {
      findFirst: registrationFindFirst,
      update: vi.fn(async ({ where, data }) => {
        if (where.id !== registration.id) {
          return null;
        }

        registrationUpdates.push(data);
        Object.assign(registration, data);
        return { ...registration };
      })
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
      create: vi.fn(async ({ data }) => {
        paymentCreates.push(data);
        return data;
      })
    },
    auditLog: {
      create: vi.fn(async ({ data }) => {
        auditCreates.push(data);
        return data;
      })
    }
  };

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
    $transaction: vi.fn(async (callback) => callback(tx))
  };

  return {
    prisma,
    registration,
    registrationUpdates,
    paymentCreates,
    auditCreates
  };
}

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://passreserve:test@localhost:5432/passreserve";
  process.env.SESSION_SECRET = "test-session-secret";
  delete process.env.STRIPE_SECRET_KEY;
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

describe("passreserve payment success in database mode", () => {
  it("finalizes preview payment success without falling back to the global persistent state loader", async () => {
    const fixture = createPaymentSuccessFixture();
    const loadPersistentState = vi.fn(async () => {
      throw new Error("loadPersistentState should not run in database mode for payment success");
    });
    const readPrismaState = vi.fn(async () => {
      throw new Error("readPrismaState should not run in database mode for payment success");
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
      readPrismaState
    }));

    const { resolveSuccessfulRegistrationConfirmation } = await import(
      "../lib/passreserve-service.js"
    );
    const resolution = await resolveSuccessfulRegistrationConfirmation({
      slug: "sillico",
      eventSlug: "divini-sapori",
      paymentToken: fixture.registration.paymentToken,
      preview: "1",
      sessionId: ""
    });

    expect(resolution).toMatchObject({
      state: "redirect",
      redirectHref: "/sillico/events/divini-sapori/register/confirmed/confirmtok_live_1"
    });
    expect(fixture.registration.status).toBe("CONFIRMED_PAID");
    expect(fixture.registration.onlineCollectedCents).toBe(4000);
    expect(fixture.registrationUpdates).toHaveLength(1);
    expect(fixture.paymentCreates).toHaveLength(1);
    expect(fixture.paymentCreates[0]).toMatchObject({
      registrationId: fixture.registration.id,
      provider: "STRIPE",
      kind: "CAPTURE",
      status: "SUCCEEDED",
      amountCents: 4000,
      note: "Preview payment completed from the local payment review page."
    });
    expect(fixture.auditCreates).toHaveLength(1);
    expect(fixture.auditCreates[0]).toMatchObject({
      actorType: "STRIPE",
      registrationId: fixture.registration.id,
      eventType: "payment_completed"
    });
    expect(loadPersistentState).not.toHaveBeenCalled();
    expect(readPrismaState).not.toHaveBeenCalled();
  });
});
