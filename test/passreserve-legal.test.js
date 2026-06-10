import { describe, expect, it } from "vitest";

import {
  COOKIE_CONSENT_VERSION,
  getLegalDocument,
  parseCookieConsentValue,
  serializeCookieConsentValue
} from "../lib/passreserve-legal.js";

describe("passreserve legal module", () => {
  it("serializes and parses cookie consent choices", () => {
    const raw = serializeCookieConsentValue({
      preferences: true,
      analytics: false,
      marketing: true,
      updatedAt: "2026-06-10T10:00:00.000Z"
    });

    expect(parseCookieConsentValue(raw)).toEqual({
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      preferences: true,
      analytics: false,
      marketing: true,
      updatedAt: "2026-06-10T10:00:00.000Z"
    });
  });

  it("returns localized legal documents", () => {
    const privacy = getLegalDocument("it", "privacy");
    const terms = getLegalDocument("en", "terms");

    expect(privacy?.title).toContain("Privacy");
    expect(privacy?.sections.length).toBeGreaterThan(5);
    expect(terms?.title).toContain("Terms");
    expect(terms?.sections.length).toBeGreaterThan(5);
  });
});
