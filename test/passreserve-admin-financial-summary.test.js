import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOrganizerDashboard,
  getPlatformOrganizerDetail,
  getPlatformOrganizers,
  getPlatformOverview
} from "../lib/passreserve-admin-service.js";
import { formatCurrencyFromCents } from "../lib/passreserve-format.js";
import { loadPersistentState, mutatePersistentState } from "../lib/passreserve-state.js";

function isOperationallyActive(registration) {
  if (["CANCELLED", "NO_SHOW"].includes(registration.status)) {
    return false;
  }

  if (registration.status === "PENDING_CONFIRM") {
    return !registration.expiresAt || new Date(registration.expiresAt).getTime() > Date.now();
  }

  if (registration.status === "PENDING_PAYMENT") {
    return !registration.expiresAt || new Date(registration.expiresAt).getTime() > Date.now();
  }

  return true;
}

function summarizeFinancials(registrations) {
  const onlineCollected = registrations.reduce(
    (sum, registration) =>
      sum +
      Math.max(
        0,
        Number(registration.onlineCollectedCents || 0) - Number(registration.refundedCents || 0)
      ),
    0
  );
  const dueAtEvent = registrations.reduce((sum, registration) => {
    if (!isOperationallyActive(registration)) {
      return sum;
    }

    return (
      sum +
      Math.max(
        0,
        Number(registration.dueAtEventCents || 0) - Number(registration.venueCollectedCents || 0)
      )
    );
  }, 0);

  return {
    onlineCollected,
    dueAtEvent
  };
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"));
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-admin-financial-summary-${Date.now()}-${Math.random()}.json`
  );
  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("passreserve admin financial summaries", () => {
  it("uses net online totals and excludes cancelled venue balances in organizer and platform summaries", async () => {
    await mutatePersistentState(async (draft) => {
      const organizer = draft.organizers.find((entry) => entry.slug === "alpine-trail-lab");
      const targetRegistration = draft.registrations.find(
        (entry) =>
          entry.organizerId === organizer.id &&
          !["CANCELLED", "NO_SHOW"].includes(entry.status)
      );

      targetRegistration.status = "CANCELLED";
      targetRegistration.onlineCollectedCents = 2000;
      targetRegistration.refundedCents = 2000;
      targetRegistration.dueAtEventCents = 5000;
      targetRegistration.venueCollectedCents = 0;
    });

    const state = await loadPersistentState();
    const organizer = state.organizers.find((entry) => entry.slug === "alpine-trail-lab");
    const organizerRegistrations = state.registrations.filter(
      (entry) => entry.organizerId === organizer.id
    );
    const organizerExpected = summarizeFinancials(organizerRegistrations);
    const platformExpected = summarizeFinancials(state.registrations);

    const dashboard = await getOrganizerDashboard("alpine-trail-lab");
    const organizers = await getPlatformOrganizers();
    const organizerListEntry = organizers.find((entry) => entry.slug === "alpine-trail-lab");
    const organizerDetail = await getPlatformOrganizerDetail("alpine-trail-lab");
    const overview = await getPlatformOverview();

    expect(dashboard.summary.onlineCollected).toBe(organizerExpected.onlineCollected);
    expect(dashboard.summary.dueAtEvent).toBe(organizerExpected.dueAtEvent);
    expect(dashboard.summary.onlineCollectedLabel).toBe(
      formatCurrencyFromCents(organizerExpected.onlineCollected)
    );
    expect(dashboard.summary.dueAtEventLabel).toBe(
      formatCurrencyFromCents(organizerExpected.dueAtEvent)
    );

    expect(organizerListEntry.summary.onlineCollected).toBe(organizerExpected.onlineCollected);
    expect(organizerListEntry.summary.dueAtEvent).toBe(organizerExpected.dueAtEvent);
    expect(organizerDetail.organizer.summary.onlineCollected).toBe(
      organizerExpected.onlineCollected
    );
    expect(organizerDetail.organizer.summary.dueAtEvent).toBe(organizerExpected.dueAtEvent);

    expect(overview.summary.onlineCollectedLabel).toBe(
      formatCurrencyFromCents(platformExpected.onlineCollected)
    );
    expect(overview.summary.dueAtEventLabel).toBe(
      formatCurrencyFromCents(platformExpected.dueAtEvent)
    );
  });
});
