import { describe, expect, it } from "vitest";

import robots from "../app/robots.js";
import sitemap from "../app/sitemap.js";

describe("public crawler routing policy", () => {
  it("keeps public discovery crawlable while excluding functional routes", () => {
    const policy = robots();

    expect(policy).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/*/admin/",
          "/*/events/*/register"
        ]
      },
      sitemap: "https://passreserve.com/sitemap.xml",
      host: "https://passreserve.com"
    });
  });

  it("publishes only canonical, non-sensitive static routes", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://passreserve.com/",
      "https://passreserve.com/events",
      "https://passreserve.com/about",
      "https://passreserve.com/organizer-access",
      "https://passreserve.com/privacy",
      "https://passreserve.com/terms",
      "https://passreserve.com/cookie-policy"
    ]);
    expect(urls.every((url) => !/\/(?:api|admin)(?:\/|$)|\/register(?:\/|$)/.test(url))).toBe(true);
  });
});
