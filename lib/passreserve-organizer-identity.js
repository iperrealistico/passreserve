import { normalizeText, slugify } from "./passreserve-format.js";

export function getOrganizerPublicSlug(organizer) {
  return normalizeText(organizer?.publicSlug || organizer?.slug);
}

export function getOrganizerInternalSlug(organizer) {
  return normalizeText(organizer?.slug);
}

export function getOrganizerPublicationState(organizer) {
  return organizer?.publicationState === "PUBLISHED" ? "PUBLISHED" : "PRIVATE";
}

export function isOrganizerPublished(organizer) {
  return organizer?.status === "ACTIVE" && getOrganizerPublicationState(organizer) === "PUBLISHED";
}

export function canEditOrganizerPublicSlug(organizer) {
  return getOrganizerPublicationState(organizer) !== "PUBLISHED";
}

export function matchesOrganizerPublicSlug(organizer, slug) {
  return getOrganizerPublicSlug(organizer) === normalizeText(slug);
}

export function buildOrganizerPublicHref(organizer) {
  const slug = getOrganizerPublicSlug(organizer);
  return slug ? `/${slug}` : "/events";
}

export function buildOrganizerEventHref(organizer, eventSlug) {
  const publicSlug = getOrganizerPublicSlug(organizer);
  return publicSlug && eventSlug ? `/${publicSlug}/events/${eventSlug}` : "/events";
}

export function buildOrganizerRegistrationHref(organizer, eventSlug, occurrenceId) {
  const detailHref = buildOrganizerEventHref(organizer, eventSlug);

  if (!occurrenceId) {
    return detailHref;
  }

  return `${detailHref}/register?occurrence=${occurrenceId}`;
}

export function normalizeOrganizerPublicSlugInput(value, fallback = "") {
  return slugify(normalizeText(value) || normalizeText(fallback));
}

export function getOrganizerPublicationStatusMeta(organizer) {
  if (isOrganizerPublished(organizer)) {
    return {
      label: "Published",
      tone: "public"
    };
  }

  return {
    label: "Private",
    tone: "draft"
  };
}
