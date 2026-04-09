import { describe, expect, it } from "vitest";

import {
  calculatePaymentBreakdown,
  getDiscoveryResults
} from "../lib/passreserve-domain";

describe("passreserve-domain", () => {
  it("clamps payment values and rounds from cents safely", () => {
    expect(
      calculatePaymentBreakdown({
        unitPrice: 12.5,
        quantity: 0,
        prepayPercentage: 140
      })
    ).toMatchObject({
      quantity: 1,
      prepayPercentage: 100,
      subtotal: 12.5,
      onlineAmount: 12.5,
      dueAtEvent: 0
    });
  });

  it("returns featured discovery entries when no query is provided", () => {
    const results = getDiscoveryResults();

    expect(results[0]).toMatchObject({
      slug: "alpine-trail-lab",
      featuredRank: 1
    });
    expect(results).toHaveLength(6);
  });

  it("prioritizes relevant organizer matches for keyword searches", () => {
    const results = getDiscoveryResults("sunrise dolomites", "keyword");

    expect(results[0]).toMatchObject({
      slug: "alpine-trail-lab",
      eventSlug: "sunrise-ridge-session"
    });
    expect(results.every((entry) => entry.score > 0)).toBe(true);
  });
});
