import { describe, expect, it } from "vitest";

import {
  PASSRESERVE_NO_STORE_CACHE_CONTROL,
  applyPassreserveSecurityHeaders,
  buildPassreserveSecurityHeaders,
  getPassreserveRoutePrivacyPolicy
} from "../lib/passreserve-http-security.js";

function createResponseDouble() {
  const store = new Map();

  return {
    headers: {
      get(key) {
        return store.get(String(key));
      },
      set(key, value) {
        store.set(String(key), String(value));
      }
    }
  };
}

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

  it("applies no-store and noindex headers to sensitive responses", () => {
    const response = createResponseDouble();

    applyPassreserveSecurityHeaders(response, "/sillico/admin/login", {
      protocol: "https:"
    });

    expect(response.headers.get("Cache-Control")).toBe(
      PASSRESERVE_NO_STORE_CACHE_CONTROL
    );
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Strict-Transport-Security")).toContain(
      "max-age=31536000"
    );
  });
});
