function toSafeInt(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function normalizeOrganizerBookingWindowSettings(organizer = {}) {
  const minAdvanceHours = Math.max(0, toSafeInt(organizer.minAdvanceHours, 0));
  const maxAdvanceDays = Math.max(0, toSafeInt(organizer.maxAdvanceDays, 0));

  return {
    minAdvanceHours,
    maxAdvanceDays: maxAdvanceDays > 0 ? maxAdvanceDays : null
  };
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWindowLabel(value) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

export function resolveEventSalesWindow(event = {}, occurrence = {}) {
  const startsAt = toDate(occurrence.salesWindowStartsAt) || toDate(event.salesWindowStartsAt);
  const endsAt = toDate(occurrence.salesWindowEndsAt) || toDate(event.salesWindowEndsAt);

  return {
    startsAt: startsAt ? startsAt.toISOString() : null,
    endsAt: endsAt ? endsAt.toISOString() : null
  };
}

export function getOrganizerBookingWindowGate(
  organizer = {},
  occurrenceStartsAt,
  nowInput = new Date()
) {
  const settings = normalizeOrganizerBookingWindowSettings(organizer);

  if (!occurrenceStartsAt) {
    return {
      ...settings,
      allowed: true,
      reason: null,
      hoursUntilStart: null
    };
  }

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const startsAt = new Date(occurrenceStartsAt);
  const diffMs = startsAt.getTime() - now.getTime();
  const hoursUntilStart = diffMs / (1000 * 60 * 60);
  const daysUntilStart = diffMs / (1000 * 60 * 60 * 24);

  if (settings.minAdvanceHours > 0 && hoursUntilStart < settings.minAdvanceHours) {
    return {
      ...settings,
      allowed: false,
      reason: `Registrations close ${settings.minAdvanceHours} hour${settings.minAdvanceHours === 1 ? "" : "s"} before this event starts.`,
      hoursUntilStart
    };
  }

  if (settings.maxAdvanceDays && daysUntilStart > settings.maxAdvanceDays) {
    return {
      ...settings,
      allowed: false,
      reason: `Registrations only open within ${settings.maxAdvanceDays} day${settings.maxAdvanceDays === 1 ? "" : "s"} of the event date.`,
      hoursUntilStart
    };
  }

  return {
    ...settings,
    allowed: true,
    reason: null,
    hoursUntilStart
  };
}

export function getRegistrationAvailabilityGate(
  organizer = {},
  event = {},
  occurrence = {},
  nowInput = new Date()
) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const salesWindow = resolveEventSalesWindow(event, occurrence);
  const opensAt = toDate(salesWindow.startsAt);
  const closesAt = toDate(salesWindow.endsAt);

  if (opensAt && now.getTime() < opensAt.getTime()) {
    return {
      ...salesWindow,
      allowed: false,
      reason: `Registrations open on ${formatWindowLabel(opensAt)}.`,
      gateState: "not_open"
    };
  }

  if (closesAt && now.getTime() > closesAt.getTime()) {
    return {
      ...salesWindow,
      allowed: false,
      reason: `Registrations closed on ${formatWindowLabel(closesAt)}.`,
      gateState: "closed"
    };
  }

  const bookingWindow = getOrganizerBookingWindowGate(
    organizer,
    occurrence.startsAt,
    now
  );

  if (!bookingWindow.allowed) {
    return {
      ...salesWindow,
      ...bookingWindow,
      gateState: "organizer_window"
    };
  }

  return {
    ...salesWindow,
    ...bookingWindow,
    allowed: true,
    reason: null,
    gateState: "open"
  };
}
