import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

function createDatabaseWebhookFixture({
  onlineCollectedCents = 0,
  existingCaptureExternalEventId = undefined
} = {}) {
  const organizer = {
    id: "org_sillico",
    slug: "sillico",
    publicSlug: "sillico",
    name: "Sillico",
    timeZone: "Europe/Rome",
    publicEmail: "",
    interestEmail: "hello@sillico.test",
    venueTitle: "Palazzo Carli",
    stripeAccountId: "acct_sillico_live",
    stripeConnectionStatus: "PENDING",
    stripeDetailsSubmitted: false,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false
  };
  const eventType = {
    id: "event_divini",
    organizerId: organizer.id,
    slug: "divini-sapori",
    title: "Divini & Sapori",
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
    name: "Adulto",
    contentI18n: null
  };
  const registration = {
    id: "reg_divini_1",
    organizerId: organizer.id,
    eventTypeId: eventType.id,
    occurrenceId: occurrence.id,
    ticketCategoryId: ticketCategory.id,
    attendeeName: "Ada Lovelace",
    attendeeEmail: "ada@example.com",
    attendeePhone: "+39 333 123 4567",
    registrationLocale: "en",
    registrationCode: "REG-DIVINI-1",
    onlineAmountCents: 5000,
    onlineCollectedCents,
    dueAtEventCents: 0,
    currency: "EUR",
    status: onlineCollectedCents >= 5000 ? "CONFIRMED_PAID" : "PENDING_PAYMENT",
    confirmationToken: "confirm_divini_1"
  };
  const items = [
    {
      id: "item_divini_1",
      registrationId: registration.id,
      ticketCategoryId: ticketCategory.id,
      sortOrder: 0,
      quantity: 2,
      unitPriceCents: 2500,
      subtotalCents: 5000,
      onlineAmountCents: 5000,
      dueAtEventCents: 0,
      ticketCategory: {
        ...ticketCategory
      }
    }
  ];
  const payments = [
    {
      id: "pay_checkout_pending",
      registrationId: registration.id,
      provider: "STRIPE",
      kind: "CHECKOUT_SESSION",
      status: "PENDING",
      amountCents: 5000,
      currency: "EUR",
      externalEventId: null,
      stripeAccountId: organizer.stripeAccountId,
      stripeSessionId: "cs_live_divini",
      stripePaymentIntentId: null,
      note: "Checkout session created.",
      metadata: null,
      occurredAt: new Date("2026-07-01T09:00:00.000Z"),
      createdAt: new Date("2026-07-01T09:00:00.000Z")
    }
  ];
  const auditLogs = [];
  const organizerUpdates = [];
  const registrationUpdates = [];
  const paymentCreates = [];
  const paymentUpdates = [];
  const stateFns = {
    mutatePersistentState: vi.fn(),
    loadPersistentState: vi.fn(),
    readPrismaState: vi.fn(),
    loadFileBackedState: vi.fn()
  };

  if (existingCaptureExternalEventId !== undefined) {
    payments.unshift({
      id: "pay_capture_existing",
      registrationId: registration.id,
      provider: "STRIPE",
      kind: "CAPTURE",
      status: "SUCCEEDED",
      amountCents: 5000,
      currency: "EUR",
      externalEventId: existingCaptureExternalEventId,
      stripeAccountId: organizer.stripeAccountId,
      stripeSessionId: "cs_live_divini",
      stripePaymentIntentId: "pi_live_divini",
      note: "Stripe checkout session completed.",
      metadata: null,
      occurredAt: new Date("2026-07-01T09:05:00.000Z"),
      createdAt: new Date("2026-07-01T09:05:00.000Z")
    });
  }

  function buildHydratedRegistration() {
    return {
      ...registration,
      organizer: {
        ...organizer
      },
      eventType: {
        ...eventType
      },
      occurrence: {
        ...occurrence
      },
      ticketCategory: {
        ...ticketCategory
      },
      items: items.map((item) => ({
        ...item,
        ticketCategory: {
          ...item.ticketCategory
        }
      }))
    };
  }

  function findPaymentByExternalEventId(externalEventId) {
    return payments.find((entry) => entry.externalEventId === externalEventId) || null;
  }

  function findCaptureByStripeReference({ stripeSessionId = null, stripePaymentIntentId = null }) {
    return (
      payments.find(
        (entry) =>
          entry.registrationId === registration.id &&
          entry.provider === "STRIPE" &&
          entry.kind === "CAPTURE" &&
          ((stripeSessionId && entry.stripeSessionId === stripeSessionId) ||
            (stripePaymentIntentId && entry.stripePaymentIntentId === stripePaymentIntentId))
      ) || null
    );
  }

  const tx = {
    $executeRawUnsafe: vi.fn(),
    organizer: {
      findUnique: vi.fn(async ({ where }) =>
        where.id === organizer.id
          ? {
              ...organizer
            }
          : null
      ),
      update: vi.fn(async ({ where, data }) => {
        if (where.id !== organizer.id) {
          return null;
        }

        organizerUpdates.push(data);
        Object.assign(organizer, data);
        return {
          ...organizer
        };
      })
    },
    registration: {
      findUnique: vi.fn(async ({ where }) =>
        where.id === registration.id
          ? {
              ...registration
            }
          : null
      ),
      update: vi.fn(async ({ where, data }) => {
        if (where.id !== registration.id) {
          return null;
        }

        registrationUpdates.push(data);
        Object.assign(registration, data);
        return {
          ...registration
        };
      })
    },
    registrationPayment: {
      findFirst: vi.fn(async ({ where }) => {
        if (where.externalEventId) {
          return findPaymentByExternalEventId(where.externalEventId);
        }

        if (where.registrationId && Array.isArray(where.OR)) {
          return findCaptureByStripeReference({
            stripeSessionId: where.OR.find((entry) => entry.stripeSessionId)?.stripeSessionId || null,
            stripePaymentIntentId:
              where.OR.find((entry) => entry.stripePaymentIntentId)?.stripePaymentIntentId || null
          });
        }

        return null;
      }),
      create: vi.fn(async ({ data }) => {
        paymentCreates.push(data);
        payments.unshift({
          ...data
        });
        return data;
      }),
      update: vi.fn(async ({ where, data }) => {
        const payment = payments.find((entry) => entry.id === where.id);

        if (!payment) {
          return null;
        }

        paymentUpdates.push(data);
        Object.assign(payment, data);
        return {
          ...payment
        };
      })
    },
    auditLog: {
      create: vi.fn(async ({ data }) => {
        auditLogs.push(data);
        return data;
      })
    }
  };

  const prisma = {
    organizer: {
      findFirst: vi.fn(async ({ where }) =>
        where.stripeAccountId === organizer.stripeAccountId
          ? {
              ...organizer
            }
          : null
      )
    },
    registration: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.registrationCode && where.registrationCode === registration.registrationCode) {
          return {
            ...registration,
            organizer: {
              ...organizer
            }
          };
        }

        if (where.id === registration.id) {
          return buildHydratedRegistration();
        }

        return null;
      })
    },
    registrationPayment: {
      findFirst: vi.fn(async ({ where }) => {
        if (where.stripePaymentIntentId) {
          const payment = payments.find(
            (entry) => entry.stripePaymentIntentId === where.stripePaymentIntentId
          );

          return payment
            ? {
                ...payment,
                registration: {
                  ...registration,
                  organizer: {
                    ...organizer
                  }
                }
              }
            : null;
        }

        if (where.stripeSessionId) {
          const payment = payments.find((entry) => entry.stripeSessionId === where.stripeSessionId);

          return payment
            ? {
                ...payment,
                registration: {
                  ...registration,
                  organizer: {
                    ...organizer
                  }
                }
              }
            : null;
        }

        if (where.externalEventId) {
          return findPaymentByExternalEventId(where.externalEventId);
        }

        return null;
      })
    },
    siteSettings: {
      findUnique: vi.fn(async () => ({
        platformEmail: "support@passreserve.test"
      }))
    },
    auditLog: {
      create: vi.fn(async ({ data }) => {
        auditLogs.push(data);
        return data;
      })
    },
    $transaction: vi.fn(async (callback) => callback(tx))
  };

  return {
    organizer,
    eventType,
    occurrence,
    ticketCategory,
    registration,
    payments,
    auditLogs,
    organizerUpdates,
    registrationUpdates,
    paymentCreates,
    paymentUpdates,
    prisma,
    stateFns
  };
}

async function importProcessStripeWebhookWithDatabaseMocks(fixture, sendPrismaTemplateEmail) {
  vi.doMock("../lib/passreserve-config.js", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      getStorageMode: () => "database"
    };
  });
  vi.doMock("../lib/passreserve-prisma.js", () => ({
    getPrismaClient: () => fixture.prisma,
    logDatabaseFallback: vi.fn()
  }));
  vi.doMock("../lib/passreserve-state.js", () => fixture.stateFns);
  vi.doMock("../lib/passreserve-email-delivery.js", async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      sendPrismaTemplateEmail,
      resolveOrganizerNotificationEmailFromPrisma: vi
        .fn()
        .mockResolvedValue("bookings@sillico.test")
    };
  });

  return import("../lib/passreserve-service.js");
}

describe("passreserve Stripe webhooks in database mode", () => {
  it("syncs organizer Stripe readiness through targeted Prisma updates", async () => {
    const fixture = createDatabaseWebhookFixture();
    const sendPrismaTemplateEmail = vi.fn();
    const { processStripeWebhook } = await importProcessStripeWebhookWithDatabaseMocks(
      fixture,
      sendPrismaTemplateEmail
    );

    const result = await processStripeWebhook({
      id: "evt_account_updated_db",
      type: "account.updated",
      account: "acct_sillico_live",
      data: {
        object: {
          id: "acct_sillico_live",
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
          requirements: {
            disabled_reason: null
          }
        }
      }
    });

    expect(result).toMatchObject({
      ok: true
    });
    expect(fixture.organizer).toMatchObject({
      stripeConnectionStatus: "CONNECTED",
      stripeDetailsSubmitted: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true
    });
    expect(fixture.organizerUpdates).toHaveLength(1);
    expect(fixture.auditLogs.at(-1)).toMatchObject({
      organizerId: fixture.organizer.id,
      eventType: "stripe_account_updated"
    });
    expect(sendPrismaTemplateEmail).not.toHaveBeenCalled();
    expect(fixture.stateFns.mutatePersistentState).not.toHaveBeenCalled();
  });

  it("finalizes a paid checkout webhook directly in the database ledger", async () => {
    const fixture = createDatabaseWebhookFixture({
      onlineCollectedCents: 0,
      existingCaptureExternalEventId: undefined
    });
    const sendPrismaTemplateEmail = vi.fn().mockResolvedValue({
      ok: true,
      mode: "log",
      id: null
    });
    const { processStripeWebhook } = await importProcessStripeWebhookWithDatabaseMocks(
      fixture,
      sendPrismaTemplateEmail
    );

    const result = await processStripeWebhook({
      id: "evt_checkout_completed_db",
      type: "checkout.session.completed",
      account: "acct_sillico_live",
      data: {
        object: {
          id: "cs_live_divini",
          client_reference_id: "REG-DIVINI-1",
          payment_intent: "pi_live_divini",
          payment_status: "paid",
          amount_total: 5000
        }
      }
    });

    expect(result).toMatchObject({
      ok: true,
      registrationId: fixture.registration.id,
      shouldSendEmails: true
    });
    expect(fixture.registration.onlineCollectedCents).toBe(5000);
    expect(fixture.registration.status).toBe("CONFIRMED_PAID");
    expect(
      fixture.payments.some(
        (entry) =>
          entry.kind === "CAPTURE" &&
          entry.externalEventId === "evt_checkout_completed_db" &&
          entry.stripeSessionId === "cs_live_divini" &&
          entry.stripePaymentIntentId === "pi_live_divini"
      )
    ).toBe(true);
    expect(fixture.paymentCreates).toHaveLength(1);
    expect(fixture.auditLogs.at(-1)).toMatchObject({
      registrationId: fixture.registration.id,
      eventType: "stripe_webhook_completed"
    });
    expect(sendPrismaTemplateEmail).toHaveBeenCalledTimes(3);
    expect(sendPrismaTemplateEmail.mock.calls.map((call) => call[1].templateSlug)).toEqual([
      "attendee_registration_confirmed",
      "attendee_payment_received",
      "organizer_payment_received"
    ]);
    expect(fixture.stateFns.mutatePersistentState).not.toHaveBeenCalled();
    expect(fixture.stateFns.readPrismaState).not.toHaveBeenCalled();
  });

  it("links a late webhook onto an existing capture without duplicating the payment", async () => {
    const fixture = createDatabaseWebhookFixture({
      onlineCollectedCents: 5000,
      existingCaptureExternalEventId: null
    });
    const sendPrismaTemplateEmail = vi.fn();
    const { processStripeWebhook } = await importProcessStripeWebhookWithDatabaseMocks(
      fixture,
      sendPrismaTemplateEmail
    );

    const result = await processStripeWebhook({
      id: "evt_checkout_completed_late_db",
      type: "checkout.session.completed",
      account: "acct_sillico_live",
      data: {
        object: {
          id: "cs_live_divini",
          client_reference_id: "REG-DIVINI-1",
          payment_intent: "pi_live_divini",
          payment_status: "paid",
          amount_total: 5000
        }
      }
    });

    const capturePayments = fixture.payments.filter((entry) => entry.kind === "CAPTURE");

    expect(result).toMatchObject({
      ok: true,
      registrationId: fixture.registration.id,
      shouldSendEmails: false
    });
    expect(capturePayments).toHaveLength(1);
    expect(capturePayments[0]).toMatchObject({
      externalEventId: "evt_checkout_completed_late_db",
      stripeSessionId: "cs_live_divini",
      stripePaymentIntentId: "pi_live_divini"
    });
    expect(fixture.paymentCreates).toHaveLength(0);
    expect(fixture.paymentUpdates).toHaveLength(1);
    expect(sendPrismaTemplateEmail).not.toHaveBeenCalled();
  });
});
