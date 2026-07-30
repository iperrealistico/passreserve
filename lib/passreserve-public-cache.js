import { unstable_cache, updateTag } from "next/cache.js";

export const PUBLIC_DATA_CACHE_VERSION = "v1";

export const PUBLIC_CACHE_TAGS = Object.freeze({
  SITE: "public-site",
  ABOUT: "about",
  DISCOVERY: "discovery",
  ORGANIZER_CONTENT: "organizer-content"
});

const ORGANIZER_CACHE_REVALIDATE_SECONDS = 15 * 60;
const DISCOVERY_CACHE_REVALIDATE_SECONDS = 10 * 60;

function normalizePublicCacheKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function getPublicDataCacheVersion(env = process.env) {
  return String(env.PASSRESERVE_PUBLIC_DATA_CACHE || "")
    .trim()
    .toLowerCase() === PUBLIC_DATA_CACHE_VERSION
    ? PUBLIC_DATA_CACHE_VERSION
    : "disabled";
}

export function isPublicDataCacheEnabled(env = process.env) {
  return getPublicDataCacheVersion(env) === PUBLIC_DATA_CACHE_VERSION;
}

export function getOrganizerPublicCacheTag(publicSlug) {
  const normalizedSlug = normalizePublicCacheKey(publicSlug);
  return normalizedSlug ? `organizer:${normalizedSlug}` : null;
}

export function getEventPublicCacheTag(eventId) {
  const normalizedId = normalizePublicCacheKey(eventId);
  return normalizedId ? `event:${normalizedId}` : null;
}

export function getOccurrenceContentCacheTag(occurrenceId) {
  const normalizedId = normalizePublicCacheKey(occurrenceId);
  return normalizedId ? `occurrence-content:${normalizedId}` : null;
}

export function buildOrganizerPublicCacheTags(publicSlug) {
  return [
    PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT,
    PUBLIC_CACHE_TAGS.DISCOVERY,
    getOrganizerPublicCacheTag(publicSlug)
  ].filter(Boolean);
}

export async function readPublicOrganizerContentWithCache(
  publicSlug,
  loader,
  env = process.env
) {
  if (!isPublicDataCacheEnabled(env)) {
    return loader(publicSlug);
  }

  const cacheKeySlug = String(publicSlug || "").trim().slice(0, 160);
  const cachedLoader = unstable_cache(
    () => loader(publicSlug),
    ["passreserve", "public-organizer-content", PUBLIC_DATA_CACHE_VERSION, cacheKeySlug],
    {
      revalidate: ORGANIZER_CACHE_REVALIDATE_SECONDS,
      tags: buildOrganizerPublicCacheTags(publicSlug)
    }
  );

  return cachedLoader();
}

export async function readPublicOrganizerSlugIndexWithCache(
  loader,
  env = process.env
) {
  if (!isPublicDataCacheEnabled(env)) {
    return loader();
  }

  const cachedLoader = unstable_cache(
    loader,
    ["passreserve", "public-organizer-slug-index", PUBLIC_DATA_CACHE_VERSION],
    {
      revalidate: ORGANIZER_CACHE_REVALIDATE_SECONDS,
      tags: [
        PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT,
        PUBLIC_CACHE_TAGS.DISCOVERY
      ]
    }
  );

  return cachedLoader();
}

export async function readPublicDiscoveryCatalogWithCache(
  locale,
  loader,
  env = process.env
) {
  const normalizedLocale = locale === "it" ? "it" : "en";

  if (!isPublicDataCacheEnabled(env)) {
    return loader(normalizedLocale);
  }

  const cachedLoader = unstable_cache(
    () => loader(normalizedLocale),
    ["passreserve", "public-discovery", PUBLIC_DATA_CACHE_VERSION, normalizedLocale],
    {
      revalidate: DISCOVERY_CACHE_REVALIDATE_SECONDS,
      tags: [PUBLIC_CACHE_TAGS.DISCOVERY]
    }
  );

  return cachedLoader();
}

export function invalidatePublicSiteContent() {
  updateTag(PUBLIC_CACHE_TAGS.SITE);
}

export function invalidatePublicAboutContent() {
  updateTag(PUBLIC_CACHE_TAGS.ABOUT);
}

export function invalidatePublicOrganizerContent(publicSlug = "") {
  updateTag(PUBLIC_CACHE_TAGS.ORGANIZER_CONTENT);
  updateTag(PUBLIC_CACHE_TAGS.DISCOVERY);

  const organizerTag = getOrganizerPublicCacheTag(publicSlug);
  if (organizerTag) {
    updateTag(organizerTag);
  }
}
