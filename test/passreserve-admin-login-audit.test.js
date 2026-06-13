import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { markAdminLogin } from "../lib/passreserve-admin-service.js";
import { loadPersistentState } from "../lib/passreserve-state.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-login-audit-${Date.now()}-${Math.random()}.json`
  );

  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

describe("passreserve admin login audit", () => {
  it("records organizer admin login successes in the audit trail", async () => {
    const state = await loadPersistentState();
    const organizerAdmin = state.organizerAdmins.find((entry) => entry.isActive);

    await markAdminLogin("organizer", organizerAdmin.id);

    const nextState = await loadPersistentState();
    const auditEntry = nextState.auditLogs.find(
      (entry) =>
        entry.eventType === "organizer_admin_login_success" && entry.actorId === organizerAdmin.id
    );

    expect(auditEntry).toMatchObject({
      actorType: "ORGANIZER_ADMIN",
      actorId: organizerAdmin.id,
      organizerId: organizerAdmin.organizerId,
      entityType: "organizer_admin"
    });
  });

  it("records platform admin login successes in the audit trail", async () => {
    const state = await loadPersistentState();
    const platformAdmin = state.platformAdmins.find((entry) => entry.isActive);

    await markAdminLogin("platform", platformAdmin.id);

    const nextState = await loadPersistentState();
    const auditEntry = nextState.auditLogs.find(
      (entry) =>
        entry.eventType === "platform_admin_login_success" && entry.actorId === platformAdmin.id
    );

    expect(auditEntry).toMatchObject({
      actorType: "PLATFORM_ADMIN",
      actorId: platformAdmin.id,
      organizerId: null,
      entityType: "platform_admin"
    });
  });
});
