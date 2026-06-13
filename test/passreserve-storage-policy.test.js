import { describe, expect, it } from "vitest";

import {
  decideStoragePolicy,
  isProtectedProductionRuntime
} from "../lib/passreserve-storage-policy.js";

describe("passreserve storage policy", () => {
  it("keeps production database mode even when schema is incompatible", () => {
    const summary = decideStoragePolicy({
      protectedProductionRuntime: true,
      databaseConfigured: true,
      databaseCompatible: false
    });

    expect(summary.mode).toBe("database");
    expect(summary.isHealthy).toBe(false);
    expect(summary.failClosed).toBe(true);
    expect(summary.detail).toContain("fail-closed");
  });

  it("allows local file fallback when no database is configured", () => {
    const summary = decideStoragePolicy({
      protectedProductionRuntime: false,
      databaseConfigured: false,
      databaseCompatible: false
    });

    expect(summary.mode).toBe("file");
    expect(summary.failClosed).toBe(false);
  });

  it("detects protected Vercel production runtime", () => {
    expect(
      isProtectedProductionRuntime({
        VERCEL: "1",
        VERCEL_ENV: "production"
      })
    ).toBe(true);

    expect(
      isProtectedProductionRuntime({
        VERCEL: "1",
        VERCEL_ENV: "preview"
      })
    ).toBe(false);
  });
});
