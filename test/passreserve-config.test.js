import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS:
    process.env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS,
  PASSRESERVE_PUBLIC_READ_MODEL: process.env.PASSRESERVE_PUBLIC_READ_MODEL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV
};

beforeEach(() => {
  vi.resetModules();
  delete process.env.SESSION_SECRET;
  delete process.env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS;
  delete process.env.PASSRESERVE_PUBLIC_READ_MODEL;
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

describe("passreserve session secret policy", () => {
  it("keeps the local fallback secret outside protected production runtimes", async () => {
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      hasCompatibleDatabaseSchema: () => true
    }));

    const { resolveSessionPassword } = await import("../lib/passreserve-config.js");

    expect(resolveSessionPassword({})).toBe("passreserve-local-session-secret-change-me");
  });

  it("fails closed when SESSION_SECRET is missing in protected production", async () => {
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      hasCompatibleDatabaseSchema: () => true
    }));

    const { resolveSessionPassword } = await import("../lib/passreserve-config.js");

    expect(() =>
      resolveSessionPassword({
        VERCEL: "1",
        VERCEL_ENV: "production"
      })
    ).toThrow(/SESSION_SECRET is required/i);
  });

  it("accepts an explicit production session secret", async () => {
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      hasCompatibleDatabaseSchema: () => true
    }));

    const { resolveSessionPassword } = await import("../lib/passreserve-config.js");

    expect(
      resolveSessionPassword({
        SESSION_SECRET: "super-secret-value",
        VERCEL: "1",
        VERCEL_ENV: "production"
      })
    ).toBe("super-secret-value");
  });

  it("exposes a bounded technical audit retention window", async () => {
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      hasCompatibleDatabaseSchema: () => true
    }));

    const { getTechnicalAuditLogRetentionDays } = await import("../lib/passreserve-config.js");

    expect(getTechnicalAuditLogRetentionDays({})).toBe(120);
    expect(
      getTechnicalAuditLogRetentionDays({
        PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS: "14"
      })
    ).toBe(14);
    expect(
      getTechnicalAuditLogRetentionDays({
        PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS: "1"
      })
    ).toBe(120);
  });

  it("keeps the public read model on legacy unless v2 is explicitly enabled", async () => {
    vi.doMock("../lib/passreserve-prisma.js", () => ({
      hasCompatibleDatabaseSchema: () => true
    }));

    const {
      PUBLIC_READ_MODEL_VERSION,
      getPublicReadModelVersion
    } = await import("../lib/passreserve-config.js");

    expect(getPublicReadModelVersion({})).toBe(
      PUBLIC_READ_MODEL_VERSION.LEGACY
    );
    expect(
      getPublicReadModelVersion({
        PASSRESERVE_PUBLIC_READ_MODEL: "v2"
      })
    ).toBe(PUBLIC_READ_MODEL_VERSION.V2);
    expect(
      getPublicReadModelVersion({
        PASSRESERVE_PUBLIC_READ_MODEL: "unexpected"
      })
    ).toBe(PUBLIC_READ_MODEL_VERSION.LEGACY);
  });
});
