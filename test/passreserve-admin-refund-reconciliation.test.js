import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/passreserve-payments.js", async () => {
  const actual = await vi.importActual("../lib/passreserve-payments.js");

  return {
    ...actual,
    retrieveStripeRefund: vi.fn()
  };
});

vi.mock("../lib/passreserve-prisma.js", () => ({
  getPrismaClient: vi.fn(),
  logDatabaseFallback: vi.fn()
}));

import { reconcilePendingStripeRefundsForOrganizer } from "../lib/passreserve-admin-service.js";
import { retrieveStripeRefund } from "../lib/passreserve-payments.js";
import { getPrismaClient } from "../lib/passreserve-prisma.js";

function createPendingRefundPrismaFixture() {
  const registration = {
    id: "reg_refund_pending",
    organizerId: "org_sillico",
    registrationCode: "REG-SILLICO-1",
    refundedCents: 0,
    onlineCollectedCents: 2000,
    currency: "EUR"
  };
  const payment = {
    id: "pay_refund_pending",
    registrationId: registration.id,
    provider: "STRIPE",
    kind: "REFUND",
    status: "PENDING",
    amountCents: 2000,
    currency: "EUR",
    stripeAccountId: "acct_sillico_123",
    stripePaymentIntentId: "pi_sillico_123",
    metadata: {
      stripeRefundId: "re_sillico_123",
      stripeRefundStatus: "pending"
    }
  };
  const auditLogs = [];

  const tx = {
    registrationPayment: {
      findUnique: vi.fn(async ({ where }) =>
        payment.id === where.id ? { ...payment } : null
      ),
      update: vi.fn(async ({ where, data }) => {
        if (payment.id !== where.id) {
          return null;
        }

        Object.assign(payment, data);
        return { ...payment };
      })
    },
    registration: {
      findUnique: vi.fn(async ({ where }) =>
        registration.id === where.id ? { ...registration } : null
      ),
      update: vi.fn(async ({ where, data }) => {
        if (registration.id !== where.id) {
          return null;
        }

        Object.assign(registration, data);
        return { ...registration };
      })
    },
    auditLog: {
      create: vi.fn(async ({ data }) => {
        auditLogs.push(data);
        return data;
      })
    }
  };

  return {
    prisma: {
      registrationPayment: {
        findMany: vi.fn(async () => [
          {
            ...payment,
            registration: {
              ...registration
            }
          }
        ])
      },
      $transaction: vi.fn(async (callback) => callback(tx))
    },
    registration,
    payment,
    auditLogs
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("passreserve admin refund reconciliation", () => {
  it("heals pending Stripe refunds that have already succeeded remotely", async () => {
    const fixture = createPendingRefundPrismaFixture();

    vi.mocked(getPrismaClient).mockReturnValue(fixture.prisma);
    vi.mocked(retrieveStripeRefund).mockResolvedValue({
      refundId: "re_sillico_123",
      status: "succeeded",
      amountCents: 2000,
      currency: "EUR",
      stripeAccountId: "acct_sillico_123",
      paymentIntentId: "pi_sillico_123",
      failureReason: null
    });

    await reconcilePendingStripeRefundsForOrganizer({
      id: "org_sillico",
      slug: "sillico"
    });

    expect(retrieveStripeRefund).toHaveBeenCalledWith(
      "re_sillico_123",
      "acct_sillico_123"
    );
    expect(fixture.registration.refundedCents).toBe(2000);
    expect(fixture.payment.status).toBe("REFUNDED");
    expect(fixture.payment.note).toBe(
      "Stripe refund reconciled from connected-account state."
    );
    expect(fixture.payment.metadata).toMatchObject({
      stripeRefundId: "re_sillico_123",
      stripeRefundStatus: "succeeded",
      reconciliationSource: "organizer_admin_load"
    });
    expect(fixture.auditLogs).toHaveLength(1);
    expect(fixture.auditLogs[0]).toMatchObject({
      organizerId: "org_sillico",
      registrationId: "reg_refund_pending",
      eventType: "stripe_refund_confirmed"
    });
  });
});
