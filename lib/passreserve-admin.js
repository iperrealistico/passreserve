import { publicOrganizers } from "./passreserve-public";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Rome"
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Rome"
});

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function parseDurationLabel(label) {
  const hoursMatch = label.match(/(\d+)h/);
  const minutesMatch = label.match(/(\d+)m/);

  return (
    (hoursMatch ? Number(hoursMatch[1]) * 60 : 0) +
    (minutesMatch ? Number(minutesMatch[1]) : 0)
  );
}

function parseCapacityCount(label) {
  const match = label.match(/(\d+)/);

  return match ? Number(match[1]) : 0;
}

function addMinutes(value, minutes) {
  const date = new Date(value);

  date.setMinutes(date.getMinutes() + minutes);

  return date.toISOString();
}

function formatDateLabel(value) {
  return dateFormatter.format(new Date(value));
}

function formatTimeLabel(startValue, endValue) {
  return `${timeFormatter.format(new Date(startValue))} to ${timeFormatter.format(
    new Date(endValue)
  )}`;
}

function deriveEventVisibility(eventIndex) {
  if (eventIndex === 0) {
    return "public";
  }

  if (eventIndex % 2 === 0) {
    return "unlisted";
  }

  return "draft";
}

function deriveOccurrenceStatus(remainingCount) {
  if (remainingCount <= 4) {
    return "capacity-watch";
  }

  return "scheduled";
}

function deriveOccurrenceRecord(organizer, event, occurrence, eventIndex, occurrenceIndex) {
  const durationMinutes = parseDurationLabel(event.duration);
  const remainingCount = parseCapacityCount(occurrence.capacity);
  const registeredCount = Math.max(2, eventIndex + occurrenceIndex + 3);
  const capacity = remainingCount + registeredCount;
  const startsAt = occurrence.startsAt;
  const endsAt = addMinutes(startsAt, durationMinutes);
  const published = !(eventIndex > 0 && occurrenceIndex === event.occurrences.length - 1);
  const price =
    event.basePrice +
    (occurrenceIndex === event.occurrences.length - 1 ? 10 : 0) +
    (eventIndex % 2 === 0 ? 0 : 5);
  const prepayPercentage =
    occurrenceIndex === event.occurrences.length - 1 && event.prepayPercentage < 100
      ? Math.min(100, event.prepayPercentage + 20)
      : event.prepayPercentage;
  const venue =
    eventIndex === 1 && occurrenceIndex === event.occurrences.length - 1
      ? `${organizer.venue.title} Annex`
      : organizer.venue.title;

  return {
    id: occurrence.id,
    label: occurrence.label,
    startsAt,
    endsAt,
    timeLabel: formatTimeLabel(startsAt, endsAt),
    capacity,
    registeredCount,
    remainingCount: capacity - registeredCount,
    price,
    priceLabel: formatCurrency(price),
    prepayPercentage,
    collectionLabel: `${prepayPercentage}% online`,
    venue,
    published,
    status: published ? deriveOccurrenceStatus(remainingCount) : "draft",
    note: occurrence.note,
    recurrenceLabel: occurrenceIndex === 0 ? "One-off headline date" : "Weekly series"
  };
}

function buildConflictDraftOccurrence(organizer) {
  const startsAt = "2026-04-18T08:30:00+02:00";
  const endsAt = addMinutes(startsAt, 180);

  return {
    id: `${organizer.slug}-draft-conflict`,
    label: formatDateLabel(startsAt),
    startsAt,
    endsAt,
    timeLabel: formatTimeLabel(startsAt, endsAt),
    capacity: 10,
    registeredCount: 0,
    remainingCount: 10,
    price: 95,
    priceLabel: formatCurrency(95),
    prepayPercentage: 50,
    collectionLabel: "50% online",
    venue: organizer.venue.title,
    published: false,
    status: "draft",
    note:
      "Draft overlap intentionally held back until the organizer resolves the venue timing clash.",
    recurrenceLabel: "Draft collision check"
  };
}

function buildAdminEvent(organizer, event, eventIndex) {
  const occurrences = event.occurrences.map((occurrence, occurrenceIndex) =>
    deriveOccurrenceRecord(organizer, event, occurrence, eventIndex, occurrenceIndex)
  );

  if (
    organizer.slug === "alpine-trail-lab" &&
    event.slug === "alpine-switchback-clinic"
  ) {
    occurrences.unshift(buildConflictDraftOccurrence(organizer));
  }

  const publishedOccurrences = occurrences.filter((occurrence) => occurrence.published);
  const nextOccurrence = publishedOccurrences[0] ?? occurrences[0] ?? null;

  return {
    slug: event.slug,
    title: event.title,
    category: event.category,
    summary: event.summary,
    description: event.description,
    visibility: deriveEventVisibility(eventIndex),
    defaultVenue: organizer.venue.title,
    mapHref: organizer.venue.mapHref,
    durationLabel: event.duration,
    durationMinutes: parseDurationLabel(event.duration),
    defaultCapacity: Math.max(...occurrences.map((occurrence) => occurrence.capacity)),
    basePrice: event.basePrice,
    basePriceLabel: formatCurrency(event.basePrice),
    prepayPercentage: event.prepayPercentage,
    collectionLabel: `${event.prepayPercentage}% online`,
    attendeeInstructions:
      event.included[0] ?? "Use the event page to explain arrival and check-in expectations.",
    organizerNotes:
      event.highlights[1] ??
      "Hosts can keep the public promise, default venue, and schedule shape aligned here.",
    cancellationPolicy:
      event.policies[0] ??
      "Deposits remain tied to the selected occurrence unless the organizer republishes the date.",
    publicHref: event.detailHref,
    nextOccurrenceLabel: nextOccurrence
      ? `${nextOccurrence.label} - ${nextOccurrence.timeLabel}`
      : "No published dates yet",
    occurrenceCount: occurrences.length,
    publishedOccurrenceCount: publishedOccurrences.length,
    registrationsCount: occurrences.reduce(
      (sum, occurrence) => sum + occurrence.registeredCount,
      0
    ),
    occurrences
  };
}

function flattenOccurrences(events, source = "existing") {
  return events.flatMap((event) =>
    event.occurrences.map((occurrence) => ({
      ...occurrence,
      eventSlug: event.slug,
      eventTitle: event.title,
      source
    }))
  );
}

function overlaps(left, right) {
  return (
    new Date(left.startsAt).getTime() < new Date(right.endsAt).getTime() &&
    new Date(left.endsAt).getTime() > new Date(right.startsAt).getTime()
  );
}

function normalizeVenue(venue) {
  return venue.toLowerCase().trim();
}

export function findVenueScheduleConflicts(events, previewOccurrences = []) {
  const existing = flattenOccurrences(events, "existing");
  const preview = previewOccurrences.map((occurrence) => ({
    ...occurrence,
    source: "preview"
  }));
  const occurrences = [...existing, ...preview].sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt)
  );
  const conflicts = [];

  for (let index = 0; index < occurrences.length; index += 1) {
    const left = occurrences[index];

    for (let compareIndex = index + 1; compareIndex < occurrences.length; compareIndex += 1) {
      const right = occurrences[compareIndex];

      if (new Date(right.startsAt).getTime() >= new Date(left.endsAt).getTime()) {
        break;
      }

      if (normalizeVenue(left.venue) !== normalizeVenue(right.venue)) {
        continue;
      }

      if (!overlaps(left, right)) {
        continue;
      }

      conflicts.push({
        id: `${left.id}__${right.id}`,
        venue: left.venue,
        startsAt: left.startsAt,
        summary: `${left.eventTitle} overlaps with ${right.eventTitle} at ${left.venue}.`,
        items: [left, right]
      });
    }
  }

  return conflicts;
}

function buildOrganizerAdmin(organizer) {
  const events = organizer.events.map((event, eventIndex) =>
    buildAdminEvent(organizer, event, eventIndex)
  );
  const conflicts = findVenueScheduleConflicts(events);

  return {
    slug: organizer.slug,
    name: organizer.name,
    city: organizer.city,
    region: organizer.region,
    tagline: organizer.tagline,
    venueTitle: organizer.venue.title,
    venueMapHref: organizer.venue.mapHref,
    supportEmail: organizer.contact.email,
    supportPhone: organizer.contact.phone,
    publicHref: organizer.organizerHref,
    eventsHref: `/${organizer.slug}/admin/events`,
    occurrencesHref: `/${organizer.slug}/admin/occurrences`,
    events,
    metrics: {
      eventCount: events.length,
      publishedEvents: events.filter((event) => event.visibility === "public").length,
      occurrenceCount: events.reduce((sum, event) => sum + event.occurrenceCount, 0),
      publishedOccurrences: events.reduce(
        (sum, event) => sum + event.publishedOccurrenceCount,
        0
      ),
      registrationsCount: events.reduce((sum, event) => sum + event.registrationsCount, 0),
      conflictCount: conflicts.length
    }
  };
}

export const organizerAdminPhase = {
  label: "Event catalog",
  title: "Organizer event catalog and occurrence planning",
  summary:
    "Passreserve.com gives organizers one place to shape event types, plan recurring dates, apply per-date overrides, and catch venue conflicts before they go live."
};

export const eventVisibilityOptions = [
  {
    id: "public",
    label: "Public"
  },
  {
    id: "unlisted",
    label: "Unlisted"
  },
  {
    id: "draft",
    label: "Draft"
  }
];

export const occurrenceStatusOptions = [
  {
    id: "scheduled",
    label: "Scheduled"
  },
  {
    id: "capacity-watch",
    label: "Capacity watch"
  },
  {
    id: "draft",
    label: "Draft"
  },
  {
    id: "cancelled",
    label: "Cancelled"
  }
];

export const recurrenceModeOptions = [
  {
    id: "single",
    label: "One-off date"
  },
  {
    id: "weekly",
    label: "Weekly series"
  }
];

export const organizerAdminGuidance = [
  {
    title: "Event formats stay organized",
    detail:
      "Event defaults live in organizer-admin forms with visibility, venue, pricing, and online-collection rules in one calm board."
  },
  {
    title: "Dates stay flexible",
    detail:
      "Every date owns its own capacity, price, venue, and publication override so yearly scheduling no longer hides inside slot settings."
  },
  {
    title: "Conflicts stay practical",
    detail:
      "The planner flags venue-time overlaps before publication so organizers can resolve collisions without leaving the admin shell."
  }
];

export const organizerAdminSeeds = publicOrganizers.map(buildOrganizerAdmin);

export function getOrganizerAdminSlugs() {
  return organizerAdminSeeds.map((organizer) => organizer.slug);
}

export function getOrganizerAdminBySlug(slug) {
  return organizerAdminSeeds.find((organizer) => organizer.slug === slug) ?? null;
}
