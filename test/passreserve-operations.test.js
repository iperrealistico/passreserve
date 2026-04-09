import { describe, expect, it } from "vitest";

import {
  applyRegistrationOperation,
  getAvailableRegistrationActions,
  getOrganizerOperationsBySlug,
  summarizeRegistrationOperations
} from "../lib/passreserve-operations";

describe("passreserve-operations", () => {
  it("summarizes organizer registration queues consistently", () => {
    const organizer = getOrganizerOperationsBySlug("alpine-trail-lab");
    const summary = summarizeRegistrationOperations(organizer.records);

    expect(summary.activeCount).toBeGreaterThan(0);
    expect(summary.activeAttendees).toBeGreaterThanOrEqual(summary.activeCount);
    expect(summary.onlineCollectedLabel).toMatch(/^€/);
  });

  it("exposes organizer actions that match the current record state", () => {
    const organizer = getOrganizerOperationsBySlug("alpine-trail-lab");
    const pendingRecord = organizer.records.find(
      (record) =>
        record.status === "PENDING_CONFIRM" && record.payment.onlineAmountExpected > 0
    );
    const actionIds = getAvailableRegistrationActions(pendingRecord).map(
      (action) => action.id
    );

    expect(actionIds).toEqual(["confirm", "cancel"]);
  });

  it("moves payment-required confirmations into the pending-payment state", () => {
    const organizer = getOrganizerOperationsBySlug("alpine-trail-lab");
    const pendingRecord = organizer.records.find(
      (record) =>
        record.status === "PENDING_CONFIRM" && record.payment.onlineAmountExpected > 0
    );
    const result = applyRegistrationOperation(
      organizer.records,
      pendingRecord.id,
      "confirm"
    );
    const updatedRecord = result.records.find((record) => record.id === pendingRecord.id);

    expect(result.message).toContain(pendingRecord.registrationCode);
    expect(updatedRecord.status).toBe("PENDING_PAYMENT");
    expect(updatedRecord.payment.paymentStatus).toBe("PENDING");
  });

  it("reconciles venue balances when an attended registration still has an open amount", () => {
    const organizer = getOrganizerOperationsBySlug("alpine-trail-lab");
    const record = organizer.records.find(
      (entry) =>
        entry.status === "CONFIRMED_PARTIALLY_PAID" &&
        entry.payment.dueAtEventOutstanding > 0
    );
    const result = applyRegistrationOperation(organizer.records, record.id, "mark-attended");
    const updatedRecord = result.records.find((entry) => entry.id === record.id);

    expect(updatedRecord.status).toBe("ATTENDED");
    expect(updatedRecord.payment.paymentStatus).toBe("PAID");
    expect(updatedRecord.payment.dueAtEventOutstanding).toBe(0);
  });
});
