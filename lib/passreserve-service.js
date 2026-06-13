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
  findPlatformAdminForAuthentication,
  pruneExpiredAuthRateLimits
} from "./passreserve-auth-security.js";
import { calculatePaymentBreakdown } from "./passreserve-domain.js";
import {
  PAYMENT_WINDOW_HOURS,
  HOLD_DURATION_MINUTES,
  getBaseUrl,
  getStorageMode,
  getStorageSummary,
  getTechnicalAuditLogRetentionDays,
  SYSTEM_LOCK_ID
} from "./passreserve-config.js";
import {
  addHours,
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
  getRegistrationOriginLabel,
  getRegistrationSourceLabel,
  getRegistrationSourceNote,
  normalizeReminderLeadHours,
  resolveOrganizerNotificationEmailFromPrisma,
  resolveOrganizerNotificationEmailFromState,
  sendPrismaTemplateEmail,
  sendStateTemplateEmail,
  shouldSendReminderForRegistration
} from "./passreserve-email-delivery.js";
import {
  buildOrganizerPublicHref,
  buildOrganizerRegistrationHref,
  getOrganizerPublicSlug,
  isOrganizerPublished,
  matchesOrganizerPublicSlug
} from "./passreserve-organizer-identity.js";
import {
  listOrganizerApplications as listOrganizerApplicationsState,
  submitOrganizerApplication
} from "./passreserve-organizer-applications.js";
import { getPrismaClient, logDatabaseFallback } from "./passreserve-prisma.js";
import {
  loadFileBackedState,
  loadPersistentState,
  mutatePersistentState,
  readPrismaState
} from "./passreserve-state.js";
import { isProtectedProductionRuntime } from "./passreserve-storage-policy.js";
import {
  createStripeCheckoutSession,
  getStripeEnvironmentState,
  retrieveStripeCheckoutSession
} from "./passreserve-payments.js";
import {
  buildPendingConfirmationRegistration,
  prepareRegistrationBuild
} from "./passreserve-registration-core.js";
import {
  REGISTRATION_CONFIRMATION_MODE,
  resolveRegistrationConfirmationMode
} from "./passreserve-registration-confirmation.js";
import {
  getRegistrationLanguageOptions,
  normalizeRegistrationLocale,
  resolveRegistrationLanguagePromptEnabled
} from "./passreserve-registration-language.js";
import {
  buildRefundPolicySnapshot,
  buildRefundPolicyView,
  requiresRefundPolicyAcceptance
} from "./passreserve-refund-policy.js";
import {
  buildDefaultRegistrationQuestionnaireConfig,
  getRegistrationQuestionnaireFieldRules,
  resolveRegistrationQuestionnaireConfig,
  shouldCollectDietaryFromQuestionnaire
} from "./passreserve-registration-questionnaire.js";

const attendeeSchema = z.object({
  ticketCategoryId: z.string().trim().min(1),
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  dietaryFlags: z.array(z.string()).optional().default([]),
  dietaryOther: z.string().trim().optional().default("")
});

const registrationItemSchema = z.object({
  ticketCategoryId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(8)
});

const requestSchema = z.object({
  slug: z.string().min(1),
  eventSlug: z.string().min(1),
  occurrenceId: z.string().min(1),
  items: z.array(registrationItemSchema).min(1).max(8),
  registrationLocale: z.string().trim().optional().default("en"),
  attendees: z.array(attendeeSchema).min(1).max(8),
  termsAccepted: z.string().trim().optional().default(""),
  refundPolicyAccepted: z.string().trim().optional().default(""),
  responsibilityAccepted: z.string().trim().optional().default(""),
  baseUrl: z.string().trim().optional().default("")
});

const confirmationSchema = z.object({
  slug: z.string().min(1),
  eventSlug: z.string().min(1),
  holdToken: z.string().min(1),
  termsAccepted: z.string().trim().optional().default(""),
  responsibilityAccepted: z.string().trim().optional().default(""),
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

function getRegistrationPaymentCheckoutMode(env = process.env) {
  const stripeEnvironment = getStripeEnvironmentState();

  if (stripeEnvironment.liveCheckoutEnabled) {
    return "live";
  }

  if (env.VERCEL === "1" || isProtectedProductionRuntime(env)) {
    return "unavailable";
  }

  return "preview";
}

function isPreviewPaymentSimulationAllowed(env = process.env) {
  return getRegistrationPaymentCheckoutMode(env) === "preview";
}

function buildInvalidPreviewPaymentResolution() {
  return {
    state: "error",
    title: "This payment return link is not valid.",
    message:
      "Reopen checkout from the pending payment page so Stripe can confirm the payment securely."
  };
}

function buildMissingSessionPaymentResolution() {
  return {
    state: "error",
    title: "Stripe confirmation is missing.",
    message:
      "Reopen checkout from the pending payment page and complete the payment again."
  };
}

const BASE_CONFIRMATION_RULES = [
  {
    field: "termsAccepted",
    label: "Site terms and privacy",
    detail:
      "The attendee acknowledges the Passreserve privacy notice and accepts the site terms of use."
  },
  {
    field: "responsibilityAccepted",
    label: "Attendee readiness",
    detail:
      "The attendee confirms the count, the selected date, and that the occurrence still fits the registered group."
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
    const organizer = await prisma.organizer.findFirst({
      where: {
        publicSlug: slug,
        status: "ACTIVE",
        publicationState: "PUBLISHED"
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
          },
          items: {
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

function getPublishedOrganizerRecord(state, slug) {
  const organizer =
    getSafeEntries(state.organizers).find(
      (entry) => matchesOrganizerPublicSlug(entry, slug) && isOrganizerPublished(entry)
    ) ?? null;

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

function getTicketCategoriesForEvent(state, eventTypeId, options = {}) {
  const includeInactive = options.includeInactive === true;

  return getSafeEntries(state.ticketCategories)
    .filter(
      (category) =>
        category.eventTypeId === eventTypeId && (includeInactive || category.isActive !== false)
    )
    .sort(
      (left, right) =>
        Number(left.sortOrder || 0) - Number(right.sortOrder || 0) ||
        String(left.name || "").localeCompare(String(right.name || ""))
    );
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

function getStripeRefundIdsFromCharge(charge) {
  return (Array.isArray(charge?.refunds?.data) ? charge.refunds.data : [])
    .map((refund) => (typeof refund === "string" ? refund : refund?.id || null))
    .filter(Boolean);
}

function findPendingRefundPaymentForCharge(state, registrationId, charge) {
  const stripePaymentIntentId =
    typeof charge?.payment_intent === "string"
      ? charge.payment_intent
      : charge?.payment_intent?.id || null;
  const refundIds = new Set(getStripeRefundIdsFromCharge(charge));

  return (
    getPaymentsForRegistration(state, registrationId).find((payment) => {
      if (
        payment?.registrationId !== registrationId ||
        payment?.provider !== "STRIPE" ||
        payment?.kind !== "REFUND" ||
        payment?.status !== "PENDING"
      ) {
        return false;
      }

      const pendingRefundId =
        payment?.metadata &&
        typeof payment.metadata === "object" &&
        !Array.isArray(payment.metadata)
          ? payment.metadata.stripeRefundId || null
          : null;

      if (pendingRefundId && refundIds.has(pendingRefundId)) {
        return true;
      }

      return Boolean(stripePaymentIntentId && payment?.stripePaymentIntentId === stripePaymentIntentId);
    }) || null
  );
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

async function getDatabaseRegistrationByStripeReference(
  prisma,
  {
    registrationCode = null,
    stripePaymentIntentId = null,
    stripeSessionId = null
  }
) {
  if (registrationCode) {
    const byCode = await prisma.registration.findUnique({
      where: {
        registrationCode
      },
      include: {
        organizer: true
      }
    });

    if (byCode) {
      return byCode;
    }
  }

  if (stripePaymentIntentId) {
    const payment = await prisma.registrationPayment.findFirst({
      where: {
        stripePaymentIntentId
      },
      include: {
        registration: {
          include: {
            organizer: true
          }
        }
      },
      orderBy: [
        {
          occurredAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    if (payment?.registration) {
      return payment.registration;
    }
  }

  if (stripeSessionId) {
    const payment = await prisma.registrationPayment.findFirst({
      where: {
        stripeSessionId
      },
      include: {
        registration: {
          include: {
            organizer: true
          }
        }
      },
      orderBy: [
        {
          occurredAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    if (payment?.registration) {
      return payment.registration;
    }
  }

  return null;
}

function getStripePaymentIntentId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

function buildPrismaTicketItemSummary(registration, locale = "en") {
  return getSafeEntries(registration?.items).map((item) => {
    const ticketCategory = item.ticketCategory || null;
    const label =
      getLocalizedText(ticketCategory, "name", locale) ||
      ticketCategory?.name ||
      "Ticket";

    return {
      ...item,
      label,
      quantityLabel: `${item.quantity}x`,
      unitPriceLabel: formatCurrencyFromCents(item.unitPriceCents),
      subtotalLabel: formatCurrencyFromCents(item.subtotalCents),
      onlineAmountLabel: formatCurrencyFromCents(item.onlineAmountCents),
      dueAtEventLabel: formatCurrencyFromCents(item.dueAtEventCents)
    };
  });
}

function buildPrismaRegistrationAttendeeViews(registration, locale = "en") {
  return getSafeEntries(registration?.attendees).map((attendee) => {
    const ticketCategory = attendee.ticketCategory || null;

    return {
      ...attendee,
      ticketLabel:
        getLocalizedText(ticketCategory, "name", locale) || ticketCategory?.name || "Ticket"
    };
  });
}

function buildPrismaPaymentView(registration, stateName = "ready") {
  const organizer = registration?.organizer || null;
  const eventRecord = registration?.eventType || null;
  const occurrenceRecord = registration?.occurrence || null;
  const ticketCategoryRecord = registration?.ticketCategory || null;

  if (!organizer || !eventRecord || !occurrenceRecord || !ticketCategoryRecord) {
    return {
      state: "error",
      title: "This payment link is no longer available.",
      message: "Return to the event page and create a fresh registration if needed."
    };
  }

  const locale = normalizeRegistrationLocale(registration.registrationLocale);
  const organizerPublicSlug = getOrganizerPublicSlug(organizer) || organizer.slug;
  const ticketItems = buildPrismaTicketItemSummary(registration, locale);
  const attendee = buildLeadAttendeeFromRegistration(registration);
  const attendees = buildPrismaRegistrationAttendeeViews(registration, locale);

  return {
    state: stateName,
    checkoutMode: getRegistrationPaymentCheckoutMode(),
    locale,
    organizer: {
      id: organizer.id,
      slug: organizer.slug,
      name: getLocalizedText(organizer, "name", locale) || organizer.name,
      organizerHref: organizerPublicSlug ? `/${organizerPublicSlug}` : "/events"
    },
    event: {
      id: eventRecord.id,
      slug: eventRecord.slug,
      title: getLocalizedText(eventRecord, "title", locale) || eventRecord.title,
      detailHref: organizerPublicSlug
        ? `/${organizerPublicSlug}/events/${eventRecord.slug}`
        : `/events`,
      collectionLabel: formatCollectionLabel(eventRecord.prepayPercentage)
    },
    occurrence: {
      id: occurrenceRecord.id,
      label: formatDateLabel(occurrenceRecord.startsAt, organizer.timeZone),
      time: formatOccurrenceTimeRange(
        occurrenceRecord.startsAt,
        occurrenceRecord.endsAt,
        organizer.timeZone
      )
    },
    ticketItems,
    ticketSummaryLabel: buildTicketSummaryLabel(ticketItems),
    attendee,
    attendees,
    payment: {
      subtotal: registration.subtotalCents / 100,
      onlineAmount: registration.onlineAmountCents / 100,
      dueAtEvent: registration.dueAtEventCents / 100,
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
    restartHref: buildOrganizerRegistrationHref(organizer, eventRecord.slug, occurrenceRecord.id)
  };
}

async function loadPrismaRegistrationEmailPayload(prisma, registrationId) {
  const registration = await prisma.registration.findUnique({
    where: {
      id: registrationId
    },
    include: {
      organizer: true,
      eventType: true,
      occurrence: true,
      ticketCategory: true,
      items: {
        include: {
          ticketCategory: true
        },
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  });

  if (
    !registration?.organizer ||
    !registration.eventType ||
    !registration.occurrence ||
    !registration.ticketCategory
  ) {
    return {
      registration,
      emailContext: null,
      platformReplyEmail: null
    };
  }

  const locale = normalizeRegistrationLocale(registration.registrationLocale);
  const ticketItems = buildPrismaTicketItemSummary(registration, locale);
  const siteSettings = await prisma.siteSettings.findUnique({
    where: {
      id: "site-settings"
    },
    select: {
      platformEmail: true
    }
  });
  const organizerNotificationEmail = await resolveOrganizerNotificationEmailFromPrisma(
    prisma,
    registration.organizer
  );

  return {
    registration,
    platformReplyEmail: siteSettings?.platformEmail || null,
    emailContext: {
      organizer: registration.organizer,
      eventRecord: registration.eventType,
      occurrence: registration.occurrence,
      ticketCategory: registration.ticketCategory,
      ticketItems,
      ticketSummaryLabel: buildTicketSummaryLabel(ticketItems),
      locale,
      eventName:
        getLocalizedText(registration.eventType, "title", locale) || registration.eventType.title,
      occurrenceLabel: formatDateLabel(
        registration.occurrence.startsAt,
        registration.organizer.timeZone,
        locale
      ),
      occurrenceTime: formatOccurrenceTimeRange(
        registration.occurrence.startsAt,
        registration.occurrence.endsAt,
        registration.organizer.timeZone,
        locale
      ),
      venueName:
        getLocalizedText(registration.occurrence, "venueTitle", locale) ||
        registration.occurrence.venueTitle ||
        getLocalizedText(registration.eventType, "venueTitle", locale) ||
        registration.eventType.venueTitle ||
        getLocalizedText(registration.organizer, "venueTitle", locale) ||
        registration.organizer.venueTitle,
      supportReplyEmail:
        registration.organizer.publicEmail ||
        registration.organizer.interestEmail ||
        siteSettings?.platformEmail ||
        null,
      organizerNotificationEmail
    }
  };
}

async function recordDatabaseStripeWebhookAudit(
  prisma,
  {
    organizerId = null,
    registrationId = null,
    eventType = "stripe_webhook_recorded",
    entityType = registrationId ? "registration_payment" : "stripe_event",
    entityId = registrationId,
    message,
    metadata = null,
    now = new Date()
  }
) {
  await prisma.auditLog.create({
    data: buildAuditLogCreateData({
      actorType: "STRIPE",
      organizerId,
      registrationId,
      eventType,
      entityType,
      entityId,
      message,
      metadata,
      now
    })
  });
}

async function findOrganizerByStripeAccountId(prisma, stripeAccountId) {
  if (!stripeAccountId) {
    return null;
  }

  return prisma.organizer.findFirst({
    where: {
      stripeAccountId
    }
  });
}

async function processDatabaseStripeAccountWebhook(event) {
  const prisma = getPrismaClient();
  const account = event.data?.object || {};
  const stripeAccountId = event.account || account.id || null;
  const organizer = await findOrganizerByStripeAccountId(prisma, stripeAccountId);
  const now = new Date();

  if (!organizer) {
    await recordDatabaseStripeWebhookAudit(prisma, {
      entityId: event.id,
      message: `Recorded account update ${event.id} without a matching organizer.`,
      metadata: {
        type: event.type,
        stripeEventId: event.id,
        stripeAccountId
      },
      now
    });

    return {
      ok: true,
      ignored: true
    };
  }

  return prisma.$transaction(async (tx) => {
    const currentOrganizer = await tx.organizer.findUnique({
      where: {
        id: organizer.id
      }
    });

    if (!currentOrganizer) {
      return {
        ok: true,
        ignored: true
      };
    }

    const nextPatch = getStripeAccountPatch(account, currentOrganizer);
    const nextOrganizer = {
      ...currentOrganizer,
      ...nextPatch
    };

    await tx.organizer.update({
      where: {
        id: currentOrganizer.id
      },
      data: {
        ...nextPatch,
        updatedAt: now
      }
    });

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "STRIPE",
        organizerId: currentOrganizer.id,
        eventType: "stripe_account_updated",
        entityType: "organizer",
        entityId: currentOrganizer.id,
        message: `Stripe account state synced for ${currentOrganizer.name}.`,
        metadata: {
          stripeEventId: event.id,
          stripeAccountId: stripeAccountId || currentOrganizer.stripeAccountId || null,
          stripeConnectionStatus: nextOrganizer.stripeConnectionStatus,
          stripeChargesEnabled: nextOrganizer.stripeChargesEnabled,
          stripePayoutsEnabled: nextOrganizer.stripePayoutsEnabled
        },
        now
      })
    });

    return {
      ok: true
    };
  });
}

async function processDatabaseStripeCheckoutCompletionWebhook(event) {
  const prisma = getPrismaClient();
  const session = event.data?.object || {};
  const stripeAccountId = event.account || null;
  const stripePaymentIntentId = getStripePaymentIntentId(session.payment_intent);
  const registrationCode = session.client_reference_id || session.metadata?.registration_code || null;
  const registration = await getDatabaseRegistrationByStripeReference(prisma, {
    registrationCode,
    stripePaymentIntentId,
    stripeSessionId: session.id || null
  });
  const organizer =
    registration?.organizer || (await findOrganizerByStripeAccountId(prisma, stripeAccountId));
  const now = new Date();
  const paymentStatus = session.payment_status || null;

  if (paymentStatus && paymentStatus !== "paid") {
    await recordDatabaseStripeWebhookAudit(prisma, {
      organizerId: organizer?.id || null,
      registrationId: registration?.id || null,
      entityId: registration?.id || event.id,
      message: registration
        ? `Stripe checkout completed for ${registration.registrationCode}, but payment is still pending.`
        : `Recorded unmatched pending checkout webhook ${event.type}.`,
      metadata: {
        type: event.type,
        stripeEventId: event.id,
        stripeAccountId,
        stripeSessionId: session.id || null,
        stripePaymentIntentId,
        paymentStatus
      },
      now
    });

    return {
      ok: true,
      ignored: true,
      pending: true
    };
  }

  if (!registration) {
    await recordDatabaseStripeWebhookAudit(prisma, {
      organizerId: organizer?.id || null,
      entityId: event.id,
      message: `Recorded unmatched webhook event ${event.type}.`,
      metadata: {
        type: event.type,
        stripeEventId: event.id,
        stripeAccountId,
        stripeSessionId: session.id || null,
        stripePaymentIntentId
      },
      now
    });

    return {
      ok: true,
      ignored: true
    };
  }

  if (
    stripeAccountId &&
    organizer?.stripeAccountId &&
    organizer.stripeAccountId !== stripeAccountId
  ) {
    return {
      ok: false,
      message: "Stripe account mismatch for the matched registration."
    };
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.registrationPayment.findFirst({
      where: {
        externalEventId: event.id
      },
      select: {
        id: true
      }
    });

    if (duplicate) {
      return {
        ok: true,
        duplicated: true
      };
    }

    const currentRegistration = await tx.registration.findUnique({
      where: {
        id: registration.id
      },
      select: {
        id: true,
        organizerId: true,
        occurrenceId: true,
        eventTypeId: true,
        ticketCategoryId: true,
        attendeeEmail: true,
        attendeeName: true,
        registrationCode: true,
        registrationLocale: true,
        currency: true,
        status: true,
        confirmationToken: true,
        onlineAmountCents: true,
        onlineCollectedCents: true,
        dueAtEventCents: true
      }
    });

    if (!currentRegistration) {
      return {
        ok: true,
        ignored: true
      };
    }

    const captureIdentifiers = [
      session.id
        ? {
            stripeSessionId: session.id
          }
        : null,
      stripePaymentIntentId
        ? {
            stripePaymentIntentId
          }
        : null
    ].filter(Boolean);
    const existingCapture = captureIdentifiers.length
      ? await tx.registrationPayment.findFirst({
          where: {
            registrationId: currentRegistration.id,
            provider: "STRIPE",
            kind: "CAPTURE",
            OR: captureIdentifiers
          },
          orderBy: [
            {
              occurredAt: "desc"
            },
            {
              createdAt: "desc"
            }
          ]
        })
      : null;
    const shouldMarkPaid =
      Number(currentRegistration.onlineCollectedCents || 0) <
      Number(currentRegistration.onlineAmountCents || 0);

    if (shouldMarkPaid) {
      await tx.registration.update({
        where: {
          id: currentRegistration.id
        },
        data: {
          onlineCollectedCents: currentRegistration.onlineAmountCents,
          status:
            currentRegistration.dueAtEventCents > 0
              ? "CONFIRMED_PARTIALLY_PAID"
              : "CONFIRMED_PAID",
          updatedAt: now
        }
      });
    }

    if (existingCapture?.externalEventId && existingCapture.externalEventId !== event.id) {
      return {
        ok: true,
        ignored: true,
        alreadyReconciled: true,
        registrationId: currentRegistration.id,
        shouldSendEmails: shouldMarkPaid
      };
    }

    if (existingCapture) {
      const baseMetadata =
        existingCapture.metadata &&
        typeof existingCapture.metadata === "object" &&
        !Array.isArray(existingCapture.metadata)
          ? existingCapture.metadata
          : {};

      await tx.registrationPayment.update({
        where: {
          id: existingCapture.id
        },
        data: {
          externalEventId: event.id,
          stripeAccountId: stripeAccountId || existingCapture.stripeAccountId || null,
          stripeSessionId: session.id || existingCapture.stripeSessionId || null,
          stripePaymentIntentId:
            stripePaymentIntentId || existingCapture.stripePaymentIntentId || null,
          note:
            event.type === "checkout.session.completed"
              ? "Stripe webhook confirmed checkout completion."
              : "Stripe webhook confirmed async checkout completion.",
          metadata: {
            ...baseMetadata,
            type: event.type,
            stripeEventId: event.id,
            paymentStatus,
            amountTotal: session.amount_total ?? baseMetadata.amountTotal ?? null
          },
          occurredAt: now
        }
      });
    } else {
      await tx.registrationPayment.create({
        data: buildPrismaPaymentCreateData({
          id: createToken(),
          registrationId: currentRegistration.id,
          provider: "STRIPE",
          kind: "CAPTURE",
          status: "SUCCEEDED",
          amountCents: currentRegistration.onlineAmountCents,
          currency: currentRegistration.currency,
          externalEventId: event.id,
          stripeAccountId: stripeAccountId || organizer?.stripeAccountId || null,
          stripeSessionId: session.id || null,
          stripePaymentIntentId,
          note:
            event.type === "checkout.session.completed"
              ? "Stripe webhook confirmed checkout completion."
              : "Stripe webhook confirmed async checkout completion.",
          metadata: {
            type: event.type,
            stripeEventId: event.id,
            paymentStatus,
            amountTotal: session.amount_total ?? null
          },
          occurredAt: now.toISOString(),
          createdAt: now.toISOString()
        })
      });
    }

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: currentRegistration.id,
        eventType: "stripe_webhook_completed",
        entityType: "registration_payment",
        entityId: currentRegistration.id,
        message: `Stripe webhook completed for ${currentRegistration.registrationCode}.`,
        metadata: {
          stripeEventId: event.id,
          stripeAccountId: stripeAccountId || organizer?.stripeAccountId || null,
          stripeSessionId: session.id || null,
          stripePaymentIntentId,
          linkedExistingCapture: Boolean(existingCapture)
        },
        now
      })
    });

    return {
      ok: true,
      registrationId: currentRegistration.id,
      shouldSendEmails: shouldMarkPaid
    };
  });

  if (!outcome.shouldSendEmails || !outcome.registrationId) {
    return outcome;
  }

  const emailPayload = await loadPrismaRegistrationEmailPayload(prisma, outcome.registrationId);

  if (!emailPayload.registration || !emailPayload.emailContext) {
    return outcome;
  }

  await sendPrismaPaymentCompletionEmails(
    prisma,
    emailPayload.registration,
    emailPayload.emailContext,
    emailPayload.platformReplyEmail
  );

  return outcome;
}

async function processDatabaseStripeAsyncPaymentFailedWebhook(event) {
  const prisma = getPrismaClient();
  const session = event.data?.object || {};
  const stripeAccountId = event.account || null;
  const stripePaymentIntentId = getStripePaymentIntentId(session.payment_intent);
  const registration = await getDatabaseRegistrationByStripeReference(prisma, {
    registrationCode: session.client_reference_id || session.metadata?.registration_code || null,
    stripePaymentIntentId,
    stripeSessionId: session.id || null
  });
  const organizer =
    registration?.organizer || (await findOrganizerByStripeAccountId(prisma, stripeAccountId));
  const now = new Date();

  if (!registration) {
    await recordDatabaseStripeWebhookAudit(prisma, {
      organizerId: organizer?.id || null,
      entityId: event.id,
      message: `Recorded unmatched webhook event ${event.type}.`,
      metadata: {
        type: event.type,
        stripeEventId: event.id,
        stripeAccountId,
        stripeSessionId: session.id || null,
        stripePaymentIntentId
      },
      now
    });

    return {
      ok: true,
      ignored: true
    };
  }

  if (
    stripeAccountId &&
    organizer?.stripeAccountId &&
    organizer.stripeAccountId !== stripeAccountId
  ) {
    return {
      ok: false,
      message: "Stripe account mismatch for the matched registration."
    };
  }

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.registrationPayment.findFirst({
      where: {
        externalEventId: event.id
      },
      select: {
        id: true
      }
    });

    if (duplicate) {
      return {
        ok: true,
        duplicated: true
      };
    }

    const currentRegistration = await tx.registration.findUnique({
      where: {
        id: registration.id
      },
      select: {
        id: true,
        organizerId: true,
        registrationCode: true,
        onlineAmountCents: true,
        currency: true
      }
    });

    if (!currentRegistration) {
      return {
        ok: true,
        ignored: true
      };
    }

    await tx.registrationPayment.create({
      data: buildPrismaPaymentCreateData({
        id: createToken(),
        registrationId: currentRegistration.id,
        provider: "STRIPE",
        kind: "WEBHOOK",
        status: "FAILED",
        amountCents: currentRegistration.onlineAmountCents,
        currency: currentRegistration.currency,
        externalEventId: event.id,
        stripeAccountId: stripeAccountId || organizer?.stripeAccountId || null,
        stripeSessionId: session.id || null,
        stripePaymentIntentId,
        note: "Stripe reported an asynchronous payment failure.",
        metadata: {
          type: event.type,
          stripeEventId: event.id,
          paymentStatus: session.payment_status || null
        },
        occurredAt: now.toISOString(),
        createdAt: now.toISOString()
      })
    });

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: currentRegistration.id,
        eventType: "stripe_webhook_recorded",
        entityType: "registration_payment",
        entityId: currentRegistration.id,
        message: `Stripe reported a failed asynchronous payment for ${currentRegistration.registrationCode}.`,
        metadata: {
          type: event.type,
          stripeEventId: event.id,
          stripeAccountId: stripeAccountId || organizer?.stripeAccountId || null
        },
        now
      })
    });

    return {
      ok: true
    };
  });
}

async function processDatabaseStripeDisputeWebhook(event) {
  const prisma = getPrismaClient();
  const object = event.data?.object || {};
  const stripeAccountId = event.account || null;
  const stripePaymentIntentId = getStripePaymentIntentId(object.payment_intent);
  const registration = await getDatabaseRegistrationByStripeReference(prisma, {
    registrationCode: object.metadata?.registration_code || null,
    stripePaymentIntentId,
    stripeSessionId: null
  });
  const organizer =
    registration?.organizer || (await findOrganizerByStripeAccountId(prisma, stripeAccountId));
  const now = new Date();

  if (!registration) {
    await recordDatabaseStripeWebhookAudit(prisma, {
      organizerId: organizer?.id || null,
      entityId: event.id,
      message: `Recorded unmatched webhook event ${event.type}.`,
      metadata: {
        type: event.type,
        stripeEventId: event.id,
        stripeAccountId,
        disputeId: object.id || null,
        stripePaymentIntentId
      },
      now
    });

    return {
      ok: true,
      ignored: true
    };
  }

  if (
    stripeAccountId &&
    organizer?.stripeAccountId &&
    organizer.stripeAccountId !== stripeAccountId
  ) {
    return {
      ok: false,
      message: "Stripe account mismatch for the matched registration."
    };
  }

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.registrationPayment.findFirst({
      where: {
        externalEventId: event.id
      },
      select: {
        id: true
      }
    });

    if (duplicate) {
      return {
        ok: true,
        duplicated: true
      };
    }

    const currentRegistration = await tx.registration.findUnique({
      where: {
        id: registration.id
      },
      select: {
        id: true,
        organizerId: true,
        registrationCode: true,
        onlineAmountCents: true,
        currency: true
      }
    });

    if (!currentRegistration) {
      return {
        ok: true,
        ignored: true
      };
    }

    const disputeStatus =
      object.status === "won" ? "SUCCEEDED" : object.status === "lost" ? "FAILED" : "PENDING";

    await tx.registrationPayment.create({
      data: buildPrismaPaymentCreateData({
        id: createToken(),
        registrationId: currentRegistration.id,
        provider: "STRIPE",
        kind: "WEBHOOK",
        status: disputeStatus,
        amountCents: object.amount ?? currentRegistration.onlineAmountCents,
        currency: currentRegistration.currency,
        externalEventId: event.id,
        stripeAccountId: stripeAccountId || organizer?.stripeAccountId || null,
        stripeSessionId: null,
        stripePaymentIntentId,
        note: `Stripe dispute update: ${object.status || event.type}.`,
        metadata: {
          type: event.type,
          stripeEventId: event.id,
          disputeId: object.id || null
        },
        occurredAt: now.toISOString(),
        createdAt: now.toISOString()
      })
    });

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: currentRegistration.id,
        eventType: "stripe_webhook_recorded",
        entityType: "registration_payment",
        entityId: currentRegistration.id,
        message: `Stripe recorded ${event.type} for ${currentRegistration.registrationCode}.`,
        metadata: {
          type: event.type,
          stripeEventId: event.id,
          stripeAccountId: stripeAccountId || organizer?.stripeAccountId || null,
          disputeId: object.id || null
        },
        now
      })
    });

    return {
      ok: true
    };
  });
}

async function processDatabaseUnhandledStripeWebhook(event) {
  const prisma = getPrismaClient();
  const stripeAccountId = event.account || null;
  const organizer = await findOrganizerByStripeAccountId(prisma, stripeAccountId);

  await recordDatabaseStripeWebhookAudit(prisma, {
    organizerId: organizer?.id || null,
    entityId: event.id,
    message: `Recorded unhandled webhook event ${event.type}.`,
    metadata: {
      type: event.type,
      stripeEventId: event.id,
      stripeAccountId
    }
  });

  return {
    ok: true,
    ignored: true
  };
}

async function processDatabaseStripeWebhook(event) {
  if (event.type === "account.updated") {
    return processDatabaseStripeAccountWebhook(event);
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    return processDatabaseStripeCheckoutCompletionWebhook(event);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    return processDatabaseStripeAsyncPaymentFailedWebhook(event);
  }

  if (event.type === "charge.refunded") {
    return processDatabaseStripeRefundWebhook(event);
  }

  if (event.type.startsWith("charge.dispute.")) {
    return processDatabaseStripeDisputeWebhook(event);
  }

  return processDatabaseUnhandledStripeWebhook(event);
}

async function processDatabaseStripeRefundWebhook(event) {
  const prisma = getPrismaClient();
  const object = event.data?.object;
  const connectedAccountId = event.account || null;
  const registrationCode = object?.metadata?.registration_code || null;
  const stripePaymentIntentId =
    typeof object?.payment_intent === "string"
      ? object.payment_intent
      : object?.payment_intent?.id || null;
  const registration = await getDatabaseRegistrationByStripeReference(prisma, {
    registrationCode,
    stripePaymentIntentId,
    stripeSessionId: null
  });
  const organizer =
    registration?.organizer ||
    (connectedAccountId
      ? await prisma.organizer.findFirst({
          where: {
            stripeAccountId: connectedAccountId
          }
        })
      : null);
  const now = new Date();
  const nowIso = now.toISOString();
  const refundIds = getStripeRefundIdsFromCharge(object);

  if (!registration) {
    await prisma.auditLog.create({
      data: {
        id: createToken(),
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: null,
        eventType: "stripe_webhook_recorded",
        entityType: "stripe_event",
        entityId: event.id,
        message: `Recorded unmatched webhook event ${event.type}.`,
        metadata: {
          type: event.type,
          stripeAccountId: connectedAccountId,
          stripeRefundIds: refundIds
        },
        createdAt: now
      }
    });

    return {
      ok: true,
      ignored: true
    };
  }

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

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.registrationPayment.findFirst({
      where: {
        externalEventId: event.id
      },
      select: {
        id: true
      }
    });

    if (duplicate) {
      return {
        ok: true,
        duplicated: true
      };
    }

    const currentRegistration = await tx.registration.findUnique({
      where: {
        id: registration.id
      },
      select: {
        id: true,
        organizerId: true,
        registrationCode: true,
        refundedCents: true,
        currency: true
      }
    });

    if (!currentRegistration) {
      return {
        ok: true,
        ignored: true
      };
    }

    const registrationPayments = await tx.registrationPayment.findMany({
      where: {
        registrationId: currentRegistration.id
      },
      orderBy: [
        {
          occurredAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ]
    });
    const pendingRefundPayment = findPendingRefundPaymentForCharge(
      {
        payments: registrationPayments
      },
      currentRegistration.id,
      object
    );
    const nextRefundedCents = Math.max(
      Number(currentRegistration.refundedCents || 0),
      Number(object?.amount_refunded || 0)
    );
    const refundDeltaCents = Math.max(
      0,
      nextRefundedCents - Number(currentRegistration.refundedCents || 0)
    );

    await tx.registration.update({
      where: {
        id: currentRegistration.id
      },
      data: {
        refundedCents: nextRefundedCents,
        updatedAt: now
      }
    });

    if (pendingRefundPayment) {
      const baseMetadata =
        pendingRefundPayment.metadata &&
        typeof pendingRefundPayment.metadata === "object" &&
        !Array.isArray(pendingRefundPayment.metadata)
          ? pendingRefundPayment.metadata
          : {};

      await tx.registrationPayment.update({
        where: {
          id: pendingRefundPayment.id
        },
        data: {
          status: "REFUNDED",
          amountCents:
            refundDeltaCents > 0 ? refundDeltaCents : pendingRefundPayment.amountCents,
          externalEventId: event.id,
          stripeAccountId:
            connectedAccountId ||
            organizer?.stripeAccountId ||
            pendingRefundPayment.stripeAccountId ||
            null,
          stripePaymentIntentId:
            stripePaymentIntentId || pendingRefundPayment.stripePaymentIntentId || null,
          note: "Stripe refund confirmed by webhook.",
          occurredAt: now,
          metadata: {
            ...baseMetadata,
            type: event.type,
            amountRefunded: object?.amount_refunded ?? 0,
            stripeRefundStatus: "succeeded",
            stripeEventId: event.id,
            reconciledAt: nowIso,
            stripeRefundIds: refundIds
          }
        }
      });
    } else {
      await tx.registrationPayment.create({
        data: {
          id: createToken(),
          registrationId: currentRegistration.id,
          provider: "STRIPE",
          kind: "REFUND",
          status: "REFUNDED",
          amountCents: refundDeltaCents || nextRefundedCents,
          currency: currentRegistration.currency,
          externalEventId: event.id,
          stripeAccountId: connectedAccountId || organizer?.stripeAccountId || null,
          stripeSessionId: null,
          stripePaymentIntentId,
          note: "Stripe refund recorded.",
          metadata: {
            type: event.type,
            amountRefunded: object?.amount_refunded ?? 0,
            stripeRefundIds: refundIds
          },
          occurredAt: now,
          createdAt: now
        }
      });
    }

    await tx.auditLog.create({
      data: {
        id: createToken(),
        actorType: "STRIPE",
        organizerId: organizer?.id || currentRegistration.organizerId,
        registrationId: currentRegistration.id,
        eventType: "stripe_refund_confirmed",
        entityType: "registration_payment",
        entityId: currentRegistration.id,
        message: `Stripe confirmed a refund for ${currentRegistration.registrationCode || currentRegistration.id}.`,
        metadata: {
          type: event.type,
          stripeAccountId: connectedAccountId,
          refundDeltaCents,
          matchedPendingRefund: Boolean(pendingRefundPayment),
          stripeRefundIds: refundIds
        },
        createdAt: now
      }
    });

    return {
      ok: true
    };
  });
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

function getRegistrationItems(registration) {
  if (Array.isArray(registration?.items) && registration.items.length) {
    return registration.items
      .filter((item) => item?.ticketCategoryId && Number(item.quantity || 0) > 0)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  }

  if (registration?.ticketCategoryId && Number(registration.quantity || 0) > 0) {
    return [
      {
        id: `${registration.id}-legacy-item`,
        registrationId: registration.id,
        ticketCategoryId: registration.ticketCategoryId,
        sortOrder: 0,
        quantity: registration.quantity,
        unitPriceCents:
          registration.quantity > 0
            ? Math.round((registration.subtotalCents || 0) / registration.quantity)
            : registration.subtotalCents || 0,
        subtotalCents: registration.subtotalCents || 0,
        onlineAmountCents: registration.onlineAmountCents || 0,
        dueAtEventCents: registration.dueAtEventCents || 0,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt
      }
    ];
  }

  return [];
}

function getDefaultTicketCategory(ticketCategories = []) {
  return (
    getSafeEntries(ticketCategories).find((category) => category.isDefault) ??
    getSafeEntries(ticketCategories)[0] ??
    null
  );
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

function buildRegistrationAttendeeViews(state, registration, locale = "en") {
  return getRegistrationAttendees(registration).map((attendee) => {
    const ticketCategory = getTicketCategoryById(state, attendee.ticketCategoryId);

    return {
      ...attendee,
      ticketLabel:
        getLocalizedText(ticketCategory, "name", locale) || ticketCategory?.name || "Ticket"
    };
  });
}

function buildOrganizerLinks(organizer) {
  return {
    organizerHref: buildOrganizerPublicHref(organizer),
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

function formatPriceRangeLabel(ticketCategories = []) {
  const prices = getSafeEntries(ticketCategories)
    .map((category) => Number(category.unitPriceCents || 0))
    .filter((value) => value >= 0)
    .sort((left, right) => left - right);

  if (!prices.length) {
    return formatCurrencyFromCents(0);
  }

  if (prices[0] === prices[prices.length - 1]) {
    return formatCurrencyFromCents(prices[0]);
  }

  return `${formatCurrencyFromCents(prices[0])} - ${formatCurrencyFromCents(prices[prices.length - 1])}`;
}

function buildTicketItemSummary(state, registration, locale = "en") {
  return getRegistrationItems(registration).map((item) => {
    const ticketCategory = getTicketCategoryById(state, item.ticketCategoryId);
    const label =
      getLocalizedText(ticketCategory, "name", locale) ||
      ticketCategory?.name ||
      "Ticket";

    return {
      ...item,
      label,
      quantityLabel: `${item.quantity}x`,
      unitPriceLabel: formatCurrencyFromCents(item.unitPriceCents),
      subtotalLabel: formatCurrencyFromCents(item.subtotalCents),
      onlineAmountLabel: formatCurrencyFromCents(item.onlineAmountCents),
      dueAtEventLabel: formatCurrencyFromCents(item.dueAtEventCents)
    };
  });
}

function buildTicketSummaryLabel(ticketItems = []) {
  return ticketItems.length
    ? ticketItems.map((item) => `${item.label} x${item.quantity}`).join(" · ")
    : "Ticket";
}

function buildTicketCategoryView(category, prepayPercentage, locale = "en", quantity = 1) {
  const payment = calculatePaymentBreakdown({
    unitPrice: category.unitPriceCents / 100,
    quantity,
    prepayPercentage
  });

  return {
    id: category.id,
    slug: category.slug,
    label: getLocalizedText(category, "name", locale) || category.name,
    summary: getLocalizedText(category, "description", locale) || category.description,
    included: getLocalizedList(category, "included", locale),
    unitPrice: category.unitPriceCents / 100,
    unitPriceLabel: formatCurrencyFromCents(category.unitPriceCents),
    isDefault: Boolean(category.isDefault),
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
    registrationHref: buildOrganizerRegistrationHref(organizer, event.slug, occurrence.id),
    ticketCategories: getSafeEntries(ticketCategories).map((category) =>
      buildTicketCategoryView(category, occurrence.prepayPercentage, locale)
    )
  };
}

function buildEventView(state, organizer, event, locale = "en") {
  if (!event) {
    return null;
  }

  const registrationQuestionnaireConfig = resolveRegistrationQuestionnaireConfig(organizer, event);
  const registrationLanguagePromptEnabled = resolveRegistrationLanguagePromptEnabled(
    organizer,
    event
  );
  const registrationConfirmationMode = resolveRegistrationConfirmationMode(organizer, event);
  const ticketCategories = getTicketCategoriesForEvent(state, event.id);
  const occurrences = getOccurrencesForEvent(state, event.id)
    .filter(isFutureOccurrence)
    .map((occurrence) =>
      buildOccurrenceView(state, organizer, event, occurrence, ticketCategories, locale)
    )
    .filter(Boolean);
  const nextOccurrence = occurrences[0] ?? null;
  const ticketCategoryViews = ticketCategories.map((category) =>
    buildTicketCategoryView(category, event.prepayPercentage, locale)
  );
  const defaultTicketCategory = getDefaultTicketCategory(ticketCategoryViews);
  const payment = calculatePaymentBreakdown({
    unitPrice: event.basePriceCents / 100,
    quantity: 1,
    prepayPercentage: event.prepayPercentage
  });
  const refundPolicy = buildRefundPolicyView(event, locale);
  const organizerName = getLocalizedText(organizer, "name", locale) || organizer?.name || "";
  const organizerSlug = getOrganizerPublicSlug(organizer) || "";
  const organizerEmail = organizer?.publicEmail || "";

  return {
    id: event.id,
    slug: event.slug,
    title: getLocalizedText(event, "title", locale) || event.title,
    category: event.category,
    summary: getLocalizedText(event, "summary", locale) || event.summary,
    description: getLocalizedText(event, "description", locale) || event.description,
    audience: getLocalizedText(event, "audience", locale) || event.audience,
    duration:
      Number.isFinite(event.durationMinutes) && event.durationMinutes > 0
        ? `${Math.floor(event.durationMinutes / 60)}h ${String(event.durationMinutes % 60).padStart(2, "0")}m`
        : null,
    venueTitle: getLocalizedText(event, "venueTitle", locale) || event.venueTitle,
    venueDetail: getLocalizedText(event, "venueDetail", locale) || event.venueDetail,
    attendeeInstructions:
      getLocalizedText(event, "attendeeInstructions", locale) || event.attendeeInstructions,
    organizerNotes: event.organizerNotes,
    cancellationPolicy:
      getLocalizedText(event, "cancellationPolicy", locale) || event.cancellationPolicy,
    refundPolicyType: event.refundPolicyType || null,
    refundPolicy,
    prepayPercentage: event.prepayPercentage,
    collectDietaryInfo: shouldCollectDietaryFromQuestionnaire(registrationQuestionnaireConfig),
    registrationQuestionnaireConfig,
    registrationLanguagePromptEnabled,
    supportedRegistrationLanguages: getRegistrationLanguageOptions(locale),
    registrationConfirmationMode,
    salesWindow: resolveEventSalesWindow(event),
    highlights: getLocalizedList(event, "highlights", locale),
    included: getLocalizedList(event, "included", locale),
    gallery: event.gallery || [],
    policies: getLocalizedList(event, "policies", locale),
    faq: event.faq || [],
    organizerSlug,
    organizerAdminSlug: organizer?.slug || "",
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
    priceRangeLabel: formatPriceRangeLabel(ticketCategories),
    nextOccurrence,
    nextOccurrenceLabel: nextOccurrence ? nextOccurrence.label : "No upcoming dates",
    ticketCategories: ticketCategoryViews,
    defaultTicketCategory,
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
    .map((event) => {
      const occurrence = event.occurrences[0] ?? null;

      if (!occurrence) {
        return null;
      }

      return {
        id: occurrence.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        label: occurrence.label,
        time: occurrence.time,
        note: occurrence.note,
        capacity: occurrence.capacityLabel,
        priceLabel: event.priceLabel,
        collectionLabel: event.collectionLabel
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.label.localeCompare(right.label));
  const organizerName = getLocalizedText(organizer, "name", locale) || organizer.name;
  const venueTitle = getLocalizedText(organizer, "venueTitle", locale) || venues[0]?.title || organizer.venueTitle;
  const venueDetail =
    getLocalizedText(organizer, "venueDetail", locale) || venues[0]?.detail || organizer.venueDetail;

  return {
    ...organizer,
    internalSlug: organizer.slug,
    publicSlug: getOrganizerPublicSlug(organizer),
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
  const organizer = getPublishedOrganizerRecord(state, slug);

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
  const selectedTicketCategory = getDefaultTicketCategory(selectedOccurrence?.ticketCategories ?? []);
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
    provisioningStatusLabel:
      request.provisioningStatus === "PROVISIONED"
        ? "Provisioned"
        : request.provisioningStatus === "DUPLICATE"
          ? "Duplicate email"
          : request.provisioningStatus === "EMAIL_FAILED"
            ? "Access email failed"
            : "Pending",
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

const TECHNICAL_AUDIT_LOG_EVENT_TYPES = [
  "organizer_admin_login_success",
  "platform_admin_login_success",
  "payment_checkout_started",
  "payment_checkout_failed",
  "payment_reopened",
  "stripe_account_updated",
  "stripe_webhook_completed",
  "stripe_webhook_recorded"
];

function buildPaymentCheckoutAuditMetadata({
  checkoutMode = null,
  fallbackToPreview = false,
  failureReason = null,
  redirectHref = null,
  source = null,
  stripeAccountId = null,
  stripeSessionId = null
} = {}) {
  return {
    ...(source
      ? {
          source
        }
      : {}),
    ...(checkoutMode
      ? {
          checkoutMode
        }
      : {}),
    ...(redirectHref
      ? {
          redirectHref
        }
      : {}),
    ...(stripeAccountId
      ? {
          stripeAccountId
        }
      : {}),
    ...(stripeSessionId
      ? {
          stripeSessionId
        }
      : {}),
    ...(fallbackToPreview
      ? {
          fallbackToPreview: true
        }
      : {}),
    ...(failureReason
      ? {
          failureReason
        }
      : {})
  };
}

async function appendPaymentCheckoutAuditLog(draft, input) {
  const isFailure = input.eventType === "payment_checkout_failed";

  return appendAuditLog(draft, {
    actorType: input.actorType || "ATTENDEE",
    actorId: input.actorId || null,
    organizerId: input.organizerId || null,
    registrationId: input.registrationId,
    eventType: input.eventType,
    entityType: "registration_payment",
    entityId: input.registrationId,
    message: isFailure
      ? `Failed to open payment handoff for ${input.registrationCode}.`
      : `Opened payment handoff for ${input.registrationCode}.`,
    metadata: input.metadata || null,
    createdAt: input.createdAt || null
  });
}

async function createPrismaAuditLog(prisma, input) {
  return prisma.auditLog.create({
    data: buildAuditLogCreateData({
      actorType: input.actorType || "SYSTEM",
      actorId: input.actorId || null,
      organizerId: input.organizerId || null,
      registrationId: input.registrationId || null,
      eventType: input.eventType,
      entityType: input.entityType || "registration",
      entityId: input.entityId ?? input.registrationId ?? null,
      message: input.message,
      metadata: input.metadata || null,
      now: input.now || new Date()
    })
  });
}

async function createPrismaPaymentCheckoutAuditLog(prisma, input) {
  const isFailure = input.eventType === "payment_checkout_failed";

  return createPrismaAuditLog(prisma, {
    actorType: input.actorType || "ATTENDEE",
    actorId: input.actorId || null,
    organizerId: input.organizerId || null,
    registrationId: input.registrationId,
    eventType: input.eventType,
    entityType: "registration_payment",
    entityId: input.registrationId,
    message: isFailure
      ? `Failed to open payment handoff for ${input.registrationCode}.`
      : `Opened payment handoff for ${input.registrationCode}.`,
    metadata: input.metadata || null,
    now: input.now || new Date()
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

const DISCOVERY_DEFAULT_COUNTRY_CODE = "italy";

const DISCOVERY_COUNTRY_LABELS = {
  italy: {
    en: "Italy",
    it: "Italia",
    aliases: ["italy", "italia"]
  }
};

const DISCOVERY_REGION_LABELS = {
  tuscany: {
    en: "Tuscany",
    it: "Toscana",
    aliases: ["tuscany", "toscana"]
  }
};

function slugifyDiscoveryValue(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveDiscoveryCountryCode(value = "") {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  for (const [code, labels] of Object.entries(DISCOVERY_COUNTRY_LABELS)) {
    if (labels.aliases.includes(normalizedValue)) {
      return code;
    }
  }

  return slugifyDiscoveryValue(normalizedValue);
}

function resolveDiscoveryRegionCode(value = "") {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  for (const [code, labels] of Object.entries(DISCOVERY_REGION_LABELS)) {
    if (labels.aliases.includes(normalizedValue)) {
      return code;
    }
  }

  return slugifyDiscoveryValue(normalizedValue);
}

function formatDiscoveryCountryLabel(code = "", locale = "en") {
  if (!code) {
    return "";
  }

  const entry = DISCOVERY_COUNTRY_LABELS[code];
  if (entry) {
    return entry[locale] || entry.en;
  }

  return code
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDiscoveryRegionLabel(code = "", rawLabel = "", locale = "en") {
  if (!code) {
    return rawLabel || "";
  }

  const entry = DISCOVERY_REGION_LABELS[code];
  if (entry) {
    return entry[locale] || entry.en;
  }

  return rawLabel || formatDiscoveryCountryLabel(code, locale);
}

function normalizeDiscoveryFilterValue(value, type) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return "";
  }

  if (type === "country") {
    return resolveDiscoveryCountryCode(normalizedValue);
  }

  if (type === "region") {
    return resolveDiscoveryRegionCode(normalizedValue);
  }

  return slugifyDiscoveryValue(normalizedValue);
}

function buildDiscoveryLocationView(city = "", region = "", locale = "en") {
  const cityLabel = city || "";
  const cityCode = cityLabel ? slugifyDiscoveryValue(cityLabel) : "";
  const regionCode = region ? resolveDiscoveryRegionCode(region) : "";

  return {
    countryCode: DISCOVERY_DEFAULT_COUNTRY_CODE,
    countryLabel: formatDiscoveryCountryLabel(DISCOVERY_DEFAULT_COUNTRY_CODE, locale),
    cityLabel,
    cityCode,
    regionLabel: region || "",
    regionCode,
    filterRegionLabel: formatDiscoveryRegionLabel(regionCode, region, locale)
  };
}

function buildDiscoveryEntry(baseEntry, locale = "en") {
  const location = buildDiscoveryLocationView(baseEntry.city, baseEntry.region, locale);

  return {
    ...baseEntry,
    country: location.countryLabel,
    countryCode: location.countryCode,
    city: location.cityLabel,
    cityCode: location.cityCode,
    region: location.regionLabel,
    regionCode: location.regionCode,
    regionFilterLabel: location.filterRegionLabel
  };
}

function matchesDiscoveryFilters(entry, filters) {
  if (filters.country && entry.countryCode !== filters.country) {
    return false;
  }

  if (filters.region && entry.regionCode !== filters.region) {
    return false;
  }

  if (filters.city && entry.cityCode !== filters.city) {
    return false;
  }

  return true;
}

function sortDiscoveryOptions(options) {
  return options.sort((left, right) => left.label.localeCompare(right.label));
}

function buildDiscoveryFilterOptions(entries, appliedCountry = "", appliedRegion = "") {
  const countries = sortDiscoveryOptions(
    Array.from(
      new Map(
        entries.map((entry) => [entry.countryCode, { code: entry.countryCode, label: entry.country }])
      ).values()
    )
  );

  const countryScopedEntries = appliedCountry
    ? entries.filter((entry) => entry.countryCode === appliedCountry)
    : entries;

  const regions = sortDiscoveryOptions(
    Array.from(
      new Map(
        countryScopedEntries.map((entry) => [
          entry.regionCode,
          { code: entry.regionCode, label: entry.regionFilterLabel || entry.region }
        ])
      ).values()
    ).filter((entry) => entry.code)
  );

  const regionScopedEntries = appliedRegion
    ? countryScopedEntries.filter((entry) => entry.regionCode === appliedRegion)
    : countryScopedEntries;

  const cities = sortDiscoveryOptions(
    Array.from(
      new Map(
        regionScopedEntries.map((entry) => [entry.cityCode, { code: entry.cityCode, label: entry.city }])
      ).values()
    ).filter((entry) => entry.code)
  );

  return { countries, regions, cities };
}

function rankDiscoveryEntries(entries, normalizedQueryLower) {
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
}

export async function getDiscoveryResults(query = "", locale = "en", filters = {}) {
  const requestedFilters = {
    country: normalizeDiscoveryFilterValue(filters.country, "country"),
    region: normalizeDiscoveryFilterValue(filters.region, "region"),
    city: normalizeDiscoveryFilterValue(filters.city, "city")
  };
  const hasActiveFilters = Boolean(
    requestedFilters.country || requestedFilters.region || requestedFilters.city
  );

  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const normalizedQuery = normalizeText(query);
      const eventWhere = {
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE",
          publicationState: "PUBLISHED"
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
        take: normalizedQuery || hasActiveFilters ? undefined : 8,
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
              publicSlug: true,
              publicationState: true,
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
          const organizerName =
            getLocalizedText(event.organizer, "name", locale) || event.organizer.name;
          const organizerTagline =
            getLocalizedText(event.organizer, "tagline", locale) || event.organizer.tagline;
          const eventTitle = getLocalizedText(event, "title", locale) || event.title;
          const eventSummary = getLocalizedText(event, "summary", locale) || event.summary;
          const organizerPublicSlug = getOrganizerPublicSlug(event.organizer);

          return buildDiscoveryEntry(
            {
              id: `${organizerPublicSlug}:${event.slug}`,
              slug: organizerPublicSlug,
              eventSlug: event.slug,
              organizerName,
              organizerTagline,
              organizerHref: `/${organizerPublicSlug}`,
              city: event.organizer.city,
              region: event.organizer.region,
              eventTitle,
              eventSummary,
              eventHref: `/${organizerPublicSlug}/events/${event.slug}`,
              registrationHref: nextOccurrence
                ? `/${organizerPublicSlug}/events/${event.slug}/register?occurrenceId=${nextOccurrence.id}`
                : `/${organizerPublicSlug}/events/${event.slug}`,
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
            },
            locale
          );
        });
      const filterOptions = buildDiscoveryFilterOptions(
        entries,
        requestedFilters.country,
        requestedFilters.region
      );
      const appliedFilters = {
        country: filterOptions.countries.some((entry) => entry.code === requestedFilters.country)
          ? requestedFilters.country
          : "",
        region: filterOptions.regions.some((entry) => entry.code === requestedFilters.region)
          ? requestedFilters.region
          : "",
        city: filterOptions.cities.some((entry) => entry.code === requestedFilters.city)
          ? requestedFilters.city
          : ""
      };
      const scopedFilterOptions = buildDiscoveryFilterOptions(
        entries,
        appliedFilters.country,
        appliedFilters.region
      );
      const filteredEntries = entries.filter((entry) =>
        matchesDiscoveryFilters(entry, appliedFilters)
      );
      const rankedEntries = rankDiscoveryEntries(
        filteredEntries,
        normalizedQuery.toLowerCase()
      );

      return {
        results: normalizedQuery || hasActiveFilters ? rankedEntries : rankedEntries.slice(0, 8),
        filterOptions: scopedFilterOptions,
        appliedFilters
      };
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-service] discovery database query unavailable, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();
  const organizers = getSafeEntries(state.organizers)
    .filter((organizer) => isOrganizerPublished(organizer))
    .map((organizer) => buildOrganizerView(state, organizer, locale));
  const entries = organizers.flatMap((organizer) =>
    organizer.events.map((event) =>
      buildDiscoveryEntry(
        {
          id: `${organizer.publicSlug}:${event.slug}`,
          slug: organizer.publicSlug,
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
        },
        locale
      )
    )
  );
  const normalizedQuery = normalizeText(query).toLowerCase();
  const filterOptions = buildDiscoveryFilterOptions(
    entries,
    requestedFilters.country,
    requestedFilters.region
  );
  const appliedFilters = {
    country: filterOptions.countries.some((entry) => entry.code === requestedFilters.country)
      ? requestedFilters.country
      : "",
    region: filterOptions.regions.some((entry) => entry.code === requestedFilters.region)
      ? requestedFilters.region
      : "",
    city: filterOptions.cities.some((entry) => entry.code === requestedFilters.city)
      ? requestedFilters.city
      : ""
  };
  const scopedFilterOptions = buildDiscoveryFilterOptions(
    entries,
    appliedFilters.country,
    appliedFilters.region
  );
  const filteredEntries = entries.filter((entry) => matchesDiscoveryFilters(entry, appliedFilters));
  const rankedEntries = rankDiscoveryEntries(filteredEntries, normalizedQuery);

  return {
    results: normalizedQuery || hasActiveFilters ? rankedEntries : rankedEntries.slice(0, 8),
    filterOptions: scopedFilterOptions,
    appliedFilters
  };
}

export async function getOrganizerSlugs() {
  const state = await loadPersistentState();

  return getSafeEntries(state.organizers)
    .filter((organizer) => isOrganizerPublished(organizer))
    .map((organizer) => getOrganizerPublicSlug(organizer));
}

export async function getOrganizerPage(slug, options = {}) {
  if (getStorageMode() === "database") {
    const state = await loadPublicOrganizerStateBySlug(slug);
    const organizer = state ? getPublishedOrganizerRecord(state, slug) : null;

    return organizer ? buildOrganizerView(state, organizer, options.locale) : null;
  }

  const state = await loadPersistentState();
  const organizer = getPublishedOrganizerRecord(state, slug);

  return organizer ? buildOrganizerView(state, organizer, options.locale) : null;
}

export async function getEventRouteParams() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const events = await prisma.eventType.findMany({
      where: {
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE",
          publicationState: "PUBLISHED"
        }
      },
      select: {
        slug: true,
        organizer: {
          select: {
            publicSlug: true
          }
        }
      }
    });

    return events.map((event) => ({
      slug: event.organizer.publicSlug,
      eventSlug: event.slug
    }));
  }

  const state = await loadPersistentState();

  return getSafeEntries(state.organizers).flatMap((organizer) =>
    getSafeEntries(state.events)
      .filter(
        (event) =>
          event.organizerId === organizer.id &&
          event.visibility === "PUBLIC" &&
          isOrganizerPublished(organizer)
      )
      .map((event) => ({
        slug: getOrganizerPublicSlug(organizer),
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
  return getRegistrationQuestionnaireFieldRules(
    buildDefaultRegistrationQuestionnaireConfig(),
    "en"
  );
}

export function getConfirmationFieldRules() {
  return BASE_CONFIRMATION_RULES;
}

function validateFinalConfirmationRequirements(payload) {
  const requiredRules = getConfirmationFieldRules();
  const missing = [];

  for (const rule of requiredRules) {
    if (payload[rule.field] !== "yes") {
      missing.push(rule.field);
    }
  }

  if (!missing.length) {
    return null;
  }

  return {
    ok: false,
    message:
      "Confirm the required policy and booking checks before completing the registration.",
    fieldErrors: Object.fromEntries(missing.map((field) => [field, "Required before continuing."]))
  };
}

function validateRefundPolicyAcceptance(payload, event = null, locale = "en") {
  if (!requiresRefundPolicyAcceptance(event, locale)) {
    return null;
  }

  if (payload.refundPolicyAccepted === "yes") {
    return null;
  }

  return {
    ok: false,
    message: "Accept the organizer refund policy before continuing.",
    fieldErrors: {
      refundPolicyAccepted: "Required before continuing."
    }
  };
}

function buildDirectConfirmationRegistration({
  organizerId,
  eventTypeId,
  occurrenceId,
  registrationLocale,
  requestedItems,
  attendees,
  lineItems,
  currency,
  nowIso,
  refundPolicyAcceptedAt = null,
  refundPolicySnapshot = null,
  note = "",
  source = "PUBLIC",
  origin = ""
}) {
  const registration = buildPendingConfirmationRegistration({
    organizerId,
    eventTypeId,
    occurrenceId,
    registrationLocale,
    requestedItems,
    attendees,
    lineItems,
    currency,
    nowIso,
    holdDurationMinutes: HOLD_DURATION_MINUTES,
    note,
    source,
    origin
  });

  registration.holdToken = null;
  registration.confirmedAt = nowIso;
  registration.confirmationToken = registration.confirmationToken || createToken();
  registration.registrationCode = registration.registrationCode || createRegistrationCode();
  registration.termsAcceptedAt = nowIso;
  registration.responsibilityAt = nowIso;
  registration.refundPolicyAcceptedAt = refundPolicyAcceptedAt;
  registration.refundPolicySnapshot = refundPolicySnapshot;
  registration.updatedAt = nowIso;

  if (registration.onlineAmountCents > 0) {
    registration.status = "PENDING_PAYMENT";
    registration.paymentToken = registration.paymentToken || createToken();
    registration.expiresAt = addHours(nowIso, PAYMENT_WINDOW_HOURS);
  } else {
    registration.status = "CONFIRMED_UNPAID";
    registration.paymentToken = null;
    registration.expiresAt = null;
  }

  return registration;
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

  if (getStorageMode() === "database") {
    try {
      return await createRegistrationHoldInDatabase(payload);
    } catch (error) {
      console.error("[passreserve-service] createRegistrationHold failed in database mode", error);

      return {
        ok: false,
        message:
          "We couldn't create the registration hold right now. Please try again in a moment."
      };
    }
  }

  return createRegistrationHoldInFileState(payload);
}

async function createRegistrationHoldInDatabase(payload) {
  const prisma = getPrismaClient();
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYSTEM_LOCK_ID})`);
    const state = await readPrismaState(tx);
    const context = buildRegistrationContext(
      state,
      payload.slug,
      payload.eventSlug,
      payload.occurrenceId
    );

    if (!context?.selectedOccurrence) {
      return {
        ok: false,
        message: "That event occurrence is no longer available."
      };
    }

    const registrationQuestionnaireConfig =
      context.event.registrationQuestionnaireConfig ||
      resolveRegistrationQuestionnaireConfig(context.organizer, context.eventRecord);
    const collectDietaryInfo = shouldCollectDietaryFromQuestionnaire(
      registrationQuestionnaireConfig
    );
    const now = new Date().toISOString();
    const selectedTicketCategories = getSafeEntries(context.selectedOccurrence.ticketCategories)
      .map((category) => getTicketCategoryById(state, category.id))
      .filter(Boolean);
    const buildResult = prepareRegistrationBuild({
      items: payload.items,
      attendees: payload.attendees,
      ticketCategories: selectedTicketCategories,
      collectDietaryInfo,
      registrationQuestionnaireConfig,
      prepayPercentage:
        context.selectedOccurrence.prepayPercentage ?? context.event.prepayPercentage,
      nowIso: now
    });

    if (!buildResult.ok) {
      return buildResult;
    }

    const { lineItems, requestedItems, requestedQuantity, attendees } = buildResult;
    const registrationConfirmationMode = resolveRegistrationConfirmationMode(
      context.organizer,
      context.eventRecord
    );
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

    if (requestedQuantity > capacity.remaining) {
      return {
        ok: false,
        message: "That quantity is no longer available for the selected occurrence.",
        fieldErrors: {
          items: "Choose a smaller quantity or a different date."
        }
      };
    }

    const refundPolicyValidation = validateRefundPolicyAcceptance(
      payload,
      context.eventRecord,
      payload.registrationLocale
    );

    if (refundPolicyValidation) {
      return refundPolicyValidation;
    }

    if (registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM) {
      const confirmationValidation = validateFinalConfirmationRequirements(payload);

      if (confirmationValidation) {
        return confirmationValidation;
      }
    }

    const refundPolicySnapshot = buildRefundPolicySnapshot(
      context.eventRecord,
      payload.registrationLocale
    );

    const registration =
      registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM
        ? buildDirectConfirmationRegistration({
            organizerId: context.organizer.id,
            eventTypeId: context.event.id,
            occurrenceId: context.selectedOccurrence.id,
            registrationLocale: payload.registrationLocale,
            requestedItems,
            attendees,
            lineItems,
            currency: state.siteSettings.stripeCurrencyDefault,
            nowIso: now,
            refundPolicyAcceptedAt: refundPolicySnapshot ? now : null,
            refundPolicySnapshot,
            source: "PUBLIC"
          })
        : buildPendingConfirmationRegistration({
            organizerId: context.organizer.id,
            eventTypeId: context.event.id,
            occurrenceId: context.selectedOccurrence.id,
            registrationLocale: payload.registrationLocale,
            requestedItems,
            attendees,
            lineItems,
            currency: state.siteSettings.stripeCurrencyDefault,
            nowIso: now,
            holdDurationMinutes: HOLD_DURATION_MINUTES,
            refundPolicyAcceptedAt: refundPolicySnapshot ? now : null,
            refundPolicySnapshot,
            source: "PUBLIC"
          });
    const emailContext = buildRegistrationEmailContext(state, registration);

    if (!emailContext) {
      return {
        ok: false,
        message: "That event occurrence is no longer available."
      };
    }

    if (
      registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM &&
      registration.onlineAmountCents > 0
    ) {
      const billingGate = getOrganizerOnlinePaymentsGate(context.organizer);

      if (getStripeEnvironmentState().mode === "live" && !billingGate.enabled) {
        return {
          ok: false,
          message: getOrganizerOnlinePaymentsError(context.organizer)
        };
      }
    }

    await tx.registration.create({
      data: buildPrismaRegistrationCreateData(registration)
    });

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "ATTENDEE",
        organizerId: context.organizer.id,
        registrationId: registration.id,
        eventType:
          registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM
            ? registration.onlineAmountCents > 0
              ? "registration_confirmed_pending_payment"
              : "registration_confirmed"
            : "registration_hold_created",
        message:
          registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM
            ? registration.onlineAmountCents > 0
              ? `Confirmed ${registration.registrationCode} and opened payment.`
              : `Confirmed ${registration.registrationCode} without online payment.`
            : `Created a registration hold for ${context.event.title}.`
      })
    });

    if (registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM) {
      return {
        ok: true,
        registration,
        emailContext,
        organizer: context.organizer,
        eventRecord: context.eventRecord,
        occurrence: context.selectedOccurrence,
        platformReplyEmail: state.siteSettings.platformEmail || null,
        redirectHref:
          registration.onlineAmountCents > 0
            ? null
            : `/${payload.slug}/events/${payload.eventSlug}/register/confirmed/${registration.confirmationToken}`
      };
    }

    return {
      ok: true,
      registration,
      emailContext,
      redirectHref: buildPendingRegistrationHref(
        payload.slug,
        payload.eventSlug,
        payload.registrationLocale
      ),
      confirmationHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirm/${registration.holdToken}`
    };
  });

  if (!outcome.ok) {
    return outcome;
  }

  if (outcome.registration.holdToken === null) {
    if (outcome.registration.onlineAmountCents > 0) {
      let session;

      try {
        session = await createStripeCheckoutSession({
          attendeeEmail: outcome.registration.attendeeEmail,
          eventSlug: outcome.eventRecord.slug,
          eventTitle: outcome.eventRecord.title,
          holdExpiresAt: outcome.registration.expiresAt,
          occurrenceId: outcome.occurrence.id,
          occurrenceLabel: outcome.occurrence.label,
          organizerName: outcome.organizer.name,
          payment: {
            onlineAmount: outcome.registration.onlineAmountCents / 100,
            onlineAmountLabel: formatCurrencyFromCents(outcome.registration.onlineAmountCents),
            dueAtEventLabel: formatCurrencyFromCents(outcome.registration.dueAtEventCents)
          },
          paymentFingerprint: outcome.registration.paymentToken,
          paymentToken: outcome.registration.paymentToken,
          quantity: outcome.registration.quantity,
          registrationCode: outcome.registration.registrationCode,
          slug: getOrganizerPublicSlug(outcome.organizer) || outcome.organizer.slug,
          stripeAccountId: outcome.organizer.stripeAccountId,
          ticketCategoryLabel: outcome.emailContext.ticketSummaryLabel
        });
      } catch (error) {
        console.error("[passreserve-service] failed to create Stripe Checkout session", error);

        await createPrismaPaymentCheckoutAuditLog(prisma, {
          organizerId: outcome.organizer.id,
          registrationId: outcome.registration.id,
          registrationCode: outcome.registration.registrationCode,
          eventType: "payment_checkout_failed",
          metadata: buildPaymentCheckoutAuditMetadata({
            checkoutMode: getStripeEnvironmentState().mode,
            fallbackToPreview: true,
            failureReason: error instanceof Error ? error.message : String(error),
            redirectHref: buildPaymentPreviewHref(
              payload.slug,
              payload.eventSlug,
              outcome.registration.paymentToken
            ),
            source: "registration_direct_confirm",
            stripeAccountId: outcome.organizer.stripeAccountId || null
          })
        });

        await sendPrismaOrganizerNewRegistrationAlert(
          prisma,
          outcome.registration,
          outcome.emailContext,
          outcome.platformReplyEmail
        );

        return {
          ok: true,
          redirectHref: buildPaymentPreviewHref(
            payload.slug,
            payload.eventSlug,
            outcome.registration.paymentToken
          )
        };
      }

      if (session.sessionId) {
        await prisma.registrationPayment.create({
          data: buildPrismaPaymentCreateData({
            id: createToken(),
            registrationId: outcome.registration.id,
            provider: "STRIPE",
            kind: "CHECKOUT_SESSION",
            status: "PENDING",
            amountCents: outcome.registration.onlineAmountCents,
            currency: outcome.registration.currency,
            externalEventId: null,
            stripeAccountId: outcome.organizer.stripeAccountId || null,
            stripeSessionId: session.sessionId,
            stripePaymentIntentId: null,
            note: "Checkout session created.",
            metadata: null,
            occurredAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          })
        });
      }

      await createPrismaPaymentCheckoutAuditLog(prisma, {
        organizerId: outcome.organizer.id,
        registrationId: outcome.registration.id,
        registrationCode: outcome.registration.registrationCode,
        eventType: "payment_checkout_started",
        metadata: buildPaymentCheckoutAuditMetadata({
          checkoutMode: session.mode || getStripeEnvironmentState().mode,
          redirectHref:
            session.url ||
            buildPaymentPreviewHref(payload.slug, payload.eventSlug, outcome.registration.paymentToken),
          source: "registration_direct_confirm",
          stripeAccountId: outcome.organizer.stripeAccountId || null,
          stripeSessionId: session.sessionId || null
        })
      });

      await sendPrismaOrganizerNewRegistrationAlert(
        prisma,
        outcome.registration,
        outcome.emailContext,
        outcome.platformReplyEmail
      );

      return {
        ok: true,
        redirectHref:
          session.url ||
          buildPaymentPreviewHref(payload.slug, payload.eventSlug, outcome.registration.paymentToken)
      };
    }

    await sendPrismaConfirmedRegistrationEmail(prisma, outcome.registration, outcome.emailContext);
    await sendPrismaOrganizerNewRegistrationAlert(
      prisma,
      outcome.registration,
      outcome.emailContext,
      outcome.platformReplyEmail
    );

    return {
      ok: true,
      redirectHref: outcome.redirectHref
    };
  }

  await sendPrismaPendingConfirmationEmail(
    prisma,
    outcome.registration,
    outcome.emailContext,
    getBaseUrl()
  );

  return {
    ok: true,
    redirectHref: outcome.redirectHref,
    confirmationHref: outcome.confirmationHref
  };
}

async function createRegistrationHoldInFileState(payload) {
  return mutatePersistentState(async (draft) => {
    const context = buildRegistrationContext(
      draft,
      payload.slug,
      payload.eventSlug,
      payload.occurrenceId
    );

    if (!context?.selectedOccurrence) {
      return {
        ok: false,
        message: "That event occurrence is no longer available."
      };
    }

    const registrationQuestionnaireConfig =
      context.event.registrationQuestionnaireConfig ||
      resolveRegistrationQuestionnaireConfig(context.organizer, context.eventRecord);
    const collectDietaryInfo = shouldCollectDietaryFromQuestionnaire(
      registrationQuestionnaireConfig
    );
    const now = new Date().toISOString();
    const selectedTicketCategories = getSafeEntries(context.selectedOccurrence.ticketCategories)
      .map((category) => getTicketCategoryById(draft, category.id))
      .filter(Boolean);
    const buildResult = prepareRegistrationBuild({
      items: payload.items,
      attendees: payload.attendees,
      ticketCategories: selectedTicketCategories,
      collectDietaryInfo,
      registrationQuestionnaireConfig,
      prepayPercentage:
        context.selectedOccurrence.prepayPercentage ?? context.event.prepayPercentage,
      nowIso: now
    });

    if (!buildResult.ok) {
      return buildResult;
    }

    const { lineItems, requestedItems, requestedQuantity, attendees } = buildResult;
    const registrationConfirmationMode = resolveRegistrationConfirmationMode(
      context.organizer,
      context.eventRecord
    );

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

    if (requestedQuantity > capacity.remaining) {
      return {
        ok: false,
        message: "That quantity is no longer available for the selected occurrence.",
        fieldErrors: {
          items: "Choose a smaller quantity or a different date."
        }
      };
    }

    const refundPolicyValidation = validateRefundPolicyAcceptance(
      payload,
      context.eventRecord,
      payload.registrationLocale
    );

    if (refundPolicyValidation) {
      return refundPolicyValidation;
    }

    if (registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM) {
      const confirmationValidation = validateFinalConfirmationRequirements(payload);

      if (confirmationValidation) {
        return confirmationValidation;
      }
    }

    const refundPolicySnapshot = buildRefundPolicySnapshot(
      context.eventRecord,
      payload.registrationLocale
    );

    const registration =
      registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM
        ? buildDirectConfirmationRegistration({
            organizerId: context.organizer.id,
            eventTypeId: context.event.id,
            occurrenceId: context.selectedOccurrence.id,
            registrationLocale: payload.registrationLocale,
            requestedItems,
            attendees,
            lineItems,
            currency: draft.siteSettings.stripeCurrencyDefault,
            nowIso: now,
            refundPolicyAcceptedAt: refundPolicySnapshot ? now : null,
            refundPolicySnapshot,
            source: "PUBLIC"
          })
        : buildPendingConfirmationRegistration({
            organizerId: context.organizer.id,
            eventTypeId: context.event.id,
            occurrenceId: context.selectedOccurrence.id,
            registrationLocale: payload.registrationLocale,
            requestedItems,
            attendees,
            lineItems,
            currency: draft.siteSettings.stripeCurrencyDefault,
            nowIso: now,
            holdDurationMinutes: HOLD_DURATION_MINUTES,
            refundPolicyAcceptedAt: refundPolicySnapshot ? now : null,
            refundPolicySnapshot,
            source: "PUBLIC"
          });
    const emailContext = buildRegistrationEmailContext(draft, registration);

    if (!emailContext) {
      return {
        ok: false,
        message: "That event occurrence is no longer available."
      };
    }

    if (
      registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM &&
      registration.onlineAmountCents > 0
    ) {
      const billingGate = getOrganizerOnlinePaymentsGate(context.organizer);

      if (getStripeEnvironmentState().mode === "live" && !billingGate.enabled) {
        return {
          ok: false,
          message: getOrganizerOnlinePaymentsError(context.organizer)
        };
      }
    }

    draft.registrations.unshift(registration);

    if (registrationConfirmationMode === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM) {
      await appendAuditLog(draft, {
        actorType: "ATTENDEE",
        organizerId: context.organizer.id,
        registrationId: registration.id,
        eventType:
          registration.onlineAmountCents > 0
            ? "registration_confirmed_pending_payment"
            : "registration_confirmed",
        entityType: "registration",
        entityId: registration.id,
        message:
          registration.onlineAmountCents > 0
            ? `Confirmed ${registration.registrationCode} and opened payment.`
            : `Confirmed ${registration.registrationCode} without online payment.`
      });

      if (registration.onlineAmountCents > 0) {
        const session = await createStripeCheckoutSession({
          attendeeEmail: registration.attendeeEmail,
          eventSlug: context.eventRecord.slug,
          eventTitle: context.eventRecord.title,
          holdExpiresAt: registration.expiresAt,
          occurrenceId: context.selectedOccurrence.id,
          occurrenceLabel: context.selectedOccurrence.label,
          organizerName: context.organizer.name,
          payment: {
            onlineAmount: registration.onlineAmountCents / 100,
            onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
            dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
          },
          paymentFingerprint: registration.paymentToken,
          paymentToken: registration.paymentToken,
          quantity: registration.quantity,
          registrationCode: registration.registrationCode,
          slug: getOrganizerPublicSlug(context.organizer) || context.organizer.slug,
          stripeAccountId: context.organizer.stripeAccountId,
          ticketCategoryLabel: emailContext.ticketSummaryLabel
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
            stripeAccountId: context.organizer.stripeAccountId || null,
            stripeSessionId: session.sessionId,
            stripePaymentIntentId: null,
            note: "Checkout session created.",
            metadata: null,
            occurredAt: now,
            createdAt: now
          });
        }

        await appendPaymentCheckoutAuditLog(draft, {
          organizerId: context.organizer.id,
          registrationId: registration.id,
          registrationCode: registration.registrationCode,
          eventType: "payment_checkout_started",
          metadata: buildPaymentCheckoutAuditMetadata({
            checkoutMode: session.mode || getStripeEnvironmentState().mode,
            redirectHref:
              session.url ||
              buildPaymentPreviewHref(payload.slug, payload.eventSlug, registration.paymentToken),
            source: "registration_direct_confirm",
            stripeAccountId: context.organizer.stripeAccountId || null,
            stripeSessionId: session.sessionId || null
          }),
          createdAt: now
        });

        await sendOrganizerNewRegistrationAlert(draft, registration, emailContext);

        return {
          ok: true,
          redirectHref:
            session.url ||
            buildPaymentPreviewHref(payload.slug, payload.eventSlug, registration.paymentToken)
        };
      }

      await sendConfirmedRegistrationEmail(draft, registration, emailContext);
      await sendOrganizerNewRegistrationAlert(draft, registration, emailContext);

      return {
        ok: true,
        redirectHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirmed/${registration.confirmationToken}`
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
      redirectHref: buildPendingRegistrationHref(
        payload.slug,
        payload.eventSlug,
        payload.registrationLocale
      ),
      confirmationHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirm/${registration.holdToken}`
    };
  });
}

export async function getRegistrationPendingView(slug, eventSlug, locale = "en") {
  const entry = await getRegistrationExperienceBySlugs(slug, eventSlug, { locale });

  if (!entry) {
    return {
      state: "error",
      title: "We couldn't match that event.",
      message: "Return to the event page and start again if you still want to register."
    };
  }

  return {
    state: "ready",
    locale: normalizeRegistrationLocale(locale),
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
    !matchesOrganizerPublicSlug(organizer, slug) ||
    !eventRecord ||
    eventRecord.slug !== eventSlug ||
    !occurrenceRecord ||
    !ticketCategoryRecord
  ) {
    return buildHoldState("This hold no longer matches a live registration context.");
  }

  const locale = registration.registrationLocale || "en";
  const event = buildEventView(state, organizer, eventRecord, locale);
  const refundPolicy = registration.refundPolicySnapshot || event.refundPolicy;
  const occurrence = event.occurrences.find((entry) => entry.id === occurrenceRecord.id);
  const ticketItems = buildTicketItemSummary(state, registration, locale);
  const payment = {
    subtotal: registration.subtotalCents / 100,
    onlineAmount: registration.onlineAmountCents / 100,
    dueAtEvent: registration.dueAtEventCents / 100,
    subtotalLabel: formatCurrencyFromCents(registration.subtotalCents),
    onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
    dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
  };
  const capacity = buildOccurrenceCapacitySummary(state, occurrenceRecord, eventRecord);
  const beforeRemaining = Math.min(
    occurrenceRecord.capacity,
    capacity.remaining + registration.quantity
  );

  return {
    state: "ready",
    locale,
    organizer: buildOrganizerView(state, organizer, locale),
    event,
    refundPolicy,
    occurrence,
    ticketItems,
    ticketSummaryLabel: buildTicketSummaryLabel(ticketItems),
    attendee: buildLeadAttendeeFromRegistration(registration),
    attendees: buildRegistrationAttendeeViews(state, registration, locale),
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
    timeline: buildRegistrationTimeline(registration),
    confirmationRules: getConfirmationFieldRules()
  };
}

function buildReminderNote(organizer, locale = "en") {
  const note = normalizeText(organizer.registrationReminderNote);

  if (note) {
    return note;
  }

  return normalizeRegistrationLocale(locale) === "it"
    ? "L'organizer condividerà eventuali aggiornamenti last-minute se qualcosa cambia prima dell'evento."
    : "The host will share any last-minute updates if anything changes before the event.";
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
        locale: context.locale,
        replyTo: context.supportReplyEmail,
        replacements: {
          "{{attendee_name}}": registration.attendeeName,
          "{{event_name}}": context.eventName,
          "{{occurrence_label}}": context.occurrenceLabel,
          "{{occurrence_time}}": context.occurrenceTime,
          "{{venue_name}}": context.venueName,
          "{{registration_code}}": registration.registrationCode,
          "{{due_at_event}}": formatCurrencyFromCents(
            registration.dueAtEventCents,
            registration.currency,
            context.locale
          ),
          "{{organizer_reminder_note}}": buildReminderNote(context.organizer, context.locale),
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
    const locale = normalizeRegistrationLocale(registration.registrationLocale);
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
      registration.organizer.timeZone,
      locale
    );
    const occurrenceTimeLabel = formatOccurrenceTimeRange(
      registration.occurrence.startsAt,
      registration.occurrence.endsAt,
      registration.organizer.timeZone,
      locale
    );
    const venueName =
      getLocalizedText(registration.occurrence, "venueTitle", locale) ||
      registration.occurrence.venueTitle ||
      getLocalizedText(registration.eventType, "venueTitle", locale) ||
      registration.eventType.venueTitle ||
      getLocalizedText(registration.organizer, "venueTitle", locale) ||
      registration.organizer.venueTitle;
    const eventName = getLocalizedText(registration.eventType, "title", locale) || registration.eventType.title;
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
      locale,
      replyTo,
      replacements: {
        "{{attendee_name}}": registration.attendeeName,
        "{{event_name}}": eventName,
        "{{occurrence_label}}": occurrenceLabel,
        "{{occurrence_time}}": occurrenceTimeLabel,
        "{{venue_name}}": venueName,
        "{{registration_code}}": registration.registrationCode,
        "{{due_at_event}}": formatCurrencyFromCents(
          registration.dueAtEventCents,
          registration.currency,
          locale
        ),
        "{{organizer_reminder_note}}": buildReminderNote(registration.organizer, locale),
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

function withBookingLocale(path, locale = "en") {
  const normalizedLocale = normalizeRegistrationLocale(locale);
  const params = new URLSearchParams();

  params.set("bookingLocale", normalizedLocale);

  return `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
}

function buildPendingRegistrationHref(slug, eventSlug, locale = "en") {
  return withBookingLocale(`/${slug}/events/${eventSlug}/register/pending`, locale);
}

function buildPaymentPreviewHref(slug, eventSlug, paymentToken) {
  return `/${slug}/events/${eventSlug}/register/payment/preview/${paymentToken}`;
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
  const locale = normalizeRegistrationLocale(registration.registrationLocale);
  const ticketItems = buildTicketItemSummary(state, registration, locale);

  if (!organizer || !eventRecord || !occurrence || !ticketCategory) {
    return null;
  }

  return {
    organizer,
    eventRecord,
    occurrence,
    ticketCategory,
    ticketItems,
    ticketSummaryLabel: buildTicketSummaryLabel(ticketItems),
    locale,
    eventName: getLocalizedText(eventRecord, "title", locale) || eventRecord.title,
    occurrenceLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone, locale),
    occurrenceTime: formatOccurrenceTimeRange(
      occurrence.startsAt,
      occurrence.endsAt,
      organizer.timeZone,
      locale
    ),
    venueName:
      getLocalizedText(occurrence, "venueTitle", locale) ||
      occurrence.venueTitle ||
      getLocalizedText(eventRecord, "venueTitle", locale) ||
      eventRecord.venueTitle ||
      getLocalizedText(organizer, "venueTitle", locale) ||
      organizer.venueTitle,
    supportReplyEmail: getSupportReplyEmail(state, organizer),
    organizerNotificationEmail: resolveOrganizerNotificationEmailFromState(state, organizer)
  };
}

function buildPendingConfirmationEmailReplacements(context, baseUrl, registration) {
  return {
    "{{attendee_name}}": registration.attendeeName,
    "{{event_name}}": context.eventName,
    "{{occurrence_label}}": context.occurrenceLabel,
    "{{confirmation_url}}": buildConfirmationHref(
      baseUrl,
      getOrganizerPublicSlug(context.organizer),
      context.eventRecord.slug,
      registration.holdToken
    ),
    "{{online_amount}}": formatCurrencyFromCents(
      registration.onlineAmountCents,
      registration.currency,
      context.locale
    ),
    "{{due_at_event}}": formatCurrencyFromCents(
      registration.dueAtEventCents,
      registration.currency,
      context.locale
    ),
    "{{registration_source_note}}": getRegistrationSourceNote(registration, context.locale),
    "{{registration_source_label}}": getRegistrationSourceLabel(registration, context.locale),
    "{{registration_origin_label}}": getRegistrationOriginLabel(registration, context.locale)
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
    locale: context.locale,
    replyTo: context.supportReplyEmail,
    replacements: buildPendingConfirmationEmailReplacements(
      context,
      baseUrl,
      registration
    ),
    metadata: {
      registrationCode: registration.registrationCode || null
    }
  });
}

async function sendPrismaPendingConfirmationEmail(prisma, registration, context, baseUrl) {
  return sendPrismaTemplateEmail(prisma, {
    templateSlug: "attendee_pending_confirmation",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("attendee_pending_confirmation", registration.id),
    locale: context.locale,
    replyTo: context.supportReplyEmail,
    replacements: buildPendingConfirmationEmailReplacements(context, baseUrl, registration),
    metadata: {
      registrationCode: registration.registrationCode || null
    }
  });
}

function buildConfirmedRegistrationEmailReplacements(context, registration) {
  return {
    "{{registration_code}}": registration.registrationCode,
    "{{event_name}}": context.eventName,
    "{{venue_name}}": context.venueName,
    "{{due_at_event}}": formatCurrencyFromCents(
      registration.dueAtEventCents,
      registration.currency,
      context.locale
    ),
    "{{registration_source_note}}": getRegistrationSourceNote(registration, context.locale),
    "{{registration_source_label}}": getRegistrationSourceLabel(registration, context.locale),
    "{{registration_origin_label}}": getRegistrationOriginLabel(registration, context.locale)
  };
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
    locale: context.locale,
    replyTo: context.supportReplyEmail,
    replacements: buildConfirmedRegistrationEmailReplacements(context, registration)
  });
}

async function sendPrismaConfirmedRegistrationEmail(prisma, registration, context) {
  return sendPrismaTemplateEmail(prisma, {
    templateSlug: "attendee_registration_confirmed",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("attendee_registration_confirmed", registration.id),
    locale: context.locale,
    replyTo: context.supportReplyEmail,
    replacements: buildConfirmedRegistrationEmailReplacements(context, registration)
  });
}

function buildOrganizerNewRegistrationAlertReplacements(context, registration) {
  return {
    "{{organizer_name}}": context.organizer.name,
    "{{event_name}}": context.eventRecord.title,
    "{{attendee_name}}": registration.attendeeName,
    "{{occurrence_label}}": context.occurrenceLabel,
    "{{quantity_label}}": pluralize(registration.quantity, "attendee"),
    "{{registration_code}}": registration.registrationCode,
    "{{payment_state}}": getRegistrationPaymentStateLabel(registration),
    "{{registration_source_label}}": getRegistrationSourceLabel(registration),
    "{{registration_origin_label}}": getRegistrationOriginLabel(registration)
  };
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
    replacements: buildOrganizerNewRegistrationAlertReplacements(context, registration)
  });
}

async function sendPrismaOrganizerNewRegistrationAlert(
  prisma,
  registration,
  context,
  platformReplyEmail = null
) {
  if (!context.organizerNotificationEmail) {
    return null;
  }

  return sendPrismaTemplateEmail(prisma, {
    templateSlug: "organizer_new_registration",
    to: context.organizerNotificationEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("organizer_new_registration", registration.id),
    replyTo: platformReplyEmail,
    replacements: buildOrganizerNewRegistrationAlertReplacements(context, registration)
  });
}

async function sendPrismaPaymentCompletionEmails(
  prisma,
  registration,
  context,
  platformReplyEmail = null
) {
  await sendPrismaConfirmedRegistrationEmail(prisma, registration, context);

  await sendPrismaTemplateEmail(prisma, {
    templateSlug: "attendee_payment_received",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("attendee_payment_received", registration.id),
    locale: context.locale,
    replyTo: context.supportReplyEmail,
    replacements: {
      "{{registration_code}}": registration.registrationCode,
      "{{paid_online}}": formatCurrencyFromCents(
        registration.onlineCollectedCents,
        registration.currency,
        context.locale
      ),
      "{{due_at_event}}": formatCurrencyFromCents(
        registration.dueAtEventCents,
        registration.currency,
        context.locale
      ),
      "{{event_name}}": context.eventName
    }
  });

  if (!context.organizerNotificationEmail) {
    return;
  }

  await sendPrismaTemplateEmail(prisma, {
    templateSlug: "organizer_payment_received",
    to: context.organizerNotificationEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("organizer_payment_received", registration.id),
    replyTo: platformReplyEmail,
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

async function sendPaymentCompletionEmails(state, registration, context) {
  await sendConfirmedRegistrationEmail(state, registration, context);

  await sendStateTemplateEmail(state, {
    templateSlug: "attendee_payment_received",
    to: registration.attendeeEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("attendee_payment_received", registration.id),
    locale: context.locale,
    replyTo: context.supportReplyEmail,
    replacements: {
      "{{registration_code}}": registration.registrationCode,
      "{{paid_online}}": formatCurrencyFromCents(
        registration.onlineCollectedCents,
        registration.currency,
        context.locale
      ),
      "{{due_at_event}}": formatCurrencyFromCents(
        registration.dueAtEventCents,
        registration.currency,
        context.locale
      ),
      "{{event_name}}": context.eventName
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

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

function buildPrismaRegistrationCreateData(registration) {
  return {
    id: registration.id,
    organizerId: registration.organizerId,
    eventTypeId: registration.eventTypeId,
    occurrenceId: registration.occurrenceId,
    ticketCategoryId: registration.ticketCategoryId,
    status: registration.status,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    attendeePhone: registration.attendeePhone,
    registrationLocale: registration.registrationLocale,
    source: registration.source || "PUBLIC",
    origin: registration.origin || "",
    quantity: registration.quantity,
    currency: registration.currency,
    subtotalCents: registration.subtotalCents,
    onlineAmountCents: registration.onlineAmountCents,
    dueAtEventCents: registration.dueAtEventCents,
    onlineCollectedCents: registration.onlineCollectedCents,
    venueCollectedCents: registration.venueCollectedCents,
    refundedCents: registration.refundedCents,
    holdToken: registration.holdToken,
    paymentToken: registration.paymentToken,
    confirmationToken: registration.confirmationToken,
    registrationCode: registration.registrationCode,
    expiresAt: toDateOrNull(registration.expiresAt),
    confirmedAt: toDateOrNull(registration.confirmedAt),
    cancelledAt: toDateOrNull(registration.cancelledAt),
    attendedAt: toDateOrNull(registration.attendedAt),
    noShowAt: toDateOrNull(registration.noShowAt),
    termsAcceptedAt: toDateOrNull(registration.termsAcceptedAt),
    responsibilityAt: toDateOrNull(registration.responsibilityAt),
    refundPolicyAcceptedAt: toDateOrNull(registration.refundPolicyAcceptedAt),
    refundPolicySnapshot: registration.refundPolicySnapshot || null,
    note: registration.note,
    createdAt: new Date(registration.createdAt),
    updatedAt: new Date(registration.updatedAt),
    attendees: {
      create: registration.attendees.map((attendee) => ({
        id: attendee.id,
        ticketCategoryId: attendee.ticketCategoryId || null,
        sortOrder: attendee.sortOrder,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        address: attendee.address,
        phone: attendee.phone,
        email: attendee.email,
        dietaryFlags: attendee.dietaryFlags,
        dietaryOther: attendee.dietaryOther,
        createdAt: new Date(attendee.createdAt),
        updatedAt: new Date(attendee.updatedAt)
      }))
    },
    items: {
      create: registration.items.map((item) => ({
        id: item.id,
        ticketCategoryId: item.ticketCategoryId,
        sortOrder: item.sortOrder,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        subtotalCents: item.subtotalCents,
        onlineAmountCents: item.onlineAmountCents,
        dueAtEventCents: item.dueAtEventCents,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }))
    }
  };
}

function buildPrismaRegistrationUpdateData(registration) {
  return {
    status: registration.status,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    attendeePhone: registration.attendeePhone,
    registrationLocale: registration.registrationLocale,
    source: registration.source || "PUBLIC",
    origin: registration.origin || "",
    quantity: registration.quantity,
    currency: registration.currency,
    subtotalCents: registration.subtotalCents,
    onlineAmountCents: registration.onlineAmountCents,
    dueAtEventCents: registration.dueAtEventCents,
    onlineCollectedCents: registration.onlineCollectedCents,
    venueCollectedCents: registration.venueCollectedCents,
    refundedCents: registration.refundedCents,
    holdToken: registration.holdToken,
    paymentToken: registration.paymentToken,
    confirmationToken: registration.confirmationToken,
    registrationCode: registration.registrationCode,
    expiresAt: toDateOrNull(registration.expiresAt),
    confirmedAt: toDateOrNull(registration.confirmedAt),
    cancelledAt: toDateOrNull(registration.cancelledAt),
    attendedAt: toDateOrNull(registration.attendedAt),
    noShowAt: toDateOrNull(registration.noShowAt),
    termsAcceptedAt: toDateOrNull(registration.termsAcceptedAt),
    responsibilityAt: toDateOrNull(registration.responsibilityAt),
    refundPolicyAcceptedAt: toDateOrNull(registration.refundPolicyAcceptedAt),
    refundPolicySnapshot: registration.refundPolicySnapshot || null,
    note: registration.note,
    updatedAt: new Date(registration.updatedAt)
  };
}

function buildPrismaPaymentCreateData(payment) {
  return {
    id: payment.id,
    registrationId: payment.registrationId,
    provider: payment.provider,
    kind: payment.kind,
    status: payment.status,
    amountCents: payment.amountCents,
    currency: payment.currency,
    externalEventId: payment.externalEventId || null,
    stripeAccountId: payment.stripeAccountId || null,
    stripeSessionId: payment.stripeSessionId || null,
    stripePaymentIntentId: payment.stripePaymentIntentId || null,
    note: payment.note || "",
    metadata: payment.metadata || null,
    occurredAt: new Date(payment.occurredAt),
    createdAt: new Date(payment.createdAt)
  };
}

async function persistPrismaPayments(prisma, payments = []) {
  for (const payment of payments) {
    await prisma.registrationPayment.create({
      data: buildPrismaPaymentCreateData(payment)
    });
  }
}

function buildAuditLogCreateData({
  actorType,
  eventType,
  message,
  organizerId,
  registrationId,
  entityType = "registration",
  entityId = registrationId,
  actorId = null,
  metadata = null,
  now = new Date()
}) {
  return {
    id: createToken(),
    createdAt: now,
    actorType,
    actorId,
    organizerId,
    registrationId,
    eventType,
    entityType,
    entityId,
    message,
    metadata
  };
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

  if (getStorageMode() === "database") {
    try {
      return await confirmRegistrationHoldInDatabase(parsed.data);
    } catch (error) {
      console.error("[passreserve-service] confirmRegistrationHold failed in database mode", error);

      return {
        ok: false,
        message: "We couldn't confirm this registration right now. Please try again in a moment."
      };
    }
  }

  return confirmRegistrationHoldInFileState(parsed.data);
}

async function confirmRegistrationHoldInDatabase(payload) {
  const prisma = getPrismaClient();
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYSTEM_LOCK_ID})`);
    const state = await readPrismaState(tx);
    const registration = getRegistrationByHoldToken(state, payload.holdToken);

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

    const organizer = getOrganizerById(state, registration.organizerId);
    const eventRecord = getEventById(state, registration.eventTypeId);
    const occurrence = getOccurrenceById(state, registration.occurrenceId);
    const ticketCategory = getTicketCategoryById(state, registration.ticketCategoryId);
    const emailContext = buildRegistrationEmailContext(state, registration);

    if (
      !organizer ||
      !matchesOrganizerPublicSlug(organizer, payload.slug) ||
      !eventRecord ||
      eventRecord.slug !== payload.eventSlug ||
      !occurrence ||
      !ticketCategory ||
      !emailContext
    ) {
      return {
        ok: false,
        message: "This hold no longer matches a live event context."
      };
    }

    const confirmationValidation = validateFinalConfirmationRequirements(payload);

    if (confirmationValidation) {
      return confirmationValidation;
    }

    const now = new Date().toISOString();
    const nextRegistration = structuredClone(registration);

    nextRegistration.holdToken = null;
    nextRegistration.confirmedAt = now;
    nextRegistration.confirmationToken = nextRegistration.confirmationToken || createToken();
    nextRegistration.registrationCode =
      nextRegistration.registrationCode || createRegistrationCode();
    nextRegistration.termsAcceptedAt = now;
    nextRegistration.responsibilityAt = now;
    nextRegistration.updatedAt = now;

    if (nextRegistration.onlineAmountCents > 0) {
      const billingGate = getOrganizerOnlinePaymentsGate(organizer);

      if (getStripeEnvironmentState().mode === "live" && !billingGate.enabled) {
        return {
          ok: false,
          message: getOrganizerOnlinePaymentsError(organizer)
        };
      }

      nextRegistration.status = "PENDING_PAYMENT";
      nextRegistration.paymentToken = nextRegistration.paymentToken || createToken();
      nextRegistration.expiresAt = addHours(now, PAYMENT_WINDOW_HOURS);

      await tx.registration.update({
        where: {
          id: nextRegistration.id
        },
        data: buildPrismaRegistrationUpdateData(nextRegistration)
      });

      await tx.auditLog.create({
        data: buildAuditLogCreateData({
          actorType: "ATTENDEE",
          organizerId: organizer.id,
          registrationId: nextRegistration.id,
          eventType: "registration_confirmed_pending_payment",
          message: `Confirmed ${nextRegistration.registrationCode} and opened payment.`
        })
      });

      return {
        ok: true,
        registration: nextRegistration,
        organizer,
        eventRecord,
        occurrence,
        ticketCategory,
        emailContext,
        platformReplyEmail: state.siteSettings.platformEmail || null,
        redirectHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirmed/${nextRegistration.confirmationToken}`
      };
    }

    nextRegistration.status = "CONFIRMED_UNPAID";
    nextRegistration.paymentToken = null;
    nextRegistration.expiresAt = null;

    await tx.registration.update({
      where: {
        id: nextRegistration.id
      },
      data: buildPrismaRegistrationUpdateData(nextRegistration)
    });

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "ATTENDEE",
        organizerId: organizer.id,
        registrationId: nextRegistration.id,
        eventType: "registration_confirmed",
        message: `Confirmed ${nextRegistration.registrationCode} without online payment.`
      })
    });

    return {
      ok: true,
      registration: nextRegistration,
      organizer,
      eventRecord,
      occurrence,
      ticketCategory,
      emailContext,
      platformReplyEmail: state.siteSettings.platformEmail || null,
      redirectHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirmed/${nextRegistration.confirmationToken}`
    };
  });

  if (!outcome.ok) {
    return outcome;
  }

  if (outcome.registration.onlineAmountCents > 0) {
    let session;

    try {
      session = await createStripeCheckoutSession({
        attendeeEmail: outcome.registration.attendeeEmail,
        eventSlug: outcome.eventRecord.slug,
        eventTitle: outcome.eventRecord.title,
        holdExpiresAt: outcome.registration.expiresAt,
        occurrenceId: outcome.occurrence.id,
        occurrenceLabel: formatDateLabel(outcome.occurrence.startsAt, outcome.organizer.timeZone),
        organizerName: outcome.organizer.name,
        payment: {
          onlineAmount: outcome.registration.onlineAmountCents / 100,
          onlineAmountLabel: formatCurrencyFromCents(outcome.registration.onlineAmountCents),
          dueAtEventLabel: formatCurrencyFromCents(outcome.registration.dueAtEventCents)
        },
        paymentFingerprint: outcome.registration.paymentToken,
        paymentToken: outcome.registration.paymentToken,
        quantity: outcome.registration.quantity,
        registrationCode: outcome.registration.registrationCode,
        slug: getOrganizerPublicSlug(outcome.organizer) || outcome.organizer.slug,
        stripeAccountId: outcome.organizer.stripeAccountId,
        ticketCategoryLabel:
          outcome.emailContext.ticketSummaryLabel || outcome.ticketCategory.name
      });
    } catch (error) {
      console.error("[passreserve-service] failed to create Stripe Checkout session", error);

      await createPrismaPaymentCheckoutAuditLog(prisma, {
        organizerId: outcome.organizer.id,
        registrationId: outcome.registration.id,
        registrationCode: outcome.registration.registrationCode,
        eventType: "payment_checkout_failed",
        metadata: buildPaymentCheckoutAuditMetadata({
          checkoutMode: getStripeEnvironmentState().mode,
          fallbackToPreview: true,
          failureReason: error instanceof Error ? error.message : String(error),
          redirectHref: buildPaymentPreviewHref(
            payload.slug,
            payload.eventSlug,
            outcome.registration.paymentToken
          ),
          source: "registration_confirmation",
          stripeAccountId: outcome.organizer.stripeAccountId || null
        })
      });

      return {
        ok: true,
        redirectHref: buildPaymentPreviewHref(
          payload.slug,
          payload.eventSlug,
          outcome.registration.paymentToken
        )
      };
    }

    if (session.sessionId) {
      await prisma.registrationPayment.create({
        data: buildPrismaPaymentCreateData({
          id: createToken(),
          registrationId: outcome.registration.id,
          provider: "STRIPE",
          kind: "CHECKOUT_SESSION",
          status: "PENDING",
          amountCents: outcome.registration.onlineAmountCents,
          currency: outcome.registration.currency,
          externalEventId: null,
          stripeAccountId: outcome.organizer.stripeAccountId || null,
          stripeSessionId: session.sessionId,
          stripePaymentIntentId: null,
          note: "Checkout session created.",
          metadata: null,
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      });
    }

    await createPrismaPaymentCheckoutAuditLog(prisma, {
      organizerId: outcome.organizer.id,
      registrationId: outcome.registration.id,
      registrationCode: outcome.registration.registrationCode,
      eventType: "payment_checkout_started",
      metadata: buildPaymentCheckoutAuditMetadata({
        checkoutMode: session.mode || getStripeEnvironmentState().mode,
        redirectHref:
          session.url ||
          buildPaymentPreviewHref(payload.slug, payload.eventSlug, outcome.registration.paymentToken),
        source: "registration_confirmation",
        stripeAccountId: outcome.organizer.stripeAccountId || null,
        stripeSessionId: session.sessionId || null
      })
    });

    await sendPrismaOrganizerNewRegistrationAlert(
      prisma,
      outcome.registration,
      outcome.emailContext,
      outcome.platformReplyEmail
    );

    return {
      ok: true,
      redirectHref: session.url
    };
  }

  await sendPrismaConfirmedRegistrationEmail(prisma, outcome.registration, outcome.emailContext);
  await sendPrismaOrganizerNewRegistrationAlert(
    prisma,
    outcome.registration,
    outcome.emailContext,
    outcome.platformReplyEmail
  );

  return {
    ok: true,
    redirectHref: outcome.redirectHref
  };
}

async function confirmRegistrationHoldInFileState(payload) {
  return mutatePersistentState(async (draft) => {
    const registration = getRegistrationByHoldToken(draft, payload.holdToken);

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
      !matchesOrganizerPublicSlug(organizer, payload.slug) ||
      !eventRecord ||
      eventRecord.slug !== payload.eventSlug ||
      !occurrence ||
      !ticketCategory ||
      !emailContext
    ) {
      return {
        ok: false,
        message: "This hold no longer matches a live event context."
      };
    }

    const confirmationValidation = validateFinalConfirmationRequirements(payload);

    if (confirmationValidation) {
      return confirmationValidation;
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
        slug: getOrganizerPublicSlug(organizer) || organizer.slug,
        stripeAccountId: organizer.stripeAccountId,
        ticketCategoryLabel: emailContext.ticketSummaryLabel || ticketCategory.name
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

      await appendPaymentCheckoutAuditLog(draft, {
        organizerId: organizer.id,
        registrationId: registration.id,
        registrationCode: registration.registrationCode,
        eventType: "payment_checkout_started",
        metadata: buildPaymentCheckoutAuditMetadata({
          checkoutMode: session.mode || getStripeEnvironmentState().mode,
          redirectHref:
            session.url ||
            buildPaymentPreviewHref(payload.slug, payload.eventSlug, registration.paymentToken),
          source: "registration_confirmation",
          stripeAccountId: organizer.stripeAccountId || null,
          stripeSessionId: session.sessionId || null
        }),
        createdAt: now
      });

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
      redirectHref: `/${payload.slug}/events/${payload.eventSlug}/register/confirmed/${registration.confirmationToken}`
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

  const locale = registration.registrationLocale || "en";
  const event = buildEventView(state, organizer, eventRecord, locale);
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
  const ticketItems = buildTicketItemSummary(state, registration, locale);

  return {
    state: "ready",
    locale,
    organizer: buildOrganizerView(state, organizer, locale),
    event,
    occurrence,
    ticketItems,
    ticketSummaryLabel: buildTicketSummaryLabel(ticketItems),
    attendee: buildLeadAttendeeFromRegistration(registration),
    attendees: buildRegistrationAttendeeViews(state, registration, locale),
    payment: {
      subtotal: registration.subtotalCents / 100,
      onlineAmount: registration.onlineAmountCents / 100,
      dueAtEvent: registration.dueAtEventCents / 100,
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

  if (!organizer || !matchesOrganizerPublicSlug(organizer, slug) || !eventRecord || eventRecord.slug !== eventSlug) {
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

  const locale = registration.registrationLocale || "en";
  const event = buildEventView(state, organizer, eventRecord, locale);
  const occurrence = event.occurrences.find((entry) => entry.id === occurrenceRecord.id) ?? {
    label: formatDateLabel(occurrenceRecord.startsAt, organizer.timeZone),
    time: formatOccurrenceTimeRange(
      occurrenceRecord.startsAt,
      occurrenceRecord.endsAt,
      organizer.timeZone
    )
  };
  const ticketItems = buildTicketItemSummary(state, registration, locale);

  return {
    state: stateName,
    checkoutMode: getRegistrationPaymentCheckoutMode(),
    locale,
    organizer: buildOrganizerView(state, organizer, locale),
    event,
    occurrence,
    ticketItems,
    ticketSummaryLabel: buildTicketSummaryLabel(ticketItems),
    attendee: buildLeadAttendeeFromRegistration(registration),
    attendees: buildRegistrationAttendeeViews(state, registration, locale),
    payment: {
      subtotal: registration.subtotalCents / 100,
      onlineAmount: registration.onlineAmountCents / 100,
      dueAtEvent: registration.dueAtEventCents / 100,
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
    restartHref: buildOrganizerRegistrationHref(organizer, eventRecord.slug, occurrenceRecord.id)
  };
}

export async function getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken) {
  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const registration = await prisma.registration.findUnique({
        where: {
          paymentToken
        },
        include: {
          organizer: true,
          eventType: true,
          occurrence: true,
          ticketCategory: true,
          attendees: {
            include: {
              ticketCategory: true
            },
            orderBy: {
              sortOrder: "asc"
            }
          },
          items: {
            include: {
              ticketCategory: true
            },
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      });

      if (!registration) {
        return {
          state: "error",
          title: "This payment preview could not be found.",
          message: "The payment link is no longer available."
        };
      }

      const organizer = registration.organizer || null;
      const eventRecord = registration.eventType || null;

      if (
        !organizer ||
        !matchesOrganizerPublicSlug(organizer, slug) ||
        !eventRecord ||
        eventRecord.slug !== eventSlug
      ) {
        return {
          state: "error",
          title: "This payment link does not match the selected event.",
          message: "Return to the event page and start again if needed."
        };
      }

      return buildPrismaPaymentView(registration);
    } catch (error) {
      console.error(
        "[passreserve-service] getRegistrationPaymentPreviewView failed in database mode",
        error
      );

      return {
        state: "error",
        title: "This payment preview could not be loaded right now.",
        message: "Please return to the event page and try again in a moment."
      };
    }
  }

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

  if (!organizer || !matchesOrganizerPublicSlug(organizer, slug) || !eventRecord || eventRecord.slug !== eventSlug) {
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
  if (getStorageMode() === "database") {
    try {
      return await resumeRegistrationPaymentInDatabase(input);
    } catch (error) {
      console.error("[passreserve-service] resumeRegistrationPayment failed in database mode", error);

      return {
        ok: false,
        message: "We couldn't reopen the payment step right now. Please try again in a moment."
      };
    }
  }

  return resumeRegistrationPaymentInFileState(input);
}

async function resumeRegistrationPaymentInDatabase(input) {
  const prisma = getPrismaClient();
  const state = await loadPersistentState();
  const registration = getRegistrationByPaymentToken(state, input.paymentToken);

  if (!registration || registration.status !== "PENDING_PAYMENT" || isPaymentExpired(registration)) {
    return {
      ok: false,
      message: "This payment window has expired. Create a new registration if seats are still open."
    };
  }

  const organizer = getOrganizerById(state, registration.organizerId);
  const eventRecord = getEventById(state, registration.eventTypeId);
  const occurrence = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategory = getTicketCategoryById(state, registration.ticketCategoryId);
  const billingGate = getOrganizerOnlinePaymentsGate(organizer);

  if (getStripeEnvironmentState().mode === "live" && !billingGate.enabled) {
    return {
      ok: false,
      message: getOrganizerOnlinePaymentsError(organizer)
    };
  }

  const session = await createStripeCheckoutSession({
    attendeeEmail: registration.attendeeEmail,
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
    slug: getOrganizerPublicSlug(organizer) || organizer.slug,
    stripeAccountId: organizer.stripeAccountId,
    ticketCategoryLabel:
      buildTicketSummaryLabel(
        buildTicketItemSummary(state, registration, registration.registrationLocale)
      ) || ticketCategory.name
  });

  if (session.sessionId) {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.registrationPayment.create({
        data: buildPrismaPaymentCreateData({
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
          occurredAt: now.toISOString(),
          createdAt: now.toISOString()
        })
      });

      await tx.auditLog.create({
        data: buildAuditLogCreateData({
          actorType: "ATTENDEE",
          organizerId: organizer.id,
          registrationId: registration.id,
          eventType: "payment_reopened",
          entityType: "registration_payment",
          message: `Reopened payment for ${registration.registrationCode}.`,
          now
        })
      });
    });
  }

  return {
    ok: true,
    redirectHref: session.url
  };
}

async function resumeRegistrationPaymentInFileState(input) {
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
      slug: getOrganizerPublicSlug(organizer) || organizer.slug,
      stripeAccountId: organizer.stripeAccountId,
      ticketCategoryLabel:
        buildTicketSummaryLabel(buildTicketItemSummary(draft, registration, registration.registrationLocale)) ||
        ticketCategory.name
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
  if (getStorageMode() === "database") {
    try {
      return await resolveSuccessfulRegistrationConfirmationInDatabase(input);
    } catch (error) {
      console.error(
        "[passreserve-service] resolveSuccessfulRegistrationConfirmation failed in database mode",
        error
      );

      return {
        state: "error",
        title: "Payment confirmation is temporarily unavailable.",
        message: "Please refresh the page in a moment or contact the organizer if the issue persists."
      };
    }
  }

  return resolveSuccessfulRegistrationConfirmationInFileState(input);
}

async function resolveSuccessfulRegistrationConfirmationInDatabase(input) {
  const prisma = getPrismaClient();
  const initialState = await loadPersistentState();
  const initialRegistration = getRegistrationByPaymentToken(initialState, input.paymentToken);
  const initialOrganizer = initialRegistration
    ? getOrganizerById(initialState, initialRegistration.organizerId)
    : null;

  if (!initialRegistration) {
    return {
      state: "error",
      title: "This payment confirmation could not be found.",
      message: "Return to the event page and create a new registration if needed."
    };
  }

  if (
    initialRegistration.status !== "PENDING_PAYMENT" &&
    initialRegistration.status !== "CONFIRMED_PARTIALLY_PAID" &&
    initialRegistration.status !== "CONFIRMED_PAID"
  ) {
    return {
      state: "redirect",
      redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${initialRegistration.confirmationToken}`
    };
  }

  if (initialRegistration.onlineCollectedCents >= initialRegistration.onlineAmountCents) {
    return {
      state: "redirect",
      redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${initialRegistration.confirmationToken}`
    };
  }

  let session = null;
  const previewSimulationAllowed =
    input.preview === "1" ? isPreviewPaymentSimulationAllowed() : false;

  if (input.preview === "1" && !previewSimulationAllowed) {
    return buildInvalidPreviewPaymentResolution();
  }

  if (input.preview !== "1" && !input.sessionId) {
    return buildMissingSessionPaymentResolution();
  }

  if (input.preview !== "1" && input.sessionId) {
    session = await retrieveStripeCheckoutSession(input.sessionId, initialOrganizer?.stripeAccountId);

    if (!session || session.payment_status !== "paid") {
      return {
        state: "error",
        title: "Payment is still pending.",
        message: "Stripe has not confirmed this checkout session yet."
      };
    }
  }

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYSTEM_LOCK_ID})`);
    const state = await readPrismaState(tx);
    const registration = getRegistrationByPaymentToken(state, input.paymentToken);
    const organizer = registration ? getOrganizerById(state, registration.organizerId) : null;
    const emailContext =
      registration && organizer ? buildRegistrationEmailContext(state, registration) : null;

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

    if (registration.onlineCollectedCents >= registration.onlineAmountCents) {
      return {
        state: "redirect",
        redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${registration.confirmationToken}`
      };
    }

    const nextRegistration = structuredClone(registration);
    const paymentDraft = {
      payments: []
    };

    if (previewSimulationAllowed) {
      await finalizeOnlinePayment(paymentDraft, nextRegistration, {
        note: "Preview payment completed from the local payment review page."
      });
    } else {
      await finalizeOnlinePayment(paymentDraft, nextRegistration, {
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

    await tx.registration.update({
      where: {
        id: nextRegistration.id
      },
      data: buildPrismaRegistrationUpdateData(nextRegistration)
    });

    await persistPrismaPayments(tx, paymentDraft.payments);

    await tx.auditLog.create({
      data: buildAuditLogCreateData({
        actorType: "STRIPE",
        organizerId: organizer?.id || null,
        registrationId: nextRegistration.id,
        eventType: "payment_completed",
        entityType: "registration_payment",
        message: `Completed payment for ${nextRegistration.registrationCode}.`
      })
    });

    return {
      state: "redirect",
      redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${nextRegistration.confirmationToken}`,
      registration: nextRegistration,
      organizer,
      emailContext,
      platformReplyEmail: state.siteSettings.platformEmail || null
    };
  });

  if (outcome.state !== "redirect" || !outcome.registration || !outcome.emailContext) {
    return outcome;
  }

  await sendPrismaPaymentCompletionEmails(
    prisma,
    outcome.registration,
    outcome.emailContext,
    outcome.platformReplyEmail
  );

  return {
    state: "redirect",
    redirectHref: outcome.redirectHref
  };
}

async function resolveSuccessfulRegistrationConfirmationInFileState(input) {
  return mutatePersistentState(async (draft) => {
    const registration = getRegistrationByPaymentToken(draft, input.paymentToken);
    const organizer = registration ? getOrganizerById(draft, registration.organizerId) : null;
    const emailContext =
      registration && organizer ? buildRegistrationEmailContext(draft, registration) : null;
    const previewSimulationAllowed =
      input.preview === "1" ? isPreviewPaymentSimulationAllowed() : false;

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

    if (registration.onlineCollectedCents >= registration.onlineAmountCents) {
      return {
        state: "redirect",
        redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${registration.confirmationToken}`
      };
    }

    if (input.preview === "1" && !previewSimulationAllowed) {
      return buildInvalidPreviewPaymentResolution();
    }

    if (input.preview !== "1" && !input.sessionId) {
      return buildMissingSessionPaymentResolution();
    }

    if (previewSimulationAllowed) {
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

  if (getStorageMode() === "database") {
    return processDatabaseStripeWebhook(event);
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
      let matchedPendingRefund = false;
      let refundDeltaCents = 0;
      let refundIds = [];

      if (registration) {
        if (event.type === "charge.refunded") {
          const pendingRefundPayment = findPendingRefundPaymentForCharge(
            draft,
            registration.id,
            object
          );
          const nextRefundedCents = Math.max(
            registration.refundedCents,
            object.amount_refunded ?? 0
          );
          refundDeltaCents = Math.max(0, nextRefundedCents - registration.refundedCents);
          const stripePaymentIntentId =
            typeof object.payment_intent === "string"
              ? object.payment_intent
              : object.payment_intent?.id || null;
          refundIds = getStripeRefundIdsFromCharge(object);

          registration.refundedCents = nextRefundedCents;
          registration.updatedAt = now;

          if (pendingRefundPayment) {
            matchedPendingRefund = true;
            pendingRefundPayment.status = "REFUNDED";
            pendingRefundPayment.amountCents =
              refundDeltaCents > 0 ? refundDeltaCents : pendingRefundPayment.amountCents;
            pendingRefundPayment.externalEventId = event.id;
            pendingRefundPayment.stripeAccountId =
              connectedAccountId || organizer?.stripeAccountId || pendingRefundPayment.stripeAccountId || null;
            pendingRefundPayment.stripePaymentIntentId =
              stripePaymentIntentId || pendingRefundPayment.stripePaymentIntentId || null;
            pendingRefundPayment.note = "Stripe refund confirmed by webhook.";
            pendingRefundPayment.occurredAt = now;
            pendingRefundPayment.metadata = {
              ...(pendingRefundPayment.metadata &&
              typeof pendingRefundPayment.metadata === "object" &&
              !Array.isArray(pendingRefundPayment.metadata)
                ? pendingRefundPayment.metadata
                : {}),
              type: event.type,
              amountRefunded: object.amount_refunded ?? 0,
              stripeRefundStatus: "succeeded",
              stripeEventId: event.id,
              reconciledAt: now,
              stripeRefundIds: refundIds
            };
          } else {
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
              stripePaymentIntentId: stripePaymentIntentId,
              note: "Stripe refund recorded.",
              metadata: {
                type: event.type,
                amountRefunded: object.amount_refunded ?? 0,
                stripeRefundIds: refundIds
              },
              occurredAt: now,
              createdAt: now
            });
          }
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
        eventType:
          registration && event.type === "charge.refunded"
            ? "stripe_refund_confirmed"
            : "stripe_webhook_recorded",
        entityType: registration ? "registration_payment" : "stripe_event",
        entityId: registration?.id || event.id,
        message: registration
          ? event.type === "charge.refunded"
            ? `Stripe confirmed a refund for ${registration.registrationCode}.`
            : `Stripe recorded ${event.type} for ${registration.registrationCode}.`
          : `Recorded unmatched webhook event ${event.type}.`,
        metadata: {
          type: event.type,
          stripeAccountId: connectedAccountId,
          matchedPendingRefund,
          refundDeltaCents,
          stripeRefundIds: refundIds
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

  const result = await submitOrganizerApplication(parsed.data);

  return {
    ok: true,
    request: decorateJoinRequest(result.application),
    storage: getStorageSummary(),
    notifications: {
      label:
        getStripeEnvironmentState().mode === "live"
          ? "Provisioning follows the configured email delivery settings."
          : "Provisioning email is active when Resend credentials are configured; otherwise delivery is logged locally."
    }
  };
}

export async function runOperationalHousekeeping(now = new Date()) {
  const rateLimitCleanup = await pruneExpiredAuthRateLimits(now);
  const retentionDays = getTechnicalAuditLogRetentionDays();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const result = await prisma.auditLog.deleteMany({
      where: {
        eventType: {
          in: TECHNICAL_AUDIT_LOG_EVENT_TYPES
        },
        createdAt: {
          lt: cutoff
        }
      }
    });

    return {
      ok: true,
      technicalAuditRetentionDays: retentionDays,
      technicalAuditEntriesRemoved: Number(result?.count || 0),
      authRateLimitEntriesRemoved: rateLimitCleanup.deletedCount
    };
  }

  const summary = await mutatePersistentState(async (draft) => {
    const auditLogs = Array.isArray(draft.auditLogs) ? draft.auditLogs : [];
    const beforeCount = auditLogs.length;

    draft.auditLogs = auditLogs.filter((entry) => {
      const createdAt = new Date(entry?.createdAt || 0);

      if (!TECHNICAL_AUDIT_LOG_EVENT_TYPES.includes(entry?.eventType)) {
        return true;
      }

      if (!Number.isFinite(createdAt.getTime())) {
        return false;
      }

      return createdAt.getTime() >= cutoff.getTime();
    });

    return {
      removedCount: Math.max(0, beforeCount - draft.auditLogs.length)
    };
  });

  return {
    ok: true,
    technicalAuditRetentionDays: retentionDays,
    technicalAuditEntriesRemoved: summary.removedCount,
    authRateLimitEntriesRemoved: rateLimitCleanup.deletedCount
  };
}

export async function listOrganizerRequests() {
  const requests = await listOrganizerApplicationsState();
  return requests.map(decorateJoinRequest);
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

function buildPasswordResetUrl(scope, resetBaseUrl, slug, token) {
  return scope === "platform"
    ? `${resetBaseUrl}/admin/login/reset/${token}`
    : `${resetBaseUrl}/${slug}/admin/login/reset/${token}`;
}

function buildPasswordResetReplacements(resetUrl, accountName) {
  return {
    "{{reset_url}}": resetUrl,
    "{{account_name}}": accountName
  };
}

async function requestPasswordResetFromDatabase({
  scope,
  slug = null,
  normalizedEmail,
  resetBaseUrl
}) {
  const prisma = getPrismaClient();
  const prepared = await prisma.$transaction(async (tx) => {
    let organizer = null;
    let target;

    if (scope === "platform") {
      target = await tx.platformAdminUser.findFirst({
        where: {
          email: normalizedEmail,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
    } else {
      organizer = await tx.organizer.findUnique({
        where: {
          slug
        },
        select: {
          id: true,
          slug: true
        }
      });

      if (!organizer) {
        return null;
      }

      target = await tx.organizerAdminUser.findFirst({
        where: {
          organizerId: organizer.id,
          email: normalizedEmail,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
    }

    if (!target) {
      return {
        ok: true
      };
    }

    const now = new Date();
    const passwordResetToken = createToken();
    const passwordResetExpires = new Date(addHours(now.toISOString(), 2));

    if (scope === "platform") {
      await tx.platformAdminUser.update({
        where: {
          id: target.id
        },
        data: {
          passwordResetToken,
          passwordResetExpires,
          updatedAt: now
        }
      });
    } else {
      await tx.organizerAdminUser.update({
        where: {
          id: target.id
        },
        data: {
          passwordResetToken,
          passwordResetExpires,
          updatedAt: now
        }
      });
    }

    await tx.auditLog.create({
      data: {
        id: createToken(),
        createdAt: now,
        actorType: "SYSTEM",
        actorId: null,
        organizerId: organizer?.id || null,
        registrationId: null,
        eventType: "password_reset_requested",
        entityType: scope === "platform" ? "platform_admin" : "organizer_admin",
        entityId: target.id,
        message: `Generated a password reset link for ${target.email}.`,
        metadata: null
      }
    });

    return {
      ok: true,
      organizer,
      target: {
        ...target,
        passwordResetToken
      }
    };
  });

  if (!prepared?.target) {
    return prepared || {
      ok: true
    };
  }

  const resetUrl = buildPasswordResetUrl(
    scope,
    resetBaseUrl,
    slug,
    prepared.target.passwordResetToken
  );

  await sendPrismaTemplateEmail(prisma, {
    templateSlug: "password_reset",
    to: prepared.target.email,
    organizerId: prepared.organizer?.id || null,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "password_reset",
      scope,
      prepared.target.id,
      prepared.target.passwordResetToken
    ),
    replacements: buildPasswordResetReplacements(resetUrl, prepared.target.name)
  });

  return {
    ok: true,
    token: prepared.target.passwordResetToken
  };
}

async function requestPasswordReset({ scope, slug = null, email }) {
  const normalizedEmail = normalizeEmail(email);
  const resetBaseUrl = getBaseUrl();

  if (getStorageMode() === "database") {
    try {
      return await requestPasswordResetFromDatabase({
        scope,
        slug,
        normalizedEmail,
        resetBaseUrl
      });
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-service] password reset request failed in database mode, falling back to file state",
        error
      );
    }
  }

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

    const resetUrl = buildPasswordResetUrl(
      scope,
      resetBaseUrl,
      slug,
      target.passwordResetToken
    );

    await sendRegistrationEmail(
      draft,
      "password_reset",
      target.email,
      buildPasswordResetReplacements(resetUrl, target.name)
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

export async function requestPlatformPasswordReset(email) {
  return requestPasswordReset({
    scope: "platform",
    email
  });
}

export async function requestOrganizerPasswordReset(slug, email) {
  return requestPasswordReset({
    scope: "organizer",
    slug,
    email
  });
}

async function resetPasswordInDatabase({ scope, slug = null, token, password }) {
  const prisma = getPrismaClient();
  const nextPasswordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    if (scope === "platform") {
      const admin = await tx.platformAdminUser.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: now
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          tokenVersion: true
        }
      });

      if (!admin) {
        return {
          ok: false,
          message: "This reset link is invalid or has expired."
        };
      }

      await tx.platformAdminUser.update({
        where: {
          id: admin.id
        },
        data: {
          passwordHash: nextPasswordHash,
          tokenVersion: Number(admin.tokenVersion || 0) + 1,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: now
        }
      });

      return {
        ok: true
      };
    }

    const organizer = await tx.organizer.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    });

    if (!organizer) {
      return {
        ok: false,
        message: "This reset link is invalid or has expired."
      };
    }

    const admin = await tx.organizerAdminUser.findFirst({
      where: {
        organizerId: organizer.id,
        passwordResetToken: token,
        passwordResetExpires: {
          gt: now
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        tokenVersion: true
      }
    });

    if (!admin) {
      return {
        ok: false,
        message: "This reset link is invalid or has expired."
      };
    }

    await tx.organizerAdminUser.update({
      where: {
        id: admin.id
      },
      data: {
        passwordHash: nextPasswordHash,
        tokenVersion: Number(admin.tokenVersion || 0) + 1,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: now
      }
    });

    return {
      ok: true
    };
  });

  return result;
}

export async function resetPlatformPassword(input) {
  const parsed = passwordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Add a password with at least eight characters."
    };
  }

  if (getStorageMode() === "database") {
    try {
      return await resetPasswordInDatabase({
        scope: "platform",
        token: parsed.data.token,
        password: parsed.data.password
      });
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-service] platform password reset failed in database mode, falling back to file state",
        error
      );
    }
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

  if (getStorageMode() === "database") {
    try {
      return await resetPasswordInDatabase({
        scope: "organizer",
        slug,
        token: parsed.data.token,
        password: parsed.data.password
      });
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-service] organizer password reset failed in database mode, falling back to file state",
        error
      );
    }
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
