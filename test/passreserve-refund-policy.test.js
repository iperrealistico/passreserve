import { describe, expect, it } from "vitest";

import {
  REFUND_POLICY_TYPE,
  buildRefundPolicySnapshot,
  buildRefundPolicyView,
  getRefundPolicyTypeMeta,
  normalizeRefundPolicyType
} from "../lib/passreserve-refund-policy.js";

describe("passreserve-refund-policy", () => {
  it("normalizes supported refund policy types safely", () => {
    expect(normalizeRefundPolicyType("refundable")).toBe(REFUND_POLICY_TYPE.REFUNDABLE);
    expect(normalizeRefundPolicyType("unknown")).toBeNull();
  });

  it("builds a structured public view from type and detailed policy text", () => {
    const view = buildRefundPolicyView(
      {
        refundPolicyType: REFUND_POLICY_TYPE.REFUNDABLE_WITH_CONDITIONS,
        cancellationPolicy:
          "Refunds are available up to 48 hours before the event with written notice."
      },
      "en"
    );

    expect(view).toMatchObject({
      type: REFUND_POLICY_TYPE.REFUNDABLE_WITH_CONDITIONS,
      label: "Refundable with conditions",
      hasCustomDetail: true,
      requiresAcceptance: true
    });
  });

  it("creates an auditable localized snapshot for accepted policies", () => {
    const snapshot = buildRefundPolicySnapshot(
      {
        refundPolicyType: REFUND_POLICY_TYPE.NON_REFUNDABLE,
        contentI18n: {
          cancellationPolicy: {
            it: "I biglietti non sono rimborsabili dopo la conferma."
          }
        },
        cancellationPolicy: "Tickets are not refundable after confirmation."
      },
      "it"
    );

    expect(snapshot).toEqual({
      type: REFUND_POLICY_TYPE.NON_REFUNDABLE,
      label: "Non rimborsabile",
      summary: "L'organizer dichiara che questa prenotazione non e rimborsabile.",
      detail: "I biglietti non sono rimborsabili dopo la conferma.",
      locale: "it"
    });
  });

  it("falls back to a generic organizer policy meta when the type is missing", () => {
    expect(getRefundPolicyTypeMeta(null, "en")).toMatchObject({
      type: null,
      label: "Organizer policy"
    });
  });
});
