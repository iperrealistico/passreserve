import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  unstableCache: vi.fn((loader) => loader),
  updateTag: vi.fn()
}));

vi.mock("next/cache.js", () => ({
  unstable_cache: cacheMocks.unstableCache,
  updateTag: cacheMocks.updateTag
}));

import {
  PUBLIC_CACHE_TAGS,
  buildOrganizerPublicCacheTags,
  getEventPublicCacheTag,
  getOccurrenceContentCacheTag,
  getOrganizerPublicCacheTag,
  getPublicDataCacheVersion,
  invalidatePublicAboutContent,
  invalidatePublicOrganizerContent,
  invalidatePublicSiteContent,
  readPublicDiscoveryCatalogWithCache,
  readPublicOrganizerContentWithCache,
  readPublicOrganizerSlugIndexWithCache
} from "../lib/passreserve-public-cache.js";
import {
  normalizePublicDiscoveryQuery
} from "../lib/passreserve-service.js";

beforeEach(() => {
  cacheMocks.unstableCache.mockClear();
  cacheMocks.updateTag.mockClear();
});

describe("public data cache", () => {
  it("uses an exact opt-in flag and stays disabled by default", () => {
    expect(getPublicDataCacheVersion({})).toBe("disabled");
    expect(
      getPublicDataCacheVersion({
        PASSRESERVE_PUBLIC_DATA_CACHE: "v1"
      })
    ).toBe("v1");
    expect(
      getPublicDataCacheVersion({
        PASSRESERVE_PUBLIC_DATA_CACHE: "true"
      })
    ).toBe("disabled");
  });

  it("uses stable non-sensitive tags and normalized identifiers", () => {
    expect(getOrganizerPublicCacheTag(" Sillico ")).toBe("organizer:sillico");
    expect(getEventPublicCacheTag("Event_123")).toBe("event:event-123");
    expect(getOccurrenceContentCacheTag("Occurrence 123")).toBe(
      "occurrence-content:occurrence-123"
    );
    expect(buildOrganizerPublicCacheTags("Sillico")).toEqual([
      PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT,
      PUBLIC_CACHE_TAGS.DISCOVERY,
      "organizer:sillico"
    ]);
  });

  it("bypasses the cache while disabled", async () => {
    const loader = vi.fn(async (slug) => ({ slug }));

    await expect(
      readPublicOrganizerContentWithCache("sillico", loader, {})
    ).resolves.toEqual({ slug: "sillico" });
    expect(cacheMocks.unstableCache).not.toHaveBeenCalled();
  });

  it("creates bounded organizer and locale-specific discovery entries when enabled", async () => {
    const env = {
      PASSRESERVE_PUBLIC_DATA_CACHE: "v1"
    };

    await readPublicOrganizerContentWithCache(
      "sillico",
      async (slug) => ({ slug }),
      env
    );
    await readPublicOrganizerSlugIndexWithCache(
      async () => ["sillico"],
      env
    );
    await readPublicDiscoveryCatalogWithCache(
      "it",
      async (locale) => [{ locale }],
      env
    );

    expect(cacheMocks.unstableCache).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      ["passreserve", "public-organizer-content", "v1", "sillico"],
      expect.objectContaining({
        revalidate: 900,
        tags: expect.arrayContaining([
          PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT,
          PUBLIC_CACHE_TAGS.DISCOVERY,
          "organizer:sillico"
        ])
      })
    );
    expect(cacheMocks.unstableCache).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      ["passreserve", "public-organizer-slug-index", "v1"],
      {
        revalidate: 900,
        tags: [
          PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT,
          PUBLIC_CACHE_TAGS.DISCOVERY
        ]
      }
    );
    expect(cacheMocks.unstableCache).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      ["passreserve", "public-discovery", "v1", "it"],
      {
        revalidate: 600,
        tags: [PUBLIC_CACHE_TAGS.DISCOVERY]
      }
    );
  });

  it("invalidates only public cache tags after content mutations", () => {
    invalidatePublicSiteContent();
    invalidatePublicAboutContent();
    invalidatePublicOrganizerContent("sillico");

    expect(cacheMocks.updateTag.mock.calls.map(([tag]) => tag)).toEqual([
      PUBLIC_CACHE_TAGS.SITE,
      PUBLIC_CACHE_TAGS.ABOUT,
      PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT,
      PUBLIC_CACHE_TAGS.DISCOVERY,
      "organizer:sillico"
    ]);
  });

  it("bounds arbitrary discovery input before database or cache work", () => {
    expect(normalizePublicDiscoveryQuery("  Tuscan   dinner  ")).toEqual({
      normalized: "Tuscan dinner",
      rejected: false
    });
    expect(normalizePublicDiscoveryQuery("x".repeat(161))).toEqual({
      normalized: "",
      rejected: true
    });
    expect(normalizePublicDiscoveryQuery(["not", "a", "string"])).toEqual({
      normalized: "",
      rejected: false
    });
  });
});
