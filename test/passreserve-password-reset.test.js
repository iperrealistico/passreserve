import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("passreserve password reset requests", () => {
  it("persists organizer reset state in database mode before sending the email", async () => {
    const sendPrismaTemplateEmail = vi.fn().mockResolvedValue({
      ok: true,
      mode: "log",
      id: null
    });
    const mutatePersistentState = vi.fn();
    const organizerUpdate = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({});
    const tx = {
      organizer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "org-sillico",
          slug: "sillico"
        })
      },
      organizerAdminUser: {
        findFirst: vi.fn().mockResolvedValue({
          id: "admin-sillico",
          email: "polissillico@gmail.com",
          name: "Sillico Admin"
        }),
        update: organizerUpdate
      },
      platformAdminUser: {
        findFirst: vi.fn(),
        update: vi.fn()
      },
      auditLog: {
        create: auditCreate
      }
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx))
    };

    vi.doMock("../lib/passreserve-config.js", () => ({
      HOLD_DURATION_MINUTES: 30,
      PAYMENT_WINDOW_HOURS: 12,
      getBaseUrl: () => "https://passreserve.com",
      getStorageMode: () => "database",
      getStorageSummary: () => ({
        mode: "database",
        label: "Postgres + Prisma",
        detail: "test"
      })
    }));
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => prisma,
      logDatabaseFallback: vi.fn()
    }));
    vi.doMock("../lib/passreserve-state.js", () => ({
      loadFileBackedState: vi.fn(),
      loadPersistentState: vi.fn(),
      mutatePersistentState
    }));
    vi.doMock("../lib/passreserve-email-delivery.js", async (importOriginal) => {
      const actual = await importOriginal();

      return {
        ...actual,
        sendPrismaTemplateEmail
      };
    });

    const { requestOrganizerPasswordReset } = await import("../lib/passreserve-service.js");
    const result = await requestOrganizerPasswordReset(
      "sillico",
      "polissillico@gmail.com",
      "https://passreserve.com"
    );

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(mutatePersistentState).not.toHaveBeenCalled();
    expect(organizerUpdate).toHaveBeenCalledOnce();
    expect(auditCreate).toHaveBeenCalledOnce();

    const updatePayload = organizerUpdate.mock.calls[0][0];
    expect(updatePayload.where).toEqual({
      id: "admin-sillico"
    });
    expect(updatePayload.data.passwordResetToken).toEqual(expect.any(String));
    expect(updatePayload.data.passwordResetExpires).toBeInstanceOf(Date);
    expect(updatePayload.data.updatedAt).toBeInstanceOf(Date);

    expect(sendPrismaTemplateEmail).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        templateSlug: "password_reset",
        to: "polissillico@gmail.com",
        organizerId: "org-sillico",
        replacements: expect.objectContaining({
          "{{account_name}}": "Sillico Admin",
          "{{reset_url}}": `https://passreserve.com/sillico/admin/login/reset/${updatePayload.data.passwordResetToken}`
        })
      })
    );
    expect(result).toEqual({
      ok: true,
      token: updatePayload.data.passwordResetToken
    });
  });

  it("does not send an email when the organizer admin account does not exist", async () => {
    const sendPrismaTemplateEmail = vi.fn();
    const mutatePersistentState = vi.fn();
    const organizerUpdate = vi.fn();
    const tx = {
      organizer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "org-sillico",
          slug: "sillico"
        })
      },
      organizerAdminUser: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: organizerUpdate
      },
      platformAdminUser: {
        findFirst: vi.fn(),
        update: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx))
    };

    vi.doMock("../lib/passreserve-config.js", () => ({
      HOLD_DURATION_MINUTES: 30,
      PAYMENT_WINDOW_HOURS: 12,
      getBaseUrl: () => "https://passreserve.com",
      getStorageMode: () => "database",
      getStorageSummary: () => ({
        mode: "database",
        label: "Postgres + Prisma",
        detail: "test"
      })
    }));
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => prisma,
      logDatabaseFallback: vi.fn()
    }));
    vi.doMock("../lib/passreserve-state.js", () => ({
      loadFileBackedState: vi.fn(),
      loadPersistentState: vi.fn(),
      mutatePersistentState
    }));
    vi.doMock("../lib/passreserve-email-delivery.js", async (importOriginal) => {
      const actual = await importOriginal();

      return {
        ...actual,
        sendPrismaTemplateEmail
      };
    });

    const { requestOrganizerPasswordReset } = await import("../lib/passreserve-service.js");
    const result = await requestOrganizerPasswordReset(
      "sillico",
      "missing@example.com",
      "https://passreserve.com"
    );

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(mutatePersistentState).not.toHaveBeenCalled();
    expect(organizerUpdate).not.toHaveBeenCalled();
    expect(sendPrismaTemplateEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true
    });
  });

  it("persists organizer password changes in database mode when a reset token is redeemed", async () => {
    const mutatePersistentState = vi.fn();
    const organizerUpdate = vi.fn().mockResolvedValue({});
    const tx = {
      organizer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "org-sillico"
        })
      },
      organizerAdminUser: {
        findFirst: vi.fn().mockResolvedValue({
          id: "admin-sillico",
          email: "polissillico@gmail.com",
          name: "Sillico Admin",
          tokenVersion: 1
        }),
        update: organizerUpdate
      },
      platformAdminUser: {
        findFirst: vi.fn(),
        update: vi.fn()
      }
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx))
    };

    vi.doMock("../lib/passreserve-config.js", () => ({
      HOLD_DURATION_MINUTES: 30,
      PAYMENT_WINDOW_HOURS: 12,
      getBaseUrl: () => "https://passreserve.com",
      getStorageMode: () => "database",
      getStorageSummary: () => ({
        mode: "database",
        label: "Postgres + Prisma",
        detail: "test"
      })
    }));
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => prisma,
      logDatabaseFallback: vi.fn()
    }));
    vi.doMock("../lib/passreserve-state.js", () => ({
      loadFileBackedState: vi.fn(),
      loadPersistentState: vi.fn(),
      mutatePersistentState
    }));

    const { resetOrganizerPassword } = await import("../lib/passreserve-service.js");
    const result = await resetOrganizerPassword("sillico", {
      token: "reset-token-1",
      password: "NuovaPassword123!"
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(mutatePersistentState).not.toHaveBeenCalled();
    expect(organizerUpdate).toHaveBeenCalledOnce();

    const updatePayload = organizerUpdate.mock.calls[0][0];
    expect(updatePayload.where).toEqual({
      id: "admin-sillico"
    });
    expect(updatePayload.data.passwordHash).toEqual(expect.any(String));
    expect(updatePayload.data.tokenVersion).toBe(2);
    expect(updatePayload.data.passwordResetToken).toBeNull();
    expect(updatePayload.data.passwordResetExpires).toBeNull();
    expect(updatePayload.data.updatedAt).toBeInstanceOf(Date);
    expect(result).toEqual({
      ok: true
    });
  });
});
