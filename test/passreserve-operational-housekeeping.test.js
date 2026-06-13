import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runOperationalHousekeeping } from "../lib/passreserve-service.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

const ORIGINAL_RETENTION = process.env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS;

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-housekeeping-${Date.now()}-${Math.random()}.json`
  );
  process.env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS = "30";

  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
  await fs.rm(`${process.env.PASSRESERVE_STATE_FILE}.auth-rate-limits.json`, {
    force: true
  });
});

afterEach(() => {
  if (ORIGINAL_RETENTION == null) {
    delete process.env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS;
  } else {
    process.env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS = ORIGINAL_RETENTION;
  }
});

describe("passreserve operational housekeeping", () => {
  it("prunes expired auth limiters and stale technical audit logs", async () => {
    const now = new Date("2026-06-13T18:00:00.000Z");
    const rateLimitPath = `${process.env.PASSRESERVE_STATE_FILE}.auth-rate-limits.json`;

    await mutatePersistentState(async (draft) => {
      draft.auditLogs.unshift(
        {
          id: "log_old_technical",
          createdAt: "2026-04-01T10:00:00.000Z",
          actorType: "ATTENDEE",
          actorId: null,
          organizerId: "org_old",
          registrationId: "reg_old",
          eventType: "payment_checkout_started",
          entityType: "registration_payment",
          entityId: "reg_old",
          message: "Opened payment handoff for REG-OLD.",
          metadata: null
        },
        {
          id: "log_old_business",
          createdAt: "2026-04-01T10:00:00.000Z",
          actorType: "STRIPE",
          actorId: null,
          organizerId: "org_old",
          registrationId: "reg_old",
          eventType: "payment_completed",
          entityType: "registration_payment",
          entityId: "reg_old",
          message: "Completed payment for REG-OLD.",
          metadata: null
        },
        {
          id: "log_recent_technical",
          createdAt: "2026-06-10T10:00:00.000Z",
          actorType: "ATTENDEE",
          actorId: null,
          organizerId: "org_new",
          registrationId: "reg_new",
          eventType: "payment_checkout_started",
          entityType: "registration_payment",
          entityId: "reg_new",
          message: "Opened payment handoff for REG-NEW.",
          metadata: null
        }
      );
    });

    await fs.writeFile(
      rateLimitPath,
      JSON.stringify(
        {
          expired_key: {
            count: 5,
            expiresAt: "2026-06-13T17:00:00.000Z"
          },
          active_key: {
            count: 1,
            expiresAt: "2026-06-13T19:00:00.000Z"
          }
        },
        null,
        2
      )
    );

    const result = await runOperationalHousekeeping(now);
    const state = await loadPersistentState();
    const nextRateLimits = JSON.parse(await fs.readFile(rateLimitPath, "utf8"));

    expect(result).toEqual({
      ok: true,
      technicalAuditRetentionDays: 30,
      technicalAuditEntriesRemoved: 1,
      authRateLimitEntriesRemoved: 1
    });
    expect(state.auditLogs.some((entry) => entry.id === "log_old_technical")).toBe(false);
    expect(state.auditLogs.some((entry) => entry.id === "log_old_business")).toBe(true);
    expect(state.auditLogs.some((entry) => entry.id === "log_recent_technical")).toBe(true);
    expect(nextRateLimits).toEqual({
      active_key: {
        count: 1,
        expiresAt: "2026-06-13T19:00:00.000Z"
      }
    });
  });
});
