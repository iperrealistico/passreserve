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
