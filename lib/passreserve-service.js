import bcrypt from "bcryptjs";
import { cache } from "react";
import { z } from "zod";

import {
  getOrganizerOnlinePaymentsGate,
  getStripeAccountPatch,
  normalizeOrganizerPaymentSettings
} from "./passreserve-billing.js";
import {
  getRegistrationAvailabilityGate,
  normalizeOrganizerBookingWindowSettings,
  resolveEventSalesWindow
} from "./passreserve-booking-window.js";
import {
  findOrganizerAdminForAuthentication,
  findPlatformAdminForAuthentication
} from "./passreserve-auth-security.js";
import { dietaryFlags } from "./passreserve-dietary.js";
import { calculatePaymentBreakdown } from "./passreserve-domain.js";
import {
  PAYMENT_WINDOW_HOURS,
  HOLD_DURATION_MINUTES,
  getBaseUrl,
  getStorageMode,
  getStorageSummary
} from "./passreserve-config.js";
import {
  addHours,
  addMinutes,
  asIso,
  clamp,
  createRegistrationCode,
  createToken,
  formatCurrencyFromCents,
  formatDateLabel,
  formatDateTimeLabel,
  formatOccurrenceTimeRange,
  normalizeEmail,
  normalizeText,
  pluralize
} from "./passreserve-format.js";
import { getLocalizedList, getLocalizedText } from "./passreserve-content.js";
import {
  buildEmailDeliveryDedupeKey,
  getRegistrationPaymentStateLabel,
  normalizeReminderLeadHours,
  resolveOrganizerNotificationEmailFromState,
  sendPrismaTemplateEmail,
  sendStateTemplateEmail,
  shouldSendReminderForRegistration
} from "./passreserve-email-delivery.js";
import { getPrismaClient, logDatabaseFallback } from "./passreserve-prisma.js";
import {
  loadFileBackedState,
  loadPersistentState,
  mutatePersistentState
} from "./passreserve-state.js";
import {
  createStripeCheckoutSession,
  getStripeEnvironmentState,
  retrieveStripeCheckoutSession
} from "./passreserve-payments.js";

const dietaryFlagIds = dietaryFlags.map((flag) => flag.id);

const attendeeSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  address: z.string().trim().min(4),
  phone: z.string().trim().min(6),
  email: z.string().trim().email(),
  dietaryFlags: z.array(z.string()).optional().default([]),
  dietaryOther: z.string().trim().optional().default("")
});

const requestSchema = z.object({
  slug: z.string().min(1),
  eventSlug: z.string().min(1),
  occurrenceId: z.string().min(1),
  ticketCategoryId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(8),
  registrationLocale: z.string().trim().optional().default("en"),
  attendees: z.array(attendeeSchema).min(1).max(8)
});

const confirmationSchema = z.object({
  slug: z.string().min(1),
  eventSlug: z.string().min(1),
  holdToken: z.string().min(1),
  termsAccepted: z.string().min(1),
  responsibilityAccepted: z.string().min(1),
  baseUrl: z.string().optional().default("")
});

const joinRequestSchema = z.object({
  contactName: z.string().trim().min(2),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().optional().default(""),
  organizerName: z.string().trim().min(2),
  city: z.string().trim().min(2),
  launchWindow: z.string().trim().min(2),
  paymentModel: z.string().trim().min(2),
  eventFocus: z.string().trim().min(2),
  note: z.string().trim().optional().default("")
});

const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});

const DEFAULT_FIELD_RULES = [
  {
    field: "firstName",
    label: "First name",
    detail: "Capture the legal first name for each participant."
  },
  {
    field: "lastName",
    label: "Last name",
    detail: "Capture the legal surname for each participant."
  },
  {
    field: "address",
    label: "Address",
    detail: "Keep a contact address available for participant records."
  },
  {
    field: "phone",
    label: "Phone",
    detail: "Use a reachable number for day-of-event questions or schedule updates."
  },
  {
    field: "email",
    label: "Email",
    detail: "The lead participant email receives confirmation and payment updates."
  },
  {
    field: "dietaryFlags",
    label: "Dietary restrictions",
    detail: "Select standard allergies or intolerances and add any custom note if needed."
  }
];

const CONFIRMATION_RULES = [
  {
    field: "termsAccepted",
    label: "Terms and venue guidance",
    detail: "The attendee confirms the organizer notes, published policies, and venue guidance."
  },
  {
    field: "responsibilityAccepted",
    label: "Attendee readiness",
    detail: "The attendee confirms the count, arrival readiness, and that this occurrence still fits the group."
  }
];

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

function getSafeEntries(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

const loadPublicOrganizerStateBySlug = cache(async function loadPublicOrganizerStateBySlug(slug) {
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
      return loadFileBackedState();
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
    logDatabaseFallback(
      "[passreserve-service] public organizer database state unavailable, falling back to file state",
      error
    );

    return loadPersistentState();
  }
});

function getOrganizerRecord(state, slug) {
  const organizer = getSafeEntries(state.organizers).find((entry) => entry.slug === slug) ?? null;

  if (organizer) {
    Object.assign(organizer, normalizeOrganizerPaymentSettings(organizer));
    Object.assign(organizer, normalizeOrganizerBookingWindowSettings(organizer));
  }

  return organizer;
}

function getOrganizerById(state, organizerId) {
  const organizer = getSafeEntries(state.organizers).find((entry) => entry.id === organizerId) ?? null;

  if (organizer) {
    Object.assign(organizer, normalizeOrganizerPaymentSettings(organizer));
    Object.assign(organizer, normalizeOrganizerBookingWindowSettings(organizer));
  }

  return organizer;
}

function getOrganizerByStripeAccountId(state, stripeAccountId) {
  const organizer =
    getSafeEntries(state.organizers).find((entry) => entry.stripeAccountId === stripeAccountId) ??
    null;

  if (organizer) {
    Object.assign(organizer, normalizeOrganizerPaymentSettings(organizer));
    Object.assign(organizer, normalizeOrganizerBookingWindowSettings(organizer));
  }

  return organizer;
}

function getEventRecord(state, organizerId, eventSlug) {
  return (
    getSafeEntries(state.events).find(
      (event) => event.organizerId === organizerId && event.slug === eventSlug
    ) ?? null
  );
}

function getEventById(state, eventId) {
  return getSafeEntries(state.events).find((event) => event.id === eventId) ?? null;
}

function getOccurrenceById(state, occurrenceId) {
  return getSafeEntries(state.occurrences).find((occurrence) => occurrence.id === occurrenceId) ?? null;
}

function getTicketCategoryById(state, ticketCategoryId) {
  return (
    getSafeEntries(state.ticketCategories).find((category) => category.id === ticketCategoryId) ??
    null
  );
}

function getTicketCategoriesForEvent(state, eventTypeId) {
  return getSafeEntries(state.ticketCategories)
    .filter((category) => category.eventTypeId === eventTypeId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function getOccurrencesForEvent(state, eventTypeId) {
  return getSafeEntries(state.occurrences)
    .filter((occurrence) => occurrence.eventTypeId === eventTypeId && occurrence.published)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function getRegistrationsForOccurrence(state, occurrenceId) {
  return getSafeEntries(state.registrations).filter(
    (registration) => registration.occurrenceId === occurrenceId
  );
}

function getRegistrationByHoldToken(state, holdToken) {
  return (
    getSafeEntries(state.registrations).find((registration) => registration.holdToken === holdToken) ??
    null
  );
}

function getRegistrationByConfirmationToken(state, confirmationToken) {
  return (
    getSafeEntries(state.registrations).find(
      (registration) => registration.confirmationToken === confirmationToken
    ) ?? null
  );
}

function getRegistrationByPaymentToken(state, paymentToken) {
  return (
    getSafeEntries(state.registrations).find((registration) => registration.paymentToken === paymentToken) ??
    null
  );
}

function getPaymentsForRegistration(state, registrationId) {
  return getSafeEntries(state.payments)
    .filter((payment) => payment.registrationId === registrationId)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function getOrganizerOnlinePaymentsError(organizer) {
  return (
    getOrganizerOnlinePaymentsGate(organizer).blockers[0] ||
    "Online payments are not ready for this organizer yet."
  );
}

function getRegistrationByStripeReference(state, { registrationCode, stripePaymentIntentId, stripeSessionId }) {
  if (registrationCode) {
    const byCode = getSafeEntries(state.registrations).find(
      (entry) => entry.registrationCode === registrationCode
    );

    if (byCode) {
      return byCode;
    }
  }

  if (stripePaymentIntentId) {
    const payment = getSafeEntries(state.payments).find(
      (entry) => entry.stripePaymentIntentId === stripePaymentIntentId
    );

    if (payment) {
      return getSafeEntries(state.registrations).find((entry) => entry.id === payment.registrationId) ?? null;
    }
  }

  if (stripeSessionId) {
    const payment = getSafeEntries(state.payments).find(
      (entry) => entry.stripeSessionId === stripeSessionId
    );

    if (payment) {
      return getSafeEntries(state.registrations).find((entry) => entry.id === payment.registrationId) ?? null;
    }
  }

  return null;
}

function isFutureOccurrence(occurrence) {
  return new Date(occurrence.startsAt).getTime() > Date.now();
}

function isHoldExpired(registration) {
  return (
    registration.status === "PENDING_CONFIRM" &&
    registration.expiresAt &&
    new Date(registration.expiresAt).getTime() <= Date.now()
  );
}

function isPaymentExpired(registration) {
  return (
    registration.status === "PENDING_PAYMENT" &&
    registration.expiresAt &&
    new Date(registration.expiresAt).getTime() <= Date.now()
  );
}

function isRegistrationConsumingCapacity(registration) {
  if (registration.status === "CANCELLED") {
    return false;
  }

  if (registration.status === "PENDING_CONFIRM") {
    return !isHoldExpired(registration);
  }

  if (registration.status === "PENDING_PAYMENT") {
    return !isPaymentExpired(registration);
  }

  return true;
}

function getOnlinePaymentStatus(registration) {
  if (registration.onlineAmountCents <= 0) {
    return "NONE";
  }

  if (registration.refundedCents > 0) {
    return "REFUNDED";
  }

  if (registration.onlineCollectedCents >= registration.onlineAmountCents) {
    return "PAID";
  }

  if (registration.onlineCollectedCents > 0) {
    return "PARTIALLY_PAID";
  }

  return registration.status === "PENDING_PAYMENT" ? "PENDING" : "FAILED";
}

function formatCollectionLabel(prepayPercentage) {
  if (prepayPercentage <= 0) {
    return "0% online";
  }

  if (prepayPercentage >= 100) {
    return "100% online";
  }

  return `${prepayPercentage}% online`;
}

function getRegistrationAttendees(registration) {
  return Array.isArray(registration?.attendees) ? registration.attendees : [];
}

function buildLeadAttendeeFromRegistration(registration) {
  const leadAttendee = getRegistrationAttendees(registration)[0] ?? null;

  if (!leadAttendee) {
    return {
      name: registration.attendeeName,
      email: registration.attendeeEmail,
      phone: registration.attendeePhone
    };
  }

  return {
    name: [leadAttendee.firstName, leadAttendee.lastName].filter(Boolean).join(" "),
    email: leadAttendee.email,
    phone: leadAttendee.phone,
    address: leadAttendee.address,
    dietaryFlags: Array.isArray(leadAttendee.dietaryFlags) ? leadAttendee.dietaryFlags : [],
    dietaryOther: leadAttendee.dietaryOther || ""
  };
}

function buildOrganizerLinks(organizer) {
  return {
    organizerHref: `/${organizer.slug}`,
    dashboardHref: `/${organizer.slug}/admin/dashboard`,
    calendarHref: `/${organizer.slug}/admin/calendar`,
    registrationsHref: `/${organizer.slug}/admin/registrations`,
    paymentsHref: `/${organizer.slug}/admin/registrations`,
    eventsHref: `/${organizer.slug}/admin/events`,
    occurrencesHref: `/${organizer.slug}/admin/occurrences`
  };
}

function buildOccurrenceCapacitySummary(state, occurrence, event) {
  const registrations = getRegistrationsForOccurrence(state, occurrence.id);
  const active = registrations.filter(isRegistrationConsumingCapacity);
  const confirmed = active.filter((registration) =>
    [
      "CONFIRMED_UNPAID",
      "CONFIRMED_PARTIALLY_PAID",
      "CONFIRMED_PAID",
      "ATTENDED",
      "NO_SHOW"
    ].includes(registration.status)
  );
  const pendingHolds = active.filter((registration) => registration.status === "PENDING_CONFIRM");
  const pendingPayments = active.filter(
    (registration) => registration.status === "PENDING_PAYMENT"
  );
  const reservedQuantity = active.reduce((sum, registration) => sum + registration.quantity, 0);
  const remaining = Math.max(0, occurrence.capacity - reservedQuantity);

  return {
    totalCapacity: occurrence.capacity,
    confirmedCount: confirmed.reduce((sum, registration) => sum + registration.quantity, 0),
    pendingHoldCount: pendingHolds.reduce((sum, registration) => sum + registration.quantity, 0),
    pendingPaymentCount: pendingPayments.reduce(
      (sum, registration) => sum + registration.quantity,
      0
    ),
    reservedQuantity,
    remaining,
    capacityLabel:
      remaining <= 0 ? "Sold out" : remaining === 1 ? "1 spot left" : `${remaining} spots left`,
    statusLabel:
      remaining <= 0
        ? "Sold out"
        : remaining <= Math.max(2, Math.floor(occurrence.capacity * 0.2))
          ? "Almost full"
          : "Open",
    registrationStatusLabel: event.visibility === "PUBLIC" ? "Live" : "Draft"
  };
}

function buildTicketCategoryView(category, prepayPercentage, quantity = 1) {
  const payment = calculatePaymentBreakdown({
    unitPrice: category.unitPriceCents / 100,
    quantity,
    prepayPercentage
  });

  return {
    id: category.id,
    slug: category.slug,
    label: category.name,
    summary: category.description,
    unitPrice: category.unitPriceCents / 100,
    unitPriceLabel: formatCurrencyFromCents(category.unitPriceCents),
    payment
  };
}

function buildOccurrenceView(state, organizer, event, occurrence, ticketCategories, locale = "en") {
  if (!organizer || !event || !occurrence) {
    return null;
  }

  const capacity = buildOccurrenceCapacitySummary(state, occurrence, event);
  const registrationGate = getRegistrationAvailabilityGate(organizer, event, occurrence);
  const salesWindow = resolveEventSalesWindow(event, occurrence);

  return {
    id: occurrence.id,
    startsAt: occurrence.startsAt,
    label: formatDateLabel(occurrence.startsAt, organizer.timeZone),
    time: formatOccurrenceTimeRange(occurrence.startsAt, occurrence.endsAt, organizer.timeZone),
    note: getLocalizedText(occurrence, "note", locale),
    prepayPercentage: occurrence.prepayPercentage,
    capacity,
    capacityLabel: capacity.capacityLabel,
    registrationStatusLabel: capacity.registrationStatusLabel,
    registrationGate,
    salesWindow,
    registrationAvailable: registrationGate.allowed && capacity.remaining > 0,
    registrationHref: `/${organizer.slug}/events/${event.slug}/register?occurrence=${occurrence.id}`,
    ticketCategories: getSafeEntries(ticketCategories).map((category) =>
      buildTicketCategoryView(category, occurrence.prepayPercentage)
    )
  };
}

function buildEventView(state, organizer, event, locale = "en") {
  if (!event) {
    return null;
  }

  const ticketCategories = getTicketCategoriesForEvent(state, event.id);
  const occurrences = getOccurrencesForEvent(state, event.id)
    .filter(isFutureOccurrence)
    .map((occurrence) =>
      buildOccurrenceView(state, organizer, event, occurrence, ticketCategories, locale)
    )
    .filter(Boolean);
  const nextOccurrence = occurrences[0] ?? null;
  const payment = calculatePaymentBreakdown({
    unitPrice: event.basePriceCents / 100,
    quantity: 1,
    prepayPercentage: event.prepayPercentage
  });
  const organizerName = getLocalizedText(organizer, "name", locale) || organizer?.name || "";
  const organizerSlug = organizer?.slug || "";
  const organizerEmail = organizer?.publicEmail || "";

  return {
    id: event.id,
    slug: event.slug,
    title: getLocalizedText(event, "title", locale) || event.title,
    category: event.category,
    summary: getLocalizedText(event, "summary", locale) || event.summary,
    description: getLocalizedText(event, "description", locale) || event.description,
    audience: getLocalizedText(event, "audience", locale) || event.audience,
    duration: `${Math.floor(event.durationMinutes / 60)}h ${String(event.durationMinutes % 60).padStart(2, "0")}m`,
    venueTitle: getLocalizedText(event, "venueTitle", locale) || event.venueTitle,
    venueDetail: getLocalizedText(event, "venueDetail", locale) || event.venueDetail,
    attendeeInstructions:
      getLocalizedText(event, "attendeeInstructions", locale) || event.attendeeInstructions,
    organizerNotes: event.organizerNotes,
    prepayPercentage: event.prepayPercentage,
    salesWindow: resolveEventSalesWindow(event),
    highlights: getLocalizedList(event, "highlights", locale),
    included: getLocalizedList(event, "included", locale),
    gallery: event.gallery || [],
    policies: getLocalizedList(event, "policies", locale),
    faq: event.faq || [],
    organizerSlug,
    organizerName,
    organizerHref: organizerSlug ? `/${organizerSlug}` : "/events",
    detailHref: organizerSlug ? `/${organizerSlug}/events/${event.slug}` : `/events`,
    interestHref: organizerEmail
      ? `mailto:${organizerEmail}?subject=${encodeURIComponent(
          getLocalizedText(event, "title", locale) || event.title
        )}`
      : null,
    collectionLabel: formatCollectionLabel(event.prepayPercentage),
    priceLabel: formatCurrencyFromCents(event.basePriceCents),
    nextOccurrence,
    nextOccurrenceLabel: nextOccurrence ? nextOccurrence.label : "No upcoming dates",
    occurrences,
    totalRemainingCapacity: occurrences.reduce(
      (sum, occurrence) => sum + occurrence.capacity.remaining,
      0
    ),
    payment
  };
}

function buildOrganizerView(state, organizer, locale = "en") {
  if (!organizer) {
    return null;
  }

  const links = buildOrganizerLinks(organizer);
  const venues =
    Array.isArray(organizer.venues) && organizer.venues.length
      ? organizer.venues
      : [
          {
            title: organizer.venueTitle,
            detail: organizer.venueDetail,
            mapHref: organizer.venueMapHref
          }
        ].filter((venue) => venue.title || venue.detail || venue.mapHref);
  const events = getSafeEntries(state.events)
    .filter((event) => event.organizerId === organizer.id && event.visibility === "PUBLIC")
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((event) => buildEventView(state, organizer, event, locale))
    .filter(Boolean);
  const featuredEvent = events[0] ?? null;
  const agenda = events
    .flatMap((event) =>
      event.occurrences.map((occurrence) => ({
        id: occurrence.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        label: occurrence.label,
        time: occurrence.time,
        note: occurrence.note,
        capacity: occurrence.capacityLabel,
        priceLabel: event.priceLabel,
        collectionLabel: event.collectionLabel
      }))
    )
    .sort((left, right) => left.label.localeCompare(right.label));
  const organizerName = getLocalizedText(organizer, "name", locale) || organizer.name;
  const venueTitle = getLocalizedText(organizer, "venueTitle", locale) || venues[0]?.title || organizer.venueTitle;
  const venueDetail =
    getLocalizedText(organizer, "venueDetail", locale) || venues[0]?.detail || organizer.venueDetail;

  return {
    ...organizer,
    name: organizerName,
    tagline: getLocalizedText(organizer, "tagline", locale) || organizer.tagline,
    description: getLocalizedText(organizer, "description", locale) || organizer.description,
    ...links,
    venues,
    venue: {
      title: venueTitle,
      detail: venueDetail,
      mapHref: venues[0]?.mapHref || organizer.venueMapHref,
      mapLabel: venues[0]?.mapHref ? "Open map" : "Map coming soon"
    },
    contact: {
      email: organizer.publicEmail,
      phone: organizer.publicPhone
    },
    events,
    featuredEvent,
    agenda,
    totalUpcomingOccurrences: agenda.length,
    defaultCollectionLabel: featuredEvent?.collectionLabel || "0% online",
    interestHref: `mailto:${organizer.interestEmail || organizer.publicEmail}`
  };
}

function buildRegistrationContext(state, slug, eventSlug, occurrenceId, locale = "en") {
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const eventRecord = getEventRecord(state, organizer.id, eventSlug);

  if (!eventRecord || eventRecord.visibility !== "PUBLIC") {
    return null;
  }

  const event = buildEventView(state, organizer, eventRecord, locale);

  if (!event) {
    return null;
  }

  const selectedOccurrence =
    event.occurrences.find((occurrence) => occurrence.id === occurrenceId) ??
    event.occurrences[0] ??
    null;
  const selectedTicketCategory = selectedOccurrence?.ticketCategories[0] ?? null;
  const organizerView = buildOrganizerView(state, organizer, locale);

  if (!organizerView) {
    return null;
  }

  return {
    organizer: organizerView,
    event,
    eventRecord,
    selectedOccurrence,
    selectedTicketCategory
  };
}

function buildRegistrationTimeline(registration) {
  if (registration.onlineAmountCents > 0) {
    return [
      {
        title: "Registration confirmed",
        detail: "Your attendee details are saved and the payment step is tied to the same registration code."
      },
      {
        title: "Online amount completes next",
        detail: "Once the online amount clears, Passreserve updates the registration automatically."
      },
      {
        title: "Any remainder stays due at the event",
        detail: "The event-day balance stays separate from what you pay online."
      }
    ];
  }

  return [
    {
      title: "Registration confirmed",
      detail: "The organizer now sees this attendee in the live registration queue."
    },
    {
      title: "No online payment is required",
      detail: "Any balance stays due at the event itself."
    }
  ];
}

function buildHoldState(message, restartHref = null) {
  return {
    state: "error",
    title: "This hold is no longer available.",
    message,
    restartHref
  };
}

function decorateJoinRequest(request) {
  return {
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
  };
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

export const registrationRequestSchema = requestSchema;
export const registrationConfirmationSchema = confirmationSchema;

export async function getPublicSiteContent() {
  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const [siteSettings, aboutPage] = await Promise.all([
        prisma.siteSettings.findUnique({
          where: {
            id: "site-settings"
          }
        }),
        prisma.aboutPageContent.findUnique({
          where: {
            id: "about-page"
          }
        })
      ]);

      return {
        siteSettings: siteSettings ? serializeDatabaseValue(siteSettings) : null,
        aboutPage: aboutPage ? serializeDatabaseValue(aboutPage) : null
      };
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-service] public site content unavailable in database, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();

  return {
    siteSettings: state.siteSettings,
    aboutPage: state.aboutPage
  };
}

export async function getDiscoveryResults(query = "", locale = "en") {
  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const normalizedQuery = normalizeText(query);
      const eventWhere = {
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE"
        },
        ...(normalizedQuery
          ? {
              OR: [
                {
                  title: {
                    contains: normalizedQuery,
                    mode: "insensitive"
                  }
                },
                {
                  summary: {
                    contains: normalizedQuery,
                    mode: "insensitive"
                  }
                },
                {
                  category: {
                    contains: normalizedQuery,
                    mode: "insensitive"
                  }
                },
                {
                  organizer: {
                    name: {
                      contains: normalizedQuery,
                      mode: "insensitive"
                    }
                  }
                },
                {
                  organizer: {
                    city: {
                      contains: normalizedQuery,
                      mode: "insensitive"
                    }
                  }
                },
                {
                  organizer: {
                    region: {
                      contains: normalizedQuery,
                      mode: "insensitive"
                    }
                  }
                },
                {
                  organizer: {
                    tagline: {
                      contains: normalizedQuery,
                      mode: "insensitive"
                    }
                  }
                }
              ]
            }
          : {})
      };
      const events = await prisma.eventType.findMany({
        where: eventWhere,
        take: normalizedQuery ? undefined : 8,
        orderBy: [
          {
            organizer: {
              name: "asc"
            }
          },
          {
            title: "asc"
          }
        ],
        select: {
          id: true,
          slug: true,
          title: true,
          contentI18n: true,
          summary: true,
          category: true,
          basePriceCents: true,
          prepayPercentage: true,
          organizer: {
            select: {
              slug: true,
              name: true,
              contentI18n: true,
              tagline: true,
              city: true,
              region: true
            }
          },
          occurrences: {
            where: {
              published: true,
              startsAt: {
                gt: new Date()
              }
            },
            orderBy: {
              startsAt: "asc"
            },
            take: 1,
            select: {
              id: true
            }
          }
        }
      });
      const entries = getSafeEntries(events)
        .filter((event) => event.organizer)
        .map((event) => {
        const nextOccurrence = event.occurrences[0] ?? null;
        const organizerName = getLocalizedText(event.organizer, "name", locale) || event.organizer.name;
        const organizerTagline =
          getLocalizedText(event.organizer, "tagline", locale) || event.organizer.tagline;
        const eventTitle = getLocalizedText(event, "title", locale) || event.title;
        const eventSummary = getLocalizedText(event, "summary", locale) || event.summary;

        return {
          id: `${event.organizer.slug}:${event.slug}`,
          slug: event.organizer.slug,
          eventSlug: event.slug,
          organizerName,
          organizerTagline,
          organizerHref: `/${event.organizer.slug}`,
          city: event.organizer.city,
          region: event.organizer.region,
          eventTitle,
          eventSummary,
          eventHref: `/${event.organizer.slug}/events/${event.slug}`,
          registrationHref:
            nextOccurrence
              ? `/${event.organizer.slug}/events/${event.slug}/register?occurrenceId=${nextOccurrence.id}`
              : `/${event.organizer.slug}/events/${event.slug}`,
          collectionLabel: formatCollectionLabel(event.prepayPercentage),
          priceLabel: formatCurrencyFromCents(event.basePriceCents),
          searchText: [
            organizerName,
            event.organizer.city,
            event.organizer.region,
            organizerTagline,
            eventTitle,
            eventSummary,
            event.category,
            JSON.stringify(event.organizer.contentI18n || {}),
            JSON.stringify(event.contentI18n || {})
          ]
            .join(" ")
            .toLowerCase()
        };
        });
      const normalizedQueryLower = normalizedQuery.toLowerCase();

      if (!normalizedQueryLower) {
        return entries;
      }

      return entries
        .map((entry) => ({
          ...entry,
          score: normalizedQueryLower
            .split(/\s+/)
            .filter(Boolean)
            .reduce((sum, token) => sum + (entry.searchText.includes(token) ? 1 : 0), 0)
        }))
        .filter((entry) => entry.score > 0)
        .sort(
          (left, right) =>
            right.score - left.score || left.organizerName.localeCompare(right.organizerName)
        );
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-service] discovery database query unavailable, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();
  const organizers = getSafeEntries(state.organizers)
    .filter((organizer) => organizer.status === "ACTIVE")
    .map((organizer) => buildOrganizerView(state, organizer, locale));
  const entries = organizers.flatMap((organizer) =>
    organizer.events.map((event) => ({
      id: `${organizer.slug}:${event.slug}`,
      slug: organizer.slug,
      eventSlug: event.slug,
      organizerName: organizer.name,
      organizerTagline: organizer.tagline,
      organizerHref: organizer.organizerHref,
      city: organizer.city,
      region: organizer.region,
      eventTitle: event.title,
      eventSummary: event.summary,
      eventHref: event.detailHref,
      registrationHref: event.nextOccurrence?.registrationHref || event.detailHref,
      collectionLabel: event.collectionLabel,
      priceLabel: event.priceLabel,
      searchText: [
        organizer.name,
        organizer.city,
        organizer.region,
        organizer.tagline,
        event.title,
        event.summary,
        event.category,
        JSON.stringify(organizer.contentI18n || {}),
        JSON.stringify(event.contentI18n || {})
      ]
        .join(" ")
        .toLowerCase()
    }))
  );
  const normalizedQuery = normalizeText(query).toLowerCase();

  if (!normalizedQuery) {
    return entries.slice(0, 8);
  }

  return entries
    .map((entry) => ({
      ...entry,
      score: normalizedQuery
        .split(/\s+/)
        .filter(Boolean)
        .reduce((sum, token) => sum + (entry.searchText.includes(token) ? 1 : 0), 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.organizerName.localeCompare(right.organizerName));
}

export async function getOrganizerSlugs() {
  const state = await loadPersistentState();

  return getSafeEntries(state.organizers)
    .filter((organizer) => organizer.status === "ACTIVE")
    .map((organizer) => organizer.slug);
}

export async function getOrganizerPage(slug, options = {}) {
  if (getStorageMode() === "database") {
    const state = await loadPublicOrganizerStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    return organizer ? buildOrganizerView(state, organizer, options.locale) : null;
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  return organizer ? buildOrganizerView(state, organizer, options.locale) : null;
}

export async function getEventRouteParams() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const events = await prisma.eventType.findMany({
      where: {
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE"
        }
      },
      select: {
        slug: true,
        organizer: {
          select: {
            slug: true
          }
        }
      }
    });

    return events.map((event) => ({
      slug: event.organizer.slug,
      eventSlug: event.slug
    }));
  }

  const state = await loadPersistentState();

  return getSafeEntries(state.organizers).flatMap((organizer) =>
    getSafeEntries(state.events)
      .filter((event) => event.organizerId === organizer.id && event.visibility === "PUBLIC")
      .map((event) => ({
        slug: organizer.slug,
        eventSlug: event.slug
      }))
  );
}

export async function getRegistrationExperienceBySlugs(slug, eventSlug, options = {}) {
  if (getStorageMode() === "database") {
    const state = await loadPublicOrganizerStateBySlug(slug);

    return state
      ? buildRegistrationContext(state, slug, eventSlug, options.occurrenceId, options.locale)
      : null;
  }

  const state = await loadPersistentState();

  return buildRegistrationContext(state, slug, eventSlug, options.occurrenceId, options.locale);
}

export async function getRegistrationRouteParams() {
  return getEventRouteParams();
}

export function getRegistrationQuantityOptions(occurrence) {
  const remaining = occurrence?.capacity?.remaining ?? 1;
  const max = clamp(remaining, 1, 8);

  return Array.from(
    {
      length: max
    },
    (_entry, index) => index + 1
  );
}

export function getRegistrationFieldRules() {
  return DEFAULT_FIELD_RULES;
}

export function getConfirmationFieldRules() {
  return CONFIRMATION_RULES;
}

function normalizeRegistrationLocale(locale) {
  const normalized = normalizeText(locale).slice(0, 2).toLowerCase();
  return normalized === "it" ? "it" : "en";
}

function normalizeRegistrationAttendees(attendees = [], nowIso = new Date().toISOString()) {
  return attendees.map((attendee, index) => ({
    id: createToken(),
    sortOrder: index,
    firstName: normalizeText(attendee.firstName),
    lastName: normalizeText(attendee.lastName),
    address: normalizeText(attendee.address),
    phone: normalizeText(attendee.phone),
    email: normalizeEmail(attendee.email),
    dietaryFlags: [...new Set((attendee.dietaryFlags || []).filter((flag) => dietaryFlagIds.includes(flag)))],
    dietaryOther: normalizeText(attendee.dietaryOther),
    createdAt: nowIso,
    updatedAt: nowIso
  }));
}

export async function createRegistrationHold(input) {
  const parsed = requestSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = {};

    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0]] = issue.message;
    }

    return {
      ok: false,
      message: "We still need a few registration details before the hold can be created.",
      fieldErrors
    };
  }

  const payload = parsed.data;

  if (payload.quantity !== payload.attendees.length) {
    return {
      ok: false,
      message: "The participant count must match the selected quantity.",
      fieldErrors: {
        attendees: "Add one full participant form for each ticket."
      }
    };
  }

  return mutatePersistentState(async (draft) => {
    const context = buildRegistrationContext(
      draft,
      payload.slug,
      payload.eventSlug,
      payload.occurrenceId
    );

    if (!context?.selectedOccurrence || !context.selectedTicketCategory) {
      return {
        ok: false,
        message: "That event occurrence is no longer available."
      };
    }

    const bookingWindow = getRegistrationAvailabilityGate(
      context.organizer,
      context.eventRecord,
      context.selectedOccurrence
    );

    if (!bookingWindow.allowed) {
      return {
        ok: false,
        message: bookingWindow.reason,
        fieldErrors: {
          occurrenceId: bookingWindow.reason
        }
      };
    }

    const capacity = context.selectedOccurrence.capacity;

    if (payload.quantity > capacity.remaining) {
      return {
        ok: false,
        message: "That quantity is no longer available for the selected occurrence.",
        fieldErrors: {
          quantity: "Choose a smaller quantity or a different date."
        }
      };
    }

    const payment = calculatePaymentBreakdown({
      unitPrice: context.selectedTicketCategory.unitPrice,
      quantity: payload.quantity,
      prepayPercentage:
        context.selectedOccurrence.prepayPercentage ?? context.event.prepayPercentage
    });
    const now = new Date().toISOString();
    const attendees = normalizeRegistrationAttendees(payload.attendees, now);
    const leadAttendee = attendees[0];

    const registration = {
      id: createToken(),
      organizerId: context.organizer.id,
      eventTypeId: context.event.id,
      occurrenceId: context.selectedOccurrence.id,
      ticketCategoryId: context.selectedTicketCategory.id,
      status: "PENDING_CONFIRM",
      attendeeName: `${leadAttendee.firstName} ${leadAttendee.lastName}`.trim(),
      attendeeEmail: leadAttendee.email,
      attendeePhone: leadAttendee.phone,
      registrationLocale: normalizeRegistrationLocale(payload.registrationLocale),
      quantity: payload.quantity,
      currency: draft.siteSettings.stripeCurrencyDefault.toUpperCase(),
      subtotalCents: Math.round(payment.subtotal * 100),
      onlineAmountCents: Math.round(payment.onlineAmount * 100),
      dueAtEventCents: Math.round(payment.dueAtEvent * 100),
      onlineCollectedCents: 0,
      venueCollectedCents: 0,
      refundedCents: 0,
      holdToken: createToken(),
      paymentToken: null,
      confirmationToken: null,
      registrationCode: null,
      expiresAt: addMinutes(now, HOLD_DURATION_MINUTES),
      confirmedAt: null,
      cancelledAt: null,
      attendedAt: null,
      noShowAt: null,
      termsAcceptedAt: null,
      responsibilityAt: null,
      note: "",
      attendees,
      createdAt: now,
      updatedAt: now
    };
    draft.registrations.unshift(registration);
    const emailContext = buildRegistrationEmailContext(draft, registration);

    if (!emailContext) {
      return {
        ok: false,
        message: "That event occurrence is no longer available."
      };
    }

    await sendPendingConfirmationEmail(draft, registration, emailContext, getBaseUrl());

    await appendAuditLog(draft, {
      actorType: "ATTENDEE",
      organizerId: context.organizer.id,
      registrationId: registration.id,
      eventType: "registration_hold_created",
      entityType: "registration",
      entityId: registration.id,
      message: `Created a registration hold for ${context.event.title}.`
    });

    return {
      ok: true,
      redirectHref: buildPendingRegistrationHref(payload.slug, payload.eventSlug),
      confirmationHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirm/${registration.holdToken}`
    };
  });
}

export async function getRegistrationPendingView(slug, eventSlug) {
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug);

  if (!entry) {
    return {
      state: "error",
      title: "We couldn't match that event.",
      message: "Return to the event page and start again if you still want to register."
    };
  }

  return {
    state: "ready",
    organizer: entry.organizer,
    event: entry.event,
    supportReplyEmail:
      entry.organizer.publicEmail || entry.organizer.interestEmail || null,
    steps: [
      {
        title: "Open the confirmation email",
        detail: "Use the same inbox you entered on the registration form."
      },
      {
        title: "Confirm the registration from that email",
        detail: "The link opens the short confirmation step for the selected date."
      },
      {
        title: "Finish any payment only if needed",
        detail:
          entry.event.payment.onlineAmount > 0
            ? "If an online amount applies, checkout opens after the confirmation step."
            : "If nothing is due online, the registration is confirmed right after the email step."
      }
    ]
  };
}

export async function getRegistrationHoldView(slug, eventSlug, holdToken) {
  const state = await loadPersistentState();
  const registration = getRegistrationByHoldToken(state, holdToken);

  if (!registration) {
    return buildHoldState("This hold could not be found.", `/${slug}/events/${eventSlug}/register`);
  }

  if (isHoldExpired(registration)) {
    return buildHoldState(
      "This hold has already expired. Start again from the registration page if seats are still available.",
      `/${slug}/events/${eventSlug}/register`
    );
  }

  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);
  const occurrenceRecord = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategoryRecord = getTicketCategoryById(state, registration.ticketCategoryId);

  if (
    !organizer ||
    organizer.slug !== slug ||
    !eventRecord ||
    eventRecord.slug !== eventSlug ||
    !occurrenceRecord ||
    !ticketCategoryRecord
  ) {
    return buildHoldState("This hold no longer matches a live registration context.");
  }

  const event = buildEventView(state, organizer, eventRecord);
  const occurrence = event.occurrences.find((entry) => entry.id === occurrenceRecord.id);
  const ticketCategory = buildTicketCategoryView(
    ticketCategoryRecord,
    occurrenceRecord.prepayPercentage,
    registration.quantity
  );
  const payment = calculatePaymentBreakdown({
    unitPrice: ticketCategoryRecord.unitPriceCents / 100,
    quantity: registration.quantity,
    prepayPercentage: occurrenceRecord.prepayPercentage
  });
  const capacity = buildOccurrenceCapacitySummary(state, occurrenceRecord, eventRecord);
  const beforeRemaining = Math.min(
    occurrenceRecord.capacity,
    capacity.remaining + registration.quantity
  );

  return {
    state: "ready",
    organizer: buildOrganizerView(state, organizer),
    event,
    occurrence,
    ticketCategory,
    attendee: buildLeadAttendeeFromRegistration(registration),
    attendees: getRegistrationAttendees(registration),
    quantity: registration.quantity,
    quantityLabel: pluralize(registration.quantity, "attendee"),
    payment,
    hold: {
      expiresAt: registration.expiresAt,
      expiresAtLabel: formatDateTimeLabel(registration.expiresAt, organizer.timeZone)
    },
    capacity: {
      ...capacity,
      beforeRemaining,
      afterHoldRemaining: capacity.remaining
    },
    timeline: buildRegistrationTimeline(registration)
  };
}

function buildReminderNote(organizer) {
  const note = normalizeText(organizer.registrationReminderNote);

  return note || "The host will share any last-minute updates if anything changes before the event.";
}

async function processFileReminderDeliveries(now = new Date()) {
  return mutatePersistentState(async (draft) => {
    const currentTime = now.getTime();

    if (!draft.siteSettings.registrationRemindersEnabled) {
      return {
        ok: true,
        disabled: true,
        sent: 0,
        skipped: 0
      };
    }

    let sent = 0;
    let skipped = 0;

    for (const registration of draft.registrations) {
      if (!shouldSendReminderForRegistration(registration)) {
        skipped += 1;
        continue;
      }

      const context = buildRegistrationEmailContext(draft, registration);

      if (!context || !context.organizer.registrationRemindersEnabled) {
        skipped += 1;
        continue;
      }

      const leadHours = normalizeReminderLeadHours(
        context.organizer.registrationReminderLeadHours
      );
      const occurrenceTime = new Date(context.occurrence.startsAt).getTime();
      const reminderTime = occurrenceTime - leadHours * 60 * 60 * 1000;

      if (currentTime < reminderTime || currentTime >= occurrenceTime) {
        skipped += 1;
        continue;
      }

      const result = await sendStateTemplateEmail(draft, {
        templateSlug: "attendee_occurrence_reminder",
        to: registration.attendeeEmail,
        registrationId: registration.id,
        occurrenceId: registration.occurrenceId,
        organizerId: registration.organizerId,
        dedupeKey: buildEmailDeliveryDedupeKey(
          "attendee_occurrence_reminder",
          registration.id,
          registration.occurrenceId,
          leadHours
        ),
        replyTo: context.supportReplyEmail,
        replacements: {
          "{{attendee_name}}": registration.attendeeName,
          "{{event_name}}": context.eventRecord.title,
          "{{occurrence_label}}": context.occurrenceLabel,
          "{{occurrence_time}}": context.occurrenceTime,
          "{{venue_name}}": context.venueName,
          "{{registration_code}}": registration.registrationCode,
          "{{due_at_event}}": formatCurrencyFromCents(
            registration.dueAtEventCents,
            registration.currency
          ),
          "{{organizer_reminder_note}}": buildReminderNote(context.organizer),
          "{{support_reply_email}}": context.supportReplyEmail || draft.siteSettings.platformEmail
        }
      });

      if (result.ok && !result.skipped) {
        sent += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      ok: true,
      disabled: false,
      sent,
      skipped
    };
  });
}

async function processDatabaseReminderDeliveries(now = new Date()) {
  const prisma = getPrismaClient();
  const siteSettings = await prisma.siteSettings.findUnique({
    where: {
      id: "site-settings"
    }
  });

  if (!siteSettings?.registrationRemindersEnabled) {
    return {
      ok: true,
      disabled: true,
      sent: 0,
      skipped: 0
    };
  }

  const registrations = await prisma.registration.findMany({
    where: {
      status: {
        in: ["CONFIRMED_UNPAID", "CONFIRMED_PARTIALLY_PAID", "CONFIRMED_PAID"]
      },
      occurrence: {
        startsAt: {
          gt: now
        },
        status: {
          not: "CANCELLED"
        }
      }
    },
    include: {
      organizer: true,
      eventType: true,
      occurrence: true,
      ticketCategory: true
    },
    orderBy: {
      occurrence: {
        startsAt: "asc"
      }
    }
  });

  const currentTime = now.getTime();
  let sent = 0;
  let skipped = 0;

  for (const registration of registrations) {
    if (!registration.organizer.registrationRemindersEnabled) {
      skipped += 1;
      continue;
    }

    const leadHours = normalizeReminderLeadHours(
      registration.organizer.registrationReminderLeadHours
    );
    const occurrenceTime = registration.occurrence.startsAt.getTime();
    const reminderTime = occurrenceTime - leadHours * 60 * 60 * 1000;

    if (currentTime < reminderTime || currentTime >= occurrenceTime) {
      skipped += 1;
      continue;
    }

    const occurrenceLabel = formatDateLabel(
      registration.occurrence.startsAt,
      registration.organizer.timeZone
    );
    const occurrenceTimeLabel = formatOccurrenceTimeRange(
      registration.occurrence.startsAt,
      registration.occurrence.endsAt,
      registration.organizer.timeZone
    );
    const venueName =
      registration.occurrence.venueTitle ||
      registration.eventType.venueTitle ||
      registration.organizer.venueTitle;
    const replyTo =
      registration.organizer.publicEmail ||
      registration.organizer.interestEmail ||
      siteSettings.platformEmail ||
      null;
    const result = await sendPrismaTemplateEmail(prisma, {
      templateSlug: "attendee_occurrence_reminder",
      to: registration.attendeeEmail,
      registrationId: registration.id,
      occurrenceId: registration.occurrenceId,
      organizerId: registration.organizerId,
      dedupeKey: buildEmailDeliveryDedupeKey(
        "attendee_occurrence_reminder",
        registration.id,
        registration.occurrenceId,
        leadHours
      ),
      replyTo,
      replacements: {
        "{{attendee_name}}": registration.attendeeName,
        "{{event_name}}": registration.eventType.title,
        "{{occurrence_label}}": occurrenceLabel,
        "{{occurrence_time}}": occurrenceTimeLabel,
        "{{venue_name}}": venueName,
        "{{registration_code}}": registration.registrationCode,
        "{{due_at_event}}": formatCurrencyFromCents(
          registration.dueAtEventCents,
          registration.currency
        ),
        "{{organizer_reminder_note}}": buildReminderNote(registration.organizer),
        "{{support_reply_email}}": replyTo || siteSettings.platformEmail
      }
    });

    if (result.ok && !result.skipped) {
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    ok: true,
    disabled: false,
    sent,
    skipped
  };
}

export async function processRegistrationReminderDeliveries(now = new Date()) {
  return getStorageMode() === "database"
    ? processDatabaseReminderDeliveries(now)
    : processFileReminderDeliveries(now);
}

async function sendRegistrationEmail(state, templateSlug, to, replacements, replyTo = null) {
  return sendStateTemplateEmail(state, {
    templateSlug,
    to,
    replacements,
    replyTo
  });
}

function buildPendingRegistrationHref(slug, eventSlug) {
  return `/${slug}/events/${eventSlug}/register/pending`;
}

function buildConfirmationHref(baseUrl, slug, eventSlug, holdToken) {
  return `${baseUrl}/${slug}/events/${eventSlug}/register/confirm/${holdToken}`;
}

function getSupportReplyEmail(state, organizer) {
  return organizer.publicEmail || organizer.interestEmail || state.siteSettings.platformEmail || null;
}

function buildRegistrationEmailContext(state, registration) {
  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);
  const occurrence = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategory = getTicketCategoryById(state, registration.ticketCategoryId);

  if (!organizer || !eventRecord || !occurrence || !ticketCategory) {
    return null;
  }

  return {
    organizer,
    eventRecord,
    occurrence,
    ticketCategory,
    occurrenceLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
    occurrenceTime: formatOccurrenceTimeRange(
      occurrence.startsAt,
      occurrence.endsAt,
      organizer.timeZone
    ),
    venueName: occurrence.venueTitle || eventRecord.venueTitle || organizer.venueTitle,
    supportReplyEmail: getSupportReplyEmail(state, organizer),
    organizerNotificationEmail: resolveOrganizerNotificationEmailFromState(state, organizer)
  };
}

async function sendPendingConfirmationEmail(state, registration, context, baseUrl) {
  return sendStateTemplateEmail(state, {
    templateSlug: "attendee_pending_confirmation",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "attendee_pending_confirmation",
      registration.id
    ),
    replyTo: context.supportReplyEmail,
    replacements: {
      "{{attendee_name}}": registration.attendeeName,
      "{{event_name}}": context.eventRecord.title,
      "{{occurrence_label}}": context.occurrenceLabel,
      "{{confirmation_url}}": buildConfirmationHref(
        baseUrl,
        context.organizer.slug,
        context.eventRecord.slug,
        registration.holdToken
      ),
      "{{online_amount}}": formatCurrencyFromCents(
        registration.onlineAmountCents,
        registration.currency
      ),
      "{{due_at_event}}": formatCurrencyFromCents(
        registration.dueAtEventCents,
        registration.currency
      )
    },
    metadata: {
      registrationCode: registration.registrationCode || null
    }
  });
}

async function sendConfirmedRegistrationEmail(state, registration, context) {
  return sendStateTemplateEmail(state, {
    templateSlug: "attendee_registration_confirmed",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "attendee_registration_confirmed",
      registration.id
    ),
    replyTo: context.supportReplyEmail,
    replacements: {
      "{{registration_code}}": registration.registrationCode,
      "{{event_name}}": context.eventRecord.title,
      "{{venue_name}}": context.venueName,
      "{{due_at_event}}": formatCurrencyFromCents(
        registration.dueAtEventCents,
        registration.currency
      )
    }
  });
}

async function sendOrganizerNewRegistrationAlert(state, registration, context) {
  if (!context.organizerNotificationEmail) {
    return null;
  }

  return sendStateTemplateEmail(state, {
    templateSlug: "organizer_new_registration",
    to: context.organizerNotificationEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("organizer_new_registration", registration.id),
    replyTo: state.siteSettings.platformEmail || null,
    replacements: {
      "{{organizer_name}}": context.organizer.name,
      "{{event_name}}": context.eventRecord.title,
      "{{attendee_name}}": registration.attendeeName,
      "{{occurrence_label}}": context.occurrenceLabel,
      "{{quantity_label}}": pluralize(registration.quantity, "attendee"),
      "{{registration_code}}": registration.registrationCode,
      "{{payment_state}}": getRegistrationPaymentStateLabel(registration)
    }
  });
}

async function sendPaymentCompletionEmails(state, registration, context) {
  await sendConfirmedRegistrationEmail(state, registration, context);

  await sendStateTemplateEmail(state, {
    templateSlug: "attendee_payment_received",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("attendee_payment_received", registration.id),
    replyTo: context.supportReplyEmail,
    replacements: {
      "{{registration_code}}": registration.registrationCode,
      "{{paid_online}}": formatCurrencyFromCents(
        registration.onlineCollectedCents,
        registration.currency
      ),
      "{{due_at_event}}": formatCurrencyFromCents(
        registration.dueAtEventCents,
        registration.currency
      ),
      "{{event_name}}": context.eventRecord.title
    }
  });

  if (context.organizerNotificationEmail) {
    await sendStateTemplateEmail(state, {
      templateSlug: "organizer_payment_received",
      to: context.organizerNotificationEmail,
      registrationId: registration.id,
      occurrenceId: registration.occurrenceId,
      organizerId: registration.organizerId,
      dedupeKey: buildEmailDeliveryDedupeKey("organizer_payment_received", registration.id),
      replyTo: state.siteSettings.platformEmail || null,
      replacements: {
        "{{registration_code}}": registration.registrationCode,
        "{{paid_online}}": formatCurrencyFromCents(
          registration.onlineCollectedCents,
          registration.currency
        ),
        "{{due_at_event}}": formatCurrencyFromCents(
          registration.dueAtEventCents,
          registration.currency
        ),
        "{{occurrence_label}}": context.occurrenceLabel,
        "{{event_name}}": context.eventRecord.title
      }
    });
  }
}

async function sendOrganizerRequestAlert(state, request) {
  const notifyAddress =
    state.siteSettings.launchInbox || state.siteSettings.adminNotifications || null;

  if (!notifyAddress) {
    return null;
  }

  return sendStateTemplateEmail(state, {
    templateSlug: "organizer_request_alert",
    to: notifyAddress,
    dedupeKey: buildEmailDeliveryDedupeKey("organizer_request_alert", request.id),
    replyTo: request.contactEmail || null,
    replacements: {
      "{{organizer_name}}": request.organizerName,
      "{{city}}": request.city,
      "{{event_focus}}": request.eventFocus,
      "{{platform_reply_email}}": state.siteSettings.platformEmail
    }
  });
}

async function finalizeOnlinePayment(draft, registration, metadata = {}) {
  if (registration.onlineCollectedCents >= registration.onlineAmountCents) {
    return registration;
  }

  registration.onlineCollectedCents = registration.onlineAmountCents;
  registration.updatedAt = new Date().toISOString();
  registration.status =
    registration.dueAtEventCents > 0 ? "CONFIRMED_PARTIALLY_PAID" : "CONFIRMED_PAID";

  draft.payments.unshift({
    id: createToken(),
    registrationId: registration.id,
    provider: "STRIPE",
    kind: "CAPTURE",
    status: "SUCCEEDED",
    amountCents: registration.onlineAmountCents,
    currency: registration.currency,
    externalEventId: metadata.externalEventId || null,
    stripeAccountId: metadata.stripeAccountId || null,
    stripeSessionId: metadata.stripeSessionId || null,
    stripePaymentIntentId: metadata.stripePaymentIntentId || null,
    note: metadata.note || "Online payment completed.",
    metadata: metadata.metadata || null,
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  return registration;
}

export async function confirmRegistrationHold(input) {
  const parsed = confirmationSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = {};

    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0]] = issue.message;
    }

    return {
      ok: false,
      message: "The confirmation request was incomplete.",
      fieldErrors
    };
  }

  return mutatePersistentState(async (draft) => {
    const registration = getRegistrationByHoldToken(draft, parsed.data.holdToken);

    if (!registration) {
      return {
        ok: false,
        message: "This hold could not be found."
      };
    }

    if (isHoldExpired(registration)) {
      return {
        ok: false,
        message: "This hold has expired. Start a fresh registration if seats are still open."
      };
    }

    const organizer = getOrganizerById(draft, registration.organizerId);
    const eventRecord = getEventById(draft, registration.eventTypeId);
    const occurrence = getOccurrenceById(draft, registration.occurrenceId);
    const ticketCategory = getTicketCategoryById(draft, registration.ticketCategoryId);
    const emailContext = buildRegistrationEmailContext(draft, registration);

    if (
      !organizer ||
      organizer.slug !== parsed.data.slug ||
      !eventRecord ||
      eventRecord.slug !== parsed.data.eventSlug ||
      !occurrence ||
      !ticketCategory ||
      !emailContext
    ) {
      return {
        ok: false,
        message: "This hold no longer matches a live event context."
      };
    }

    const now = new Date().toISOString();

    registration.holdToken = null;
    registration.confirmedAt = now;
    registration.confirmationToken = registration.confirmationToken || createToken();
    registration.registrationCode = registration.registrationCode || createRegistrationCode();
    registration.termsAcceptedAt = now;
    registration.responsibilityAt = now;
    registration.updatedAt = now;

    if (registration.onlineAmountCents > 0) {
      const billingGate = getOrganizerOnlinePaymentsGate(organizer);

      if (getStripeEnvironmentState().mode === "live" && !billingGate.enabled) {
        return {
          ok: false,
          message: getOrganizerOnlinePaymentsError(organizer)
        };
      }

      registration.status = "PENDING_PAYMENT";
      registration.paymentToken = registration.paymentToken || createToken();
      registration.expiresAt = addHours(now, PAYMENT_WINDOW_HOURS);

      const session = await createStripeCheckoutSession({
        attendeeEmail: registration.attendeeEmail,
        baseUrl: parsed.data.baseUrl || getBaseUrl(),
        eventSlug: eventRecord.slug,
        eventTitle: eventRecord.title,
        holdExpiresAt: registration.expiresAt,
        occurrenceId: occurrence.id,
        occurrenceLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
        organizerName: organizer.name,
        payment: {
          onlineAmount: registration.onlineAmountCents / 100,
          onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
          dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
        },
        paymentFingerprint: registration.paymentToken,
        paymentToken: registration.paymentToken,
        quantity: registration.quantity,
        registrationCode: registration.registrationCode,
        slug: organizer.slug,
        stripeAccountId: organizer.stripeAccountId,
        ticketCategoryLabel: ticketCategory.name
      });

      if (session.sessionId) {
        draft.payments.unshift({
          id: createToken(),
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "CHECKOUT_SESSION",
          status: "PENDING",
          amountCents: registration.onlineAmountCents,
          currency: registration.currency,
          externalEventId: null,
          stripeAccountId: organizer.stripeAccountId || null,
          stripeSessionId: session.sessionId,
          stripePaymentIntentId: null,
          note: "Checkout session created.",
          metadata: null,
          occurredAt: now,
          createdAt: now
        });
      }

      await appendAuditLog(draft, {
        actorType: "ATTENDEE",
        organizerId: organizer.id,
        registrationId: registration.id,
        eventType: "registration_confirmed_pending_payment",
        entityType: "registration",
        entityId: registration.id,
        message: `Confirmed ${registration.registrationCode} and opened payment.`
      });

      await sendOrganizerNewRegistrationAlert(draft, registration, emailContext);

      return {
        ok: true,
        redirectHref: session.url
      };
    }

    registration.status = "CONFIRMED_UNPAID";
    registration.paymentToken = null;
    registration.expiresAt = null;

    await sendConfirmedRegistrationEmail(draft, registration, emailContext);
    await sendOrganizerNewRegistrationAlert(draft, registration, emailContext);

    await appendAuditLog(draft, {
      actorType: "ATTENDEE",
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "registration_confirmed",
      entityType: "registration",
      entityId: registration.id,
      message: `Confirmed ${registration.registrationCode} without online payment.`
    });

    return {
      ok: true,
      redirectHref: `/${parsed.data.slug}/events/${parsed.data.eventSlug}/register/confirmed/${registration.confirmationToken}`
    };
  });
}

function buildConfirmedView(state, registration) {
  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);
  const occurrenceRecord = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategoryRecord = getTicketCategoryById(state, registration.ticketCategoryId);

  if (!organizer || !eventRecord || !occurrenceRecord || !ticketCategoryRecord) {
    return {
      state: "error",
      title: "This registration could not be found.",
      message: "The registration details are no longer available."
    };
  }

  const event = buildEventView(state, organizer, eventRecord);
  const occurrence = event.occurrences.find((entry) => entry.id === occurrenceRecord.id) ?? {
    label: formatDateLabel(occurrenceRecord.startsAt, organizer.timeZone),
    time: formatOccurrenceTimeRange(
      occurrenceRecord.startsAt,
      occurrenceRecord.endsAt,
      organizer.timeZone
    )
  };
  const paymentStatus = getOnlinePaymentStatus(registration);
  const payments = getPaymentsForRegistration(state, registration.id);
  const lastPayment = payments[0] ?? null;

  return {
    state: "ready",
    organizer: buildOrganizerView(state, organizer),
    event,
    occurrence,
    ticketCategory: buildTicketCategoryView(
      ticketCategoryRecord,
      occurrenceRecord.prepayPercentage,
      registration.quantity
    ),
    attendee: buildLeadAttendeeFromRegistration(registration),
    attendees: getRegistrationAttendees(registration),
    payment: {
      subtotalLabel: formatCurrencyFromCents(registration.subtotalCents),
      onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
      dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
    },
    paymentProvider: {
      label: registration.onlineAmountCents > 0 ? "Organizer Stripe Checkout" : "Pay at the event"
    },
    registrationCode: registration.registrationCode,
    registrationStatus: registration.status,
    paymentStatus,
    quantityLabel: pluralize(registration.quantity, "attendee"),
    headline:
      registration.status === "CONFIRMED_PAID"
        ? "Your registration and payment are confirmed."
        : registration.status === "CONFIRMED_PARTIALLY_PAID"
          ? "Your registration is confirmed and the deposit is paid."
          : "Your registration is confirmed.",
    nextStep:
      registration.dueAtEventCents > 0
        ? `Keep ${formatCurrencyFromCents(registration.dueAtEventCents)} ready for the event-day balance.`
        : "You are all set for the online amount that was required.",
    confirmedAtLabel: registration.confirmedAt
      ? formatDateTimeLabel(registration.confirmedAt, organizer.timeZone)
      : "Not confirmed",
    reconciledAtLabel: lastPayment ? formatDateTimeLabel(lastPayment.occurredAt, organizer.timeZone) : null,
    createdAtLabel: formatDateTimeLabel(registration.createdAt, organizer.timeZone),
    timeline: buildRegistrationTimeline(registration)
  };
}

export async function getConfirmedRegistrationView(slug, eventSlug, confirmationToken) {
  const state = await loadPersistentState();
  const registration = getRegistrationByConfirmationToken(state, confirmationToken);

  if (!registration) {
    return {
      state: "error",
      title: "This confirmation could not be found.",
      message: "The registration confirmation link is no longer available."
    };
  }

  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);

  if (!organizer || organizer.slug !== slug || !eventRecord || eventRecord.slug !== eventSlug) {
    return {
      state: "error",
      title: "This confirmation does not match the current event.",
      message: "Return to the event page and create a new registration if you still need access."
    };
  }

  return buildConfirmedView(state, registration);
}

function buildPaymentView(state, registration, stateName = "ready") {
  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);
  const occurrenceRecord = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategoryRecord = getTicketCategoryById(state, registration.ticketCategoryId);

  if (!organizer || !eventRecord || !occurrenceRecord || !ticketCategoryRecord) {
    return {
      state: "error",
      title: "This payment link is no longer available.",
      message: "Return to the event page and create a fresh registration if needed."
    };
  }

  const event = buildEventView(state, organizer, eventRecord);
  const occurrence = event.occurrences.find((entry) => entry.id === occurrenceRecord.id) ?? {
    label: formatDateLabel(occurrenceRecord.startsAt, organizer.timeZone),
    time: formatOccurrenceTimeRange(
      occurrenceRecord.startsAt,
      occurrenceRecord.endsAt,
      organizer.timeZone
    )
  };

  return {
    state: stateName,
    organizer: buildOrganizerView(state, organizer),
    event,
    occurrence,
    ticketCategory: buildTicketCategoryView(
      ticketCategoryRecord,
      occurrenceRecord.prepayPercentage,
      registration.quantity
    ),
    attendee: buildLeadAttendeeFromRegistration(registration),
    attendees: getRegistrationAttendees(registration),
    payment: {
      subtotalLabel: formatCurrencyFromCents(registration.subtotalCents),
      onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
      dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
    },
    registrationCode: registration.registrationCode,
    quantityLabel: pluralize(registration.quantity, "attendee"),
    confirmedAtLabel: registration.confirmedAt
      ? formatDateTimeLabel(registration.confirmedAt, organizer.timeZone)
      : "Not confirmed",
    paymentExpiresAtLabel: registration.expiresAt
      ? formatDateTimeLabel(registration.expiresAt, organizer.timeZone)
      : "Not set",
    paymentExpired: isPaymentExpired(registration),
    restartHref: `/${organizer.slug}/events/${eventRecord.slug}/register?occurrence=${occurrenceRecord.id}`
  };
}

export async function getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken) {
  const state = await loadPersistentState();
  const registration = getRegistrationByPaymentToken(state, paymentToken);

  if (!registration) {
    return {
      state: "error",
      title: "This payment preview could not be found.",
      message: "The payment link is no longer available."
    };
  }

  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);

  if (!organizer || organizer.slug !== slug || !eventRecord || eventRecord.slug !== eventSlug) {
    return {
      state: "error",
      title: "This payment link does not match the selected event.",
      message: "Return to the event page and start again if needed."
    };
  }

  return buildPaymentView(state, registration);
}

export async function getRegistrationPaymentCancellationView(slug, eventSlug, paymentToken) {
  return getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken);
}

export async function resumeRegistrationPayment(input) {
  return mutatePersistentState(async (draft) => {
    const registration = getRegistrationByPaymentToken(draft, input.paymentToken);

    if (!registration || registration.status !== "PENDING_PAYMENT" || isPaymentExpired(registration)) {
      return {
        ok: false,
        message: "This payment window has expired. Create a new registration if seats are still open."
      };
    }

    const organizer = getOrganizerById(draft, registration.organizerId);
    const eventRecord = getEventById(draft, registration.eventTypeId);
    const occurrence = getOccurrenceById(draft, registration.occurrenceId);
    const ticketCategory = getTicketCategoryById(draft, registration.ticketCategoryId);
    const billingGate = getOrganizerOnlinePaymentsGate(organizer);

    if (getStripeEnvironmentState().mode === "live" && !billingGate.enabled) {
      return {
        ok: false,
        message: getOrganizerOnlinePaymentsError(organizer)
      };
    }

    const session = await createStripeCheckoutSession({
      attendeeEmail: registration.attendeeEmail,
      baseUrl: input.baseUrl || getBaseUrl(),
      eventSlug: eventRecord.slug,
      eventTitle: eventRecord.title,
      holdExpiresAt: registration.expiresAt,
      occurrenceId: occurrence.id,
      occurrenceLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
      organizerName: organizer.name,
      payment: {
        onlineAmount: registration.onlineAmountCents / 100,
        onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
        dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
      },
      paymentFingerprint: registration.paymentToken,
      paymentToken: registration.paymentToken,
      quantity: registration.quantity,
      registrationCode: registration.registrationCode,
      slug: organizer.slug,
      stripeAccountId: organizer.stripeAccountId,
      ticketCategoryLabel: ticketCategory.name
    });

    draft.payments.unshift({
      id: createToken(),
      registrationId: registration.id,
      provider: "STRIPE",
      kind: "CHECKOUT_SESSION",
      status: "PENDING",
      amountCents: registration.onlineAmountCents,
      currency: registration.currency,
      externalEventId: null,
      stripeAccountId: organizer.stripeAccountId || null,
      stripeSessionId: session.sessionId,
      stripePaymentIntentId: null,
      note: "Checkout session reopened.",
      metadata: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    await appendAuditLog(draft, {
      actorType: "ATTENDEE",
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "payment_reopened",
      entityType: "registration_payment",
      entityId: registration.id,
      message: `Reopened payment for ${registration.registrationCode}.`
    });

    return {
      ok: true,
      redirectHref: session.url
    };
  });
}

export async function resolveSuccessfulRegistrationConfirmation(input) {
  return mutatePersistentState(async (draft) => {
    const registration = getRegistrationByPaymentToken(draft, input.paymentToken);
    const organizer = registration ? getOrganizerById(draft, registration.organizerId) : null;
    const emailContext =
      registration && organizer ? buildRegistrationEmailContext(draft, registration) : null;

    if (!registration) {
      return {
        state: "error",
        title: "This payment confirmation could not be found.",
        message: "Return to the event page and create a new registration if needed."
      };
    }

    if (
      registration.status !== "PENDING_PAYMENT" &&
      registration.status !== "CONFIRMED_PARTIALLY_PAID" &&
      registration.status !== "CONFIRMED_PAID"
    ) {
      return {
        state: "redirect",
        redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${registration.confirmationToken}`
      };
    }

    if (input.preview === "1") {
      await finalizeOnlinePayment(draft, registration, {
        note: "Preview payment completed from the local payment review page."
      });
    } else if (input.sessionId) {
      const session = await retrieveStripeCheckoutSession(input.sessionId, organizer?.stripeAccountId);

      if (!session || session.payment_status !== "paid") {
        return {
          state: "error",
          title: "Payment is still pending.",
          message: "Stripe has not confirmed this checkout session yet."
        };
      }

      await finalizeOnlinePayment(draft, registration, {
        stripeAccountId: organizer?.stripeAccountId || null,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        note: "Stripe checkout session completed.",
        metadata: {
          amountTotal: session.amount_total ?? 0
        }
      });
    }

    if (emailContext) {
      await sendPaymentCompletionEmails(draft, registration, emailContext);
    }

    await appendAuditLog(draft, {
      actorType: "STRIPE",
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "payment_completed",
      entityType: "registration_payment",
      entityId: registration.id,
      message: `Completed payment for ${registration.registrationCode}.`
    });

    return {
      state: "redirect",
      redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${registration.confirmationToken}`
    };
  });
}

export async function processStripeWebhook(event) {
  if (!event || !event.id) {
    return {
      ok: false,
      message: "Invalid Stripe webhook event."
    };
  }

  return mutatePersistentState(async (draft) => {
    if (draft.payments.some((payment) => payment.externalEventId === event.id)) {
      return {
        ok: true,
        duplicated: true
      };
    }

    const connectedAccountId = event.account || null;

    if (event.type === "account.updated") {
      const account = event.data.object;
      const organizer = getOrganizerByStripeAccountId(
        draft,
        connectedAccountId || account.id || null
      );

      if (!organizer) {
        await appendAuditLog(draft, {
          actorType: "STRIPE",
          eventType: "stripe_webhook_recorded",
          entityType: "stripe_event",
          entityId: event.id,
          message: `Recorded account update ${event.id} without a matching organizer.`,
          metadata: {
            type: event.type,
            stripeAccountId: connectedAccountId || account.id || null
          }
        });

        return {
          ok: true,
          ignored: true
        };
      }

      Object.assign(organizer, getStripeAccountPatch(account, organizer));
      organizer.updatedAt = new Date().toISOString();

      await appendAuditLog(draft, {
        actorType: "STRIPE",
        organizerId: organizer.id,
        eventType: "stripe_account_updated",
        entityType: "organizer",
        entityId: organizer.id,
        message: `Stripe account state synced for ${organizer.name}.`,
        metadata: {
          stripeAccountId: organizer.stripeAccountId,
          stripeConnectionStatus: organizer.stripeConnectionStatus,
          stripeChargesEnabled: organizer.stripeChargesEnabled,
          stripePayoutsEnabled: organizer.stripePayoutsEnabled
        }
      });

      return {
        ok: true
      };
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      const registration = getRegistrationByStripeReference(draft, {
        registrationCode: session.client_reference_id || session.metadata?.registration_code || null,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        stripeSessionId: session.id
      });

      if (!registration) {
        return {
          ok: false,
          message: "No registration matched the Stripe session."
        };
      }

      const organizer = getOrganizerById(draft, registration.organizerId);

      if (
        connectedAccountId &&
        organizer?.stripeAccountId &&
        organizer.stripeAccountId !== connectedAccountId
      ) {
        return {
          ok: false,
          message: "Stripe account mismatch for the matched registration."
        };
      }

      await finalizeOnlinePayment(draft, registration, {
        externalEventId: event.id,
        stripeAccountId: connectedAccountId || organizer?.stripeAccountId || null,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        note:
          event.type === "checkout.session.completed"
            ? "Stripe webhook confirmed checkout completion."
            : "Stripe webhook confirmed async checkout completion.",
        metadata: {
          type: event.type
        }
      });
      const emailContext = organizer ? buildRegistrationEmailContext(draft, registration) : null;

      if (emailContext) {
        await sendPaymentCompletionEmails(draft, registration, emailContext);
      }

      await appendAuditLog(draft, {
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: registration.id,
        eventType: "stripe_webhook_completed",
        entityType: "registration_payment",
        entityId: registration.id,
        message: `Stripe webhook completed for ${registration.registrationCode}.`,
        metadata: {
          stripeEventId: event.id,
          stripeAccountId: connectedAccountId || organizer?.stripeAccountId || null
        }
      });

      return {
        ok: true
      };
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const registration = getRegistrationByStripeReference(draft, {
        registrationCode: session.client_reference_id || session.metadata?.registration_code || null,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        stripeSessionId: session.id
      });
      const organizer = registration ? getOrganizerById(draft, registration.organizerId) : null;

      if (registration) {
        draft.payments.unshift({
          id: createToken(),
          registrationId: registration.id,
          provider: "STRIPE",
          kind: "WEBHOOK",
          status: "FAILED",
          amountCents: registration.onlineAmountCents,
          currency: registration.currency,
          externalEventId: event.id,
          stripeAccountId: connectedAccountId || organizer?.stripeAccountId || null,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null,
          note: "Stripe reported an asynchronous payment failure.",
          metadata: {
            type: event.type
          },
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      await appendAuditLog(draft, {
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: registration?.id || null,
        eventType: "stripe_webhook_recorded",
        entityType: registration ? "registration_payment" : "stripe_event",
        entityId: registration?.id || event.id,
        message: registration
          ? `Stripe reported a failed asynchronous payment for ${registration.registrationCode}.`
          : `Recorded unmatched webhook event ${event.type}.`,
        metadata: {
          type: event.type,
          stripeAccountId: connectedAccountId
        }
      });

      return {
        ok: true,
        ignored: !registration
      };
    }

    if (event.type === "charge.refunded" || event.type.startsWith("charge.dispute.")) {
      const object = event.data.object;
      const registration = getRegistrationByStripeReference(draft, {
        registrationCode: object.metadata?.registration_code || null,
        stripePaymentIntentId:
          typeof object.payment_intent === "string"
            ? object.payment_intent
            : object.payment_intent?.id || null,
        stripeSessionId: null
      });
      const organizer = registration ? getOrganizerById(draft, registration.organizerId) : null;
      const now = new Date().toISOString();

      if (registration) {
        if (event.type === "charge.refunded") {
          const nextRefundedCents = Math.max(
            registration.refundedCents,
            object.amount_refunded ?? 0
          );
          const refundDeltaCents = Math.max(0, nextRefundedCents - registration.refundedCents);

          registration.refundedCents = nextRefundedCents;
          registration.updatedAt = now;

          draft.payments.unshift({
            id: createToken(),
            registrationId: registration.id,
            provider: "STRIPE",
            kind: "REFUND",
            status: "REFUNDED",
            amountCents: refundDeltaCents || nextRefundedCents,
            currency: registration.currency,
            externalEventId: event.id,
            stripeAccountId: connectedAccountId || organizer?.stripeAccountId || null,
            stripeSessionId: null,
            stripePaymentIntentId:
              typeof object.payment_intent === "string"
                ? object.payment_intent
                : object.payment_intent?.id || null,
            note: "Stripe refund recorded.",
            metadata: {
              type: event.type,
              amountRefunded: object.amount_refunded ?? 0
            },
            occurredAt: now,
            createdAt: now
          });
        } else {
          const disputeStatus =
            object.status === "won"
              ? "SUCCEEDED"
              : object.status === "lost"
                ? "FAILED"
                : "PENDING";

          draft.payments.unshift({
            id: createToken(),
            registrationId: registration.id,
            provider: "STRIPE",
            kind: "WEBHOOK",
            status: disputeStatus,
            amountCents: object.amount ?? registration.onlineAmountCents,
            currency: registration.currency,
            externalEventId: event.id,
            stripeAccountId: connectedAccountId || organizer?.stripeAccountId || null,
            stripeSessionId: null,
            stripePaymentIntentId:
              typeof object.payment_intent === "string"
                ? object.payment_intent
                : object.payment_intent?.id || null,
            note: `Stripe dispute update: ${object.status || event.type}.`,
            metadata: {
              type: event.type,
              disputeId: object.id || null
            },
            occurredAt: now,
            createdAt: now
          });
        }
      }

      await appendAuditLog(draft, {
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: registration?.id || null,
        eventType: "stripe_webhook_recorded",
        entityType: registration ? "registration_payment" : "stripe_event",
        entityId: registration?.id || event.id,
        message: registration
          ? `Stripe recorded ${event.type} for ${registration.registrationCode}.`
          : `Recorded unmatched webhook event ${event.type}.`,
        metadata: {
          type: event.type,
          stripeAccountId: connectedAccountId
        }
      });

      return {
        ok: true,
        ignored: !registration
      };
    }

    await appendAuditLog(draft, {
      actorType: "STRIPE",
      eventType: "stripe_webhook_recorded",
      entityType: "stripe_event",
      entityId: event.id,
      message: `Recorded unhandled webhook event ${event.type}.`,
      metadata: {
        type: event.type,
        stripeAccountId: connectedAccountId
      }
    });

    return {
      ok: true,
      ignored: true
    };
  });
}

export async function submitOrganizerRequest(payload) {
  const parsed = joinRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      message: "We still need a few organizer details before the request can be saved."
    };
  }

  const result = await mutatePersistentState(async (draft) => {
    const request = {
      id: createToken(),
      status: "PENDING",
      contactName: normalizeText(parsed.data.contactName),
      contactEmail: normalizeEmail(parsed.data.contactEmail),
      contactPhone: normalizeText(parsed.data.contactPhone),
      organizerName: normalizeText(parsed.data.organizerName),
      city: normalizeText(parsed.data.city),
      launchWindow: normalizeText(parsed.data.launchWindow),
      paymentModel: normalizeText(parsed.data.paymentModel),
      eventFocus: normalizeText(parsed.data.eventFocus),
      note: normalizeText(parsed.data.note),
      approvedAt: null,
      approvedById: null,
      organizerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    draft.joinRequests.unshift(request);

    await sendRegistrationEmail(
      draft,
      "organizer_request_acknowledgement",
      request.contactEmail,
      {
        "{{organizer_name}}": request.organizerName,
        "{{contact_name}}": request.contactName,
        "{{launch_window}}": request.launchWindow,
        "{{payment_model}}": request.paymentModel
      },
      draft.siteSettings.launchInbox
    );
    await sendOrganizerRequestAlert(draft, request);

    await appendAuditLog(draft, {
      actorType: "ATTENDEE",
      eventType: "organizer_join_request_created",
      entityType: "organizer_join_request",
      entityId: request.id,
      message: `Saved a new organizer request for ${request.organizerName}.`
    });

    return request;
  });

  return {
    ok: true,
    request: decorateJoinRequest(result),
    storage: getStorageSummary(),
    notifications: {
      label:
        getStripeEnvironmentState().mode === "live"
          ? "Emails follow the configured delivery settings."
          : "Email delivery is active when Resend credentials are configured; otherwise it is logged locally."
    }
  };
}

export async function listOrganizerRequests() {
  const state = await loadPersistentState();

  return state.joinRequests.map(decorateJoinRequest);
}

export async function listAuditLogs(limit = 50) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const rows = await prisma.auditLog.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc"
      }
    });

    return rows.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString()
    }));
  }

  const state = await loadPersistentState();

  return state.auditLogs.slice(0, limit);
}

export async function authenticatePlatformAdmin(email, password) {
  const admin = await findPlatformAdminForAuthentication(email);

  if (!admin) {
    return null;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);

  return valid ? admin : null;
}

export async function authenticateOrganizerAdmin(slug, email, password) {
  const login = await findOrganizerAdminForAuthentication(slug, email);

  if (!login) {
    return null;
  }

  const valid = await bcrypt.compare(password, login.admin.passwordHash);

  return valid
      ? {
        organizer: login.organizer,
        admin: login.admin
      }
    : null;
}

async function requestPasswordReset({ scope, slug = null, email, baseUrl }) {
  const normalizedEmail = normalizeEmail(email);
  const resetBaseUrl = baseUrl || getBaseUrl();

  return mutatePersistentState(async (draft) => {
    let target;
    let organizer = null;

    if (scope === "platform") {
      target = draft.platformAdmins.find(
        (entry) => entry.email === normalizedEmail && entry.isActive
      );
    } else {
      organizer = getOrganizerRecord(draft, slug);
      target = draft.organizerAdmins.find(
        (entry) =>
          organizer &&
          entry.organizerId === organizer.id &&
          entry.email === normalizedEmail &&
          entry.isActive
      );
    }

    if (!target) {
      return {
        ok: true
      };
    }

    target.passwordResetToken = createToken();
    target.passwordResetExpires = addHours(new Date().toISOString(), 2);
    target.updatedAt = new Date().toISOString();

    const resetUrl =
      scope === "platform"
        ? `${resetBaseUrl}/admin/login/reset/${target.passwordResetToken}`
        : `${resetBaseUrl}/${slug}/admin/login/reset/${target.passwordResetToken}`;

    await sendRegistrationEmail(
      draft,
      "password_reset",
      target.email,
      {
        "{{reset_url}}": resetUrl,
        "{{account_name}}": target.name
      }
    );

    await appendAuditLog(draft, {
      actorType: "SYSTEM",
      organizerId: organizer?.id || null,
      eventType: "password_reset_requested",
      entityType: scope === "platform" ? "platform_admin" : "organizer_admin",
      entityId: target.id,
      message: `Generated a password reset link for ${target.email}.`
    });

    return {
      ok: true,
      token: target.passwordResetToken
    };
  });
}

export async function requestPlatformPasswordReset(email, baseUrl) {
  return requestPasswordReset({
    scope: "platform",
    email,
    baseUrl
  });
}

export async function requestOrganizerPasswordReset(slug, email, baseUrl) {
  return requestPasswordReset({
    scope: "organizer",
    slug,
    email,
    baseUrl
  });
}

export async function resetPlatformPassword(input) {
  const parsed = passwordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a password with at least eight characters."
    };
  }

  return mutatePersistentState(async (draft) => {
    const admin = draft.platformAdmins.find(
      (entry) =>
        entry.passwordResetToken === parsed.data.token &&
        entry.passwordResetExpires &&
        new Date(entry.passwordResetExpires).getTime() > Date.now()
    );

    if (!admin) {
      return {
        ok: false,
        message: "This reset link is invalid or has expired."
      };
    }

    admin.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
    admin.passwordResetToken = null;
    admin.passwordResetExpires = null;
    admin.updatedAt = new Date().toISOString();

    return {
      ok: true
    };
  });
}

export async function resetOrganizerPassword(slug, input) {
  const parsed = passwordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a password with at least eight characters."
    };
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const admin = draft.organizerAdmins.find(
      (entry) =>
        organizer &&
        entry.organizerId === organizer.id &&
        entry.passwordResetToken === parsed.data.token &&
        entry.passwordResetExpires &&
        new Date(entry.passwordResetExpires).getTime() > Date.now()
    );

    if (!admin) {
      return {
        ok: false,
        message: "This reset link is invalid or has expired."
      };
    }

    admin.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
    admin.passwordResetToken = null;
    admin.passwordResetExpires = null;
    admin.updatedAt = new Date().toISOString();

    return {
      ok: true
    };
  });
}
