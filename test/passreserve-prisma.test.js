import { beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING"
];

beforeEach(() => {
  vi.resetModules();

  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("passreserve-prisma database URL resolution", () => {
  it("falls back to POSTGRES_PRISMA_URL and pins the passreserve schema", async () => {
    process.env.POSTGRES_PRISMA_URL =
      "postgres://user:secret@db.example.com:6543/postgres?pgbouncer=true&sslmode=require";

    const prisma = await import("../lib/passreserve-prisma.js");
    const resolvedUrl = new URL(prisma.getResolvedDatabaseUrl());

    expect(resolvedUrl.searchParams.get("schema")).toBe("passreserve");
    expect(process.env.DATABASE_URL).toBe(resolvedUrl.toString());
  });

  it("keeps an explicit DATABASE_URL unchanged", async () => {
    process.env.DATABASE_URL = "postgres://user:secret@db.example.com:5432/postgres?schema=custom";
    process.env.POSTGRES_PRISMA_URL =
      "postgres://user:secret@db.example.com:6543/postgres?pgbouncer=true&sslmode=require";

    const prisma = await import("../lib/passreserve-prisma.js");

    expect(prisma.getResolvedDatabaseUrl()).toBe(process.env.DATABASE_URL);
    expect(process.env.DATABASE_URL).toBe(
      "postgres://user:secret@db.example.com:5432/postgres?schema=custom"
    );
  });
});
