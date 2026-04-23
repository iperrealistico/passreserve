import bcrypt from "bcryptjs";
import { cache } from "react";

import {
  ORGANIZER_BILLING_STATUS,
  getOrganizerOnlinePaymentsGate,
  getStripeAccountPatch,
  isOccurrenceUsingOnlinePayments,
  normalizeOrganizerBillingStatus,
  normalizeOrganizerPaymentSettings
} from "./passreserve-billing.js";
import { getDietaryFlagLabel } from "./passreserve-dietary.js";
import { normalizeOrganizerBookingWindowSettings } from "./passreserve-booking-window.js";
import { sendTransactionalEmail } from "./passreserve-email.js";
import {
  buildEmailDeliveryDedupeKey,
  getRegistrationRefundStateLabel,
  normalizeReminderLeadHours,
  sendPrismaTemplateEmail,
  sendStateTemplateEmail,
  shouldSendOccurrenceCancellationForRegistration
} from "./passreserve-email-delivery.js";
import {
  DEFAULT_LOCAL_PASSWORD,
  getStorageMode,
  getStorageSummary
} from "./passreserve-config.js";
import {
  addHours,
  asIso,
  createToken,
  formatCurrencyFromCents,
  formatDateLabel,
  formatDateTimeLabel,
  formatOccurrenceTimeRange,
  normalizeEmail,
  normalizeText,
  pluralize,
  slugify
} from "./passreserve-format.js";
import { getPrismaClient } from "./passreserve-prisma.js";
import { loadPersistentState, mutatePersistentState } from "./passreserve-state.js";
import { getBaseUrl } from "./passreserve-config.js";
import {
  createStripeConnectedAccount,
  createStripeOnboardingAccountLink,
  getStripeEnvironmentState,
  retrieveStripeConnectedAccount
} from "./passreserve-payments.js";

function getOrganizerRecord(state, slug) {
  return applyOrganizerPaymentDefaults(
    state.organizers.find((organizer) => organizer.slug === slug) ?? null
  );
}

function getOrganizerById(state, organizerId) {
  return applyOrganizerPaymentDefaults(
    state.organizers.find((organizer) => organizer.id === organizerId) ?? null
  );
}

function getEventById(state, eventId) {
  return state.events.find((event) => event.id === eventId) ?? null;
}

function getOccurrenceById(state, occurrenceId) {
  return state.occurrences.find((occurrence) => occurrence.id === occurrenceId) ?? null;
}

function getTicketCategoryById(state, ticketCategoryId) {
  return state.ticketCategories.find((category) => category.id === ticketCategoryId) ?? null;
}

function getOrganizerEvents(state, organizerId) {
  return state.events
    .filter((event) => event.organizerId === organizerId)
    .sort((left, right) => left.title.localeCompare(right.title));
}

function getEventOccurrences(state, eventTypeId) {
  return state.occurrences
    .filter((occurrence) => occurrence.eventTypeId === eventTypeId)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function getOrganizerRegistrations(state, organizerId) {
  return state.registrations
    .filter((registration) => registration.organizerId === organizerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function getRegistrationPayments(state, registrationId) {
  return state.payments
    .filter((payment) => payment.registrationId === registrationId)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function getEmailDeliveries(state, limit = 50) {
  return (Array.isArray(state.emailDeliveries) ? state.emailDeliveries : [])
    .slice()
    .sort((left, right) => {
      const leftTimestamp = left.sentAt || left.createdAt || "";
      const rightTimestamp = right.sentAt || right.createdAt || "";
      return rightTimestamp.localeCompare(leftTimestamp);
    })
    .slice(0, limit);
}

function getDeliveryStatusTone(status) {
  return status === "FAILED" ? "unlisted" : status === "SENT" ? "public" : "capacity-watch";
}

function isPendingConfirmExpired(registration) {
  return (
    registration.status === "PENDING_CONFIRM" &&
    registration.expiresAt &&
    new Date(registration.expiresAt).getTime() <= Date.now()
  );
}

function isPendingPaymentExpired(registration) {
  return (
    registration.status === "PENDING_PAYMENT" &&
    registration.expiresAt &&
    new Date(registration.expiresAt).getTime() <= Date.now()
  );
}

function isRegistrationActiveForCapacity(registration) {
  if (registration.status === "CANCELLED") {
    return false;
  }

  if (registration.status === "PENDING_CONFIRM") {
    return !isPendingConfirmExpired(registration);
  }

  if (registration.status === "PENDING_PAYMENT") {
    return !isPendingPaymentExpired(registration);
  }

  return true;
}

function getOccurrenceCapacitySummary(state, occurrence) {
  const registrations = state.registrations.filter(
    (registration) => registration.occurrenceId === occurrence.id
  );
  const reserved = registrations.filter(isRegistrationActiveForCapacity);
  const reservedQuantity = reserved.reduce((sum, registration) => sum + registration.quantity, 0);

  return {
    totalCapacity: occurrence.capacity,
    reservedQuantity,
    remaining: Math.max(0, occurrence.capacity - reservedQuantity),
    pendingPayments: reserved
      .filter((registration) => registration.status === "PENDING_PAYMENT")
      .reduce((sum, registration) => sum + registration.quantity, 0)
  };
}

function applyOrganizerPaymentDefaults(organizer) {
  if (!organizer) {
    return organizer;
  }

  Object.assign(organizer, normalizeOrganizerPaymentSettings(organizer));
  Object.assign(organizer, normalizeOrganizerBookingWindowSettings(organizer));

  return organizer;
}

function serializeDatabaseValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeDatabaseValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeDatabaseValue(entry)])
    );
  }

  return value;
}

const loadOrganizerAdminStateBySlug = cache(async function loadOrganizerAdminStateBySlug(slug) {
  if (getStorageMode() !== "database") {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    const [events, ticketCategories, occurrences, registrations, payments] = await Promise.all([
      prisma.eventType.findMany({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          title: "asc"
        }
      }),
      prisma.ticketCategory.findMany({
        where: {
          eventType: {
            organizerId: organizer.id
          }
        },
        orderBy: {
          sortOrder: "asc"
        }
      }),
      prisma.eventOccurrence.findMany({
        where: {
          eventType: {
            organizerId: organizer.id
          }
        },
        orderBy: {
          startsAt: "asc"
        }
      }),
      prisma.registration.findMany({
        where: {
          organizerId: organizer.id
        },
        include: {
          attendees: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.registrationPayment.findMany({
        where: {
          registration: {
            organizerId: organizer.id
          }
        },
        orderBy: {
          occurredAt: "desc"
        }
      })
    ]);

    return serializeDatabaseValue({
      organizers: [organizer],
      events,
      ticketCategories,
      occurrences,
      registrations,
      payments
    });
  } catch (error) {
    console.error(
      "[passreserve-admin-service] organizer admin database state unavailable, falling back to file state",
      error
    );

    return loadPersistentState();
  }
});

function buildOrganizerBillingSnapshot(organizer, timeZone = "Europe/Rome") {
  const gate = getOrganizerOnlinePaymentsGate(organizer);

  return {
    ...gate,
    stripeConnectedAtLabel: gate.stripeConnectedAt
      ? formatDateTimeLabel(gate.stripeConnectedAt, timeZone)
      : "Not connected",
    stripeLastSyncedAtLabel: gate.stripeLastSyncedAt
      ? formatDateTimeLabel(gate.stripeLastSyncedAt, timeZone)
      : "Not synced yet",
    paidPublishingLabel: gate.enabled
      ? "Paid events can be published."
      : "Paid events stay blocked until Stripe and billing are ready."
  };
}

function getRegistrationAttendees(registration) {
  return Array.isArray(registration?.attendees) ? registration.attendees : [];
}

function summarizeDietaryNeeds(registrations, locale = "en") {
  const breakdown = new Map();
  const customNotes = [];
  let participantsWithRestrictions = 0;

  for (const registration of registrations) {
    for (const attendee of getRegistrationAttendees(registration)) {
      const flags = Array.isArray(attendee.dietaryFlags) ? attendee.dietaryFlags : [];
      const other = normalizeText(attendee.dietaryOther);

      if (flags.length || other) {
        participantsWithRestrictions += 1;
      }

      for (const flag of flags) {
        breakdown.set(flag, (breakdown.get(flag) || 0) + 1);
      }

      if (other) {
        customNotes.push({
          attendeeName: [attendee.firstName, attendee.lastName].filter(Boolean).join(" "),
          detail: other
        });
      }
    }
  }

  return {
    participantsWithRestrictions,
    breakdown: Array.from(breakdown.entries())
      .map(([id, count]) => ({
        id,
        count,
        label: getDietaryFlagLabel(id, locale)
      }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    customNotes
  };
}

function getOrganizerSummary(state, organizer) {
  const registrations = getOrganizerRegistrations(state, organizer.id);
  const activeRegistrations = registrations.filter(
    (registration) =>
      !["CANCELLED", "NO_SHOW"].includes(registration.status) &&
      !isPendingConfirmExpired(registration) &&
      !isPendingPaymentExpired(registration)
  );
  const onlineCollected = registrations.reduce(
    (sum, registration) => sum + registration.onlineCollectedCents,
    0
  );
  const dueAtEvent = registrations.reduce(
    (sum, registration) =>
      sum + Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents),
    0
  );
  const upcomingOccurrences = getOrganizerEvents(state, organizer.id).flatMap((event) =>
    getEventOccurrences(state, event.id).filter(
      (occurrence) => new Date(occurrence.startsAt).getTime() > Date.now()
    )
  );
  const dietary = summarizeDietaryNeeds(activeRegistrations);

  return {
    activeCount: activeRegistrations.length,
    onlineCollected,
    onlineCollectedLabel: formatCurrencyFromCents(onlineCollected),
    dueAtEvent,
    dueAtEventLabel: formatCurrencyFromCents(dueAtEvent),
    pendingPayments: registrations.filter(
      (registration) => registration.status === "PENDING_PAYMENT"
    ).length,
    upcomingOccurrences: upcomingOccurrences.length,
    dietary
  };
}

function buildOrganizerLinks(organizer) {
  return {
    publicHref: `/${organizer.slug}`,
    dashboardHref: `/${organizer.slug}/admin/dashboard`,
    calendarHref: `/${organizer.slug}/admin/calendar`,
    registrationsHref: `/${organizer.slug}/admin/registrations`,
    paymentsHref: `/${organizer.slug}/admin/registrations`,
    billingHref: `/${organizer.slug}/admin/billing`,
    settingsHref: `/${organizer.slug}/admin/settings`,
    eventsHref: `/${organizer.slug}/admin/events`,
    occurrencesHref: `/${organizer.slug}/admin/occurrences`
  };
}

function getActiveRegistrationWhere(now = new Date()) {
  return {
    status: {
      notIn: ["CANCELLED", "NO_SHOW"]
    },
    OR: [
      {
        status: {
          notIn: ["PENDING_CONFIRM", "PENDING_PAYMENT"]
        }
      },
      {
        status: "PENDING_CONFIRM",
        OR: [
          {
            expiresAt: null
          },
          {
            expiresAt: {
              gt: now
            }
          }
        ]
      },
      {
        status: "PENDING_PAYMENT",
        OR: [
          {
            expiresAt: null
          },
          {
            expiresAt: {
              gt: now
            }
          }
        ]
      }
    ]
  };
}

function getOrganizerVenueRecords(organizer) {
  if (Array.isArray(organizer?.venues) && organizer.venues.length) {
    return organizer.venues
      .map((entry) => ({
        title: normalizeText(entry?.title),
        detail: normalizeText(entry?.detail),
        mapHref: normalizeText(entry?.mapHref)
      }))
      .filter((entry) => entry.title || entry.detail || entry.mapHref);
  }

  const fallbackVenue = {
    title: normalizeText(organizer?.venueTitle),
    detail: normalizeText(organizer?.venueDetail),
    mapHref: normalizeText(organizer?.venueMapHref)
  };

  return fallbackVenue.title || fallbackVenue.detail || fallbackVenue.mapHref ? [fallbackVenue] : [];
}

function normalizeOrganizerVenuesInput(input = {}) {
  const entries = [];
  const pushEntry = (entry) => {
    const normalized = {
      title: normalizeText(entry?.title),
      detail: normalizeText(entry?.detail),
      mapHref: normalizeText(entry?.mapHref)
    };

    if (!normalized.title && !normalized.detail && !normalized.mapHref) {
      return;
    }

    const duplicate = entries.some(
      (existing) =>
        existing.title === normalized.title &&
        existing.detail === normalized.detail &&
        existing.mapHref === normalized.mapHref
    );

    if (!duplicate) {
      entries.push(normalized);
    }
  };

  pushEntry({
    title: input.venueTitle,
    detail: input.venueDetail,
    mapHref: input.venueMapHref
  });

  const lines = normalizeText(input.venuesText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [title = "", detail = "", mapHref = ""] = line.split("|");
    pushEntry({ title, detail, mapHref });
  }

  return entries;
}

function getPrimaryVenueFromInput(input = {}) {
  const venues = normalizeOrganizerVenuesInput(input);
  return {
    venues,
    primaryVenue: venues[0] || {
      title: "",
      detail: "",
      mapHref: ""
    }
  };
}

function getRegistrationTotals(registrations) {
  const onlineCollected = registrations.reduce(
    (sum, registration) => sum + (registration.onlineCollectedCents || 0),
    0
  );
  const dueAtEvent = registrations.reduce(
    (sum, registration) =>
      sum +
      Math.max(
        0,
        (registration.dueAtEventCents || 0) - (registration.venueCollectedCents || 0)
      ),
    0
  );

  return {
    onlineCollected,
    onlineCollectedLabel: formatCurrencyFromCents(onlineCollected),
    dueAtEvent,
    dueAtEventLabel: formatCurrencyFromCents(dueAtEvent)
  };
}

async function sendPasswordResetTemplateByEmail(prisma, target, organizer = null) {
  const template = await prisma.emailTemplate.findFirst({
    where: {
      slug: "password_reset"
    }
  });

  if (!template || !target?.email) {
    return null;
  }

  const resetUrl = organizer
    ? `${getBaseUrl()}/${organizer.slug}/admin/login/reset/${target.passwordResetToken}`
    : `${getBaseUrl()}/admin/login/reset/${target.passwordResetToken}`;

  return sendTransactionalEmail({
    to: target.email,
    subject: template.subject,
    html: template.bodyHtml,
    replacements: {
      "{{reset_url}}": resetUrl,
      "{{account_name}}": target.name
    }
  });
}

async function appendAuditLog(draft, input) {
  draft.auditLogs.unshift({
    id: createToken(),
    createdAt: asIso(input.createdAt) || new Date().toISOString(),
    actorType: input.actorType,
    actorId: input.actorId || null,
    organizerId: input.organizerId || null,
    registrationId: input.registrationId || null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId || null,
    message: input.message,
    metadata: input.metadata || null
  });
}

function getTemplate(state, slug) {
  return state.emailTemplates.find((template) => template.slug === slug) ?? null;
}

async function sendTemplate(state, slug, to, replacements) {
  const template = getTemplate(state, slug);

  if (!template || !to) {
    return null;
  }

  return sendTransactionalEmail({
    to,
    subject: template.subject,
    html: template.bodyHtml,
    replacements
  });
}

function getOrganizerSupportReplyEmail(siteSettings, organizer) {
  return organizer.publicEmail || organizer.interestEmail || siteSettings?.platformEmail || null;
}

function buildOccurrenceLabelForOrganizer(organizer, occurrence) {
  return formatDateLabel(occurrence.startsAt, organizer.timeZone);
}

function buildCancellationEmailReplacements(siteSettings, organizer, event, occurrence, registration) {
  return {
    "{{registration_code}}": registration.registrationCode || "Pending",
    "{{event_name}}": event.title,
    "{{occurrence_label}}": buildOccurrenceLabelForOrganizer(organizer, occurrence),
    "{{refund_state}}": getRegistrationRefundStateLabel(registration, registration.currency),
    "{{support_reply_email}}":
      getOrganizerSupportReplyEmail(siteSettings, organizer) || siteSettings?.platformEmail || ""
  };
}

async function sendStateRegistrationCancellationEmail(
  state,
  organizer,
  event,
  occurrence,
  registration
) {
  return sendStateTemplateEmail(state, {
    templateSlug: "attendee_registration_cancelled",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: occurrence.id,
    organizerId: organizer.id,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "attendee_registration_cancelled",
      registration.id,
      registration.cancelledAt || registration.updatedAt
    ),
    replyTo: getOrganizerSupportReplyEmail(state.siteSettings, organizer),
    replacements: buildCancellationEmailReplacements(
      state.siteSettings,
      organizer,
      event,
      occurrence,
      registration
    )
  });
}

async function sendStateOccurrenceCancellationEmail(
  state,
  organizer,
  event,
  occurrence,
  registration
) {
  return sendStateTemplateEmail(state, {
    templateSlug: "attendee_occurrence_cancelled",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: occurrence.id,
    organizerId: organizer.id,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "attendee_occurrence_cancelled",
      registration.id,
      occurrence.id
    ),
    replyTo: getOrganizerSupportReplyEmail(state.siteSettings, organizer),
    replacements: {
      "{{event_name}}": event.title,
      "{{occurrence_label}}": buildOccurrenceLabelForOrganizer(organizer, occurrence),
      "{{refund_state}}": getRegistrationRefundStateLabel(registration, registration.currency),
      "{{support_reply_email}}":
        getOrganizerSupportReplyEmail(state.siteSettings, organizer) ||
        state.siteSettings.platformEmail ||
        ""
    }
  });
}

async function sendPrismaRegistrationCancellationEmail(
  prisma,
  siteSettings,
  organizer,
  event,
  occurrence,
  registration
) {
  return sendPrismaTemplateEmail(prisma, {
    templateSlug: "attendee_registration_cancelled",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: occurrence.id,
    organizerId: organizer.id,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "attendee_registration_cancelled",
      registration.id,
      registration.cancelledAt || registration.updatedAt
    ),
    replyTo: getOrganizerSupportReplyEmail(siteSettings, organizer),
    replacements: buildCancellationEmailReplacements(
      siteSettings,
      organizer,
      event,
      occurrence,
      registration
    )
  });
}

async function sendPrismaOccurrenceCancellationEmail(
  prisma,
  siteSettings,
  organizer,
  event,
  occurrence,
  registration
) {
  return sendPrismaTemplateEmail(prisma, {
    templateSlug: "attendee_occurrence_cancelled",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: occurrence.id,
    organizerId: organizer.id,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "attendee_occurrence_cancelled",
      registration.id,
      occurrence.id
    ),
    replyTo: getOrganizerSupportReplyEmail(siteSettings, organizer),
    replacements: {
      "{{event_name}}": event.title,
      "{{occurrence_label}}": buildOccurrenceLabelForOrganizer(organizer, occurrence),
      "{{refund_state}}": getRegistrationRefundStateLabel(registration, registration.currency),
      "{{support_reply_email}}":
        getOrganizerSupportReplyEmail(siteSettings, organizer) || siteSettings?.platformEmail || ""
    }
  });
}

function normalizeMultilineEntries(value) {
  return normalizeText(value)
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeHttpUrl(value) {
  const candidate = normalizeText(value);

  if (!candidate) {
    return "";
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeGalleryEntries(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return [];
  }

  let entries;

  try {
    entries = JSON.parse(normalizedValue);
  } catch {
    entries = normalizeMultilineEntries(normalizedValue).map((imageUrl) => ({
      imageUrl
    }));
  }

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      if (!entry) {
        return null;
      }

      if (typeof entry === "string") {
        const imageUrl = normalizeHttpUrl(entry);
        return imageUrl ? { imageUrl } : null;
      }

      if (typeof entry !== "object") {
        return null;
      }

      const imageUrl = normalizeHttpUrl(entry.imageUrl);
      const title = normalizeText(entry.title);
      const caption = normalizeText(entry.caption);

      if (!imageUrl) {
        return null;
      }

      return {
        ...(imageUrl ? { imageUrl } : {}),
        ...(title ? { title } : {}),
        ...(caption ? { caption } : {})
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function getTimeZoneOffsetMilliseconds(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return (
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    ) - date.getTime()
  );
}

function parseDateTimeInTimeZone(value, timeZone) {
  const match = normalizeText(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const wallClockUtcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  let instant = wallClockUtcGuess;

  for (let step = 0; step < 3; step += 1) {
    const offset = getTimeZoneOffsetMilliseconds(new Date(instant), timeZone);
    const nextInstant = wallClockUtcGuess - offset;

    if (nextInstant === instant) {
      break;
    }

    instant = nextInstant;
  }

  return new Date(instant);
}

function parseRequiredDateTime(value, label, timeZone = "Europe/Rome") {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  const parsed =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
      ? new Date(normalized)
      : parseDateTimeInTimeZone(normalized, timeZone);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date and time.`);
  }

  return parsed;
}

function parseOptionalDateTime(value, label, timeZone = "Europe/Rome") {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return parseRequiredDateTime(normalized, label, timeZone);
}

function buildOrganizerAdminRecord(state, registration) {
  const organizer = getOrganizerById(state, registration.organizerId);
  const event = getEventById(state, registration.eventTypeId);
  const occurrence = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategory = getTicketCategoryById(state, registration.ticketCategoryId);
  const payments = getRegistrationPayments(state, registration.id);
  const attendees = getRegistrationAttendees(registration);
  const dietary = summarizeDietaryNeeds([registration]);

  return {
    id: registration.id,
    registrationCode: registration.registrationCode || "Pending",
    status: registration.status,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    attendeePhone: registration.attendeePhone,
    registrationLocale: registration.registrationLocale || "en",
    attendees: attendees.map((attendee) => ({
      ...attendee,
      fullName: [attendee.firstName, attendee.lastName].filter(Boolean).join(" "),
      dietaryFlagLabels: (Array.isArray(attendee.dietaryFlags) ? attendee.dietaryFlags : []).map((flag) =>
        getDietaryFlagLabel(flag)
      )
    })),
    dietary,
    quantityLabel: pluralize(registration.quantity, "attendee"),
    eventSlug: event?.slug || "",
    eventTitle: event?.title || "Unknown event",
    occurrenceLabel: occurrence
      ? formatDateLabel(occurrence.startsAt, organizer?.timeZone || "Europe/Rome")
      : "Unknown date",
    occurrenceTime: occurrence
      ? formatOccurrenceTimeRange(
          occurrence.startsAt,
          occurrence.endsAt,
          organizer?.timeZone || "Europe/Rome"
        )
      : "",
    onlineCollectedLabel: formatCurrencyFromCents(registration.onlineCollectedCents),
    dueAtEventOpenLabel: formatCurrencyFromCents(
      Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents)
    ),
    ticketLabel: ticketCategory?.name || "General admission",
    createdAtLabel: formatDateTimeLabel(
      registration.createdAt,
      organizer?.timeZone || "Europe/Rome"
    ),
    paymentCount: payments.length
  };
}

function getRegistrationActionOptions(registration) {
  const actions = [];

  if (["CONFIRMED_UNPAID", "CONFIRMED_PARTIALLY_PAID", "CONFIRMED_PAID"].includes(registration.status)) {
    actions.push("mark_attended", "mark_no_show", "cancel");
  }

  if (registration.status === "PENDING_PAYMENT") {
    actions.push("mark_paid", "cancel");
  }

  return actions;
}

export async function markAdminLogin(scope, userId) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const now = new Date();

    if (scope === "platform") {
      await prisma.platformAdminUser.updateMany({
        where: {
          id: userId
        },
        data: {
          lastLoginAt: now,
          updatedAt: now
        }
      });

      return;
    }

    await prisma.organizerAdminUser.updateMany({
      where: {
        id: userId
      },
      data: {
        lastLoginAt: now,
        updatedAt: now
      }
    });

    return;
  }

  await mutatePersistentState(async (draft) => {
    const collection = scope === "platform" ? draft.platformAdmins : draft.organizerAdmins;
    const admin = collection.find((entry) => entry.id === userId);

    if (admin) {
      admin.lastLoginAt = new Date().toISOString();
      admin.updatedAt = new Date().toISOString();
    }
  });
}

const getPlatformOverviewCached = cache(async function getPlatformOverviewCached() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const now = new Date();

    const [
      supportSettings,
      organizerCount,
      eventCount,
      occurrenceCount,
      activeRegistrations,
      openRequestsCount,
      templateCount,
      registrationRows
    ] = await Promise.all([
      prisma.siteSettings.findUnique({
        where: {
          id: "site-settings"
        }
      }),
      prisma.organizer.count({
        where: {
          status: "ACTIVE"
        }
      }),
      prisma.eventType.count({
        where: {
          visibility: "PUBLIC"
        }
      }),
      prisma.eventOccurrence.count({
        where: {
          published: true
        }
      }),
      prisma.registration.count({
        where: getActiveRegistrationWhere(now)
      }),
      prisma.organizerJoinRequest.count({
        where: {
          status: "PENDING"
        }
      }),
      prisma.emailTemplate.count(),
      prisma.registration.findMany({
        select: {
          status: true,
          onlineCollectedCents: true,
          dueAtEventCents: true,
          venueCollectedCents: true
        }
      })
    ]);

    const totals = getRegistrationTotals(registrationRows);
    const pendingPayments = registrationRows.filter(
      (registration) => registration.status === "PENDING_PAYMENT"
    ).length;

    return {
      supportEmail: supportSettings?.platformEmail || "",
      releaseLabel: "Production admin",
      summary: {
        organizerCount,
        eventCount,
        occurrenceCount,
        activeRegistrations,
        openRequestsCount,
        templateCount,
        onlineCollectedLabel: totals.onlineCollectedLabel,
        dueAtEventLabel: totals.dueAtEventLabel,
        stripeModeLabel:
          getStripeEnvironmentState().mode === "live" ? "Connect enabled" : "Preview mode",
        inboxStorageLabel: getStorageSummary().label
      },
      attentionQueue: [
        {
          title: `${openRequestsCount} organizer requests waiting`,
          detail: "Approve queued organizers or create new organizer accounts directly from platform admin.",
          href: "/admin/organizers",
          cta: "Open organizer queue"
        },
        {
          title: `${pendingPayments} registrations need payment follow-up`,
          detail: "Pending payment registrations stay visible so the team can support organizers quickly.",
          href: "/admin/logs",
          cta: "Review recent activity"
        },
        {
          title: getStorageSummary().label,
          detail: getStorageSummary().detail,
          href: "/admin/health",
          cta: "Check environment"
        }
      ],
      releaseTracks: [
        {
          title: "Organizer onboarding",
          detail: "Manual organizer approval with primary admin bootstrapping and reset links."
        },
        {
          title: "Content and settings",
          detail: "Editable site settings, about-page content, and email templates."
        },
        {
          title: "Ops and payments",
          detail: "Registration, payment, and audit activity are stored durably."
        }
      ]
    };
  }

  const state = await loadPersistentState();
  const activeOrganizers = state.organizers.filter((organizer) => organizer.status === "ACTIVE");
  const publishedEvents = state.events.filter((event) => event.visibility === "PUBLIC");
  const publishedOccurrences = state.occurrences.filter((occurrence) => occurrence.published);
  const activeRegistrations = state.registrations.filter(
    (registration) =>
      !isPendingConfirmExpired(registration) &&
      !isPendingPaymentExpired(registration) &&
      registration.status !== "CANCELLED"
  );
  const onlineCollected = state.registrations.reduce(
    (sum, registration) => sum + registration.onlineCollectedCents,
    0
  );
  const dueAtEvent = state.registrations.reduce(
    (sum, registration) =>
      sum + Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents),
    0
  );

  return {
    supportEmail: state.siteSettings.platformEmail,
    releaseLabel: "Production admin",
    summary: {
      organizerCount: activeOrganizers.length,
      eventCount: publishedEvents.length,
      occurrenceCount: publishedOccurrences.length,
      activeRegistrations: activeRegistrations.length,
      openRequestsCount: state.joinRequests.filter((request) => request.status === "PENDING").length,
      templateCount: state.emailTemplates.length,
      onlineCollectedLabel: formatCurrencyFromCents(onlineCollected),
      dueAtEventLabel: formatCurrencyFromCents(dueAtEvent),
      inboxStorageLabel: getStorageSummary().label,
      stripeModeLabel:
        getStripeEnvironmentState().mode === "live" ? "Connect enabled" : "Preview mode"
    },
    attentionQueue: [
      {
        title: `${state.joinRequests.filter((request) => request.status === "PENDING").length} organizer requests waiting`,
        detail: "Approve queued organizers or create new organizer accounts directly from platform admin.",
        href: "/admin/organizers",
        cta: "Open organizer queue"
      },
      {
        title: `${activeRegistrations.filter((registration) => registration.status === "PENDING_PAYMENT").length} registrations need payment follow-up`,
        detail: "Pending payment registrations stay visible so the team can support organizers quickly.",
        href: "/admin/logs",
        cta: "Review recent activity"
      },
      {
        title: getStorageSummary().label,
        detail: getStorageSummary().detail,
        href: "/admin/health",
        cta: "Check environment"
      }
    ],
    releaseTracks: [
      {
        title: "Organizer onboarding",
        detail: "Manual organizer approval with primary admin bootstrapping and reset links."
      },
      {
        title: "Content and settings",
        detail: "Editable site settings, about-page content, and email templates."
      },
      {
        title: "Ops and payments",
        detail: "Registration, payment, and audit activity are stored durably."
      }
    ]
  };
});

export async function getPlatformOverview() {
  return getPlatformOverviewCached();
}

export async function getPlatformHealth() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const stripe = getStripeEnvironmentState();
    const storage = getStorageSummary();
    const emailConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
    const [organizerCount, eventCount, occurrenceCount, registrationCount, recentFailures] = await Promise.all([
      prisma.organizer.count(),
      prisma.eventType.count(),
      prisma.eventOccurrence.count(),
      prisma.registration.count(),
      prisma.emailDeliveryLog.findMany({
        where: {
          deliveryStatus: "FAILED"
        },
        orderBy: {
          sentAt: "desc"
        },
        take: 5
      })
    ]);

    return {
      metrics: [
        {
          label: "Organizers",
          value: String(organizerCount)
        },
        {
          label: "Events",
          value: String(eventCount)
        },
        {
          label: "Occurrences",
          value: String(occurrenceCount)
        },
        {
          label: "Registrations",
          value: String(registrationCount)
        }
      ],
      checks: [
        {
          title: "Persistence",
          statusLabel: storage.label,
          statusTone: storage.mode === "database" ? "public" : "capacity-watch",
          detail: storage.detail
        },
        {
          title: "Stripe",
          statusLabel: stripe.mode === "live" ? "Live" : "Preview",
          statusTone: stripe.mode === "live" ? "public" : "capacity-watch",
          detail:
            stripe.mode === "live"
              ? "Stripe Connect can onboard organizers and create direct-charge Checkout sessions in this environment."
              : "Checkout stays in preview mode here until Stripe Connect credentials are configured."
        },
        {
          title: "Email delivery",
          statusLabel: emailConfigured ? "Configured" : "Log only",
          statusTone: emailConfigured ? "public" : "capacity-watch",
          detail:
            emailConfigured
              ? "Transactional email is ready through Resend."
              : "Email is logged locally until Resend is configured."
        },
        {
          title: "Inbound email",
          statusLabel: "Not implemented",
          statusTone: "capacity-watch",
          detail:
            "Organizer requests and delivery logs are visible in the back office, but incoming mailbox handling is not implemented in this release."
        }
      ],
      email: {
        outboundModeLabel: emailConfigured ? "Resend configured" : "Log only",
        outboundConfigured: emailConfigured,
        inboundSupported: false,
        recentFailureCount: recentFailures.length,
        recentFailures: recentFailures.map((entry) => ({
          id: entry.id,
          recipientEmail: entry.recipientEmail,
          templateSlug: entry.templateSlug,
          deliveryStatus: entry.deliveryStatus,
          statusTone: getDeliveryStatusTone(entry.deliveryStatus),
          sentAt: entry.sentAt.toISOString()
        }))
      },
      risks: [
        {
          title: "Production still needs owner-managed secrets",
          detail:
            "Domain, Postgres, Stripe Connect secrets, and Resend still need to be connected by the owner account before launch."
        },
        {
          title: "Inbound email remains out of scope",
          detail:
            "Replies from attendees or organizers are not ingested into Passreserve yet, so operational follow-up still depends on normal mailboxes."
        }
      ]
    };
  }

  const state = await loadPersistentState();
  const stripe = getStripeEnvironmentState();
  const storage = getStorageSummary();
  const emailConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const recentFailures = getEmailDeliveries(state, 5).filter(
    (entry) => entry.deliveryStatus === "FAILED"
  );

  return {
    metrics: [
      {
        label: "Organizers",
        value: String(state.organizers.length)
      },
      {
        label: "Events",
        value: String(state.events.length)
      },
      {
        label: "Occurrences",
        value: String(state.occurrences.length)
      },
      {
        label: "Registrations",
        value: String(state.registrations.length)
      }
    ],
    checks: [
      {
        title: "Persistence",
        statusLabel: storage.label,
        statusTone: storage.mode === "database" ? "public" : "capacity-watch",
        detail: storage.detail
      },
      {
        title: "Stripe",
        statusLabel: stripe.mode === "live" ? "Live" : "Preview",
        statusTone: stripe.mode === "live" ? "public" : "capacity-watch",
        detail:
          stripe.mode === "live"
            ? "Stripe Connect can onboard organizers and create direct-charge Checkout sessions in this environment."
            : "Checkout stays in preview mode here until Stripe Connect credentials are configured."
      },
      {
        title: "Email delivery",
        statusLabel: emailConfigured ? "Configured" : "Log only",
        statusTone: emailConfigured ? "public" : "capacity-watch",
        detail:
          emailConfigured
            ? "Transactional email is ready through Resend."
            : "Email is logged locally until Resend is configured."
      },
      {
        title: "Inbound email",
        statusLabel: "Not implemented",
        statusTone: "capacity-watch",
        detail:
          "Organizer requests and delivery logs are visible in the back office, but incoming mailbox handling is not implemented in this release."
      }
    ],
    email: {
      outboundModeLabel: emailConfigured ? "Resend configured" : "Log only",
      outboundConfigured: emailConfigured,
      inboundSupported: false,
      recentFailureCount: recentFailures.length,
      recentFailures: recentFailures.map((entry) => ({
        id: entry.id,
        recipientEmail: entry.recipientEmail,
        templateSlug: entry.templateSlug,
        deliveryStatus: entry.deliveryStatus,
        statusTone: getDeliveryStatusTone(entry.deliveryStatus),
        sentAt: entry.sentAt || entry.createdAt
      }))
    },
    risks: [
      {
        title: "Production still needs owner-managed secrets",
        detail:
          "Domain, Postgres, Stripe Connect secrets, and Resend still need to be connected by the owner account before launch."
      },
      {
        title: "Inbound email remains out of scope",
        detail:
          "Replies from attendees or organizers are not ingested into Passreserve yet, so operational follow-up still depends on normal mailboxes."
      }
    ]
  };
}

export async function getPlatformOrganizers() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const now = Date.now();
    const organizers = await prisma.organizer.findMany({
      orderBy: {
        name: "asc"
      },
      include: {
        events: {
          select: {
            id: true,
            title: true,
            visibility: true,
            occurrences: {
              select: {
                id: true,
                startsAt: true,
                published: true
              }
            }
          }
        },
        registrations: {
          select: {
            status: true,
            expiresAt: true,
            onlineCollectedCents: true,
            dueAtEventCents: true,
            venueCollectedCents: true
          }
        }
      }
    });

    return organizers.map((organizer) => {
      const activeRegistrations = organizer.registrations.filter((registration) => {
        if (["CANCELLED", "NO_SHOW"].includes(registration.status)) {
          return false;
        }

        if (registration.status === "PENDING_CONFIRM" || registration.status === "PENDING_PAYMENT") {
          return !registration.expiresAt || registration.expiresAt.getTime() > now;
        }

        return true;
      });
      const totals = getRegistrationTotals(organizer.registrations);
      const publishedOccurrences = organizer.events.flatMap((event) =>
        event.occurrences.filter((occurrence) => occurrence.published)
      ).length;
      const pendingPayments = organizer.registrations.filter(
        (registration) => registration.status === "PENDING_PAYMENT"
      ).length;

      return {
        ...organizer,
        ...buildOrganizerLinks(organizer),
        venues: getOrganizerVenueRecords(organizer),
        summary: {
          activeCount: activeRegistrations.length,
          onlineCollected: totals.onlineCollected,
          onlineCollectedLabel: totals.onlineCollectedLabel,
          dueAtEvent: totals.dueAtEvent,
          dueAtEventLabel: totals.dueAtEventLabel,
          pendingPayments
        },
        metrics: {
          eventCount: organizer.events.length,
          publishedEvents: organizer.events.filter((event) => event.visibility === "PUBLIC").length,
          publishedOccurrences
        },
        launchStatusLabel: organizer.status === "ACTIVE" ? "Active" : organizer.status,
        launchStatusTone: organizer.status === "ACTIVE" ? "public" : "capacity-watch",
        healthLabel: pendingPayments > 0 ? "Needs payment follow-up" : "Healthy",
        healthTone: pendingPayments > 0 ? "capacity-watch" : "public",
        featuredEventTitle: organizer.events[0]?.title || "No events yet",
        detailHref: `/admin/organizers/${organizer.slug}`
      };
    });
  }

  const state = await loadPersistentState();

  return state.organizers
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((organizer) => {
      const summary = getOrganizerSummary(state, organizer);
      const events = getOrganizerEvents(state, organizer.id);

      return {
        ...organizer,
        ...buildOrganizerLinks(organizer),
        summary,
        metrics: {
          eventCount: events.length,
          publishedEvents: events.filter((event) => event.visibility === "PUBLIC").length,
          publishedOccurrences: events.flatMap((event) => getEventOccurrences(state, event.id))
            .length
        },
        launchStatusLabel: organizer.status === "ACTIVE" ? "Active" : organizer.status,
        launchStatusTone: organizer.status === "ACTIVE" ? "public" : "capacity-watch",
        healthLabel: summary.pendingPayments > 0 ? "Needs payment follow-up" : "Healthy",
        healthTone: summary.pendingPayments > 0 ? "capacity-watch" : "public",
        featuredEventTitle: events[0]?.title || "No events yet",
        detailHref: `/admin/organizers/${organizer.slug}`
      };
    });
}

export async function listOrganizerRequests() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const requests = await prisma.organizerJoinRequest.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return requests.map((request) => ({
      ...request,
      statusLabel:
        request.status === "APPROVED"
          ? "Approved"
          : request.status === "REJECTED"
            ? "Rejected"
            : request.status === "ARCHIVED"
              ? "Archived"
              : "Needs reply",
      statusTone:
        request.status === "APPROVED"
          ? "public"
          : request.status === "REJECTED"
            ? "unlisted"
            : request.status === "ARCHIVED"
              ? "unlisted"
              : "capacity-watch"
    }));
  }

  const state = await loadPersistentState();

  return state.joinRequests
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((request) => ({
      ...request,
      statusLabel:
        request.status === "APPROVED"
          ? "Approved"
          : request.status === "REJECTED"
            ? "Rejected"
            : request.status === "ARCHIVED"
              ? "Archived"
              : "Needs reply",
      statusTone:
        request.status === "APPROVED"
          ? "public"
          : request.status === "REJECTED"
            ? "unlisted"
            : request.status === "ARCHIVED"
              ? "unlisted"
              : "capacity-watch"
    }));
}

export async function getPlatformOrganizerDetail(slug) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    applyOrganizerPaymentDefaults(organizer);

    const [admins, events, registrations, recentJoinRequest] = await Promise.all([
      prisma.organizerAdminUser.findMany({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          createdAt: "asc"
        }
      }),
      prisma.eventType.findMany({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          title: "asc"
        },
        include: {
          occurrences: {
            select: {
              id: true
            }
          }
        }
      }),
      prisma.registration.findMany({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 10,
        include: {
          eventType: {
            select: {
              title: true
            }
          },
          occurrence: {
            select: {
              startsAt: true,
              endsAt: true
            }
          },
          ticketCategory: {
            select: {
              name: true
            }
          },
          payments: {
            select: {
              id: true
            }
          }
        }
      }),
      prisma.organizerJoinRequest.findFirst({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    ]);

    const allRegistrationTotals = await prisma.registration.findMany({
      where: {
        organizerId: organizer.id
      },
      select: {
        status: true,
        expiresAt: true,
        onlineCollectedCents: true,
        dueAtEventCents: true,
        venueCollectedCents: true
      }
    });
    const activeRegistrations = allRegistrationTotals.filter((registration) => {
      if (["CANCELLED", "NO_SHOW"].includes(registration.status)) {
        return false;
      }

      if (registration.status === "PENDING_CONFIRM" || registration.status === "PENDING_PAYMENT") {
        return !registration.expiresAt || registration.expiresAt.getTime() > Date.now();
      }

      return true;
    });
    const totals = getRegistrationTotals(allRegistrationTotals);
    const upcomingOccurrences = await prisma.eventOccurrence.count({
      where: {
        eventType: {
          organizerId: organizer.id
        },
        startsAt: {
          gt: new Date()
        }
      }
    });
    const billing = buildOrganizerBillingSnapshot(organizer, organizer.timeZone);

    return {
      organizer: {
        ...organizer,
        venues: getOrganizerVenueRecords(organizer),
        ...buildOrganizerLinks(organizer),
        summary: {
          activeCount: activeRegistrations.length,
          onlineCollected: totals.onlineCollected,
          onlineCollectedLabel: totals.onlineCollectedLabel,
          dueAtEvent: totals.dueAtEvent,
          dueAtEventLabel: totals.dueAtEventLabel,
          upcomingOccurrences
        },
        billing
      },
      admins,
      events: events.map((event) => ({
        ...event,
        occurrenceCount: event.occurrences.length
      })),
      recentRegistrations: registrations.map((registration) => ({
        id: registration.id,
        registrationCode: registration.registrationCode || "Pending",
        status: registration.status,
        attendeeName: registration.attendeeName,
        attendeeEmail: registration.attendeeEmail,
        quantityLabel: pluralize(registration.quantity, "attendee"),
        eventTitle: registration.eventType?.title || "Unknown event",
        occurrenceLabel: registration.occurrence
          ? formatDateLabel(registration.occurrence.startsAt, organizer.timeZone)
          : "Unknown date",
        occurrenceTime: registration.occurrence
          ? formatOccurrenceTimeRange(
              registration.occurrence.startsAt,
              registration.occurrence.endsAt,
              organizer.timeZone
            )
          : "",
        onlineCollectedLabel: formatCurrencyFromCents(registration.onlineCollectedCents),
        dueAtEventOpenLabel: formatCurrencyFromCents(
          Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents)
        ),
        ticketLabel: registration.ticketCategory?.name || "General admission",
        createdAtLabel: formatDateTimeLabel(registration.createdAt, organizer.timeZone),
        paymentCount: registration.payments.length
      })),
      recentJoinRequest
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const summary = getOrganizerSummary(state, organizer);
  const admins = state.organizerAdmins.filter((admin) => admin.organizerId === organizer.id);
  const events = getOrganizerEvents(state, organizer.id);
  const recentRegistrations = getOrganizerRegistrations(state, organizer.id)
    .slice(0, 10)
    .map((registration) => buildOrganizerAdminRecord(state, registration));
  const recentJoinRequest = state.joinRequests.find((request) => request.organizerId === organizer.id);
  const billing = buildOrganizerBillingSnapshot(organizer, organizer.timeZone);

  return {
    organizer: {
      ...organizer,
      venues: getOrganizerVenueRecords(organizer),
      ...buildOrganizerLinks(organizer),
      summary,
      billing
    },
    admins,
    events: events.map((event) => ({
      ...event,
      occurrenceCount: getEventOccurrences(state, event.id).length
    })),
    recentRegistrations,
    recentJoinRequest
  };
}

export async function getEditablePlatformContent() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const [siteSettings, aboutPage, emailTemplates] = await Promise.all([
      prisma.siteSettings.findUnique({
        where: {
          id: "site-settings"
        }
      }),
      prisma.aboutPageContent.findUnique({
        where: {
          id: "about-page"
        }
      }),
      prisma.emailTemplate.findMany({
        orderBy: {
          slug: "asc"
        }
      })
    ]);

    return {
      siteSettings,
      aboutPage,
      emailTemplates
    };
  }

  const state = await loadPersistentState();

  return {
    siteSettings: state.siteSettings,
    aboutPage: state.aboutPage,
    emailTemplates: state.emailTemplates
  };
}

export async function getPlatformEmailConsole() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const [emailTemplates, deliveryLogs, inbox] = await Promise.all([
      prisma.emailTemplate.findMany({
        orderBy: {
          slug: "asc"
        }
      }),
      prisma.emailDeliveryLog.findMany({
        orderBy: {
          sentAt: "desc"
        },
        take: 50
      }),
      listOrganizerRequests()
    ]);

    return {
      outboundConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      inboundSupported: false,
      emailTemplates,
      deliveryLogs: deliveryLogs.map((entry) => ({
        id: entry.id,
        recipientEmail: entry.recipientEmail,
        templateSlug: entry.templateSlug,
        deliveryStatus: entry.deliveryStatus,
        statusTone: getDeliveryStatusTone(entry.deliveryStatus),
        sentAt: entry.sentAt.toISOString(),
        metadata: entry.metadata
      })),
      inbox,
      inboxOpenCount: inbox.filter((request) => request.status === "PENDING").length
    };
  }

  const state = await loadPersistentState();
  const inbox = await listOrganizerRequests();

  return {
    outboundConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    inboundSupported: false,
    emailTemplates: state.emailTemplates,
    deliveryLogs: getEmailDeliveries(state).map((entry) => ({
      ...entry,
      statusTone: getDeliveryStatusTone(entry.deliveryStatus)
    })),
    inbox,
    inboxOpenCount: inbox.filter((request) => request.status === "PENDING").length
  };
}

export async function getOrganizerShell(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    const summary = getOrganizerSummary(state, organizer);
    const totalUpcomingOccurrences = getOrganizerEvents(state, organizer.id).flatMap((event) =>
      getEventOccurrences(state, event.id).filter(
        (occurrence) => new Date(occurrence.startsAt).getTime() > Date.now()
      )
    ).length;

    return {
      organizer: {
        ...organizer,
        venues: getOrganizerVenueRecords(organizer),
        ...buildOrganizerLinks(organizer),
        summary,
        billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
        totalUpcomingOccurrences,
        supportEmail: organizer.publicEmail
      }
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer: {
      ...organizer,
      venues: getOrganizerVenueRecords(organizer),
      ...buildOrganizerLinks(organizer),
      summary: getOrganizerSummary(state, organizer),
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      totalUpcomingOccurrences: getOrganizerEvents(state, organizer.id).flatMap((event) =>
        getEventOccurrences(state, event.id).filter(
          (occurrence) => new Date(occurrence.startsAt).getTime() > Date.now()
        )
      ).length,
      supportEmail: organizer.publicEmail
    }
  };
}

export async function getOrganizerDashboard(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    const summary = getOrganizerSummary(state, organizer);
    const upcomingOccurrences = getOrganizerEvents(state, organizer.id)
      .flatMap((event) =>
        getEventOccurrences(state, event.id).map((occurrence) => ({
          occurrence,
          event
        }))
      )
      .filter((entry) => new Date(entry.occurrence.startsAt).getTime() > Date.now())
      .sort((left, right) => left.occurrence.startsAt.localeCompare(right.occurrence.startsAt))
      .slice(0, 8)
      .map((entry) => ({
        id: entry.occurrence.id,
        eventTitle: entry.event.title,
        dateLabel: formatDateLabel(entry.occurrence.startsAt, organizer.timeZone),
        timeLabel: formatOccurrenceTimeRange(
          entry.occurrence.startsAt,
          entry.occurrence.endsAt,
          organizer.timeZone
        ),
        capacity: getOccurrenceCapacitySummary(state, entry.occurrence)
      }));
    const recentRegistrations = getOrganizerRegistrations(state, organizer.id)
      .slice(0, 8)
      .map((registration) => ({
        ...buildOrganizerAdminRecord(state, registration),
        actions: getRegistrationActionOptions(registration)
      }));

    return {
      organizer,
      summary,
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      upcomingOccurrences,
      recentRegistrations
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const summary = getOrganizerSummary(state, organizer);
  const upcomingOccurrences = getOrganizerEvents(state, organizer.id)
    .flatMap((event) =>
      getEventOccurrences(state, event.id).map((occurrence) => ({
        occurrence,
        event
      }))
    )
    .filter((entry) => new Date(entry.occurrence.startsAt).getTime() > Date.now())
    .sort((left, right) => left.occurrence.startsAt.localeCompare(right.occurrence.startsAt))
    .slice(0, 8)
    .map((entry) => ({
      id: entry.occurrence.id,
      eventTitle: entry.event.title,
      dateLabel: formatDateLabel(entry.occurrence.startsAt, organizer.timeZone),
      timeLabel: formatOccurrenceTimeRange(
        entry.occurrence.startsAt,
        entry.occurrence.endsAt,
        organizer.timeZone
      ),
      capacity: getOccurrenceCapacitySummary(state, entry.occurrence)
    }));
  const recentRegistrations = getOrganizerRegistrations(state, organizer.id)
    .slice(0, 8)
    .map((registration) => ({
      ...buildOrganizerAdminRecord(state, registration),
      actions: getRegistrationActionOptions(registration)
    }));

  return {
    organizer,
    summary,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    upcomingOccurrences,
    recentRegistrations
  };
}

export async function getOrganizerCalendar(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    const entries = getOrganizerEvents(state, organizer.id)
      .flatMap((event) =>
        getEventOccurrences(state, event.id).map((occurrence) => ({
          id: occurrence.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          startsAt: occurrence.startsAt,
          dateLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
          timeLabel: formatOccurrenceTimeRange(
            occurrence.startsAt,
            occurrence.endsAt,
            organizer.timeZone
          ),
          published: occurrence.published,
          status: occurrence.status,
          capacity: getOccurrenceCapacitySummary(state, occurrence)
        }))
      )
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

    return {
      organizer,
      entries
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const entries = getOrganizerEvents(state, organizer.id)
    .flatMap((event) =>
      getEventOccurrences(state, event.id).map((occurrence) => ({
        id: occurrence.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        startsAt: occurrence.startsAt,
        dateLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
        timeLabel: formatOccurrenceTimeRange(
          occurrence.startsAt,
          occurrence.endsAt,
          organizer.timeZone
        ),
        published: occurrence.published,
        status: occurrence.status,
        capacity: getOccurrenceCapacitySummary(state, occurrence)
      }))
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  return {
    organizer,
    entries
  };
}

export async function getOrganizerEventsAdmin(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    return {
      organizer,
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      events: getOrganizerEvents(state, organizer.id).map((event) => ({
        ...event,
        basePriceLabel: formatCurrencyFromCents(event.basePriceCents),
        salesWindowStartsAtLabel: event.salesWindowStartsAt
          ? formatDateTimeLabel(event.salesWindowStartsAt, organizer.timeZone)
          : "Use organizer defaults",
        salesWindowEndsAtLabel: event.salesWindowEndsAt
          ? formatDateTimeLabel(event.salesWindowEndsAt, organizer.timeZone)
          : "Use organizer defaults",
        occurrenceCount: getEventOccurrences(state, event.id).length,
        publishedOccurrenceCount: getEventOccurrences(state, event.id).filter(
          (occurrence) => occurrence.published
        ).length,
        registrationCount: getOrganizerRegistrations(state, organizer.id).filter(
          (registration) => registration.eventTypeId === event.id
        ).length
      }))
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    events: getOrganizerEvents(state, organizer.id).map((event) => ({
      ...event,
      basePriceLabel: formatCurrencyFromCents(event.basePriceCents),
      salesWindowStartsAtLabel: event.salesWindowStartsAt
        ? formatDateTimeLabel(event.salesWindowStartsAt, organizer.timeZone)
        : "Use organizer defaults",
      salesWindowEndsAtLabel: event.salesWindowEndsAt
        ? formatDateTimeLabel(event.salesWindowEndsAt, organizer.timeZone)
        : "Use organizer defaults",
      occurrenceCount: getEventOccurrences(state, event.id).length,
      publishedOccurrenceCount: getEventOccurrences(state, event.id).filter(
        (occurrence) => occurrence.published
      ).length,
      registrationCount: getOrganizerRegistrations(state, organizer.id).filter(
        (registration) => registration.eventTypeId === event.id
      ).length
    }))
  };
}

export async function getOrganizerOccurrencesAdmin(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    return {
      organizer,
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      events: getOrganizerEvents(state, organizer.id),
      occurrences: getOrganizerEvents(state, organizer.id)
        .flatMap((event) =>
          getEventOccurrences(state, event.id).map((occurrence) => ({
            ...occurrence,
            eventSlug: event.slug,
            eventTitle: event.title,
            usesOnlinePayments: isOccurrenceUsingOnlinePayments(occurrence),
            capacitySummary: getOccurrenceCapacitySummary(state, occurrence),
            salesWindowStartsAtLabel: occurrence.salesWindowStartsAt
              ? formatDateTimeLabel(occurrence.salesWindowStartsAt, organizer.timeZone)
              : event.salesWindowStartsAt
                ? `Event default · ${formatDateTimeLabel(event.salesWindowStartsAt, organizer.timeZone)}`
                : "Event default",
            salesWindowEndsAtLabel: occurrence.salesWindowEndsAt
              ? formatDateTimeLabel(occurrence.salesWindowEndsAt, organizer.timeZone)
              : event.salesWindowEndsAt
                ? `Event default · ${formatDateTimeLabel(event.salesWindowEndsAt, organizer.timeZone)}`
                : "Event default",
            startsAtLabel: formatDateTimeLabel(occurrence.startsAt, organizer.timeZone),
            endsAtLabel: formatDateTimeLabel(occurrence.endsAt, organizer.timeZone)
          }))
        )
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    events: getOrganizerEvents(state, organizer.id),
    occurrences: getOrganizerEvents(state, organizer.id)
      .flatMap((event) =>
        getEventOccurrences(state, event.id).map((occurrence) => ({
          ...occurrence,
          eventSlug: event.slug,
          eventTitle: event.title,
          usesOnlinePayments: isOccurrenceUsingOnlinePayments(occurrence),
          capacitySummary: getOccurrenceCapacitySummary(state, occurrence),
          salesWindowStartsAtLabel: occurrence.salesWindowStartsAt
            ? formatDateTimeLabel(occurrence.salesWindowStartsAt, organizer.timeZone)
            : event.salesWindowStartsAt
              ? `Event default · ${formatDateTimeLabel(event.salesWindowStartsAt, organizer.timeZone)}`
              : "Event default",
          salesWindowEndsAtLabel: occurrence.salesWindowEndsAt
            ? formatDateTimeLabel(occurrence.salesWindowEndsAt, organizer.timeZone)
            : event.salesWindowEndsAt
              ? `Event default · ${formatDateTimeLabel(event.salesWindowEndsAt, organizer.timeZone)}`
              : "Event default",
          startsAtLabel: formatDateTimeLabel(occurrence.startsAt, organizer.timeZone),
          endsAtLabel: formatDateTimeLabel(occurrence.endsAt, organizer.timeZone)
        }))
      )
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  };
}

export async function getOrganizerRegistrationsAdmin(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    return {
      organizer,
      registrations: getOrganizerRegistrations(state, organizer.id).map((registration) => {
        const ledger = getRegistrationPayments(state, registration.id).slice(0, 5);

        return {
          ...buildOrganizerAdminRecord(state, registration),
          actions: getRegistrationActionOptions(registration),
          venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
          dueAtEventOpenCents: Math.max(
            0,
            registration.dueAtEventCents - registration.venueCollectedCents
          ),
          ledger: ledger.map((payment) => ({
            id: payment.id,
            note: payment.note,
            provider: payment.provider,
            kind: payment.kind,
            status: payment.status,
            amountLabel:
              payment.kind === "REFUND"
                ? `-${formatCurrencyFromCents(payment.amountCents)}`
                : formatCurrencyFromCents(payment.amountCents),
            occurredAtLabel: formatDateTimeLabel(payment.occurredAt, organizer.timeZone),
            stripeAccountId: payment.stripeAccountId || null
          }))
        };
      })
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    registrations: getOrganizerRegistrations(state, organizer.id).map((registration) => {
      const ledger = getRegistrationPayments(state, registration.id).slice(0, 5);

      return {
        ...buildOrganizerAdminRecord(state, registration),
        actions: getRegistrationActionOptions(registration),
        venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
        dueAtEventOpenCents: Math.max(
          0,
          registration.dueAtEventCents - registration.venueCollectedCents
        ),
        ledger: ledger.map((payment) => ({
          id: payment.id,
          note: payment.note,
          provider: payment.provider,
          kind: payment.kind,
          status: payment.status,
          amountLabel:
            payment.kind === "REFUND"
              ? `-${formatCurrencyFromCents(payment.amountCents)}`
              : formatCurrencyFromCents(payment.amountCents),
          occurredAtLabel: formatDateTimeLabel(payment.occurredAt, organizer.timeZone),
          stripeAccountId: payment.stripeAccountId || null
        }))
      };
    })
  };
}

export async function getOrganizerPaymentsAdmin(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    return {
      organizer,
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      payments: getOrganizerRegistrations(state, organizer.id).map((registration) => {
        const record = buildOrganizerAdminRecord(state, registration);

        return {
          ...record,
          venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
          dueAtEventOpenCents: Math.max(
            0,
            registration.dueAtEventCents - registration.venueCollectedCents
          ),
          ledger: getRegistrationPayments(state, registration.id).slice(0, 5).map((payment) => ({
            id: payment.id,
            note: payment.note,
            provider: payment.provider,
            kind: payment.kind,
            status: payment.status,
            amountLabel:
              payment.kind === "REFUND"
                ? `-${formatCurrencyFromCents(payment.amountCents)}`
                : formatCurrencyFromCents(payment.amountCents),
            occurredAtLabel: formatDateTimeLabel(payment.occurredAt, organizer.timeZone),
            stripeAccountId: payment.stripeAccountId || null
          }))
        };
      })
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    payments: getOrganizerRegistrations(state, organizer.id).map((registration) => {
      const record = buildOrganizerAdminRecord(state, registration);

      return {
        ...record,
        venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
        dueAtEventOpenCents: Math.max(
          0,
          registration.dueAtEventCents - registration.venueCollectedCents
        ),
        ledger: getRegistrationPayments(state, registration.id).slice(0, 5).map((payment) => ({
          id: payment.id,
          note: payment.note,
          provider: payment.provider,
          kind: payment.kind,
          status: payment.status,
          amountLabel:
            payment.kind === "REFUND"
              ? `-${formatCurrencyFromCents(payment.amountCents)}`
              : formatCurrencyFromCents(payment.amountCents),
          occurredAtLabel: formatDateTimeLabel(payment.occurredAt, organizer.timeZone),
          stripeAccountId: payment.stripeAccountId || null
        }))
      };
    })
  };
}

export async function getOrganizerBillingAdmin(slug) {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    return {
      organizer: {
        ...organizer,
        ...buildOrganizerLinks(organizer)
      },
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      stripeEnvironment: getStripeEnvironmentState()
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer: {
      ...organizer,
      ...buildOrganizerLinks(organizer)
    },
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    stripeEnvironment: getStripeEnvironmentState()
  };
}

export async function getOrganizerSettingsAdmin(slug) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const [organizer, siteSettings] = await Promise.all([
      prisma.organizer.findUnique({
        where: {
          slug
        }
      }),
      prisma.siteSettings.findUnique({
        where: {
          id: "site-settings"
        }
      })
    ]);

    if (!organizer) {
      return null;
    }

    const primaryAdmin =
      (await prisma.organizerAdminUser.findFirst({
        where: {
          organizerId: organizer.id,
          isPrimary: true
        },
        orderBy: {
          createdAt: "asc"
        }
      })) ||
      (await prisma.organizerAdminUser.findFirst({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          createdAt: "asc"
        }
      })) ||
      null;

    return {
      organizer: {
        ...organizer,
        venues: getOrganizerVenueRecords(organizer),
        ...buildOrganizerLinks(organizer)
      },
      primaryAdmin,
      siteSettings
    };
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const primaryAdmin =
    state.organizerAdmins.find((entry) => entry.organizerId === organizer.id && entry.isPrimary) ||
    state.organizerAdmins.find((entry) => entry.organizerId === organizer.id) ||
    null;

  return {
    organizer: {
      ...organizer,
      venues: getOrganizerVenueRecords(organizer),
      ...buildOrganizerLinks(organizer)
    },
    primaryAdmin,
    siteSettings: state.siteSettings
  };
}

export async function getOrganizerImpersonationTarget(slug) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    const admin =
      (await prisma.organizerAdminUser.findFirst({
        where: {
          organizerId: organizer.id,
          isPrimary: true,
          isActive: true
        },
        orderBy: {
          createdAt: "asc"
        }
      })) ||
      (await prisma.organizerAdminUser.findFirst({
        where: {
          organizerId: organizer.id,
          isActive: true
        },
        orderBy: {
          createdAt: "asc"
        }
      })) ||
      null;

    return admin ? { organizer, admin } : null;
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const admin =
    state.organizerAdmins.find(
      (entry) => entry.organizerId === organizer.id && entry.isPrimary && entry.isActive
    ) ||
    state.organizerAdmins.find((entry) => entry.organizerId === organizer.id && entry.isActive) ||
    null;

  return admin ? { organizer, admin } : null;
}

export async function updateOrganizerSettings(slug, input, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const [currentOrganizer, siteSettings] = await Promise.all([
      prisma.organizer.findUnique({
        where: {
          slug
        }
      }),
      prisma.siteSettings.findUnique({
        where: {
          id: "site-settings"
        }
      })
    ]);

    if (!currentOrganizer) {
      return null;
    }

    const { venues, primaryVenue } = getPrimaryVenueFromInput(input);
    const now = new Date();
    const platformRemindersEnabled = Boolean(siteSettings?.registrationRemindersEnabled);
    const organizer = await prisma.organizer.update({
      where: {
        slug
      },
      data: {
        name: normalizeText(input.name) || currentOrganizer.name,
        tagline: normalizeText(input.tagline),
        description: normalizeText(input.description),
        city: normalizeText(input.city),
        region: normalizeText(input.region),
        publicEmail: normalizeEmail(input.publicEmail) || currentOrganizer.publicEmail,
        publicPhone: normalizeText(input.publicPhone),
        interestEmail: normalizeEmail(input.interestEmail) || currentOrganizer.interestEmail,
        venueTitle: primaryVenue.title,
        venueDetail: primaryVenue.detail,
        venueMapHref: primaryVenue.mapHref,
        venues,
        minAdvanceHours: Math.max(0, Math.round(Number(input.minAdvanceHours || 0))),
        maxAdvanceDays: Math.max(0, Math.round(Number(input.maxAdvanceDays || 0))) || null,
        registrationRemindersEnabled:
          platformRemindersEnabled && Boolean(input.registrationRemindersEnabled),
        registrationReminderLeadHours: normalizeReminderLeadHours(
          input.registrationReminderLeadHours
        ),
        registrationReminderNote: normalizeText(input.registrationReminderNote),
        updatedAt: now
      }
    });

    const primaryAdmin =
      input.adminEmail || input.adminName
        ? await prisma.organizerAdminUser.findFirst({
            where: {
              organizerId: organizer.id,
              isPrimary: true
            },
            orderBy: {
              createdAt: "asc"
            }
          })
        : null;

    if (primaryAdmin) {
      await prisma.organizerAdminUser.update({
        where: {
          id: primaryAdmin.id
        },
        data: {
          email: normalizeEmail(input.adminEmail) || primaryAdmin.email,
          name: normalizeText(input.adminName) || primaryAdmin.name,
          updatedAt: now
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: now,
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: null,
        eventType: "organizer_settings_updated",
        entityType: "organizer",
        entityId: organizer.id,
        message: `Updated organizer settings for ${organizer.name}.`,
        metadata: {
          minAdvanceHours: organizer.minAdvanceHours,
          maxAdvanceDays: organizer.maxAdvanceDays,
          venueCount: venues.length
        }
      }
    });

    return organizer;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    const { venues, primaryVenue } = getPrimaryVenueFromInput(input);

    organizer.name = normalizeText(input.name) || organizer.name;
    organizer.tagline = normalizeText(input.tagline);
    organizer.description = normalizeText(input.description);
    organizer.city = normalizeText(input.city);
    organizer.region = normalizeText(input.region);
    organizer.publicEmail = normalizeEmail(input.publicEmail) || organizer.publicEmail;
    organizer.publicPhone = normalizeText(input.publicPhone);
    organizer.interestEmail = normalizeEmail(input.interestEmail) || organizer.interestEmail;
    organizer.venueTitle = primaryVenue.title;
    organizer.venueDetail = primaryVenue.detail;
    organizer.venueMapHref = primaryVenue.mapHref;
    organizer.venues = venues;
    organizer.minAdvanceHours = Math.max(0, Math.round(Number(input.minAdvanceHours || 0)));
    organizer.maxAdvanceDays = Math.max(0, Math.round(Number(input.maxAdvanceDays || 0))) || null;
    organizer.registrationRemindersEnabled =
      Boolean(draft.siteSettings.registrationRemindersEnabled) &&
      Boolean(input.registrationRemindersEnabled);
    organizer.registrationReminderLeadHours = normalizeReminderLeadHours(
      input.registrationReminderLeadHours
    );
    organizer.registrationReminderNote = normalizeText(input.registrationReminderNote);
    organizer.updatedAt = new Date().toISOString();

    const primaryAdmin =
      draft.organizerAdmins.find((entry) => entry.organizerId === organizer.id && entry.isPrimary) ||
      draft.organizerAdmins.find((entry) => entry.organizerId === organizer.id) ||
      null;

    if (primaryAdmin) {
      primaryAdmin.email = normalizeEmail(input.adminEmail) || primaryAdmin.email;
      primaryAdmin.name = normalizeText(input.adminName) || primaryAdmin.name;
      primaryAdmin.updatedAt = new Date().toISOString();
    }

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_settings_updated",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Updated organizer settings for ${organizer.name}.`,
      metadata: {
        minAdvanceHours: organizer.minAdvanceHours,
        maxAdvanceDays: organizer.maxAdvanceDays,
        venueCount: venues.length
      }
    });

    return organizer;
  });
}

export async function changeOrganizerAdminPassword(
  slug,
  adminUserId,
  currentPassword,
  nextPassword
) {
  if (!currentPassword || !nextPassword || nextPassword.length < 8) {
    return {
      ok: false,
      message: "Use your current password and choose a new password with at least 8 characters."
    };
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const admin = draft.organizerAdmins.find(
      (entry) => entry.id === adminUserId && entry.organizerId === organizer?.id && entry.isActive
    );

    if (!organizer || !admin) {
      return {
        ok: false,
        message: "This organizer admin account could not be verified."
      };
    }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);

    if (!valid) {
      return {
        ok: false,
        message: "The current password did not match this organizer admin account."
      };
    }

    admin.passwordHash = await bcrypt.hash(nextPassword, 10);
    admin.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId: adminUserId,
      organizerId: organizer.id,
      eventType: "organizer_password_changed",
      entityType: "organizer_admin",
      entityId: admin.id,
      message: `Updated the password for organizer admin ${admin.email}.`
    });

    return {
      ok: true
    };
  });
}

export async function setOrganizerAdminPasswordFromPlatform(
  slug,
  adminUserId,
  nextPassword,
  actorId = null
) {
  if (!nextPassword || nextPassword.length < 8) {
    return {
      ok: false,
      message: "Choose a new password with at least 8 characters."
    };
  }

  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return {
        ok: false,
        message: "This organizer could not be found."
      };
    }

    const admin = await prisma.organizerAdminUser.findFirst({
      where: {
        id: adminUserId,
        organizerId: organizer.id
      }
    });

    if (!admin) {
      return {
        ok: false,
        message: "This organizer admin account could not be verified."
      };
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10);
    const now = new Date();

    await prisma.organizerAdminUser.update({
      where: {
        id: admin.id
      },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: now
      }
    });

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: now,
        actorType: "PLATFORM_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: null,
        eventType: "organizer_password_changed_by_platform",
        entityType: "organizer_admin",
        entityId: admin.id,
        message: `Platform admin set a new password for organizer admin ${admin.email}.`,
        metadata: null
      }
    });

    return {
      ok: true
    };
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const admin = draft.organizerAdmins.find(
      (entry) => entry.id === adminUserId && entry.organizerId === organizer?.id
    );

    if (!organizer || !admin) {
      return {
        ok: false,
        message: "This organizer admin account could not be verified."
      };
    }

    admin.passwordHash = await bcrypt.hash(nextPassword, 10);
    admin.passwordResetToken = null;
    admin.passwordResetExpires = null;
    admin.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_password_changed_by_platform",
      entityType: "organizer_admin",
      entityId: admin.id,
      message: `Platform admin set a new password for organizer admin ${admin.email}.`
    });

    return {
      ok: true
    };
  });
}

export async function createOrganizerStripeConnectLink(slug, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    let account = organizer.stripeAccountId
      ? await retrieveStripeConnectedAccount(organizer.stripeAccountId)
      : null;
    const createdNow = !account;

    if (!account) {
      account = await createStripeConnectedAccount({
        organizerId: organizer.id,
        organizerName: organizer.name,
        organizerEmail: organizer.publicEmail,
        slug: organizer.slug
      });
    }

    Object.assign(organizer, getStripeAccountPatch(account, organizer));
    organizer.onlinePaymentsBillingStatus = normalizeOrganizerBillingStatus(
      organizer.onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    );
    organizer.updatedAt = new Date().toISOString();

    const baseUrl = getBaseUrl();
    const link = await createStripeOnboardingAccountLink({
      stripeAccountId: organizer.stripeAccountId,
      refreshUrl: `${baseUrl}/${organizer.slug}/admin/billing/connect`,
      returnUrl: `${baseUrl}/${organizer.slug}/admin/billing/return`
    });

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: createdNow
        ? "organizer_stripe_account_created"
        : "organizer_stripe_onboarding_reopened",
      entityType: "organizer",
      entityId: organizer.id,
      message: createdNow
        ? `Created Stripe Connect account ${organizer.stripeAccountId}.`
        : `Reopened Stripe Connect onboarding for ${organizer.name}.`,
      metadata: {
        stripeAccountId: organizer.stripeAccountId
      }
    });

    return {
      organizerId: organizer.id,
      url: link.url
    };
  });
}

export async function refreshOrganizerStripeConnection(slug, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    if (!organizer.stripeAccountId) {
      organizer.updatedAt = new Date().toISOString();

      return buildOrganizerBillingSnapshot(organizer, organizer.timeZone);
    }

    const account = await retrieveStripeConnectedAccount(organizer.stripeAccountId);

    if (!account) {
      return buildOrganizerBillingSnapshot(organizer, organizer.timeZone);
    }

    Object.assign(organizer, getStripeAccountPatch(account, organizer));
    organizer.onlinePaymentsBillingStatus = normalizeOrganizerBillingStatus(
      organizer.onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    );
    organizer.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: actorId ? "ORGANIZER_ADMIN" : "STRIPE",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_stripe_status_synced",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Synced Stripe Connect readiness for ${organizer.name}.`,
      metadata: {
        stripeAccountId: organizer.stripeAccountId,
        stripeConnectionStatus: organizer.stripeConnectionStatus,
        stripeChargesEnabled: organizer.stripeChargesEnabled,
        stripePayoutsEnabled: organizer.stripePayoutsEnabled
      }
    });

    return buildOrganizerBillingSnapshot(organizer, organizer.timeZone);
  });
}

export async function updateOrganizerBillingSettings(slug, input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    const onlinePaymentsMonthlyFeeCents = Math.max(
      0,
      Math.round(Number(input.onlinePaymentsMonthlyFeeCents || 0))
    );
    const onlinePaymentsBillingStatus = normalizeOrganizerBillingStatus(
      onlinePaymentsMonthlyFeeCents,
      input.onlinePaymentsBillingStatus
    );

    organizer.onlinePaymentsMonthlyFeeCents = onlinePaymentsMonthlyFeeCents;
    organizer.onlinePaymentsBillingStatus = onlinePaymentsBillingStatus;
    organizer.onlinePaymentsBillingActivatedAt =
      onlinePaymentsBillingStatus === ORGANIZER_BILLING_STATUS.ACTIVE
        ? organizer.onlinePaymentsBillingActivatedAt || new Date().toISOString()
        : null;
    organizer.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_billing_updated",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Updated billing settings for ${organizer.name}.`,
      metadata: {
        onlinePaymentsMonthlyFeeCents: organizer.onlinePaymentsMonthlyFeeCents,
        onlinePaymentsBillingStatus: organizer.onlinePaymentsBillingStatus
      }
    });

    return organizer;
  });
}

export async function updateSiteSettings(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    draft.siteSettings.siteName = normalizeText(input.siteName) || draft.siteSettings.siteName;
    draft.siteSettings.siteDescription =
      normalizeText(input.siteDescription) || draft.siteSettings.siteDescription;
    draft.siteSettings.platformEmail =
      normalizeEmail(input.platformEmail) || draft.siteSettings.platformEmail;
    draft.siteSettings.launchInbox =
      normalizeEmail(input.launchInbox) || draft.siteSettings.launchInbox;
    draft.siteSettings.adminNotifications =
      normalizeEmail(input.adminNotifications) || draft.siteSettings.adminNotifications;
    draft.siteSettings.registrationRemindersEnabled = Boolean(
      input.registrationRemindersEnabled
    );
    draft.siteSettings.supportResponseTarget =
      normalizeText(input.supportResponseTarget) || draft.siteSettings.supportResponseTarget;
    draft.siteSettings.customDomain = normalizeText(input.customDomain) || null;
    draft.siteSettings.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "site_settings_updated",
      entityType: "site_settings",
      entityId: draft.siteSettings.id,
      message: "Updated platform site settings."
    });
  });
}

export async function updateAboutPage(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    draft.aboutPage.heroEyebrow = normalizeText(input.heroEyebrow);
    draft.aboutPage.heroTitle = normalizeText(input.heroTitle);
    draft.aboutPage.heroSummary = normalizeText(input.heroSummary);
    draft.aboutPage.sections = {
      ...draft.aboutPage.sections,
      cta: {
        title: normalizeText(input.ctaTitle),
        detail: normalizeText(input.ctaDetail)
      }
    };
    draft.aboutPage.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "about_page_updated",
      entityType: "about_page",
      entityId: draft.aboutPage.id,
      message: "Updated about-page content."
    });
  });
}

export async function updateEmailTemplate(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const template = draft.emailTemplates.find((entry) => entry.id === input.id);

    if (!template) {
      return;
    }

    template.subject = normalizeText(input.subject);
    template.preview = normalizeText(input.preview);
    template.bodyHtml = normalizeText(input.bodyHtml);
    template.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "email_template_updated",
      entityType: "email_template",
      entityId: template.id,
      message: `Updated email template ${template.slug}.`
    });
  });
}

async function bootstrapOrganizerAdmin(draft, organizer, adminEmail, adminName) {
  const passwordHash = await bcrypt.hash(DEFAULT_LOCAL_PASSWORD, 10);
  const resetToken = createToken();
  const admin = {
    id: createToken(),
    organizerId: organizer.id,
    email: normalizeEmail(adminEmail),
    name: normalizeText(adminName),
    passwordHash,
    isPrimary: true,
    isActive: true,
    passwordResetToken: resetToken,
    passwordResetExpires: addHours(new Date().toISOString(), 24),
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  draft.organizerAdmins.push(admin);

  const resetUrl = `${getBaseUrl()}/${organizer.slug}/admin/login/reset/${resetToken}`;

  await sendTemplate(draft, "password_reset", admin.email, {
    "{{reset_url}}": resetUrl,
    "{{account_name}}": admin.name
  });

  return admin;
}

export async function createOrganizerFromPlatform(input, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const slug = slugify(input.slug || input.name);
    const now = new Date();
    const { venues, primaryVenue } = getPrimaryVenueFromInput(input);

    const existing = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (existing) {
      throw new Error("An organizer with this slug already exists.");
    }

    const passwordHash = await bcrypt.hash(DEFAULT_LOCAL_PASSWORD, 10);
    const resetToken = createToken();
    const resetExpires = new Date(addHours(now.toISOString(), 24));

    const organizer = await prisma.$transaction(async (tx) => {
      const createdOrganizer = await tx.organizer.create({
        data: {
          slug,
          name: normalizeText(input.name),
          status: "ACTIVE",
          description: normalizeText(input.description),
          tagline: normalizeText(input.tagline),
          city: normalizeText(input.city),
          region: normalizeText(input.region),
          timeZone: "Europe/Rome",
          publicEmail: normalizeEmail(input.publicEmail),
          publicPhone: normalizeText(input.publicPhone),
          venueTitle: primaryVenue.title,
          venueDetail: primaryVenue.detail,
          venueMapHref: primaryVenue.mapHref,
          venues,
          interestEmail: normalizeEmail(input.publicEmail),
          themeTags: [],
          policies: [],
          faq: [],
          photoStory: [],
          imageUrl: null,
          minAdvanceHours: 0,
          maxAdvanceDays: null,
          registrationRemindersEnabled: false,
          registrationReminderLeadHours: 24,
          registrationReminderNote: "",
          stripeAccountId: null,
          stripeConnectionStatus: "NOT_CONNECTED",
          stripeDetailsSubmitted: false,
          stripeChargesEnabled: false,
          stripePayoutsEnabled: false,
          stripeConnectedAt: null,
          stripeLastSyncedAt: null,
          onlinePaymentsMonthlyFeeCents: 0,
          onlinePaymentsBillingStatus: "NOT_REQUIRED",
          onlinePaymentsBillingActivatedAt: null,
          createdAt: now,
          updatedAt: now
        }
      });

      await tx.organizerAdminUser.create({
        data: {
          organizerId: createdOrganizer.id,
          email: normalizeEmail(input.adminEmail),
          name: normalizeText(input.adminName) || `${createdOrganizer.name} Admin`,
          passwordHash,
          isPrimary: true,
          isActive: true,
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now
        }
      });

      await tx.auditLog.create({
        data: {
          id: createToken(),
          createdAt: now,
          actorType: "PLATFORM_ADMIN",
          actorId,
          organizerId: createdOrganizer.id,
          registrationId: null,
          eventType: "organizer_created",
          entityType: "organizer",
          entityId: createdOrganizer.id,
          message: `Created organizer ${createdOrganizer.name}.`,
          metadata: {
            venueCount: venues.length
          }
        }
      });

      return createdOrganizer;
    });

    await sendPasswordResetTemplateByEmail(
      prisma,
      {
        email: normalizeEmail(input.adminEmail),
        name: normalizeText(input.adminName) || `${organizer.name} Admin`,
        passwordResetToken: resetToken
      },
      organizer
    );

    return organizer;
  }

  return mutatePersistentState(async (draft) => {
    const slug = slugify(input.slug || input.name);
    const { venues, primaryVenue } = getPrimaryVenueFromInput(input);

    if (draft.organizers.some((organizer) => organizer.slug === slug)) {
      throw new Error("An organizer with this slug already exists.");
    }

    const organizer = {
      id: createToken(),
      slug,
      name: normalizeText(input.name),
      status: "ACTIVE",
      description: normalizeText(input.description),
      tagline: normalizeText(input.tagline),
      city: normalizeText(input.city),
      region: normalizeText(input.region),
      timeZone: "Europe/Rome",
      publicEmail: normalizeEmail(input.publicEmail),
      publicPhone: normalizeText(input.publicPhone),
      venueTitle: primaryVenue.title,
      venueDetail: primaryVenue.detail,
      venueMapHref: primaryVenue.mapHref,
      venues,
      interestEmail: normalizeEmail(input.publicEmail),
      themeTags: [],
      policies: [],
      faq: [],
      photoStory: [],
      imageUrl: null,
      minAdvanceHours: 0,
      maxAdvanceDays: null,
      registrationRemindersEnabled: false,
      registrationReminderLeadHours: 24,
      registrationReminderNote: "",
      stripeAccountId: null,
      stripeConnectionStatus: "NOT_CONNECTED",
      stripeDetailsSubmitted: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeConnectedAt: null,
      stripeLastSyncedAt: null,
      onlinePaymentsMonthlyFeeCents: 0,
      onlinePaymentsBillingStatus: "NOT_REQUIRED",
      onlinePaymentsBillingActivatedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    draft.organizers.push(organizer);
    await bootstrapOrganizerAdmin(
      draft,
      organizer,
      input.adminEmail,
      input.adminName || `${organizer.name} Admin`
    );

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_created",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Created organizer ${organizer.name}.`,
      metadata: {
        venueCount: venues.length
      }
    });

    return organizer;
  });
}

export async function approveOrganizerRequest(requestId, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const request = draft.joinRequests.find((entry) => entry.id === requestId);

    if (!request || request.status !== "PENDING") {
      return null;
    }

    const organizer = {
      id: createToken(),
      slug: slugify(request.organizerName),
      name: request.organizerName,
      status: "ACTIVE",
      description: request.eventFocus,
      tagline: `${request.organizerName} on Passreserve`,
      city: request.city,
      region: "Italy",
      timeZone: "Europe/Rome",
      publicEmail: request.contactEmail,
      publicPhone: request.contactPhone,
      venueTitle: `${request.city} host venue`,
      venueDetail: "Update the organizer venue details from the organizer dashboard.",
      venueMapHref: "",
      venues: [
        {
          title: `${request.city} host venue`,
          detail: "Update the organizer venue details from the organizer dashboard.",
          mapHref: ""
        }
      ],
      interestEmail: request.contactEmail,
      themeTags: [],
      policies: [],
      faq: [],
      photoStory: [],
      imageUrl: null,
      minAdvanceHours: 0,
      maxAdvanceDays: null,
      registrationRemindersEnabled: false,
      registrationReminderLeadHours: 24,
      registrationReminderNote: "",
      stripeAccountId: null,
      stripeConnectionStatus: "NOT_CONNECTED",
      stripeDetailsSubmitted: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeConnectedAt: null,
      stripeLastSyncedAt: null,
      onlinePaymentsMonthlyFeeCents: 0,
      onlinePaymentsBillingStatus: "NOT_REQUIRED",
      onlinePaymentsBillingActivatedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    draft.organizers.push(organizer);
    await bootstrapOrganizerAdmin(draft, organizer, request.contactEmail, request.contactName);

    request.status = "APPROVED";
    request.organizerId = organizer.id;
    request.approvedById = actorId;
    request.approvedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_request_approved",
      entityType: "organizer_join_request",
      entityId: request.id,
      message: `Approved organizer request for ${request.organizerName}.`
    });

    return organizer;
  });
}

export async function suspendOrganizerFromPlatform(slug, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    const updated = await prisma.organizer.update({
      where: {
        slug
      },
      data: {
        status: organizer.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
        updatedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: new Date(),
        actorType: "PLATFORM_ADMIN",
        actorId,
        organizerId: updated.id,
        registrationId: null,
        eventType: updated.status === "ARCHIVED" ? "organizer_suspended" : "organizer_reactivated",
        entityType: "organizer",
        entityId: updated.id,
        message:
          updated.status === "ARCHIVED"
            ? `Suspended organizer ${updated.name}.`
            : `Reactivated organizer ${updated.name}.`,
        metadata: {
          status: updated.status
        }
      }
    });

    return updated;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    organizer.status = organizer.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    organizer.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: organizer.status === "ARCHIVED" ? "organizer_suspended" : "organizer_reactivated",
      entityType: "organizer",
      entityId: organizer.id,
      message:
        organizer.status === "ARCHIVED"
          ? `Suspended organizer ${organizer.name}.`
          : `Reactivated organizer ${organizer.name}.`,
      metadata: {
        status: organizer.status
      }
    });

    return organizer;
  });
}

export async function deleteOrganizerFromPlatform(slug, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: new Date(),
        actorType: "PLATFORM_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: null,
        eventType: "organizer_deleted",
        entityType: "organizer",
        entityId: organizer.id,
        message: `Deleted organizer ${organizer.name}.`,
        metadata: {
          slug: organizer.slug
        }
      }
    });

    await prisma.organizer.delete({
      where: {
        slug
      }
    });

    return organizer;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    draft.organizers = draft.organizers.filter((entry) => entry.id !== organizer.id);
    draft.organizerAdmins = draft.organizerAdmins.filter((entry) => entry.organizerId !== organizer.id);
    const eventIds = draft.events
      .filter((entry) => entry.organizerId === organizer.id)
      .map((entry) => entry.id);
    draft.events = draft.events.filter((entry) => entry.organizerId !== organizer.id);
    draft.ticketCategories = draft.ticketCategories.filter(
      (entry) => !eventIds.includes(entry.eventTypeId)
    );
    const occurrenceIds = draft.occurrences
      .filter((entry) => eventIds.includes(entry.eventTypeId))
      .map((entry) => entry.id);
    draft.occurrences = draft.occurrences.filter((entry) => !eventIds.includes(entry.eventTypeId));
    const registrationIds = draft.registrations
      .filter((entry) => entry.organizerId === organizer.id || occurrenceIds.includes(entry.occurrenceId))
      .map((entry) => entry.id);
    draft.registrations = draft.registrations.filter((entry) => !registrationIds.includes(entry.id));
    draft.payments = draft.payments.filter((entry) => !registrationIds.includes(entry.registrationId));
    draft.joinRequests = draft.joinRequests.map((entry) =>
      entry.organizerId === organizer.id
        ? {
            ...entry,
            organizerId: null
          }
        : entry
    );
    draft.auditLogs = draft.auditLogs.map((entry) =>
      entry.organizerId === organizer.id
        ? {
            ...entry,
            organizerId: null
          }
        : entry
    );

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "organizer_deleted",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Deleted organizer ${organizer.name}.`,
      metadata: {
        slug: organizer.slug
      }
    });

    return organizer;
  });
}

export async function toggleOrganizerEventSuspended(slug, eventId, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    const event = await prisma.eventType.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });

    if (!event) {
      return null;
    }

    const nextVisibility = event.visibility === "ARCHIVED" ? "DRAFT" : "ARCHIVED";
    const updated = await prisma.eventType.update({
      where: {
        id: event.id
      },
      data: {
        visibility: nextVisibility,
        updatedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: new Date(),
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: null,
        eventType:
          nextVisibility === "ARCHIVED" ? "organizer_event_suspended" : "organizer_event_restored",
        entityType: "event_type",
        entityId: updated.id,
        message:
          nextVisibility === "ARCHIVED"
            ? `Suspended event ${updated.title}.`
            : `Restored event ${updated.title} as a draft.`,
        metadata: {
          visibility: nextVisibility
        }
      }
    });

    return updated;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const event = draft.events.find(
      (entry) => entry.id === eventId && entry.organizerId === organizer?.id
    );

    if (!organizer || !event) {
      return null;
    }

    event.visibility = event.visibility === "ARCHIVED" ? "DRAFT" : "ARCHIVED";
    event.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: event.visibility === "ARCHIVED" ? "organizer_event_suspended" : "organizer_event_restored",
      entityType: "event_type",
      entityId: event.id,
      message:
        event.visibility === "ARCHIVED"
          ? `Suspended event ${event.title}.`
          : `Restored event ${event.title} as a draft.`,
      metadata: {
        visibility: event.visibility
      }
    });

    return event;
  });
}

export async function deleteOrganizerEvent(slug, eventId, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const organizer = await prisma.organizer.findUnique({
      where: {
        slug
      }
    });

    if (!organizer) {
      return null;
    }

    const event = await prisma.eventType.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });

    if (!event) {
      return null;
    }

    const registrationCount = await prisma.registration.count({
      where: {
        organizerId: organizer.id,
        eventTypeId: event.id
      }
    });

    if (registrationCount > 0) {
      throw new Error("This event already has registrations. Suspend it instead of deleting it.");
    }

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: new Date(),
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: null,
        eventType: "organizer_event_deleted",
        entityType: "event_type",
        entityId: event.id,
        message: `Deleted event ${event.title}.`,
        metadata: {
          slug: event.slug
        }
      }
    });

    await prisma.eventType.delete({
      where: {
        id: event.id
      }
    });

    return event;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const event = draft.events.find(
      (entry) => entry.id === eventId && entry.organizerId === organizer?.id
    );

    if (!organizer || !event) {
      return null;
    }

    const registrationCount = draft.registrations.filter(
      (registration) => registration.eventTypeId === event.id && registration.organizerId === organizer.id
    ).length;

    if (registrationCount > 0) {
      throw new Error("This event already has registrations. Suspend it instead of deleting it.");
    }

    draft.events = draft.events.filter((entry) => entry.id !== event.id);
    draft.ticketCategories = draft.ticketCategories.filter((entry) => entry.eventTypeId !== event.id);
    draft.occurrences = draft.occurrences.filter((entry) => entry.eventTypeId !== event.id);

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_event_deleted",
      entityType: "event_type",
      entityId: event.id,
      message: `Deleted event ${event.title}.`,
      metadata: {
        slug: event.slug
      }
    });

    return event;
  });
}

export async function saveOrganizerEvent(slug, input, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const organizer = await tx.organizer.findUnique({
        where: {
          slug
        }
      });

      if (!organizer) {
        return null;
      }

      const existingEvent = input.id
        ? await tx.eventType.findFirst({
            where: {
              id: input.id,
              organizerId: organizer.id
            }
          })
        : null;
      const nextSlug = slugify(input.slug || input.title);
      const conflictingEvent = await tx.eventType.findFirst({
        where: {
          organizerId: organizer.id,
          slug: nextSlug,
          ...(existingEvent
            ? {
                NOT: {
                  id: existingEvent.id
                }
              }
            : {})
        }
      });

      if (conflictingEvent) {
        throw new Error("Another event already uses this slug.");
      }

      const nextGallery =
        input.galleryJson !== undefined
          ? normalizeGalleryEntries(input.galleryJson)
          : existingEvent?.gallery || [];
      const coverImageUrl =
        nextGallery.find((entry) => entry.imageUrl)?.imageUrl ||
        normalizeText(input.imageUrl) ||
        null;
      const salesWindowStartsAt = parseOptionalDateTime(
        input.salesWindowStartsAt,
        "Sales window start",
        organizer.timeZone
      );
      const salesWindowEndsAt = parseOptionalDateTime(
        input.salesWindowEndsAt,
        "Sales window end",
        organizer.timeZone
      );

      if (
        salesWindowStartsAt &&
        salesWindowEndsAt &&
        salesWindowEndsAt.getTime() < salesWindowStartsAt.getTime()
      ) {
        throw new Error("The sales window end must be after the sales window start.");
      }

      const eventData = {
        slug: nextSlug,
        title: normalizeText(input.title),
        category: normalizeText(input.category),
        visibility: input.visibility || "DRAFT",
        summary: normalizeText(input.summary),
        description: normalizeText(input.description),
        audience: normalizeText(input.audience),
        durationMinutes: Number(input.durationMinutes || 180),
        venueTitle: normalizeText(input.venueTitle) || organizer.venueTitle,
        venueDetail: normalizeText(input.venueDetail) || organizer.venueDetail,
        mapHref: normalizeText(input.mapHref),
        basePriceCents: Math.round(Number(input.basePriceCents || 0)),
        prepayPercentage: Math.max(0, Math.min(100, Number(input.prepayPercentage || 0))),
        salesWindowStartsAt,
        salesWindowEndsAt,
        attendeeInstructions: normalizeText(input.attendeeInstructions),
        organizerNotes: normalizeText(input.organizerNotes),
        cancellationPolicy: normalizeText(input.cancellationPolicy),
        highlights: normalizeMultilineEntries(input.highlights),
        included: normalizeMultilineEntries(input.included),
        policies: normalizeMultilineEntries(input.policies),
        faq: existingEvent?.faq || [],
        gallery: nextGallery,
        imageUrl: coverImageUrl,
        updatedAt: now
      };

      const savedEvent = existingEvent
        ? await tx.eventType.update({
            where: {
              id: existingEvent.id
            },
            data: eventData
          })
        : await tx.eventType.create({
            data: {
              id: createToken(),
              organizerId: organizer.id,
              createdAt: now,
              ...eventData
            }
          });

      const existingTicket = await tx.ticketCategory.findFirst({
        where: {
          eventTypeId: savedEvent.id
        },
        orderBy: {
          sortOrder: "asc"
        }
      });

      if (existingTicket) {
        await tx.ticketCategory.update({
          where: {
            id: existingTicket.id
          },
          data: {
            unitPriceCents: savedEvent.basePriceCents,
            updatedAt: now
          }
        });
      } else {
        await tx.ticketCategory.create({
          data: {
            id: createToken(),
            eventTypeId: savedEvent.id,
            slug: "general",
            name: "General admission",
            description: "Standard access to this event.",
            unitPriceCents: savedEvent.basePriceCents,
            isDefault: true,
            sortOrder: 0,
            createdAt: now,
            updatedAt: now
          }
        });
      }

      await tx.auditLog.create({
        data: {
          id: createToken(),
          createdAt: now,
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: null,
          eventType: "organizer_event_saved",
          entityType: "event_type",
          entityId: savedEvent.id,
          message: `Saved event ${savedEvent.title}.`,
          metadata: null
        }
      });

      return savedEvent;
    });
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    let event = input.id ? draft.events.find((entry) => entry.id === input.id) : null;

    if (!event) {
      event = {
        id: createToken(),
        organizerId: organizer.id,
        slug: slugify(input.slug || input.title),
        createdAt: new Date().toISOString()
      };
      draft.events.push(event);
      draft.ticketCategories.push({
        id: createToken(),
        eventTypeId: event.id,
        slug: "general",
        name: "General admission",
        description: "Standard access to this event.",
        unitPriceCents: Math.round(Number(input.basePriceCents || 0)),
        isDefault: true,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const nextGallery =
      input.galleryJson !== undefined
        ? normalizeGalleryEntries(input.galleryJson)
        : event.gallery || [];
    const coverImageUrl =
      nextGallery.find((entry) => entry.imageUrl)?.imageUrl ||
      normalizeText(input.imageUrl) ||
      null;
    const salesWindowStartsAt = parseOptionalDateTime(
      input.salesWindowStartsAt,
      "Sales window start",
      organizer.timeZone
    );
    const salesWindowEndsAt = parseOptionalDateTime(
      input.salesWindowEndsAt,
      "Sales window end",
      organizer.timeZone
    );

    if (
      salesWindowStartsAt &&
      salesWindowEndsAt &&
      salesWindowEndsAt.getTime() < salesWindowStartsAt.getTime()
    ) {
      throw new Error("The sales window end must be after the sales window start.");
    }

    Object.assign(event, {
      title: normalizeText(input.title),
      category: normalizeText(input.category),
      visibility: input.visibility || "DRAFT",
      summary: normalizeText(input.summary),
      description: normalizeText(input.description),
      audience: normalizeText(input.audience),
      durationMinutes: Number(input.durationMinutes || 180),
      venueTitle: normalizeText(input.venueTitle) || organizer.venueTitle,
      venueDetail: normalizeText(input.venueDetail) || organizer.venueDetail,
      mapHref: normalizeText(input.mapHref),
      basePriceCents: Math.round(Number(input.basePriceCents || 0)),
      prepayPercentage: Math.max(0, Math.min(100, Number(input.prepayPercentage || 0))),
      salesWindowStartsAt: salesWindowStartsAt ? salesWindowStartsAt.toISOString() : null,
      salesWindowEndsAt: salesWindowEndsAt ? salesWindowEndsAt.toISOString() : null,
      attendeeInstructions: normalizeText(input.attendeeInstructions),
      organizerNotes: normalizeText(input.organizerNotes),
      cancellationPolicy: normalizeText(input.cancellationPolicy),
      highlights: normalizeMultilineEntries(input.highlights),
      included: normalizeMultilineEntries(input.included),
      policies: normalizeMultilineEntries(input.policies),
      faq: [],
      gallery: nextGallery,
      imageUrl: coverImageUrl,
      updatedAt: new Date().toISOString()
    });

    const ticket = draft.ticketCategories.find((entry) => entry.eventTypeId === event.id);

    if (ticket) {
      ticket.unitPriceCents = event.basePriceCents;
      ticket.updatedAt = new Date().toISOString();
    }

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_event_saved",
      entityType: "event_type",
      entityId: event.id,
      message: `Saved event ${event.title}.`
    });

    return event;
  });
}

export async function saveOrganizerOccurrence(slug, input, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const outcome = await prisma.$transaction(async (tx) => {
      const organizer = await tx.organizer.findUnique({
        where: {
          slug
        }
      });

      if (!organizer) {
        return null;
      }

      const existingOccurrence = input.id
        ? await tx.eventOccurrence.findFirst({
            where: {
              id: input.id,
              eventType: {
                organizerId: organizer.id
              }
            },
            include: {
              eventType: true
            }
          })
        : null;
      const event =
        existingOccurrence?.eventType ??
        (await tx.eventType.findFirst({
          where: {
            id: input.eventTypeId,
            organizerId: organizer.id
          }
        }));

      if (!event) {
        return null;
      }

      const resolvedCapacity =
        input.capacity === "" || input.capacity == null ? 12 : Number(input.capacity);
      const resolvedPriceCents =
        input.priceCents === "" || input.priceCents == null
          ? event.basePriceCents
          : Number(input.priceCents);
      const resolvedPrepayPercentage =
        input.prepayPercentage === "" || input.prepayPercentage == null
          ? event.prepayPercentage
          : Number(input.prepayPercentage);
      const nextOccurrence = {
        priceCents: Math.round(resolvedPriceCents),
        prepayPercentage: Math.max(0, Math.min(100, resolvedPrepayPercentage)),
        published: input.published === "true" || input.published === true
      };
      const billingGate = getOrganizerOnlinePaymentsGate(organizer);
      const nextStatus = input.status || "SCHEDULED";

      if (
        nextOccurrence.published &&
        nextStatus !== "CANCELLED" &&
        isOccurrenceUsingOnlinePayments(nextOccurrence) &&
        !billingGate.enabled
      ) {
        throw new Error(billingGate.blockers[0] || "Paid occurrences cannot be published yet.");
      }

      const startsAt = parseRequiredDateTime(input.startsAt, "Start time", organizer.timeZone);
      const endsAt = parseRequiredDateTime(input.endsAt, "End time", organizer.timeZone);
      const salesWindowStartsAt = parseOptionalDateTime(
        input.salesWindowStartsAt,
        "Sales window start",
        organizer.timeZone
      );
      const salesWindowEndsAt = parseOptionalDateTime(
        input.salesWindowEndsAt,
        "Sales window end",
        organizer.timeZone
      );

      if (endsAt.getTime() <= startsAt.getTime()) {
        throw new Error("End time must be after the start time.");
      }

      if (
        salesWindowStartsAt &&
        salesWindowEndsAt &&
        salesWindowEndsAt.getTime() < salesWindowStartsAt.getTime()
      ) {
        throw new Error("The sales window end must be after the sales window start.");
      }

      const now = new Date();
      const occurrenceData = {
        status: nextStatus,
        startsAt,
        endsAt,
        capacity: resolvedCapacity,
        priceCents: nextOccurrence.priceCents,
        prepayPercentage: nextOccurrence.prepayPercentage,
        venueTitle: normalizeText(input.venueTitle) || event.venueTitle,
        note: normalizeText(input.note),
        salesWindowStartsAt,
        salesWindowEndsAt,
        published: nextOccurrence.published,
        imageUrl: normalizeText(input.imageUrl) || null,
        updatedAt: now
      };
      const savedOccurrence = existingOccurrence
        ? await tx.eventOccurrence.update({
            where: {
              id: existingOccurrence.id
            },
            data: occurrenceData
          })
        : await tx.eventOccurrence.create({
            data: {
              id: createToken(),
              eventTypeId: event.id,
              createdAt: now,
              ...occurrenceData
            }
          });
      const shouldCancelOccurrence =
        Boolean(existingOccurrence) &&
        existingOccurrence.status !== "CANCELLED" &&
        occurrenceData.status === "CANCELLED" &&
        Boolean(existingOccurrence.published);
      let cancelledRegistrations = [];

      if (shouldCancelOccurrence) {
        const registrations = await tx.registration.findMany({
          where: {
            occurrenceId: savedOccurrence.id
          },
          orderBy: {
            createdAt: "desc"
          }
        });
        const eligibleRegistrations = registrations.filter(
          shouldSendOccurrenceCancellationForRegistration
        );

        if (eligibleRegistrations.length > 0) {
          await tx.registration.updateMany({
            where: {
              id: {
                in: eligibleRegistrations.map((registration) => registration.id)
              }
            },
            data: {
              status: "CANCELLED",
              cancelledAt: now,
              updatedAt: now
            }
          });
          cancelledRegistrations = eligibleRegistrations.map((registration) => ({
            ...registration,
            status: "CANCELLED",
            cancelledAt: now,
            updatedAt: now
          }));
        }
      }

      await tx.auditLog.create({
        data: {
          id: createToken(),
          createdAt: now,
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: null,
          eventType: "organizer_occurrence_saved",
          entityType: "event_occurrence",
          entityId: savedOccurrence.id,
          message: `Saved an occurrence for ${event.title}.`,
          metadata: null
        }
      });

      return {
        savedOccurrence,
        organizer,
        event,
        cancelledRegistrations
      };
    });

    if (outcome?.cancelledRegistrations?.length) {
      const siteSettings = await prisma.siteSettings.findUnique({
        where: {
          id: "site-settings"
        }
      });

      for (const registration of outcome.cancelledRegistrations) {
        await sendPrismaOccurrenceCancellationEmail(
          prisma,
          siteSettings,
          outcome.organizer,
          outcome.event,
          outcome.savedOccurrence,
          registration
        );
      }
    }

    return outcome?.savedOccurrence || null;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const event = draft.events.find(
      (entry) => entry.id === input.eventTypeId && entry.organizerId === organizer?.id
    );

    if (!organizer || !event) {
      return null;
    }

    let occurrence = input.id ? draft.occurrences.find((entry) => entry.id === input.id) : null;

    if (!occurrence) {
      occurrence = {
        id: createToken(),
        eventTypeId: event.id,
        createdAt: new Date().toISOString()
      };
      draft.occurrences.push(occurrence);
    }

    const resolvedCapacity =
      input.capacity === "" || input.capacity == null ? 12 : Number(input.capacity);
    const resolvedPriceCents =
      input.priceCents === "" || input.priceCents == null
        ? event.basePriceCents
        : Number(input.priceCents);
    const resolvedPrepayPercentage =
      input.prepayPercentage === "" || input.prepayPercentage == null
        ? event.prepayPercentage
        : Number(input.prepayPercentage);

    const nextOccurrence = {
      ...occurrence,
      priceCents: Math.round(resolvedPriceCents),
      prepayPercentage: Math.max(0, Math.min(100, resolvedPrepayPercentage)),
      published: input.published === "true" || input.published === true
    };
    const billingGate = getOrganizerOnlinePaymentsGate(organizer);
    const startsAt = parseRequiredDateTime(input.startsAt, "Start time", organizer.timeZone);
    const endsAt = parseRequiredDateTime(input.endsAt, "End time", organizer.timeZone);
    const salesWindowStartsAt = parseOptionalDateTime(
      input.salesWindowStartsAt,
      "Sales window start",
      organizer.timeZone
    );
    const salesWindowEndsAt = parseOptionalDateTime(
      input.salesWindowEndsAt,
      "Sales window end",
      organizer.timeZone
    );

    if (
      nextOccurrence.published &&
      (input.status || "SCHEDULED") !== "CANCELLED" &&
      isOccurrenceUsingOnlinePayments(nextOccurrence) &&
      !billingGate.enabled
    ) {
      throw new Error(billingGate.blockers[0] || "Paid occurrences cannot be published yet.");
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new Error("End time must be after the start time.");
    }

    if (
      salesWindowStartsAt &&
      salesWindowEndsAt &&
      salesWindowEndsAt.getTime() < salesWindowStartsAt.getTime()
    ) {
      throw new Error("The sales window end must be after the sales window start.");
    }

    const shouldCancelOccurrence =
      Boolean(occurrence.id && input.id) &&
      occurrence.status !== "CANCELLED" &&
      (input.status || "SCHEDULED") === "CANCELLED" &&
      Boolean(occurrence.published);
    const nextUpdatedAt = new Date().toISOString();

    Object.assign(occurrence, {
      status: input.status || "SCHEDULED",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      capacity: resolvedCapacity,
      priceCents: nextOccurrence.priceCents,
      prepayPercentage: nextOccurrence.prepayPercentage,
      venueTitle: normalizeText(input.venueTitle) || event.venueTitle,
      note: normalizeText(input.note),
      salesWindowStartsAt: salesWindowStartsAt ? salesWindowStartsAt.toISOString() : null,
      salesWindowEndsAt: salesWindowEndsAt ? salesWindowEndsAt.toISOString() : null,
      published: nextOccurrence.published,
      imageUrl: normalizeText(input.imageUrl) || null,
      updatedAt: nextUpdatedAt
    });

    if (shouldCancelOccurrence) {
      const registrations = draft.registrations.filter(
        (entry) => entry.occurrenceId === occurrence.id
      );

      for (const registration of registrations) {
        if (!shouldSendOccurrenceCancellationForRegistration(registration)) {
          continue;
        }

        registration.status = "CANCELLED";
        registration.cancelledAt = nextUpdatedAt;
        registration.updatedAt = nextUpdatedAt;
        await sendStateOccurrenceCancellationEmail(
          draft,
          organizer,
          event,
          occurrence,
          registration
        );
      }
    }

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_occurrence_saved",
      entityType: "event_occurrence",
      entityId: occurrence.id,
      message: `Saved an occurrence for ${event.title}.`
    });

    return occurrence;
  });
}

export async function updateOrganizerRegistration(slug, registrationId, action, actorId = null) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const outcome = await prisma.$transaction(async (tx) => {
      const organizer = await tx.organizer.findUnique({
        where: {
          slug
        }
      });

      if (!organizer) {
        return null;
      }

      const registration = await tx.registration.findFirst({
        where: {
          id: registrationId,
          organizerId: organizer.id
        },
        include: {
          eventType: true,
          occurrence: true
        }
      });

      if (!registration) {
        return null;
      }

      const now = new Date();
      const nextData = {
        updatedAt: now
      };
      let manualPaymentAmountCents = 0;

      if (action === "mark_paid") {
        manualPaymentAmountCents = Math.max(
          0,
          registration.onlineAmountCents - registration.onlineCollectedCents
        );
        nextData.onlineCollectedCents = Math.max(
          registration.onlineCollectedCents,
          registration.onlineAmountCents
        );
        nextData.status =
          Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents) > 0
            ? "CONFIRMED_PARTIALLY_PAID"
            : "CONFIRMED_PAID";
        nextData.confirmedAt = registration.confirmedAt || now;
      } else if (action === "mark_attended") {
        nextData.status = "ATTENDED";
        nextData.attendedAt = now;
      } else if (action === "mark_no_show") {
        nextData.status = "NO_SHOW";
        nextData.noShowAt = now;
      } else if (action === "cancel") {
        nextData.status = "CANCELLED";
        nextData.cancelledAt = now;
      }

      const updated = await tx.registration.update({
        where: {
          id: registration.id
        },
        data: nextData
      });

      if (manualPaymentAmountCents > 0) {
        await tx.registrationPayment.create({
          data: {
            id: createToken(),
            registrationId: registration.id,
            provider: "MANUAL",
            kind: "ADJUSTMENT",
            status: "SUCCEEDED",
            amountCents: manualPaymentAmountCents,
            currency: registration.currency,
            externalEventId: null,
            stripeAccountId: null,
            stripeSessionId: null,
            stripePaymentIntentId: null,
            note: "Marked as paid manually by organizer admin.",
            metadata: null,
            occurredAt: now,
            createdAt: now
          }
        });
      }

      await tx.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: registration.id,
          eventType: "organizer_registration_updated",
          entityType: "registration",
          entityId: registration.id,
          message: `Applied organizer action ${action} to ${registration.registrationCode || registration.id}.`,
          metadata: null,
          createdAt: now
        }
      });

      return {
        updated,
        organizer,
        event: registration.eventType,
        occurrence: registration.occurrence,
        shouldSendCancellationEmail: action === "cancel"
      };
    });

    if (outcome?.shouldSendCancellationEmail) {
      const siteSettings = await prisma.siteSettings.findUnique({
        where: {
          id: "site-settings"
        }
      });

      await sendPrismaRegistrationCancellationEmail(
        prisma,
        siteSettings,
        outcome.organizer,
        outcome.event,
        outcome.occurrence,
        outcome.updated
      );
    }

    return outcome?.updated || null;
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const registration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
    );

    if (!organizer || !registration) {
      return null;
    }

    if (action === "mark_paid") {
      const manualPaymentAmountCents = Math.max(
        0,
        registration.onlineAmountCents - registration.onlineCollectedCents
      );

      registration.onlineCollectedCents = Math.max(
        registration.onlineCollectedCents,
        registration.onlineAmountCents
      );
      registration.status =
        registration.dueAtEventCents > 0 ? "CONFIRMED_PARTIALLY_PAID" : "CONFIRMED_PAID";
      registration.confirmedAt = registration.confirmedAt || new Date().toISOString();

      if (manualPaymentAmountCents > 0) {
        draft.payments.unshift({
          id: createToken(),
          registrationId: registration.id,
          provider: "MANUAL",
          kind: "ADJUSTMENT",
          status: "SUCCEEDED",
          amountCents: manualPaymentAmountCents,
          currency: registration.currency,
          externalEventId: null,
          stripeSessionId: null,
          stripePaymentIntentId: null,
          note: "Marked as paid manually by organizer admin.",
          metadata: null,
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
    } else if (action === "mark_attended") {
      registration.status = "ATTENDED";
      registration.attendedAt = new Date().toISOString();
    } else if (action === "mark_no_show") {
      registration.status = "NO_SHOW";
      registration.noShowAt = new Date().toISOString();
    } else if (action === "cancel") {
      registration.status = "CANCELLED";
      registration.cancelledAt = new Date().toISOString();
    }

    registration.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "organizer_registration_updated",
      entityType: "registration",
      entityId: registration.id,
      message: `Applied organizer action ${action} to ${registration.registrationCode || registration.id}.`
    });

    if (action === "cancel") {
      const event = getEventById(draft, registration.eventTypeId);
      const occurrence = getOccurrenceById(draft, registration.occurrenceId);

      if (event && occurrence) {
        await sendStateRegistrationCancellationEmail(
          draft,
          organizer,
          event,
          occurrence,
          registration
        );
      }
    }

    return registration;
  });
}

export async function recordVenuePayment(slug, registrationId, amountCents, actorId = null) {
  const normalizedAmountCents = Math.max(0, Math.round(Number(amountCents || 0)));

  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();

    return prisma.$transaction(async (tx) => {
      const organizer = await tx.organizer.findUnique({
        where: {
          slug
        }
      });

      if (!organizer) {
        return null;
      }

      const registration = await tx.registration.findFirst({
        where: {
          id: registrationId,
          organizerId: organizer.id
        }
      });

      if (!registration) {
        return null;
      }

      const now = new Date();
      const nextVenueCollectedCents = registration.venueCollectedCents + normalizedAmountCents;
      const remainingDueAtVenue = Math.max(0, registration.dueAtEventCents - nextVenueCollectedCents);
      const nextStatus =
        registration.status === "ATTENDED"
          ? "ATTENDED"
          : remainingDueAtVenue === 0 &&
              registration.onlineCollectedCents >= registration.onlineAmountCents
            ? "CONFIRMED_PAID"
            : registration.status;

      const updated = await tx.registration.update({
        where: {
          id: registration.id
        },
        data: {
          venueCollectedCents: nextVenueCollectedCents,
          status: nextStatus,
          updatedAt: now
        }
      });

      await tx.registrationPayment.create({
        data: {
          id: createToken(),
          registrationId: registration.id,
          provider: "VENUE",
          kind: "ADJUSTMENT",
          status: "SUCCEEDED",
          amountCents: normalizedAmountCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: null,
          stripeSessionId: null,
          stripePaymentIntentId: null,
          note: "Recorded venue payment.",
          metadata: null,
          occurredAt: now,
          createdAt: now
        }
      });

      await tx.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: registration.id,
          eventType: "venue_payment_recorded",
          entityType: "registration_payment",
          entityId: registration.id,
          message: `Recorded a venue payment for ${registration.registrationCode || registration.id}.`,
          metadata: null,
          createdAt: now
        }
      });

      return updated;
    });
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const registration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
    );

    if (!organizer || !registration) {
      return null;
    }

    registration.venueCollectedCents += normalizedAmountCents;
    if (
      registration.status !== "ATTENDED" &&
      Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents) === 0 &&
      registration.onlineCollectedCents >= registration.onlineAmountCents
    ) {
      registration.status = "CONFIRMED_PAID";
    }
    registration.updatedAt = new Date().toISOString();
    draft.payments.unshift({
      id: createToken(),
      registrationId: registration.id,
      provider: "VENUE",
      kind: "ADJUSTMENT",
      status: "SUCCEEDED",
      amountCents: normalizedAmountCents,
      currency: registration.currency,
      externalEventId: null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      note: "Recorded venue payment.",
      metadata: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "venue_payment_recorded",
      entityType: "registration_payment",
      entityId: registration.id,
      message: `Recorded a venue payment for ${registration.registrationCode || registration.id}.`
    });

    return registration;
  });
}
