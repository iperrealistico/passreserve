import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearAdminLoginRateLimit,
  consumeAdminLoginRateLimit,
  findOrganizerAdminForAuthentication,
  findPlatformAdminForAuthentication,
  validateOrganizerAdminSessionUser,
  validatePlatformAdminSessionUser
} from "../lib/passreserve-auth-security.js";
import { mutatePersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-auth-${Date.now()}-${Math.random()}.json`
  );

  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
  await fs.rm(`${process.env.PASSRESERVE_STATE_FILE}.auth-rate-limits.json`, {
    force: true
  });
});

describe("passreserve-auth-security", () => {
  it("rate limits repeated admin login attempts and clears the limiter after success", async () => {
    const first = await consumeAdminLoginRateLimit("platform", {
      ip: "127.0.0.1",
      limit: 2,
      windowSeconds: 60
    });
    const second = await consumeAdminLoginRateLimit("platform", {
      ip: "127.0.0.1",
      limit: 2,
      windowSeconds: 60
    });
    const blocked = await consumeAdminLoginRateLimit("platform", {
      ip: "127.0.0.1",
      limit: 2,
      windowSeconds: 60
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    await clearAdminLoginRateLimit("platform", {
      ip: "127.0.0.1"
    });

    const reset = await consumeAdminLoginRateLimit("platform", {
      ip: "127.0.0.1",
      limit: 2,
      windowSeconds: 60
    });

    expect(reset.success).toBe(true);
  });

  it("rejects stale platform sessions after tokenVersion changes", async () => {
    const admin = await findPlatformAdminForAuthentication("admin@passreserve.local");

    expect(admin).not.toBeNull();
    expect(
      await validatePlatformAdminSessionUser({
        type: "platform",
        userId: admin.id,
        tokenVersion: admin.tokenVersion
      })
    ).not.toBeNull();

    await mutatePersistentState(async (draft) => {
      const target = draft.platformAdmins.find((entry) => entry.id === admin.id);

      target.tokenVersion = Number(target.tokenVersion || 0) + 1;
      target.updatedAt = new Date().toISOString();
    });

    expect(
      await validatePlatformAdminSessionUser({
        type: "platform",
        userId: admin.id,
        tokenVersion: admin.tokenVersion
      })
    ).toBeNull();
  });

  it("rejects stale organizer sessions after tokenVersion changes", async () => {
    const login = await findOrganizerAdminForAuthentication(
      "alpine-trail-lab",
      "admin@alpine-trail-lab.passreserve.local"
    );

    expect(login).not.toBeNull();
    expect(
      await validateOrganizerAdminSessionUser(
        {
          type: "organizer",
          userId: login.admin.id,
          organizerId: login.organizer.id,
          organizerSlug: login.organizer.slug,
          tokenVersion: login.admin.tokenVersion
        },
        "alpine-trail-lab"
      )
    ).not.toBeNull();

    await mutatePersistentState(async (draft) => {
      const target = draft.organizerAdmins.find((entry) => entry.id === login.admin.id);

      target.tokenVersion = Number(target.tokenVersion || 0) + 1;
      target.updatedAt = new Date().toISOString();
    });

    expect(
      await validateOrganizerAdminSessionUser(
        {
          type: "organizer",
          userId: login.admin.id,
          organizerId: login.organizer.id,
          organizerSlug: login.organizer.slug,
          tokenVersion: login.admin.tokenVersion
        },
        "alpine-trail-lab"
      )
    ).toBeNull();
  });
});
