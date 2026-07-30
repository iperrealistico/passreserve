import { describe, expect, it } from "vitest";

import {
  PASSRESERVE_NO_STORE_CACHE_CONTROL,
  PASSRESERVE_SECURITY_HEADER_SOURCE,
  PASSRESERVE_SENSITIVE_HEADER_SOURCES,
  buildPassreserveSecurityHeaders,
  getPassreserveRoutePrivacyPolicy,
  getPassreserveStaticHeaderRules
} from "../lib/passreserve-http-security.js";

describe("passreserve-http-security", () => {
  it("adds baseline browser security headers without forcing hsts on local http", () => {
    const headers = buildPassreserveSecurityHeaders({
      protocol: "http:"
    });

    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).not.toContain(
      "upgrade-insecure-requests"
    );
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("adds hsts and upgrade-insecure-requests on https responses", () => {
    const headers = buildPassreserveSecurityHeaders({
      protocol: "https:"
    });

    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["Content-Security-Policy"]).toContain(
      "upgrade-insecure-requests"
    );
  });

  it("treats protected production runtimes as secure transport even without explicit protocol", () => {
    const headers = buildPassreserveSecurityHeaders({
      env: {
        VERCEL: "1",
        VERCEL_ENV: "production"
      }
    });

    expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(headers["Content-Security-Policy"]).toContain(
      "upgrade-insecure-requests"
    );
  });

  it("marks admin, api, and register routes as no-store and noindex", () => {
    expect(getPassreserveRoutePrivacyPolicy("/admin/login")).toEqual({
      noIndex: true,
      noStore: true
    });
    expect(getPassreserveRoutePrivacyPolicy("/sillico/admin/registrations")).toEqual({
      noIndex: true,
      noStore: true
    });
    expect(getPassreserveRoutePrivacyPolicy("/api/stripe/webhooks")).toEqual({
      noIndex: true,
      noStore: true
    });
    expect(
      getPassreserveRoutePrivacyPolicy(
        "/sillico/events/divini-sapori/register/payment/success/token-123"
      )
    ).toEqual({
      noIndex: true,
      noStore: true
    });
  });

  it("leaves public discovery and event detail pages indexable", () => {
    expect(getPassreserveRoutePrivacyPolicy("/")).toEqual({
      noIndex: false,
      noStore: false
    });
    expect(getPassreserveRoutePrivacyPolicy("/events")).toEqual({
      noIndex: false,
      noStore: false
    });
    expect(getPassreserveRoutePrivacyPolicy("/sillico/events/divini-sapori")).toEqual({
      noIndex: false,
      noStore: false
    });
  });

  it("builds deployment routing headers for public and sensitive routes", () => {
    const rules = getPassreserveStaticHeaderRules();
    const baselineRule = rules[0];
    const sensitiveRules = rules.slice(1);
    const baselineHeaders = Object.fromEntries(
      baselineRule.headers.map(({ key, value }) => [key, value])
    );

    expect(baselineRule.source).toBe(PASSRESERVE_SECURITY_HEADER_SOURCE);
    expect(baselineHeaders["Content-Security-Policy"]).toContain(
      "upgrade-insecure-requests"
    );
    expect(baselineHeaders["Strict-Transport-Security"]).toContain(
      "max-age=31536000"
    );
    expect(sensitiveRules.map((rule) => rule.source)).toEqual(
      PASSRESERVE_SENSITIVE_HEADER_SOURCES
    );

    for (const rule of sensitiveRules) {
      const headers = Object.fromEntries(
        rule.headers.map(({ key, value }) => [key, value])
      );

      expect(headers["Cache-Control"]).toBe(
        PASSRESERVE_NO_STORE_CACHE_CONTROL
      );
      expect(headers["CDN-Cache-Control"]).toBe("no-store");
      expect(headers["Vercel-CDN-Cache-Control"]).toBe("no-store");
      expect(headers.Pragma).toBe("no-cache");
      expect(headers.Expires).toBe("0");
      expect(headers["X-Robots-Tag"]).toBe("noindex, nofollow");
    }
  });
});
