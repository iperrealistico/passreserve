import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV
};

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_URL =
    "postgresql://passreserve:test@localhost:5432/passreserve";
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

describe("organizer login shell", () => {
  it("loads only organizer identity and does not run admin-state reconciliation", async () => {
    const organizerFindUnique = vi.fn(async () => ({
      id: "org_sillico",
      slug: "sillico",
      name: "Sillico"
    }));
    const unexpectedRead = vi.fn(async () => {
      throw new Error("login shell must not load admin operational state");
    });
    const prisma = {
      organizer: {
        findUnique: organizerFindUnique
      },
      registrationPayment: {
        findMany: unexpectedRead
      },
      eventType: {
        findMany: unexpectedRead
      },
      registration: {
        findMany: unexpectedRead
      }
    };

    vi.doMock("../lib/passreserve-prisma.js", () => ({
      getPrismaClient: () => prisma,
      hasCompatibleDatabaseSchema: () => true,
      logDatabaseFallback: vi.fn()
    }));

    const {
      getOrganizerLoginShell
    } = await import("../lib/passreserve-admin-service.js");
    const shell = await getOrganizerLoginShell("sillico");

    expect(shell).toEqual({
      organizer: {
        id: "org_sillico",
        slug: "sillico",
        name: "Sillico"
      }
    });
    expect(organizerFindUnique).toHaveBeenCalledWith({
      where: {
        slug: "sillico"
      },
      select: {
        id: true,
        slug: true,
        name: true
      }
    });
    expect(unexpectedRead).not.toHaveBeenCalled();
  });
});
