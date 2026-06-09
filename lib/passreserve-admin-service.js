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
import {
  buildEmailDeliveryDedupeKey,
  getRegistrationRefundStateLabel,
  normalizeReminderLeadHours,
  sendPrismaTemplateEmail,
  sendStateTemplateEmail,
  shouldSendOccurrenceCancellationForRegistration
} from "./passreserve-email-delivery.js";
import {
  buildOrganizerPublicHref,
  canEditOrganizerPublicSlug,
  getOrganizerPublicationStatusMeta,
  getOrganizerPublicSlug,
  normalizeOrganizerPublicSlugInput
} from "./passreserve-organizer-identity.js";
import {
  createOrganizerAccountFromPlatform,
  listOrganizerApplications,
  resendOrganizerApplicationAccess
} from "./passreserve-organizer-applications.js";
import {
  getBaseUrl,
  getStorageMode,
  getStorageSummary,
  hasResend
} from "./passreserve-config.js";
import {
  buildLocalizedListEntry,
  buildLocalizedTextEntry,
  getLocalizedList,
  getLocalizedText,
  pickPrimaryListValue,
  pickPrimaryTextValue,
  upsertLocalizedField
} from "./passreserve-content.js";
import {
  asIso,
  createToken,
  formatCurrencyFromCents,
  formatDateLabel,
  formatDateTimeLabel,
  formatOccurrenceTimeRange,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  pluralize,
  slugify
} from "./passreserve-format.js";
import { sendTransactionalEmail } from "./passreserve-email.js";
import { getPrismaClient, logDatabaseFallback } from "./passreserve-prisma.js";
import {
  loadFileBackedState,
  loadPersistentState,
  mutatePersistentState
} from "./passreserve-state.js";
import {
  buildStripeRefundIdempotencyKey,
  createStripeRefund,
  createStripeConnectedAccount,
  createStripeOnboardingAccountLink,
  getStripeEnvironmentState,
  retrieveStripeConnectedAccount
} from "./passreserve-payments.js";
import {
  getLatestFailedRefundPayment,
  getRegistrationRefundSummary
} from "./passreserve-refunds.js";

const ORGANIZER_WORKSPACE_RESET_AUDIT_EVENT = "organizer_workspace_reset";
export const ORGANIZER_REGISTRATION_CANCEL_MODE = Object.freeze({
  CANCEL_ONLY: "CANCEL_ONLY",
  CANCEL_AND_REFUND_ONLINE: "CANCEL_AND_REFUND_ONLINE"
});
export const ORGANIZER_OCCURRENCE_CANCEL_MODE = Object.freeze({
  CANCEL_ONLY: "CANCEL_ONLY",
  CANCEL_AND_REFUND_ELIGIBLE: "CANCEL_AND_REFUND_ELIGIBLE"
});

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

function getTicketCategoriesForEvent(state, eventTypeId, options = {}) {
  const includeInactive = options.includeInactive === true;

  return state.ticketCategories
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

function getOrganizerTourStorageSeedFromState(state, organizerId) {
  const latestReset = (Array.isArray(state.auditLogs) ? state.auditLogs : [])
    .filter(
      (entry) =>
        entry.organizerId === organizerId &&
        entry.eventType === ORGANIZER_WORKSPACE_RESET_AUDIT_EVENT
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  return latestReset?.createdAt || null;
}

async function getOrganizerTourStorageSeedFromDatabase(organizerId) {
  const prisma = getPrismaClient();
  const latestReset = await prisma.auditLog.findFirst({
    where: {
      organizerId,
      eventType: ORGANIZER_WORKSPACE_RESET_AUDIT_EVENT
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      createdAt: true
    }
  });

  return latestReset?.createdAt?.toISOString() || null;
}

function buildOrganizerWorkspaceResetData(now) {
  return {
    contentI18n: null,
    description: "",
    tagline: "",
    publicEmail: "",
    publicPhone: "",
    venueTitle: "",
    venueDetail: "",
    venueMapHref: "",
    venues: [],
    interestEmail: "",
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
    updatedAt: now
  };
}

function getRegistrationPayments(state, registrationId) {
  return state.payments
    .filter((payment) => payment.registrationId === registrationId)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function normalizeOrganizerRegistrationCancelMode(value) {
  return String(value || "").trim().toUpperCase() ===
    ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
    ? ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
    : ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_ONLY;
}

function normalizeOrganizerOccurrenceCancelMode(value) {
  return String(value || "").trim().toUpperCase() ===
    ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE
    ? ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE
    : ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_ONLY;
}

function assertOrganizerRegistrationRefundEligibility(refundSummary, options = {}) {
  if (refundSummary?.eligible) {
    return refundSummary;
  }

  if (options.allowFailedRetry && refundSummary?.reason === "refund_failed" && refundSummary?.retryable) {
    return refundSummary;
  }

  throw new Error(
    refundSummary?.reasonLabel || "Automatic Stripe refund is unavailable for this registration."
  );
}

function buildOrganizerRefundAttemptContext({
  action = "organizer_cancel",
  actorId,
  cancelMode,
  organizer,
  registration,
  refundSummary,
  surface = "organizer_registration_cancel",
  allowFailedRetry = false
}) {
  const readySummary = assertOrganizerRegistrationRefundEligibility(refundSummary, {
    allowFailedRetry
  });
  const stripeAccountId = readySummary.stripeAccountId || organizer?.stripeAccountId || null;
  const idempotencyKey =
    readySummary.latestFailedRefundIdempotencyKey ||
    buildStripeRefundIdempotencyKey({
      action,
      registrationId: registration.id,
      paymentIntentId: readySummary.stripePaymentIntentId,
      amountCents: readySummary.refundableOnlineAmountCents,
      reason: "requested_by_customer"
    });

  return {
    action,
    actorId,
    cancelMode,
    idempotencyKey,
    organizer,
    refundSummary: readySummary,
    registration,
    stripeAccountId,
    surface
  };
}

function buildOrganizerRefundRequestMetadata({
  action = "organizer_cancel",
  actorId,
  cancelMode,
  organizer,
  registration,
  surface = "organizer_registration_cancel"
}) {
  return {
    passreserve_surface: surface,
    refund_action: action,
    organizer_id: organizer?.id || "",
    organizer_slug: organizer?.slug || "",
    registration_id: registration?.id || "",
    registration_code: registration?.registrationCode || registration?.id || "",
    occurrence_id: registration?.occurrenceId || "",
    event_type_id: registration?.eventTypeId || "",
    actor_id: actorId || "",
    cancel_mode: cancelMode
  };
}

async function requestOrganizerStripeRefund({
  action = "organizer_cancel",
  actorId,
  allowFailedRetry = false,
  cancelMode,
  organizer,
  registration,
  refundSummary,
  surface = "organizer_registration_cancel"
}) {
  const context = buildOrganizerRefundAttemptContext({
    action,
    actorId,
    allowFailedRetry,
    cancelMode,
    organizer,
    registration,
    refundSummary,
    surface
  });

  const refund = await createStripeRefund({
    amountCents: context.refundSummary.refundableOnlineAmountCents,
    paymentIntentId: context.refundSummary.stripePaymentIntentId,
    stripeAccountId: context.stripeAccountId,
    idempotencyKey: context.idempotencyKey,
    reason: "requested_by_customer",
    metadata: buildOrganizerRefundRequestMetadata({
      action: context.action,
      actorId: context.actorId,
      cancelMode: context.cancelMode,
      organizer: context.organizer,
      registration: context.registration,
      surface: context.surface
    })
  });

  return {
    refund,
    refundSummary: context.refundSummary,
    idempotencyKey: context.idempotencyKey,
    stripeAccountId: context.stripeAccountId
  };
}

function buildOrganizerPendingRefundPaymentRecord({
  actorId,
  cancelMode,
  note = "Stripe refund requested by organizer admin.",
  occurredAt,
  refundRequest,
  registration,
  action = "organizer_cancel",
  surface = "organizer_registration_cancel"
}) {
  const timestamp = asIso(occurredAt) || new Date().toISOString();

  return {
    id: createToken(),
    registrationId: registration.id,
    provider: "STRIPE",
    kind: "REFUND",
    status: "PENDING",
    amountCents: refundRequest.refundSummary.refundableOnlineAmountCents,
    currency: registration.currency,
    externalEventId: null,
    stripeAccountId: refundRequest.stripeAccountId,
    stripeSessionId: refundRequest.refundSummary.stripeSessionId || null,
    stripePaymentIntentId: refundRequest.refundSummary.stripePaymentIntentId || null,
    note,
    metadata: {
      requestedAt: timestamp,
      requestedByActorId: actorId || null,
      requestedAmountCents: refundRequest.refundSummary.refundableOnlineAmountCents,
      refundAction: action,
      cancelMode,
      passreserveSurface: surface,
      stripeRefundId: refundRequest.refund?.refundId || null,
      stripeRefundStatus: refundRequest.refund?.status || null,
      stripeRefundMode: refundRequest.refund?.mode || null,
      stripeFailureReason: refundRequest.refund?.failureReason || null,
      stripeAccountId: refundRequest.stripeAccountId || null,
      idempotencyKey: refundRequest.idempotencyKey
    },
    occurredAt,
    createdAt: occurredAt
  };
}

function buildOrganizerRegistrationAuditMetadata({
  action,
  cancelMode,
  errorMessage = null,
  refundRequest,
  refundSummary = null
}) {
  return {
    action,
    cancelMode,
    refundAmountCents:
      refundRequest?.refundSummary?.refundableOnlineAmountCents ||
      refundSummary?.refundableOnlineAmountCents ||
      0,
    stripeRefundId: refundRequest?.refund?.refundId || null,
    stripeRefundStatus: refundRequest?.refund?.status || null,
    stripeRefundMode: refundRequest?.refund?.mode || null,
    stripeAccountId:
      refundRequest?.stripeAccountId || refundSummary?.stripeAccountId || null,
    stripePaymentIntentId:
      refundRequest?.refundSummary?.stripePaymentIntentId ||
      refundSummary?.stripePaymentIntentId ||
      null,
    idempotencyKey: refundRequest?.idempotencyKey || null,
    errorMessage
  };
}

function buildOrganizerFailedRefundPaymentRecord({
  actorId,
  action = "organizer_cancel",
  cancelMode,
  note = "Stripe refund request failed.",
  occurredAt,
  organizer,
  registration,
  refundSummary,
  errorMessage,
  surface = "organizer_registration_cancel"
}) {
  const context = buildOrganizerRefundAttemptContext({
    action,
    actorId,
    allowFailedRetry: true,
    cancelMode,
    organizer,
    registration,
    refundSummary,
    surface
  });
  const timestamp = asIso(occurredAt) || new Date().toISOString();

  return {
    id: createToken(),
    registrationId: registration.id,
    provider: "STRIPE",
    kind: "REFUND",
    status: "FAILED",
    amountCents: context.refundSummary.refundableOnlineAmountCents,
    currency: registration.currency,
    externalEventId: null,
    stripeAccountId: context.stripeAccountId,
    stripeSessionId: context.refundSummary.stripeSessionId || null,
    stripePaymentIntentId: context.refundSummary.stripePaymentIntentId || null,
    note,
    metadata: {
      requestedAt: timestamp,
      requestedByActorId: actorId || null,
      requestedAmountCents: context.refundSummary.refundableOnlineAmountCents,
      refundAction: action,
      cancelMode,
      passreserveSurface: surface,
      stripeRefundId: null,
      stripeRefundStatus: "failed",
      stripeRefundMode: null,
      stripeFailureReason: errorMessage || null,
      stripeAccountId: context.stripeAccountId || null,
      idempotencyKey: context.idempotencyKey,
      errorMessage: errorMessage || null
    },
    occurredAt,
    createdAt: occurredAt
  };
}

function buildOccurrenceCancellationAuditMetadata({
  cancellationSummary,
  cancelMode
}) {
  return {
    action: "occurrence_cancel_with_refunds_requested",
    cancelMode,
    cancelledCount: cancellationSummary?.cancelledCount || 0,
    refundRequestedCount: cancellationSummary?.refundRequestedCount || 0,
    refundRequestedCents: cancellationSummary?.refundRequestedCents || 0,
    refundSkippedCount: cancellationSummary?.refundSkippedCount || 0,
    refundFailedCount: cancellationSummary?.refundFailedCount || 0
  };
}

function buildOrganizerRefundFailureAuditMetadata({
  action,
  cancelMode,
  errorMessage,
  refundSummary = null
}) {
  return buildOrganizerRegistrationAuditMetadata({
    action,
    cancelMode,
    errorMessage,
    refundSummary
  });
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(text) {
  return `<p>${escapeHtml(String(text || "")).replace(/\n/g, "<br />")}</p>`;
}

function getConfiguredSenderDomain() {
  const [, domain = ""] = normalizeEmail(process.env.FROM_EMAIL).split("@");
  return domain;
}

function getDefaultPlatformDirectFromEmail() {
  const domain = getConfiguredSenderDomain();
  return domain ? `direct@${domain}` : "";
}

function isSenderOnConfiguredDomain(email) {
  const normalized = normalizeEmail(email);
  const domain = getConfiguredSenderDomain();
  return Boolean(normalized && domain && normalized.endsWith(`@${domain}`));
}

function getPreferredOrganizerContactEmail(organizer, admins = [], joinRequest = null) {
  const activePrimaryAdmin = admins.find((admin) => admin.isPrimary && admin.isActive !== false);
  const activeAdmin = admins.find((admin) => admin.isActive !== false);

  return (
    normalizeEmail(activePrimaryAdmin?.email) ||
    normalizeEmail(activeAdmin?.email) ||
    normalizeEmail(joinRequest?.contactEmail) ||
    normalizeEmail(organizer?.interestEmail) ||
    normalizeEmail(organizer?.publicEmail) ||
    ""
  );
}

function buildPlatformDirectEmailSnapshot(organizer, admins = [], joinRequest = null) {
  return {
    configured: Boolean(hasResend() && getDefaultPlatformDirectFromEmail()),
    defaultFromEmail: getDefaultPlatformDirectFromEmail(),
    defaultToEmail: getPreferredOrganizerContactEmail(organizer, admins, joinRequest),
    senderDomain: getConfiguredSenderDomain()
  };
}

function resolvePlatformDirectEmailInput({
  organizer,
  admins,
  joinRequest,
  input
}) {
  const snapshot = buildPlatformDirectEmailSnapshot(organizer, admins, joinRequest);

  if (!hasResend()) {
    return {
      ok: false,
      message: "Outbound email is not configured in this environment.",
      snapshot
    };
  }

  const fromEmail = normalizeEmail(input.fromEmail) || snapshot.defaultFromEmail;
  const toEmail = normalizeEmail(input.toEmail) || snapshot.defaultToEmail;
  const subject = normalizeText(input.subject);
  const body = String(input.body || "").trim();

  if (!snapshot.senderDomain) {
    return {
      ok: false,
      message: "The configured Resend sender domain could not be resolved.",
      snapshot
    };
  }

  if (!isValidEmail(fromEmail)) {
    return {
      ok: false,
      message: "Add a valid sender email address.",
      snapshot
    };
  }

  if (!isSenderOnConfiguredDomain(fromEmail)) {
    return {
      ok: false,
      message: `The sender must stay on @${snapshot.senderDomain}.`,
      snapshot
    };
  }

  if (!isValidEmail(toEmail)) {
    return {
      ok: false,
      message: "Add a valid organizer recipient email address.",
      snapshot
    };
  }

  if (!subject) {
    return {
      ok: false,
      message: "Add an email subject before sending.",
      snapshot
    };
  }

  if (!body) {
    return {
      ok: false,
      message: "Add an email body before sending.",
      snapshot
    };
  }

  return {
    ok: true,
    snapshot,
    fromEmail,
    toEmail,
    subject,
    body,
    htmlBody: plainTextToHtml(body)
  };
}

function buildPlatformDirectEmailLogEntry({
  organizerId,
  organizerSlug,
  actorId,
  recipientEmail,
  fromEmail,
  subject,
  deliveryStatus,
  providerMessageId
}) {
  const sentAt = new Date().toISOString();

  return {
    id: createToken(),
    recipientEmail,
    templateSlug: "platform_direct_message",
    organizerId,
    registrationId: null,
    occurrenceId: null,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "platform_direct_message",
      organizerId,
      recipientEmail,
      sentAt,
      createToken().slice(0, 8)
    ),
    deliveryStatus,
    providerMessageId: providerMessageId || null,
    sentAt,
    createdAt: sentAt,
    metadata: {
      actorId,
      organizerSlug,
      fromEmail,
      subject
    }
  };
}

function buildReminderModeLabel(enabled) {
  return enabled ? "Enabled" : "Disabled";
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

function buildTicketSummaryLabel(ticketItems = []) {
  return ticketItems.length
    ? ticketItems.map((item) => `${item.label} x${item.quantity}`).join(" · ")
    : "General admission";
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

function buildAdminTicketItems(state, registration, locale = "en") {
  return getRegistrationItems(registration).map((item) => {
    const ticketCategory = getTicketCategoryById(state, item.ticketCategoryId);
    const label =
      getLocalizedText(ticketCategory, "name", locale) || ticketCategory?.name || "General admission";

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

function buildAdminTicketCategoryRecord(category, locale = "en") {
  return {
    ...category,
    label: getLocalizedText(category, "name", locale) || category.name,
    summary: getLocalizedText(category, "description", locale) || category.description,
    includedList: getLocalizedList(category, "included", locale),
    unitPriceLabel: formatCurrencyFromCents(category.unitPriceCents)
  };
}

const EVENT_VISIBILITY_VALUES = new Set(["DRAFT", "PUBLIC", "UNLISTED", "ARCHIVED"]);

function normalizeAdminEventVisibility(value) {
  const normalized = normalizeText(value).toUpperCase();
  return EVENT_VISIBILITY_VALUES.has(normalized) ? normalized : "DRAFT";
}

function normalizeAdminGalleryItems(value) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .map((entry) => ({
        imageUrl: normalizeText(entry.imageUrl),
        title: normalizeText(entry.title),
        caption: normalizeText(entry.caption)
      }))
      .filter((entry) => entry.imageUrl);
  }

  if (value && typeof value === "object") {
    const singleItem = {
      imageUrl: normalizeText(value.imageUrl),
      title: normalizeText(value.title),
      caption: normalizeText(value.caption)
    };

    return singleItem.imageUrl ? [singleItem] : [];
  }

  if (typeof value === "string") {
    const imageUrl = normalizeText(value);
    return imageUrl ? [{ imageUrl, title: "", caption: "" }] : [];
  }

  return [];
}

function buildOrganizerAdminEventRecord(state, organizer, event) {
  const ticketCategories = getTicketCategoriesForEvent(state, event.id).map((category) =>
    buildAdminTicketCategoryRecord(category)
  );
  const occurrences = getEventOccurrences(state, event.id);
  const registrations = getOrganizerRegistrations(state, organizer.id).filter(
    (registration) => registration.eventTypeId === event.id
  );

  return {
    ...event,
    visibility: normalizeAdminEventVisibility(event.visibility),
    gallery: normalizeAdminGalleryItems(event.gallery),
    collectDietaryInfo: event.collectDietaryInfo !== false,
    ticketCategories,
    ticketCount: ticketCategories.filter((category) => category.isActive !== false).length,
    basePriceLabel: formatCurrencyFromCents(event.basePriceCents),
    salesWindowStartsAtLabel: event.salesWindowStartsAt
      ? formatDateTimeLabel(event.salesWindowStartsAt, organizer.timeZone)
      : "Use organizer defaults",
    salesWindowEndsAtLabel: event.salesWindowEndsAt
      ? formatDateTimeLabel(event.salesWindowEndsAt, organizer.timeZone)
      : "Use organizer defaults",
    occurrenceCount: occurrences.length,
    publishedOccurrenceCount: occurrences.filter((occurrence) => occurrence.published).length,
    registrationCount: registrations.length
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
    publicHref: buildOrganizerPublicHref(organizer),
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

function resolveOrganizerPublicSlugInput(input, organizer) {
  const requestedSlug = normalizeOrganizerPublicSlugInput(
    input.publicSlug,
    organizer?.publicSlug || organizer?.slug || input.name
  );

  if (!requestedSlug) {
    throw new Error("Add a public slug before saving the organizer page settings.");
  }

  return requestedSlug;
}

async function ensurePublicSlugAvailableInDatabase(prisma, organizerId, publicSlug) {
  const conflict = await prisma.organizer.findFirst({
    where: {
      publicSlug,
      NOT: {
        id: organizerId
      }
    },
    select: {
      id: true
    }
  });

  if (conflict) {
    throw new Error("That public slug is already in use. Choose a different public slug.");
  }
}

function ensurePublicSlugAvailableInState(state, organizerId, publicSlug) {
  const conflict = state.organizers.find(
    (entry) => entry.id !== organizerId && getOrganizerPublicSlug(entry) === publicSlug
  );

  if (conflict) {
    throw new Error("That public slug is already in use. Choose a different public slug.");
  }
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

function buildAuditLogRecord(input) {
  const createdAt = asIso(input.createdAt);

  return {
    id: createToken(),
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    actorType: input.actorType,
    actorId: input.actorId || null,
    organizerId: input.organizerId || null,
    registrationId: input.registrationId || null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId || null,
    message: input.message,
    metadata: input.metadata || null
  };
}

function getOrganizerSupportReplyEmail(siteSettings, organizer) {
  return organizer.publicEmail || organizer.interestEmail || siteSettings?.platformEmail || null;
}

function buildOccurrenceLabelForOrganizer(organizer, occurrence) {
  return formatDateLabel(occurrence.startsAt, organizer.timeZone);
}

function buildCancellationEmailReplacements(
  siteSettings,
  organizer,
  event,
  occurrence,
  registration,
  payments = []
) {
  return {
    "{{registration_code}}": registration.registrationCode || "Pending",
    "{{event_name}}": event.title,
    "{{occurrence_label}}": buildOccurrenceLabelForOrganizer(organizer, occurrence),
    "{{refund_state}}": getRegistrationRefundStateLabel(
      registration,
      registration.currency,
      payments
    ),
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
  const payments = getRegistrationPayments(state, registration.id);

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
      registration,
      payments
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
  const payments = getRegistrationPayments(state, registration.id);

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
      "{{refund_state}}": getRegistrationRefundStateLabel(
        registration,
        registration.currency,
        payments
      ),
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
  const payments = await prisma.registrationPayment.findMany({
    where: {
      registrationId: registration.id
    },
    orderBy: {
      occurredAt: "desc"
    }
  });

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
      registration,
      payments
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
  const payments = await prisma.registrationPayment.findMany({
    where: {
      registrationId: registration.id
    },
    orderBy: {
      occurredAt: "desc"
    }
  });

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
      "{{refund_state}}": getRegistrationRefundStateLabel(
        registration,
        registration.currency,
        payments
      ),
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

function buildOrganizerContentI18n(currentContent, input) {
  let next = currentContent ?? null;

  next = upsertLocalizedField(next, "name", buildLocalizedTextEntry(input.nameIt, input.nameEn));
  next = upsertLocalizedField(next, "tagline", buildLocalizedTextEntry(input.taglineIt, input.taglineEn));
  next = upsertLocalizedField(
    next,
    "description",
    buildLocalizedTextEntry(input.descriptionIt, input.descriptionEn)
  );
  next = upsertLocalizedField(
    next,
    "venueTitle",
    buildLocalizedTextEntry(input.venueTitleIt, input.venueTitleEn)
  );
  next = upsertLocalizedField(
    next,
    "venueDetail",
    buildLocalizedTextEntry(input.venueDetailIt, input.venueDetailEn)
  );

  return next;
}

function buildEventContentI18n(currentContent, input) {
  let next = currentContent ?? null;

  next = upsertLocalizedField(next, "title", buildLocalizedTextEntry(input.titleIt, input.titleEn));
  next = upsertLocalizedField(next, "summary", buildLocalizedTextEntry(input.summaryIt, input.summaryEn));
  next = upsertLocalizedField(
    next,
    "description",
    buildLocalizedTextEntry(input.descriptionIt, input.descriptionEn)
  );
  next = upsertLocalizedField(
    next,
    "audience",
    buildLocalizedTextEntry(input.audienceIt, input.audienceEn)
  );
  next = upsertLocalizedField(
    next,
    "venueTitle",
    buildLocalizedTextEntry(input.venueTitleIt, input.venueTitleEn)
  );
  next = upsertLocalizedField(
    next,
    "venueDetail",
    buildLocalizedTextEntry(input.venueDetailIt, input.venueDetailEn)
  );
  next = upsertLocalizedField(
    next,
    "attendeeInstructions",
    buildLocalizedTextEntry(input.attendeeInstructionsIt, input.attendeeInstructionsEn)
  );
  next = upsertLocalizedField(
    next,
    "cancellationPolicy",
    buildLocalizedTextEntry(input.cancellationPolicyIt, input.cancellationPolicyEn)
  );
  next = upsertLocalizedField(
    next,
    "highlights",
    buildLocalizedListEntry(
      normalizeMultilineEntries(input.highlightsIt),
      normalizeMultilineEntries(input.highlightsEn)
    )
  );
  next = upsertLocalizedField(
    next,
    "included",
    buildLocalizedListEntry(
      normalizeMultilineEntries(input.includedIt),
      normalizeMultilineEntries(input.includedEn)
    )
  );
  next = upsertLocalizedField(
    next,
    "policies",
    buildLocalizedListEntry(
      normalizeMultilineEntries(input.policiesIt),
      normalizeMultilineEntries(input.policiesEn)
    )
  );

  return next;
}

function buildTicketCategoryContentI18n(currentContent, input) {
  let next = currentContent ?? null;

  next = upsertLocalizedField(next, "name", buildLocalizedTextEntry(input.nameIt, input.nameEn));
  next = upsertLocalizedField(
    next,
    "description",
    buildLocalizedTextEntry(input.descriptionIt, input.descriptionEn)
  );
  next = upsertLocalizedField(
    next,
    "included",
    buildLocalizedListEntry(
      normalizeMultilineEntries(input.includedIt),
      normalizeMultilineEntries(input.includedEn)
    )
  );

  return next;
}

function normalizeTicketCatalogInput(value, fallbackBasePriceCents = 0) {
  let parsed = [];

  if (Array.isArray(value)) {
    parsed = value;
  } else if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("The ticket catalog could not be parsed.");
    }
  }

  const normalized = parsed
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      const contentI18n = buildTicketCategoryContentI18n(entry.contentI18n, entry);
      const name = pickPrimaryTextValue(contentI18n?.name, entry.name);
      const description = pickPrimaryTextValue(contentI18n?.description, entry.description);
      const included = pickPrimaryListValue(
        contentI18n?.included,
        normalizeMultilineEntries(entry.included)
      );
      const unitPriceCents = Math.max(
        0,
        Math.round(Number(normalizeText(entry.priceEuros || entry.unitPriceEuros).replace(",", ".")) * 100) ||
          Math.round(Number(entry.unitPriceCents || 0))
      );

      if (!name || unitPriceCents < 0) {
        return null;
      }

      return {
        id: normalizeText(entry.id),
        slug: slugify(entry.slug || name),
        name,
        description,
        contentI18n,
        included,
        unitPriceCents,
        isDefault: Boolean(entry.isDefault),
        isActive: entry.isActive !== false,
        sortOrder: Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : index
      };
    })
    .filter(Boolean);

  if (!normalized.length) {
    return [
      {
        id: "",
        slug: "general",
        name: "General admission",
        description: "Standard access to this event.",
        contentI18n: null,
        included: [],
        unitPriceCents: Math.max(0, Math.round(Number(fallbackBasePriceCents || 0))),
        isDefault: true,
        isActive: true,
        sortOrder: 0
      }
    ];
  }

  const uniqueSlugs = new Set();
  const seenDefault = normalized.some((entry) => entry.isDefault);

  for (const [index, entry] of normalized.entries()) {
    if (!entry.slug) {
      entry.slug = `ticket-${index + 1}`;
    }

    let candidate = entry.slug;
    let suffix = 2;

    while (uniqueSlugs.has(candidate)) {
      candidate = `${entry.slug}-${suffix}`;
      suffix += 1;
    }

    entry.slug = candidate;
    uniqueSlugs.add(candidate);
    entry.isDefault = seenDefault ? entry.isDefault : index === 0;
    entry.sortOrder = index;
  }

  if (!normalized.some((entry) => entry.isDefault)) {
    normalized[0].isDefault = true;
  }

  let defaultAssigned = false;

  for (const entry of normalized) {
    if (entry.isDefault && !defaultAssigned) {
      defaultAssigned = true;
      continue;
    }

    if (entry.isDefault && defaultAssigned) {
      entry.isDefault = false;
    }
  }

  return normalized.map((entry) => ({
    ...entry,
    isDefault: entry.isDefault && entry.isActive !== false
  }));
}

function deriveEventBasePriceFromTickets(ticketCatalog = [], fallbackBasePriceCents = 0) {
  const activePrices = ticketCatalog
    .filter((entry) => entry.isActive !== false)
    .map((entry) => Number(entry.unitPriceCents || 0))
    .filter((value) => value >= 0)
    .sort((left, right) => left - right);

  return activePrices[0] ?? Math.max(0, Math.round(Number(fallbackBasePriceCents || 0)));
}

function buildOccurrenceContentI18n(currentContent, input) {
  let next = currentContent ?? null;

  next = upsertLocalizedField(
    next,
    "venueTitle",
    buildLocalizedTextEntry(input.venueTitleIt, input.venueTitleEn)
  );
  next = upsertLocalizedField(next, "note", buildLocalizedTextEntry(input.noteIt, input.noteEn));

  return next;
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

function getRegistrationSourceLabel(registration, locale = "en") {
  if (registration?.source === "ORGANIZER_MANUAL") {
    return locale === "it" ? "Inserita dallo staff" : "Staff entry";
  }

  if (registration?.source === "IMPORT") {
    return locale === "it" ? "Importata" : "Imported";
  }

  return locale === "it" ? "Pubblica" : "Public";
}

function getRegistrationOriginLabel(registration, locale = "en") {
  const origin = normalizeText(registration?.origin).toLowerCase();

  if (origin === "walk-in") {
    return locale === "it" ? "Walk-in" : "Walk-in";
  }

  if (origin === "phone") {
    return locale === "it" ? "Telefono" : "Phone";
  }

  if (origin === "email") {
    return locale === "it" ? "Email" : "Email";
  }

  if (origin === "staff") {
    return locale === "it" ? "Staff" : "Staff";
  }

  if (registration?.source === "IMPORT") {
    return locale === "it" ? "Import" : "Import";
  }

  return locale === "it" ? "Flusso pubblico" : "Public flow";
}

function getRegistrationSourceTone(registration) {
  if (registration?.source === "ORGANIZER_MANUAL") {
    return "capacity-watch";
  }

  if (registration?.source === "IMPORT") {
    return "pending_confirm";
  }

  return "public";
}

function getRegistrationOriginTone(registration) {
  if (registration?.source === "ORGANIZER_MANUAL") {
    return "pending_confirm";
  }

  if (registration?.source === "IMPORT") {
    return "capacity-watch";
  }

  return "public";
}

function getRefundReviewReasonLabel(reason, locale = "en") {
  if (reason === "missing_stripe_capture") {
    return locale === "it"
      ? "Esiste un importo online, ma non risulta nessuna cattura Stripe nel ledger."
      : "An online amount exists, but no Stripe capture was found in the ledger.";
  }

  if (reason === "missing_payment_reference") {
    return locale === "it"
      ? "La cattura Stripe esiste, ma manca il riferimento di pagamento riutilizzabile."
      : "The Stripe capture exists, but the reusable payment reference is missing.";
  }

  return locale === "it"
    ? "Questo rimborso richiede una verifica manuale prima di poter procedere."
    : "This refund needs a manual review before it can proceed.";
}

function buildOrganizerRefundSummaryView(registration, refundSummary, locale = "en") {
  const onlineCollectionOnlyMessage =
    registration?.dueAtEventCents > 0
      ? locale === "it"
        ? "Nessuna quota online incassata. L'eventuale saldo era previsto solo sul posto."
        : "No online amount was collected. Any balance was due at the venue only."
      : locale === "it"
        ? "Non e stato incassato nessun pagamento online per questa registrazione."
        : "No online payment was collected for this registration.";

  if (refundSummary.pendingRefundCents > 0) {
    return {
      ...refundSummary,
      status: "PENDING",
      statusLabel: locale === "it" ? "Rimborso in attesa" : "Refund pending",
      detailLabel:
        locale === "it"
          ? `${refundSummary.pendingRefundLabel} richiesti su Stripe. In attesa della conferma webhook.`
          : `${refundSummary.pendingRefundLabel} requested on Stripe. Waiting for webhook confirmation.`,
      amountLabel: refundSummary.pendingRefundLabel,
      tone: "refund-pending",
      highlighted: true
    };
  }

  if (refundSummary.alreadyRefundedCents > 0 || refundSummary.reason === "already_fully_refunded") {
    return {
      ...refundSummary,
      status: "REFUNDED",
      statusLabel: locale === "it" ? "Rimborso completato" : "Refund completed",
      detailLabel:
        locale === "it"
          ? `${refundSummary.alreadyRefundedLabel} risultano gia rimborsati online.`
          : `${refundSummary.alreadyRefundedLabel} is already confirmed as refunded online.`,
      amountLabel: refundSummary.alreadyRefundedLabel,
      tone: "refund-completed",
      highlighted: true
    };
  }

  if (refundSummary.eligible) {
    return {
      ...refundSummary,
      status: "READY",
      statusLabel: locale === "it" ? "Rimborso disponibile" : "Refund available",
      detailLabel:
        locale === "it"
          ? `${refundSummary.refundableOnlineAmountLabel} possono essere rimborsati sulla quota online incassata.`
          : `${refundSummary.refundableOnlineAmountLabel} can be refunded back to the attendee's online payment.`,
      amountLabel: refundSummary.refundableOnlineAmountLabel,
      tone: "refund-ready",
      highlighted: true
    };
  }

  if (refundSummary.reason === "no_online_collection") {
    return {
      ...refundSummary,
      status: "NOT_REQUIRED",
      statusLabel: locale === "it" ? "Nessun rimborso online" : "No online refund",
      detailLabel: onlineCollectionOnlyMessage,
      amountLabel: null,
      tone: "refund-none",
      highlighted: false
    };
  }

  if (refundSummary.reason === "refund_failed") {
    return {
      ...refundSummary,
      status: "FAILED",
      statusLabel: locale === "it" ? "Rimborso fallito" : "Refund failed",
      detailLabel:
        locale === "it"
          ? `${refundSummary.latestFailedRefundReason || "Stripe non ha accettato l'ultima richiesta di rimborso."} Riprova dal backoffice quando vuoi.`
          : `${refundSummary.latestFailedRefundReason || "Stripe did not accept the last refund request."} Retry it from backoffice when you're ready.`,
      amountLabel: refundSummary.refundableOnlineAmountLabel,
      tone: "danger",
      highlighted: true,
      retryAvailable: Boolean(refundSummary.retryable)
    };
  }

  return {
    ...refundSummary,
    status: "REVIEW",
    statusLabel: locale === "it" ? "Verifica manuale" : "Manual review",
    detailLabel: getRefundReviewReasonLabel(refundSummary.reason, locale),
    amountLabel:
      refundSummary.refundableOnlineAmountCents > 0
        ? refundSummary.refundableOnlineAmountLabel
        : refundSummary.onlineCollectedLabel,
    tone: "refund-review",
    highlighted: true
  };
}

function getOrganizerPaymentStatusTone(payment) {
  if (payment?.kind === "REFUND" && payment?.status === "PENDING") {
    return "refund-pending";
  }

  if (payment?.kind === "REFUND" && payment?.status === "REFUNDED") {
    return "refund-completed";
  }

  if (payment?.kind === "REFUND" && payment?.status === "FAILED") {
    return "danger";
  }

  if (payment?.status === "SUCCEEDED") {
    return "public";
  }

  if (payment?.status === "PENDING") {
    return "payment-pending";
  }

  if (payment?.status === "FAILED") {
    return "payment-failed";
  }

  return "refund-none";
}

function getOrganizerPaymentStatusLabel(payment, locale = "en") {
  if (payment?.kind === "REFUND" && payment?.status === "PENDING") {
    return locale === "it" ? "Rimborso in attesa" : "Refund pending";
  }

  if (payment?.kind === "REFUND" && payment?.status === "REFUNDED") {
    return locale === "it" ? "Rimborso completato" : "Refund completed";
  }

  if (payment?.kind === "REFUND" && payment?.status === "FAILED") {
    return locale === "it" ? "Rimborso fallito" : "Refund failed";
  }

  if (payment?.status === "SUCCEEDED") {
    return locale === "it" ? "Confermato" : "Confirmed";
  }

  if (payment?.status === "PENDING") {
    return locale === "it" ? "In attesa" : "Pending";
  }

  if (payment?.status === "FAILED") {
    return locale === "it" ? "Fallito" : "Failed";
  }

  if (payment?.status === "CANCELED") {
    return locale === "it" ? "Annullato" : "Canceled";
  }

  return payment?.status || "";
}

function getOrganizerPaymentKindLabel(payment, locale = "en") {
  if (payment?.kind === "REFUND") {
    return locale === "it" ? "Rimborso Stripe" : "Stripe refund";
  }

  if (payment?.kind === "CAPTURE") {
    return locale === "it" ? "Incasso Stripe" : "Stripe capture";
  }

  if (payment?.kind === "WEBHOOK") {
    return locale === "it" ? "Aggiornamento webhook" : "Webhook update";
  }

  if (payment?.kind === "CHECKOUT_SESSION") {
    return locale === "it" ? "Sessione checkout" : "Checkout session";
  }

  return payment?.kind || (locale === "it" ? "Pagamento" : "Payment");
}

function getOrganizerPaymentDetailLabel(payment, locale = "en") {
  const metadata =
    payment?.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? payment.metadata
      : {};

  if (payment?.kind === "REFUND" && payment?.status === "PENDING") {
    return locale === "it"
      ? "Richiesta accettata da Stripe. In attesa della conferma webhook prima di considerare il rimborso completato."
      : "Request accepted by Stripe. Waiting for webhook confirmation before treating the refund as completed.";
  }

  if (payment?.kind === "REFUND" && payment?.status === "REFUNDED") {
    return metadata.stripeEventId
      ? locale === "it"
        ? "Rimborso confermato dal webhook Stripe."
        : "Refund confirmed by the Stripe webhook."
      : locale === "it"
        ? "Rimborso registrato come completato."
        : "Refund recorded as completed.";
  }

  if (payment?.kind === "REFUND" && payment?.status === "FAILED") {
    return locale === "it"
      ? "La richiesta di rimborso non e andata a buon fine e richiede follow-up manuale."
      : "The refund request failed and needs manual follow-up.";
  }

  return payment?.note || "";
}

function getOrganizerPaymentReferenceLabel(payment, locale = "en") {
  const metadata =
    payment?.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata)
      ? payment.metadata
      : {};
  const references = [];

  if (metadata.stripeRefundId) {
    references.push(`Refund ${metadata.stripeRefundId}`);
  }

  if (payment?.stripePaymentIntentId) {
    references.push(`PI ${payment.stripePaymentIntentId}`);
  }

  if (metadata.stripeEventId) {
    references.push(locale === "it" ? `Webhook ${metadata.stripeEventId}` : `Webhook ${metadata.stripeEventId}`);
  }

  return references.join(" · ");
}

function buildOrganizerPaymentLedgerEntry(payment, locale = "en", timeZone = "Europe/Rome") {
  return {
    id: payment.id,
    note: payment.note,
    provider: payment.provider,
    kind: payment.kind,
    kindLabel: getOrganizerPaymentKindLabel(payment, locale),
    status: payment.status,
    statusLabel: getOrganizerPaymentStatusLabel(payment, locale),
    statusTone: getOrganizerPaymentStatusTone(payment),
    detailLabel: getOrganizerPaymentDetailLabel(payment, locale),
    referenceLabel: getOrganizerPaymentReferenceLabel(payment, locale),
    amountLabel:
      payment.kind === "REFUND"
        ? `-${formatCurrencyFromCents(payment.amountCents)}`
        : formatCurrencyFromCents(payment.amountCents),
    occurredAtLabel: formatDateTimeLabel(payment.occurredAt, timeZone),
    stripeAccountId: payment.stripeAccountId || null
  };
}

function buildOrganizerAdminRecord(state, registration, locale = "en") {
  const organizer = getOrganizerById(state, registration.organizerId);
  const event = getEventById(state, registration.eventTypeId);
  const occurrence = getOccurrenceById(state, registration.occurrenceId);
  const payments = getRegistrationPayments(state, registration.id);
  const attendees = getRegistrationAttendees(registration);
  const dietary = summarizeDietaryNeeds([registration], locale);
  const ticketItems = buildAdminTicketItems(state, registration, locale);
  const refundSummary = getRegistrationRefundSummary(registration, payments, {
    currency: registration.currency
  });
  const refundSummaryView = buildOrganizerRefundSummaryView(
    registration,
    refundSummary,
    locale
  );

  return {
    id: registration.id,
    registrationCode: registration.registrationCode || "Pending",
    status: registration.status,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    attendeePhone: registration.attendeePhone,
    registrationLocale: registration.registrationLocale || "en",
    source: registration.source || "PUBLIC",
    sourceLabel: getRegistrationSourceLabel(registration, locale),
    sourceTone: getRegistrationSourceTone(registration),
    origin: registration.origin || "",
    originLabel: getRegistrationOriginLabel(registration, locale),
    originTone: getRegistrationOriginTone(registration),
    attendees: attendees.map((attendee) => ({
      ...attendee,
      fullName: [attendee.firstName, attendee.lastName].filter(Boolean).join(" "),
      dietaryFlagLabels: (Array.isArray(attendee.dietaryFlags) ? attendee.dietaryFlags : []).map((flag) =>
        getDietaryFlagLabel(flag, locale)
      ),
      ticketLabel:
        getLocalizedText(getTicketCategoryById(state, attendee.ticketCategoryId), "name", locale) ||
        getTicketCategoryById(state, attendee.ticketCategoryId)?.name ||
        buildTicketSummaryLabel(ticketItems)
    })),
    dietary,
    quantityLabel: pluralize(registration.quantity, "attendee"),
    eventSlug: event?.slug || "",
    eventTitle: event?.title || "Unknown event",
    occurrenceId: occurrence?.id || registration.occurrenceId,
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
    refundedLabel: formatCurrencyFromCents(registration.refundedCents),
    dueAtEventOpenLabel: formatCurrencyFromCents(
      Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents)
    ),
    refundSummary: refundSummaryView,
    ticketItems,
    ticketLabel: buildTicketSummaryLabel(ticketItems),
    note: registration.note || "",
    createdAtLabel: formatDateTimeLabel(
      registration.createdAt,
      organizer?.timeZone || "Europe/Rome"
    ),
    paymentCount: payments.length
  };
}

function buildOccurrenceCancellationSnapshot(state, occurrence) {
  const registrations = state.registrations.filter((entry) => entry.occurrenceId === occurrence.id);
  const cancellableRegistrations = registrations.filter(shouldSendOccurrenceCancellationForRegistration);
  const refundSummaries = cancellableRegistrations.map((registration) =>
    getRegistrationRefundSummary(registration, getRegistrationPayments(state, registration.id), {
      currency: registration.currency
    })
  );
  const refundEligibleCount = refundSummaries.filter((summary) => summary.eligible).length;
  const refundEligibleAmountCents = refundSummaries.reduce(
    (sum, summary) =>
      summary.eligible ? sum + Number(summary.refundableOnlineAmountCents || 0) : sum,
    0
  );
  const cancelledRegistrations = registrations.filter((entry) => entry.status === "CANCELLED");
  const failedRefundSummaries = cancelledRegistrations
    .map((registration) =>
      getRegistrationRefundSummary(registration, getRegistrationPayments(state, registration.id), {
        currency: registration.currency
      })
    )
    .filter((summary) => summary.reason === "refund_failed" && summary.retryable);
  const refundFailedCount = failedRefundSummaries.length;
  const refundFailedAmountCents = failedRefundSummaries.reduce(
    (sum, summary) => sum + Number(summary.refundableOnlineAmountCents || 0),
    0
  );

  return {
    registrationCount: registrations.length,
    cancellableRegistrationCount: cancellableRegistrations.length,
    refundEligibleCount,
    refundEligibleAmountCents,
    refundEligibleAmountLabel: formatCurrencyFromCents(refundEligibleAmountCents),
    refundFailedCount,
    refundFailedAmountCents,
    refundFailedAmountLabel: formatCurrencyFromCents(refundFailedAmountCents)
  };
}

function getRegistrationActionOptions(registration, refundSummary = null) {
  const actions = [];

  if (["CONFIRMED_UNPAID", "CONFIRMED_PARTIALLY_PAID", "CONFIRMED_PAID"].includes(registration.status)) {
    actions.push("mark_attended", "mark_no_show", "cancel");
  }

  if (registration.status === "PENDING_PAYMENT") {
    actions.push("mark_paid", "cancel");
  }

  if (
    registration.status === "CANCELLED" &&
    refundSummary?.status === "FAILED" &&
    refundSummary?.retryAvailable
  ) {
    actions.push("retry_refund");
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
      organizerReminderOptInCount,
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
          OR: [
            {
              status: "PENDING"
            },
            {
              provisioningStatus: "EMAIL_FAILED"
            }
          ]
        }
      }),
      prisma.organizer.count({
        where: {
          registrationRemindersEnabled: true
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
    const platformRemindersEnabled = Boolean(supportSettings?.registrationRemindersEnabled);

    return {
      supportEmail: supportSettings?.platformEmail || "",
      releaseLabel: "Production admin",
      summary: {
        organizerCount,
        eventCount,
        occurrenceCount,
        activeRegistrations,
        openRequestsCount,
        pendingApplicationsCount: openRequestsCount,
        reminderModeLabel: buildReminderModeLabel(platformRemindersEnabled),
        organizerReminderOptInCount,
        templateCount,
        onlineCollectedLabel: totals.onlineCollectedLabel,
        dueAtEventLabel: totals.dueAtEventLabel,
        stripeModeLabel:
          getStripeEnvironmentState().mode === "live" ? "Connect enabled" : "Preview mode",
        inboxStorageLabel: getStorageSummary().label,
        storageLabel: getStorageSummary().label
      },
      attentionQueue: [
        {
          title: `${openRequestsCount} applications need follow-up`,
          detail: "Review duplicate signups, resend failed access emails, and keep the provisioning audit current.",
          href: "/admin/applications",
          cta: "Open applications"
        },
        {
          title: platformRemindersEnabled
            ? `${organizerReminderOptInCount} organizers have reminders enabled`
            : "Guest reminders are disabled",
          detail: platformRemindersEnabled
            ? "The daily cron can now send attendee reminders for organizers who opt in on their own settings."
            : "Turn on platform reminders before expecting scheduled attendee reminder emails.",
          href: "/admin/settings",
          cta: "Open settings"
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
          detail: "Applications now auto-provision organizers, keep them private by default, and let admins resend access when onboarding email fails."
        },
        {
          title: "Content and settings",
          detail: "Editable site settings, public slugs, publication controls, about-page content, and email templates."
        },
        {
          title: "Ops and payments",
          detail: "Registration, payment, reminder, and audit activity are stored durably."
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
  const pendingApplicationsCount = state.joinRequests.filter(
    (request) => request.status === "PENDING" || request.provisioningStatus === "EMAIL_FAILED"
  ).length;
  const organizerReminderOptInCount = state.organizers.filter(
    (organizer) => organizer.registrationRemindersEnabled
  ).length;
  const platformRemindersEnabled = Boolean(state.siteSettings.registrationRemindersEnabled);

  return {
    supportEmail: state.siteSettings.platformEmail,
    releaseLabel: "Production admin",
    summary: {
      organizerCount: activeOrganizers.length,
      eventCount: publishedEvents.length,
      occurrenceCount: publishedOccurrences.length,
      activeRegistrations: activeRegistrations.length,
      openRequestsCount: pendingApplicationsCount,
      pendingApplicationsCount,
      reminderModeLabel: buildReminderModeLabel(platformRemindersEnabled),
      organizerReminderOptInCount,
      templateCount: state.emailTemplates.length,
      onlineCollectedLabel: formatCurrencyFromCents(onlineCollected),
      dueAtEventLabel: formatCurrencyFromCents(dueAtEvent),
      inboxStorageLabel: getStorageSummary().label,
      storageLabel: getStorageSummary().label,
      stripeModeLabel:
        getStripeEnvironmentState().mode === "live" ? "Connect enabled" : "Preview mode"
    },
    attentionQueue: [
      {
        title: `${pendingApplicationsCount} applications need follow-up`,
        detail: "Review duplicate signups, resend failed access emails, and keep the provisioning audit current.",
        href: "/admin/applications",
        cta: "Open applications"
      },
      {
        title: platformRemindersEnabled
          ? `${organizerReminderOptInCount} organizers have reminders enabled`
          : "Guest reminders are disabled",
        detail: platformRemindersEnabled
          ? "The daily cron can now send attendee reminders for organizers who opt in on their own settings."
          : "Turn on platform reminders before expecting scheduled attendee reminder emails.",
        href: "/admin/settings",
        cta: "Open settings"
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
        detail: "Applications now auto-provision organizers, keep them private by default, and let admins resend access when onboarding email fails."
      },
      {
        title: "Content and settings",
        detail: "Editable site settings, public slugs, publication controls, about-page content, and email templates."
      },
      {
        title: "Ops and payments",
        detail: "Registration, payment, reminder, and audit activity are stored durably."
      }
    ]
  };
});

export async function getPlatformOverview() {
  return getPlatformOverviewCached();
}

export async function getPlatformHealth() {
  const stripe = getStripeEnvironmentState();
  const storage = getStorageSummary();
  const emailConfigured = hasResend();
  const reminderSchedulerConfigured = Boolean(process.env.CRON_SECRET?.trim());

  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const [
      siteSettings,
      organizerCount,
      eventCount,
      occurrenceCount,
      registrationCount,
      organizerReminderOptInCount,
      recentFailures
    ] =
      await Promise.all([
        prisma.siteSettings.findUnique({
          where: {
            id: "site-settings"
          }
        }),
        prisma.organizer.count(),
        prisma.eventType.count(),
        prisma.eventOccurrence.count(),
        prisma.registration.count(),
        prisma.organizer.count({
          where: {
            registrationRemindersEnabled: true
          }
        }),
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
          title: "Guest reminders",
          statusLabel: siteSettings?.registrationRemindersEnabled ? "Enabled" : "Disabled",
          statusTone: siteSettings?.registrationRemindersEnabled ? "public" : "capacity-watch",
          detail:
            siteSettings?.registrationRemindersEnabled
              ? "Organizers can opt in per account and the reminder templates are ready."
              : "Platform reminders are off, so the daily reminder job will skip attendee emails."
        },
        {
          title: "Reminder scheduler",
          statusLabel: reminderSchedulerConfigured ? "Scheduled" : "Needs CRON_SECRET",
          statusTone: reminderSchedulerConfigured ? "public" : "capacity-watch",
          detail: reminderSchedulerConfigured
            ? "Vercel can sign the daily reminder cron request automatically."
            : "Add CRON_SECRET so Vercel cron can authenticate against /api/cron/reminders."
        },
        {
          title: "Inbound email",
          statusLabel: "External",
          statusTone: "public",
          detail: "Inbound email is now handled outside Passreserve through Cloudflare Workers."
        }
      ],
      email: {
        outboundModeLabel: emailConfigured ? "Resend configured" : "Log only",
        outboundConfigured: emailConfigured,
        inboundModeLabel: "Handled externally",
        reminderSchedulerConfigured,
        platformRemindersEnabled: Boolean(siteSettings?.registrationRemindersEnabled),
        organizerReminderOptInCount,
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
          title: "No reminders will send until organizers opt in",
          detail:
            "The platform scheduler can be healthy while reminder delivery still stays silent until at least one organizer enables reminder emails."
        }
      ]
    };
  }

  const state = await loadPersistentState();
  const organizerReminderOptInCount = state.organizers.filter(
    (organizer) => organizer.registrationRemindersEnabled
  ).length;
  const platformRemindersEnabled = Boolean(state.siteSettings.registrationRemindersEnabled);
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
        title: "Guest reminders",
        statusLabel: platformRemindersEnabled ? "Enabled" : "Disabled",
        statusTone: platformRemindersEnabled ? "public" : "capacity-watch",
        detail:
          platformRemindersEnabled
            ? "Organizers can opt in per account and the reminder templates are ready."
            : "Platform reminders are off, so the daily reminder job will skip attendee emails."
      },
      {
        title: "Reminder scheduler",
        statusLabel: reminderSchedulerConfigured ? "Scheduled" : "Needs CRON_SECRET",
        statusTone: reminderSchedulerConfigured ? "public" : "capacity-watch",
        detail: reminderSchedulerConfigured
          ? "Vercel can sign the daily reminder cron request automatically."
          : "Add CRON_SECRET so Vercel cron can authenticate against /api/cron/reminders."
      },
      {
        title: "Inbound email",
        statusLabel: "External",
        statusTone: "public",
        detail: "Inbound email is now handled outside Passreserve through Cloudflare Workers."
      }
    ],
    email: {
      outboundModeLabel: emailConfigured ? "Resend configured" : "Log only",
      outboundConfigured: emailConfigured,
      inboundModeLabel: "Handled externally",
      reminderSchedulerConfigured,
      platformRemindersEnabled,
      organizerReminderOptInCount,
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
        title: "No reminders will send until organizers opt in",
        detail:
          "The platform scheduler can be healthy while reminder delivery still stays silent until at least one organizer enables reminder emails."
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
        publicSlug: getOrganizerPublicSlug(organizer),
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
        publicationStatusLabel: getOrganizerPublicationStatusMeta(organizer).label,
        publicationStatusTone: getOrganizerPublicationStatusMeta(organizer).tone,
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
        publicSlug: getOrganizerPublicSlug(organizer),
        summary,
        metrics: {
          eventCount: events.length,
          publishedEvents: events.filter((event) => event.visibility === "PUBLIC").length,
          publishedOccurrences: events
            .flatMap((event) => getEventOccurrences(state, event.id))
            .filter((occurrence) => occurrence.published).length
        },
        launchStatusLabel: organizer.status === "ACTIVE" ? "Active" : organizer.status,
        launchStatusTone: organizer.status === "ACTIVE" ? "public" : "capacity-watch",
        publicationStatusLabel: getOrganizerPublicationStatusMeta(organizer).label,
        publicationStatusTone: getOrganizerPublicationStatusMeta(organizer).tone,
        healthLabel: summary.pendingPayments > 0 ? "Needs payment follow-up" : "Healthy",
        healthTone: summary.pendingPayments > 0 ? "capacity-watch" : "public",
        featuredEventTitle: events[0]?.title || "No events yet",
        detailHref: `/admin/organizers/${organizer.slug}`
      };
    });
}

export async function listOrganizerRequests() {
  return listOrganizerApplications();
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
      directEmail: buildPlatformDirectEmailSnapshot(organizer, admins, recentJoinRequest),
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
    directEmail: buildPlatformDirectEmailSnapshot(organizer, admins, recentJoinRequest),
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

export async function getPlatformEmailConsole(options = {}) {
  void options;

  const outboundConfigured = hasResend();
  const defaultDirectFromEmail = getDefaultPlatformDirectFromEmail();
  const senderDomain = getConfiguredSenderDomain();

  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const [emailTemplates, deliveryLogs] = await Promise.all([
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
      })
    ]);

    return {
      outboundConfigured,
      directSenderConfigured: Boolean(outboundConfigured && defaultDirectFromEmail),
      defaultDirectFromEmail,
      senderDomain,
      inboundModeLabel: "Handled externally",
      emailTemplates,
      deliveryLogs: deliveryLogs.map((entry) => ({
        id: entry.id,
        recipientEmail: entry.recipientEmail,
        templateSlug: entry.templateSlug,
        deliveryStatus: entry.deliveryStatus,
        statusTone: getDeliveryStatusTone(entry.deliveryStatus),
        sentAt: entry.sentAt.toISOString(),
        metadata: entry.metadata
      }))
    };
  }

  const state = await loadPersistentState();

  return {
    outboundConfigured,
    directSenderConfigured: Boolean(outboundConfigured && defaultDirectFromEmail),
    defaultDirectFromEmail,
    senderDomain,
    inboundModeLabel: "Handled externally",
    emailTemplates: state.emailTemplates,
    deliveryLogs: getEmailDeliveries(state).map((entry) => ({
      ...entry,
      statusTone: getDeliveryStatusTone(entry.deliveryStatus)
    }))
  };
}

export async function sendOrganizerDirectEmailFromPlatform(slug, input, actorId = null) {
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
        message: "The organizer could not be found."
      };
    }

    const [admins, recentJoinRequest] = await Promise.all([
      prisma.organizerAdminUser.findMany({
        where: {
          organizerId: organizer.id
        },
        orderBy: {
          createdAt: "asc"
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

    const resolved = resolvePlatformDirectEmailInput({
      organizer,
      admins,
      joinRequest: recentJoinRequest,
      input
    });

    if (!resolved.ok) {
      return resolved;
    }

    const delivery = await sendTransactionalEmail({
      from: resolved.fromEmail,
      to: resolved.toEmail,
      subject: resolved.subject,
      text: resolved.body,
      html: resolved.htmlBody
    });

    if (!delivery.ok || delivery.mode !== "email") {
      return {
        ok: false,
        message: "The direct organizer email could not be sent through Resend.",
        snapshot: resolved.snapshot
      };
    }

    const deliveryLog = buildPlatformDirectEmailLogEntry({
      organizerId: organizer.id,
      organizerSlug: organizer.slug,
      actorId,
      recipientEmail: resolved.toEmail,
      fromEmail: resolved.fromEmail,
      subject: resolved.subject,
      deliveryStatus: "SENT",
      providerMessageId: delivery.id
    });
    const auditTimestamp = new Date();

    await prisma.emailDeliveryLog.create({
      data: {
        ...deliveryLog,
        sentAt: new Date(deliveryLog.sentAt),
        createdAt: new Date(deliveryLog.createdAt)
      }
    });
    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: auditTimestamp,
        actorType: "PLATFORM_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: null,
        eventType: "platform_direct_email_sent",
        entityType: "organizer",
        entityId: organizer.id,
        message: `Sent a direct platform email to ${organizer.name}.`,
        metadata: {
          toEmail: resolved.toEmail,
          fromEmail: resolved.fromEmail,
          subject: resolved.subject
        }
      }
    });

    return {
      ok: true,
      organizerSlug: organizer.slug,
      snapshot: resolved.snapshot
    };
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return {
        ok: false,
        message: "The organizer could not be found."
      };
    }

    const admins = draft.organizerAdmins.filter((entry) => entry.organizerId === organizer.id);
    const recentJoinRequest =
      draft.joinRequests
        .filter((entry) => entry.organizerId === organizer.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] || null;
    const resolved = resolvePlatformDirectEmailInput({
      organizer,
      admins,
      joinRequest: recentJoinRequest,
      input
    });

    if (!resolved.ok) {
      return resolved;
    }

    const delivery = await sendTransactionalEmail({
      from: resolved.fromEmail,
      to: resolved.toEmail,
      subject: resolved.subject,
      text: resolved.body,
      html: resolved.htmlBody
    });

    if (!delivery.ok || delivery.mode !== "email") {
      return {
        ok: false,
        message: "The direct organizer email could not be sent through Resend.",
        snapshot: resolved.snapshot
      };
    }

    if (!Array.isArray(draft.emailDeliveries)) {
      draft.emailDeliveries = [];
    }

    const deliveryLog = buildPlatformDirectEmailLogEntry({
      organizerId: organizer.id,
      organizerSlug: organizer.slug,
      actorId,
      recipientEmail: resolved.toEmail,
      fromEmail: resolved.fromEmail,
      subject: resolved.subject,
      deliveryStatus: "SENT",
      providerMessageId: delivery.id
    });

    draft.emailDeliveries.unshift(deliveryLog);

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "platform_direct_email_sent",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Sent a direct platform email to ${organizer.name}.`,
      metadata: {
        toEmail: resolved.toEmail,
        fromEmail: resolved.fromEmail,
        subject: resolved.subject
      }
    });

    return {
      ok: true,
      organizerSlug: organizer.slug,
      snapshot: resolved.snapshot
    };
  });
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
    const tourStorageSeed = await getOrganizerTourStorageSeedFromDatabase(organizer.id);

    return {
      organizer: {
        ...organizer,
        venues: getOrganizerVenueRecords(organizer),
        ...buildOrganizerLinks(organizer),
        summary,
        billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
        totalUpcomingOccurrences,
        supportEmail: organizer.publicEmail,
        tourStorageSeed
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
      supportEmail: organizer.publicEmail,
      tourStorageSeed: getOrganizerTourStorageSeedFromState(state, organizer.id)
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
        eventSlug: entry.event.slug,
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
      .map((registration) => {
        const record = buildOrganizerAdminRecord(state, registration);

        return {
          ...record,
          actions: getRegistrationActionOptions(registration, record.refundSummary)
        };
      });

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
      eventSlug: entry.event.slug,
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
    .map((registration) => {
      const record = buildOrganizerAdminRecord(state, registration);

      return {
        ...record,
        actions: getRegistrationActionOptions(registration, record.refundSummary)
      };
    });

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
      events: getOrganizerEvents(state, organizer.id).map((event) =>
        buildOrganizerAdminEventRecord(state, organizer, event)
      )
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
    events: getOrganizerEvents(state, organizer.id).map((event) =>
      buildOrganizerAdminEventRecord(state, organizer, event)
    )
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
            cancellationSnapshot: buildOccurrenceCancellationSnapshot(state, occurrence),
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
          cancellationSnapshot: buildOccurrenceCancellationSnapshot(state, occurrence),
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

export async function getOrganizerRegistrationsAdmin(slug, locale = "en") {
  if (getStorageMode() === "database") {
    const state = await loadOrganizerAdminStateBySlug(slug);
    const organizer = state ? getOrganizerRecord(state, slug) : null;

    if (!organizer) {
      return null;
    }

    return {
      organizer,
      occurrences: getOrganizerEvents(state, organizer.id)
        .flatMap((event) =>
          getEventOccurrences(state, event.id).map((occurrence) => ({
            id: occurrence.id,
            eventSlug: event.slug,
            eventTitle: event.title,
            label: formatDateLabel(occurrence.startsAt, organizer.timeZone),
            startsAt: occurrence.startsAt,
            startsAtLabel: formatDateTimeLabel(occurrence.startsAt, organizer.timeZone)
          }))
        )
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
      registrations: getOrganizerRegistrations(state, organizer.id).map((registration) => {
        const ledger = getRegistrationPayments(state, registration.id).slice(0, 5);
        const record = buildOrganizerAdminRecord(state, registration, locale);

        return {
          ...record,
          actions: getRegistrationActionOptions(registration, record.refundSummary),
          venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
          dueAtEventOpenCents: Math.max(
            0,
            registration.dueAtEventCents - registration.venueCollectedCents
          ),
          ledger: ledger.map((payment) =>
            buildOrganizerPaymentLedgerEntry(payment, locale, organizer.timeZone)
          )
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
    occurrences: getOrganizerEvents(state, organizer.id)
      .flatMap((event) =>
        getEventOccurrences(state, event.id).map((occurrence) => ({
          id: occurrence.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          label: formatDateLabel(occurrence.startsAt, organizer.timeZone),
          startsAt: occurrence.startsAt,
          startsAtLabel: formatDateTimeLabel(occurrence.startsAt, organizer.timeZone)
        }))
      )
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    registrations: getOrganizerRegistrations(state, organizer.id).map((registration) => {
      const ledger = getRegistrationPayments(state, registration.id).slice(0, 5);
      const record = buildOrganizerAdminRecord(state, registration, locale);

      return {
        ...record,
        actions: getRegistrationActionOptions(registration, record.refundSummary),
        venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
        dueAtEventOpenCents: Math.max(
          0,
          registration.dueAtEventCents - registration.venueCollectedCents
        ),
        ledger: ledger.map((payment) =>
          buildOrganizerPaymentLedgerEntry(payment, locale, organizer.timeZone)
        )
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
          ledger: getRegistrationPayments(state, registration.id)
            .slice(0, 5)
            .map((payment) => buildOrganizerPaymentLedgerEntry(payment, "en", organizer.timeZone))
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
        ledger: getRegistrationPayments(state, registration.id)
          .slice(0, 5)
          .map((payment) => buildOrganizerPaymentLedgerEntry(payment, "en", organizer.timeZone))
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

async function findOrganizerAdminRecordInDatabase(
  prisma,
  organizerId,
  options = {}
) {
  const actorId = normalizeText(options.actorId);
  const includeInactiveFallback = options.includeInactiveFallback !== false;
  const lookups = [
    actorId
      ? {
          where: {
            id: actorId,
            organizerId,
            isActive: true
          }
        }
      : null,
    {
      where: {
        organizerId,
        isPrimary: true,
        isActive: true
      },
      orderBy: {
        createdAt: "asc"
      }
    },
    {
      where: {
        organizerId,
        isActive: true
      },
      orderBy: {
        createdAt: "asc"
      }
    },
    includeInactiveFallback
      ? {
          where: {
            organizerId,
            isPrimary: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      : null,
    includeInactiveFallback
      ? {
          where: {
            organizerId
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      : null
  ].filter(Boolean);

  for (const lookup of lookups) {
    const admin = await prisma.organizerAdminUser.findFirst(lookup);

    if (admin) {
      return admin;
    }
  }

  return null;
}

function findOrganizerAdminRecordInState(state, organizerId, options = {}) {
  const actorId = normalizeText(options.actorId);
  const includeInactiveFallback = options.includeInactiveFallback !== false;
  const admins = state.organizerAdmins.filter((entry) => entry.organizerId === organizerId);

  return (
    (actorId
      ? admins.find((entry) => entry.id === actorId && entry.isActive !== false)
      : null) ||
    admins.find((entry) => entry.isPrimary && entry.isActive !== false) ||
    admins.find((entry) => entry.isActive !== false) ||
    (includeInactiveFallback ? admins.find((entry) => entry.isPrimary) : null) ||
    (includeInactiveFallback ? admins[0] || null : null)
  );
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

    const primaryAdmin = await findOrganizerAdminRecordInDatabase(prisma, organizer.id);

    return {
      organizer: {
        ...organizer,
        publicSlug: getOrganizerPublicSlug(organizer),
        venues: getOrganizerVenueRecords(organizer),
        ...buildOrganizerLinks(organizer),
        canEditPublicSlug: canEditOrganizerPublicSlug(organizer),
        publicationStatus: getOrganizerPublicationStatusMeta(organizer)
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

  const primaryAdmin = findOrganizerAdminRecordInState(state, organizer.id);

  return {
    organizer: {
      ...organizer,
      publicSlug: getOrganizerPublicSlug(organizer),
      venues: getOrganizerVenueRecords(organizer),
      ...buildOrganizerLinks(organizer),
      canEditPublicSlug: canEditOrganizerPublicSlug(organizer),
      publicationStatus: getOrganizerPublicationStatusMeta(organizer)
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

    const admin = await findOrganizerAdminRecordInDatabase(prisma, organizer.id, {
      includeInactiveFallback: false
    });

    return admin ? { organizer, admin } : null;
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const admin = findOrganizerAdminRecordInState(state, organizer.id, {
    includeInactiveFallback: false
  });

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

    const nextPublicSlug = resolveOrganizerPublicSlugInput(input, currentOrganizer);

    if (
      !canEditOrganizerPublicSlug(currentOrganizer) &&
      nextPublicSlug !== getOrganizerPublicSlug(currentOrganizer)
    ) {
      throw new Error("The public slug is locked after publication in v1.");
    }

    await ensurePublicSlugAvailableInDatabase(prisma, currentOrganizer.id, nextPublicSlug);

    const { venues, primaryVenue } = getPrimaryVenueFromInput(input);
    const contentI18n = buildOrganizerContentI18n(currentOrganizer.contentI18n, input);
    const localizedName = contentI18n?.name ?? null;
    const localizedTagline = contentI18n?.tagline ?? null;
    const localizedDescription = contentI18n?.description ?? null;
    const localizedVenueTitle = contentI18n?.venueTitle ?? null;
    const localizedVenueDetail = contentI18n?.venueDetail ?? null;
    const now = new Date();
    const platformRemindersEnabled = Boolean(siteSettings?.registrationRemindersEnabled);
    const organizer = await prisma.organizer.update({
      where: {
        slug
      },
      data: {
        name: pickPrimaryTextValue(localizedName, currentOrganizer.name),
        contentI18n,
        tagline: pickPrimaryTextValue(localizedTagline, currentOrganizer.tagline),
        description: pickPrimaryTextValue(localizedDescription, currentOrganizer.description),
        city: normalizeText(input.city),
        region: normalizeText(input.region),
        publicSlug: nextPublicSlug,
        publicEmail: normalizeEmail(input.publicEmail) || currentOrganizer.publicEmail,
        publicPhone: normalizeText(input.publicPhone),
        interestEmail: normalizeEmail(input.interestEmail) || currentOrganizer.interestEmail,
        venueTitle: pickPrimaryTextValue(localizedVenueTitle, primaryVenue.title),
        venueDetail: pickPrimaryTextValue(localizedVenueDetail, primaryVenue.detail),
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
        ? await findOrganizerAdminRecordInDatabase(prisma, organizer.id, {
            actorId
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
          publicSlug: organizer.publicSlug,
          publicationState: organizer.publicationState,
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

    const nextPublicSlug = resolveOrganizerPublicSlugInput(input, organizer);

    if (
      !canEditOrganizerPublicSlug(organizer) &&
      nextPublicSlug !== getOrganizerPublicSlug(organizer)
    ) {
      throw new Error("The public slug is locked after publication in v1.");
    }

    ensurePublicSlugAvailableInState(draft, organizer.id, nextPublicSlug);

    const { venues, primaryVenue } = getPrimaryVenueFromInput(input);
    const contentI18n = buildOrganizerContentI18n(organizer.contentI18n, input);
    const localizedName = contentI18n?.name ?? null;
    const localizedTagline = contentI18n?.tagline ?? null;
    const localizedDescription = contentI18n?.description ?? null;
    const localizedVenueTitle = contentI18n?.venueTitle ?? null;
    const localizedVenueDetail = contentI18n?.venueDetail ?? null;

    organizer.name = pickPrimaryTextValue(localizedName, organizer.name);
    organizer.contentI18n = contentI18n;
    organizer.tagline = pickPrimaryTextValue(localizedTagline, organizer.tagline);
    organizer.description = pickPrimaryTextValue(localizedDescription, organizer.description);
    organizer.city = normalizeText(input.city);
    organizer.region = normalizeText(input.region);
    organizer.publicSlug = nextPublicSlug;
    organizer.publicEmail = normalizeEmail(input.publicEmail) || organizer.publicEmail;
    organizer.publicPhone = normalizeText(input.publicPhone);
    organizer.interestEmail = normalizeEmail(input.interestEmail) || organizer.interestEmail;
    organizer.venueTitle = pickPrimaryTextValue(localizedVenueTitle, primaryVenue.title);
    organizer.venueDetail = pickPrimaryTextValue(localizedVenueDetail, primaryVenue.detail);
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
      input.adminEmail || input.adminName
        ? findOrganizerAdminRecordInState(draft, organizer.id, {
            actorId
          })
        : null;

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
        publicSlug: organizer.publicSlug,
        publicationState: organizer.publicationState,
        minAdvanceHours: organizer.minAdvanceHours,
        maxAdvanceDays: organizer.maxAdvanceDays,
        venueCount: venues.length
      }
    });

    return organizer;
  });
}

export async function publishOrganizerProfile(slug, actorId = null) {
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

    if (organizer.status !== "ACTIVE") {
      return {
        ok: false,
        message: "Only active organizers can be published."
      };
    }

    const publicSlug = getOrganizerPublicSlug(organizer) || organizer.slug;
    await ensurePublicSlugAvailableInDatabase(prisma, organizer.id, publicSlug);

    const now = new Date();
    const updated = await prisma.organizer.update({
      where: {
        id: organizer.id
      },
      data: {
        publicSlug,
        publicationState: "PUBLISHED",
        publishedAt: organizer.publishedAt || now,
        updatedAt: now
      }
    });

    await prisma.auditLog.create({
      data: {
        id: createToken(),
        createdAt: now,
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: updated.id,
        registrationId: null,
        eventType: "organizer_published",
        entityType: "organizer",
        entityId: updated.id,
        message: `Published organizer page for ${updated.name}.`,
        metadata: {
          publicSlug: updated.publicSlug,
          publishedAt: updated.publishedAt
        }
      }
    });

    return {
      ok: true,
      organizer: updated
    };
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return {
        ok: false,
        message: "This organizer could not be found."
      };
    }

    if (organizer.status !== "ACTIVE") {
      return {
        ok: false,
        message: "Only active organizers can be published."
      };
    }

    const publicSlug = getOrganizerPublicSlug(organizer) || organizer.slug;
    ensurePublicSlugAvailableInState(draft, organizer.id, publicSlug);

    const now = new Date().toISOString();
    organizer.publicSlug = publicSlug;
    organizer.publicationState = "PUBLISHED";
    organizer.publishedAt = organizer.publishedAt || now;
    organizer.updatedAt = now;

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_published",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Published organizer page for ${organizer.name}.`,
      metadata: {
        publicSlug: organizer.publicSlug,
        publishedAt: organizer.publishedAt
      }
    });

    return {
      ok: true,
      organizer
    };
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
    admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
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
        tokenVersion: {
          increment: 1
        },
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
    admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
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

    const patch = getStripeAccountPatch(account, organizer);
    const normalizedBillingStatus = normalizeOrganizerBillingStatus(
      organizer.onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    );
    const nextUpdatedAt = new Date().toISOString();
    const nextOrganizer = serializeDatabaseValue({
      ...organizer,
      ...patch,
      onlinePaymentsBillingStatus: normalizedBillingStatus,
      updatedAt: nextUpdatedAt
    });

    await prisma.organizer.update({
      where: {
        id: organizer.id
      },
      data: {
        stripeAccountId: nextOrganizer.stripeAccountId,
        stripeConnectionStatus: nextOrganizer.stripeConnectionStatus,
        stripeDetailsSubmitted: nextOrganizer.stripeDetailsSubmitted,
        stripeChargesEnabled: nextOrganizer.stripeChargesEnabled,
        stripePayoutsEnabled: nextOrganizer.stripePayoutsEnabled,
        stripeConnectedAt: nextOrganizer.stripeConnectedAt
          ? new Date(nextOrganizer.stripeConnectedAt)
          : null,
        stripeLastSyncedAt: nextOrganizer.stripeLastSyncedAt
          ? new Date(nextOrganizer.stripeLastSyncedAt)
          : null,
        onlinePaymentsBillingStatus: normalizedBillingStatus,
        updatedAt: new Date(nextUpdatedAt)
      }
    });

    const baseUrl = getBaseUrl();
    const link = await createStripeOnboardingAccountLink({
      stripeAccountId: nextOrganizer.stripeAccountId,
      refreshUrl: `${baseUrl}/${organizer.slug}/admin/billing/connect`,
      returnUrl: `${baseUrl}/${organizer.slug}/admin/billing/return`
    });

    await prisma.auditLog.create({
      data: buildAuditLogRecord({
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: organizer.id,
        eventType: createdNow
          ? "organizer_stripe_account_created"
          : "organizer_stripe_onboarding_reopened",
        entityType: "organizer",
        entityId: organizer.id,
        message: createdNow
          ? `Created Stripe Connect account ${nextOrganizer.stripeAccountId}.`
          : `Reopened Stripe Connect onboarding for ${organizer.name}.`,
        metadata: {
          stripeAccountId: nextOrganizer.stripeAccountId
        }
      })
    });

    return {
      organizerId: organizer.id,
      url: link.url,
      billing: buildOrganizerBillingSnapshot(nextOrganizer, organizer.timeZone)
    };
  }

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

    const serializedOrganizer = serializeDatabaseValue(organizer);

    if (!organizer.stripeAccountId) {
      return {
        ...buildOrganizerBillingSnapshot(serializedOrganizer, organizer.timeZone),
        syncOutcome: "missing-account"
      };
    }

    const account = await retrieveStripeConnectedAccount(organizer.stripeAccountId);

    if (!account) {
      return {
        ...buildOrganizerBillingSnapshot(serializedOrganizer, organizer.timeZone),
        syncOutcome: "missing-remote-account"
      };
    }

    const patch = getStripeAccountPatch(account, organizer);
    const normalizedBillingStatus = normalizeOrganizerBillingStatus(
      organizer.onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    );
    const nextUpdatedAt = new Date().toISOString();
    const nextOrganizer = serializeDatabaseValue({
      ...organizer,
      ...patch,
      onlinePaymentsBillingStatus: normalizedBillingStatus,
      updatedAt: nextUpdatedAt
    });

    await prisma.organizer.update({
      where: {
        id: organizer.id
      },
      data: {
        stripeAccountId: nextOrganizer.stripeAccountId,
        stripeConnectionStatus: nextOrganizer.stripeConnectionStatus,
        stripeDetailsSubmitted: nextOrganizer.stripeDetailsSubmitted,
        stripeChargesEnabled: nextOrganizer.stripeChargesEnabled,
        stripePayoutsEnabled: nextOrganizer.stripePayoutsEnabled,
        stripeConnectedAt: nextOrganizer.stripeConnectedAt
          ? new Date(nextOrganizer.stripeConnectedAt)
          : null,
        stripeLastSyncedAt: nextOrganizer.stripeLastSyncedAt
          ? new Date(nextOrganizer.stripeLastSyncedAt)
          : null,
        onlinePaymentsBillingStatus: normalizedBillingStatus,
        updatedAt: new Date(nextUpdatedAt)
      }
    });

    await prisma.auditLog.create({
      data: buildAuditLogRecord({
        actorType: actorId ? "ORGANIZER_ADMIN" : "STRIPE",
        actorId,
        organizerId: organizer.id,
        eventType: "organizer_stripe_status_synced",
        entityType: "organizer",
        entityId: organizer.id,
        message: `Synced Stripe Connect readiness for ${organizer.name}.`,
        metadata: {
          stripeAccountId: nextOrganizer.stripeAccountId,
          stripeConnectionStatus: nextOrganizer.stripeConnectionStatus,
          stripeChargesEnabled: nextOrganizer.stripeChargesEnabled,
          stripePayoutsEnabled: nextOrganizer.stripePayoutsEnabled
        }
      })
    });

    return {
      ...buildOrganizerBillingSnapshot(nextOrganizer, organizer.timeZone),
      syncOutcome:
        nextOrganizer.stripeConnectionStatus === "CONNECTED"
          ? "connected"
          : nextOrganizer.stripeConnectionStatus === "RESTRICTED"
            ? "restricted"
            : "pending"
    };
  }

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

export async function createOrganizerFromPlatform(input, actorId = null) {
  const result = await createOrganizerAccountFromPlatform(input, actorId);
  return result.organizer;
}

export async function approveOrganizerRequest(requestId, actorId = null) {
  const result = await resendOrganizerApplicationAccess(requestId, actorId);
  return result.ok ? result : null;
}

export async function resendOrganizerApplicationAccessFromPlatform(requestId, actorId = null) {
  return resendOrganizerApplicationAccess(requestId, actorId);
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

export async function resetOrganizerWorkspace(slug, actorId = null) {
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

      const now = new Date();
      const [eventCount, occurrenceCount, registrationCount, emailDeliveryCount] =
        await Promise.all([
          tx.eventType.count({
            where: {
              organizerId: organizer.id
            }
          }),
          tx.eventOccurrence.count({
            where: {
              eventType: {
                organizerId: organizer.id
              }
            }
          }),
          tx.registration.count({
            where: {
              organizerId: organizer.id
            }
          }),
          tx.emailDeliveryLog.count({
            where: {
              organizerId: organizer.id
            }
          })
        ]);

      await tx.emailDeliveryLog.deleteMany({
        where: {
          organizerId: organizer.id
        }
      });

      await tx.eventType.deleteMany({
        where: {
          organizerId: organizer.id
        }
      });

      const updatedOrganizer = await tx.organizer.update({
        where: {
          id: organizer.id
        },
        data: buildOrganizerWorkspaceResetData(now)
      });

      await tx.auditLog.create({
        data: {
          id: createToken(),
          createdAt: now,
          actorType: actorId ? "PLATFORM_ADMIN" : "SYSTEM",
          actorId,
          organizerId: organizer.id,
          registrationId: null,
          eventType: ORGANIZER_WORKSPACE_RESET_AUDIT_EVENT,
          entityType: "organizer",
          entityId: organizer.id,
          message: `Reset organizer workspace for ${organizer.name}.`,
          metadata: {
            deletedEventCount: eventCount,
            deletedOccurrenceCount: occurrenceCount,
            deletedRegistrationCount: registrationCount,
            deletedEmailDeliveryCount: emailDeliveryCount
          }
        }
      });

      return {
        organizer: updatedOrganizer,
        deleted: {
          eventCount,
          occurrenceCount,
          registrationCount,
          emailDeliveryCount
        },
        tourStorageSeed: now.toISOString()
      };
    });
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    const now = new Date().toISOString();
    const eventIds = draft.events
      .filter((event) => event.organizerId === organizer.id)
      .map((event) => event.id);
    const occurrenceIds = draft.occurrences
      .filter((occurrence) => eventIds.includes(occurrence.eventTypeId))
      .map((occurrence) => occurrence.id);
    const registrationIds = draft.registrations
      .filter((registration) => registration.organizerId === organizer.id)
      .map((registration) => registration.id);
    const deletedEventCount = eventIds.length;
    const deletedOccurrenceCount = occurrenceIds.length;
    const deletedRegistrationCount = registrationIds.length;
    const deletedEmailDeliveryCount = (draft.emailDeliveries || []).filter(
      (delivery) => delivery.organizerId === organizer.id
    ).length;

    draft.events = draft.events.filter((event) => event.organizerId !== organizer.id);
    draft.ticketCategories = draft.ticketCategories.filter(
      (category) => !eventIds.includes(category.eventTypeId)
    );
    draft.occurrences = draft.occurrences.filter(
      (occurrence) => !eventIds.includes(occurrence.eventTypeId)
    );
    draft.registrations = draft.registrations.filter(
      (registration) => registration.organizerId !== organizer.id
    );
    draft.payments = draft.payments.filter(
      (payment) => !registrationIds.includes(payment.registrationId)
    );
    draft.emailDeliveries = (draft.emailDeliveries || []).filter(
      (delivery) => delivery.organizerId !== organizer.id
    );

    Object.assign(organizer, buildOrganizerWorkspaceResetData(now));

    await appendAuditLog(draft, {
      createdAt: now,
      actorType: actorId ? "PLATFORM_ADMIN" : "SYSTEM",
      actorId,
      organizerId: organizer.id,
      eventType: ORGANIZER_WORKSPACE_RESET_AUDIT_EVENT,
      entityType: "organizer",
      entityId: organizer.id,
      message: `Reset organizer workspace for ${organizer.name}.`,
      metadata: {
        deletedEventCount,
        deletedOccurrenceCount,
        deletedRegistrationCount,
        deletedEmailDeliveryCount
      }
    });

    return {
      organizer,
      deleted: {
        eventCount: deletedEventCount,
        occurrenceCount: deletedOccurrenceCount,
        registrationCount: deletedRegistrationCount,
        emailDeliveryCount: deletedEmailDeliveryCount
      },
      tourStorageSeed: now
    };
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
      const contentI18n = buildEventContentI18n(existingEvent?.contentI18n, input);
      const nextTitle = pickPrimaryTextValue(contentI18n?.title, input.title);
      const ticketCatalog = normalizeTicketCatalogInput(
        input.ticketCatalogJson,
        input.basePriceCents || existingEvent?.basePriceCents || 0
      );
      const derivedBasePriceCents = deriveEventBasePriceFromTickets(
        ticketCatalog,
        input.basePriceCents || existingEvent?.basePriceCents || 0
      );

      if (!nextTitle) {
        throw new Error("Add at least one public event title before saving.");
      }
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
        title: nextTitle,
        contentI18n,
        category: normalizeText(input.category),
        visibility: input.visibility || "DRAFT",
        summary: pickPrimaryTextValue(contentI18n?.summary, input.summary),
        description: pickPrimaryTextValue(contentI18n?.description, input.description),
        audience: pickPrimaryTextValue(contentI18n?.audience, input.audience),
        durationMinutes: Number(input.durationMinutes || 180),
        venueTitle:
          pickPrimaryTextValue(contentI18n?.venueTitle, input.venueTitle) || organizer.venueTitle,
        venueDetail:
          pickPrimaryTextValue(contentI18n?.venueDetail, input.venueDetail) || organizer.venueDetail,
        mapHref: normalizeText(input.mapHref),
        basePriceCents: derivedBasePriceCents,
        prepayPercentage: Math.max(0, Math.min(100, Number(input.prepayPercentage || 0))),
        collectDietaryInfo: input.collectDietaryInfo !== false,
        salesWindowStartsAt,
        salesWindowEndsAt,
        attendeeInstructions: pickPrimaryTextValue(
          contentI18n?.attendeeInstructions,
          input.attendeeInstructions
        ),
        organizerNotes: normalizeText(input.organizerNotes),
        cancellationPolicy: pickPrimaryTextValue(
          contentI18n?.cancellationPolicy,
          input.cancellationPolicy
        ),
        highlights: pickPrimaryListValue(
          contentI18n?.highlights,
          normalizeMultilineEntries(input.highlights)
        ),
        included: pickPrimaryListValue(
          contentI18n?.included,
          normalizeMultilineEntries(input.included)
        ),
        policies: pickPrimaryListValue(
          contentI18n?.policies,
          normalizeMultilineEntries(input.policies)
        ),
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
      const existingTickets = await tx.ticketCategory.findMany({
        where: {
          eventTypeId: savedEvent.id
        },
        orderBy: {
          sortOrder: "asc"
        }
      });
      const touchedTicketIds = new Set();

      for (const ticket of ticketCatalog) {
        const existingTicket =
          existingTickets.find((entry) => entry.id === ticket.id) ||
          existingTickets.find((entry) => entry.slug === ticket.slug) ||
          null;
        const ticketData = {
          slug: ticket.slug,
          name: ticket.name,
          description: ticket.description,
          contentI18n: ticket.contentI18n,
          included: ticket.included,
          unitPriceCents: ticket.unitPriceCents,
          isDefault: ticket.isDefault,
          isActive: ticket.isActive !== false,
          sortOrder: ticket.sortOrder,
          updatedAt: now
        };

        if (existingTicket) {
          const updatedTicket = await tx.ticketCategory.update({
            where: {
              id: existingTicket.id
            },
            data: ticketData
          });
          touchedTicketIds.add(updatedTicket.id);
        } else {
          const createdTicket = await tx.ticketCategory.create({
            data: {
              id: createToken(),
              eventTypeId: savedEvent.id,
              createdAt: now,
              ...ticketData
            }
          });
          touchedTicketIds.add(createdTicket.id);
        }
      }

      if (existingTickets.length) {
        await tx.ticketCategory.updateMany({
          where: {
            eventTypeId: savedEvent.id,
            id: {
              notIn: Array.from(touchedTicketIds)
            }
          },
          data: {
            isActive: false,
            isDefault: false,
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
    }

    const nextGallery =
      input.galleryJson !== undefined
        ? normalizeGalleryEntries(input.galleryJson)
        : event.gallery || [];
    const contentI18n = buildEventContentI18n(event.contentI18n, input);
    const nextTitle = pickPrimaryTextValue(contentI18n?.title, input.title);
    const ticketCatalog = normalizeTicketCatalogInput(
      input.ticketCatalogJson,
      input.basePriceCents || event.basePriceCents || 0
    );
    const derivedBasePriceCents = deriveEventBasePriceFromTickets(
      ticketCatalog,
      input.basePriceCents || event.basePriceCents || 0
    );

    if (!nextTitle) {
      throw new Error("Add at least one public event title before saving.");
    }
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
      title: nextTitle,
      contentI18n,
      category: normalizeText(input.category),
      visibility: input.visibility || "DRAFT",
      summary: pickPrimaryTextValue(contentI18n?.summary, input.summary),
      description: pickPrimaryTextValue(contentI18n?.description, input.description),
      audience: pickPrimaryTextValue(contentI18n?.audience, input.audience),
      durationMinutes: Number(input.durationMinutes || 180),
      venueTitle:
        pickPrimaryTextValue(contentI18n?.venueTitle, input.venueTitle) || organizer.venueTitle,
      venueDetail:
        pickPrimaryTextValue(contentI18n?.venueDetail, input.venueDetail) || organizer.venueDetail,
      mapHref: normalizeText(input.mapHref),
      basePriceCents: derivedBasePriceCents,
      prepayPercentage: Math.max(0, Math.min(100, Number(input.prepayPercentage || 0))),
      collectDietaryInfo: input.collectDietaryInfo !== false,
      salesWindowStartsAt: salesWindowStartsAt ? salesWindowStartsAt.toISOString() : null,
      salesWindowEndsAt: salesWindowEndsAt ? salesWindowEndsAt.toISOString() : null,
      attendeeInstructions: pickPrimaryTextValue(
        contentI18n?.attendeeInstructions,
        input.attendeeInstructions
      ),
      organizerNotes: normalizeText(input.organizerNotes),
      cancellationPolicy: pickPrimaryTextValue(
        contentI18n?.cancellationPolicy,
        input.cancellationPolicy
      ),
      highlights: pickPrimaryListValue(
        contentI18n?.highlights,
        normalizeMultilineEntries(input.highlights)
      ),
      included: pickPrimaryListValue(
        contentI18n?.included,
        normalizeMultilineEntries(input.included)
      ),
      policies: pickPrimaryListValue(
        contentI18n?.policies,
        normalizeMultilineEntries(input.policies)
      ),
      faq: [],
      gallery: nextGallery,
      imageUrl: coverImageUrl,
      updatedAt: new Date().toISOString()
    });
    const ticketNow = new Date().toISOString();
    const existingTickets = draft.ticketCategories.filter((entry) => entry.eventTypeId === event.id);
    const touchedTicketIds = new Set();

    for (const ticket of ticketCatalog) {
      const existingTicket =
        existingTickets.find((entry) => entry.id === ticket.id) ||
        existingTickets.find((entry) => entry.slug === ticket.slug) ||
        null;

      if (existingTicket) {
        Object.assign(existingTicket, {
          slug: ticket.slug,
          name: ticket.name,
          description: ticket.description,
          contentI18n: ticket.contentI18n,
          included: ticket.included,
          unitPriceCents: ticket.unitPriceCents,
          isDefault: ticket.isDefault,
          isActive: ticket.isActive !== false,
          sortOrder: ticket.sortOrder,
          updatedAt: ticketNow
        });
        touchedTicketIds.add(existingTicket.id);
      } else {
        const createdTicket = {
          id: createToken(),
          eventTypeId: event.id,
          slug: ticket.slug,
          name: ticket.name,
          description: ticket.description,
          contentI18n: ticket.contentI18n,
          included: ticket.included,
          unitPriceCents: ticket.unitPriceCents,
          isDefault: ticket.isDefault,
          isActive: ticket.isActive !== false,
          sortOrder: ticket.sortOrder,
          createdAt: ticketNow,
          updatedAt: ticketNow
        };
        draft.ticketCategories.push(createdTicket);
        touchedTicketIds.add(createdTicket.id);
      }
    }

    for (const existingTicket of existingTickets) {
      if (!touchedTicketIds.has(existingTicket.id)) {
        existingTicket.isActive = false;
        existingTicket.isDefault = false;
        existingTicket.updatedAt = ticketNow;
      }
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
  const occurrenceCancelMode = normalizeOrganizerOccurrenceCancelMode(input.cancelMode);

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
      const resolvedPrepayPercentage =
        input.prepayPercentage === "" || input.prepayPercentage == null
          ? event.prepayPercentage
          : Number(input.prepayPercentage);
      const nextOccurrence = {
        priceCents: Math.round(event.basePriceCents),
        prepayPercentage: Math.max(0, Math.min(100, resolvedPrepayPercentage)),
        published: input.published === "true" || input.published === true
      };
      const contentI18n = buildOccurrenceContentI18n(existingOccurrence?.contentI18n, input);
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
        venueTitle:
          pickPrimaryTextValue(contentI18n?.venueTitle, input.venueTitle) || event.venueTitle,
        contentI18n,
        note: pickPrimaryTextValue(contentI18n?.note, input.note),
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
        didCancelOccurrence: shouldCancelOccurrence,
        savedOccurrence,
        organizer,
        event,
        cancelledRegistrations
      };
    });

    let cancellationSummary = null;

    if (outcome?.didCancelOccurrence) {
      const refundResults = [];

      if (
        occurrenceCancelMode === ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE
      ) {
        for (const registration of outcome.cancelledRegistrations) {
          const result = await requestOrganizerOccurrenceRefundForRegistration(
            slug,
            registration.id,
            actorId
          );

          if (result) {
            refundResults.push(result);
          }
        }
      }

      await sendOccurrenceCancellationEmailsForRegistrations({
        cancelledRegistrations: outcome.cancelledRegistrations,
        event: outcome.event,
        occurrence: outcome.savedOccurrence,
        organizer: outcome.organizer,
        slug
      });

      cancellationSummary = buildOccurrenceCancellationSummary({
        cancelMode: occurrenceCancelMode,
        cancelledRegistrations: outcome.cancelledRegistrations,
        refundResults
      });

      if (cancellationSummary.refundRequestedCount > 0 || cancellationSummary.refundFailedCount > 0) {
        await prisma.auditLog.create({
          data: {
            id: createToken(),
            actorType: "ORGANIZER_ADMIN",
            actorId,
            organizerId: outcome.organizer.id,
            registrationId: null,
            eventType: "organizer_occurrence_cancelled_with_refunds_requested",
            entityType: "event_occurrence",
            entityId: outcome.savedOccurrence.id,
            message: `Cancelled an occurrence for ${outcome.event.title} and processed the related Stripe refund requests.`,
            metadata: buildOccurrenceCancellationAuditMetadata({
              cancellationSummary,
              cancelMode: occurrenceCancelMode
            }),
            createdAt: new Date()
          }
        });
      }
    }

    return outcome?.savedOccurrence
      ? {
          ...outcome.savedOccurrence,
          cancellationSummary
        }
      : null;
  }

  const outcome = await mutatePersistentState(async (draft) => {
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
    const resolvedPrepayPercentage =
      input.prepayPercentage === "" || input.prepayPercentage == null
        ? event.prepayPercentage
        : Number(input.prepayPercentage);

    const nextOccurrence = {
      ...occurrence,
      priceCents: Math.round(event.basePriceCents),
      prepayPercentage: Math.max(0, Math.min(100, resolvedPrepayPercentage)),
      published: input.published === "true" || input.published === true
    };
    const contentI18n = buildOccurrenceContentI18n(occurrence.contentI18n, input);
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
      venueTitle:
        pickPrimaryTextValue(contentI18n?.venueTitle, input.venueTitle) || event.venueTitle,
      contentI18n,
      note: pickPrimaryTextValue(contentI18n?.note, input.note),
      salesWindowStartsAt: salesWindowStartsAt ? salesWindowStartsAt.toISOString() : null,
      salesWindowEndsAt: salesWindowEndsAt ? salesWindowEndsAt.toISOString() : null,
      published: nextOccurrence.published,
      imageUrl: normalizeText(input.imageUrl) || null,
      updatedAt: nextUpdatedAt
    });

    let cancelledRegistrations = [];

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
        cancelledRegistrations.push({
          ...registration
        });
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

    return {
      didCancelOccurrence: shouldCancelOccurrence,
      savedOccurrence: {
        ...occurrence
      },
      organizer: {
        ...organizer
      },
      event: {
        ...event
      },
      cancelledRegistrations
    };
  });

  if (!outcome?.savedOccurrence) {
    return null;
  }

  let cancellationSummary = null;

  if (outcome.didCancelOccurrence) {
    const refundResults = [];

    if (occurrenceCancelMode === ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE) {
      for (const registration of outcome.cancelledRegistrations) {
        const result = await requestOrganizerOccurrenceRefundForRegistration(
          slug,
          registration.id,
          actorId
        );

        if (result) {
          refundResults.push(result);
        }
      }
    }

    await sendOccurrenceCancellationEmailsForRegistrations({
      cancelledRegistrations: outcome.cancelledRegistrations,
      event: outcome.event,
      occurrence: outcome.savedOccurrence,
      organizer: outcome.organizer,
      slug
    });

    cancellationSummary = buildOccurrenceCancellationSummary({
      cancelMode: occurrenceCancelMode,
      cancelledRegistrations: outcome.cancelledRegistrations,
      refundResults
    });

    if (cancellationSummary.refundRequestedCount > 0 || cancellationSummary.refundFailedCount > 0) {
      await mutatePersistentState(async (draft) => {
        await appendAuditLog(draft, {
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: outcome.organizer.id,
          eventType: "organizer_occurrence_cancelled_with_refunds_requested",
          entityType: "event_occurrence",
          entityId: outcome.savedOccurrence.id,
          message: `Cancelled an occurrence for ${outcome.event.title} and processed the related Stripe refund requests.`,
          metadata: buildOccurrenceCancellationAuditMetadata({
            cancellationSummary,
            cancelMode: occurrenceCancelMode
          })
        });
      });
    }
  }

  return {
    ...outcome.savedOccurrence,
    cancellationSummary
  };
}

export async function cancelOrganizerRegistration(
  slug,
  registrationId,
  options = {},
  actorId = null
) {
  const cancelMode = normalizeOrganizerRegistrationCancelMode(options.cancelMode);

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

    const registration = await prisma.registration.findFirst({
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

    const payments = await prisma.registrationPayment.findMany({
      where: {
        registrationId: registration.id
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

    const refundRequest =
      cancelMode === ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
        ? await (async () => {
            const refundSummary = getRegistrationRefundSummary(registration, payments, {
              currency: registration.currency
            });

            try {
              return await requestOrganizerStripeRefund({
                action: "organizer_cancel",
                actorId,
                cancelMode,
                organizer,
                registration,
                refundSummary,
                surface: "organizer_registration_cancel"
              });
            } catch (error) {
              await prisma.auditLog.create({
                data: {
                  id: createToken(),
                  actorType: "ORGANIZER_ADMIN",
                  actorId,
                  organizerId: organizer.id,
                  registrationId: registration.id,
                  eventType: "organizer_refund_request_failed",
                  entityType: "registration",
                  entityId: registration.id,
                  message: `Stripe refund request failed for ${registration.registrationCode || registration.id}.`,
                  metadata: buildOrganizerRefundFailureAuditMetadata({
                    action: "organizer_cancel",
                    cancelMode,
                    errorMessage:
                      error instanceof Error ? error.message : "Stripe refund request failed.",
                    refundSummary
                  }),
                  createdAt: new Date()
                }
              });

              throw error;
            }
          })()
        : null;

    const outcome = await prisma.$transaction(async (tx) => {
      const current = await tx.registration.findFirst({
        where: {
          id: registrationId,
          organizerId: organizer.id
        },
        include: {
          eventType: true,
          occurrence: true
        }
      });

      if (!current) {
        return null;
      }

      if (refundRequest) {
        const currentPayments = await tx.registrationPayment.findMany({
          where: {
            registrationId: current.id
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

        assertOrganizerRegistrationRefundEligibility(
          getRegistrationRefundSummary(current, currentPayments, {
            currency: current.currency
          })
        );
      }

      const now = new Date();
      const updated = await tx.registration.update({
        where: {
          id: current.id
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          updatedAt: now
        }
      });

      if (refundRequest) {
        await tx.registrationPayment.create({
          data: buildOrganizerPendingRefundPaymentRecord({
            actorId,
            action: "organizer_cancel",
            cancelMode,
            note: "Stripe refund requested by organizer admin.",
            occurredAt: now,
            refundRequest,
            registration: current,
            surface: "organizer_registration_cancel"
          })
        });
      }

      await tx.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: current.id,
          eventType: refundRequest
            ? "organizer_registration_cancelled_with_refund_requested"
            : "organizer_registration_updated",
          entityType: "registration",
          entityId: current.id,
          message: refundRequest
            ? `Cancelled ${current.registrationCode || current.id} and requested a Stripe refund.`
            : `Applied organizer action cancel to ${current.registrationCode || current.id}.`,
          metadata: buildOrganizerRegistrationAuditMetadata({
            action: refundRequest ? "cancel_with_refund_request" : "cancel",
            cancelMode,
            refundRequest
          }),
          createdAt: now
        }
      });

      return {
        updated,
        organizer,
        event: current.eventType,
        occurrence: current.occurrence
      };
    });

    if (!outcome) {
      return null;
    }

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

    return outcome.updated;
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);
  const registration = state.registrations.find(
    (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
  );

  if (!organizer || !registration) {
    return null;
  }

  const refundRequest =
    cancelMode === ORGANIZER_REGISTRATION_CANCEL_MODE.CANCEL_AND_REFUND_ONLINE
      ? await (async () => {
          const refundSummary = getRegistrationRefundSummary(
            registration,
            getRegistrationPayments(state, registration.id),
            {
              currency: registration.currency
            }
          );

          try {
            return await requestOrganizerStripeRefund({
              action: "organizer_cancel",
              actorId,
              cancelMode,
              organizer,
              registration,
              refundSummary,
              surface: "organizer_registration_cancel"
            });
          } catch (error) {
            await mutatePersistentState(async (draft) => {
              await appendAuditLog(draft, {
                actorType: "ORGANIZER_ADMIN",
                actorId,
                organizerId: organizer.id,
                registrationId: registration.id,
                eventType: "organizer_refund_request_failed",
                entityType: "registration",
                entityId: registration.id,
                message: `Stripe refund request failed for ${registration.registrationCode || registration.id}.`,
                metadata: buildOrganizerRefundFailureAuditMetadata({
                  action: "organizer_cancel",
                  cancelMode,
                  errorMessage:
                    error instanceof Error ? error.message : "Stripe refund request failed.",
                  refundSummary
                })
              });
            });

            throw error;
          }
        })()
      : null;

  return mutatePersistentState(async (draft) => {
    const nextOrganizer = getOrganizerRecord(draft, slug);
    const nextRegistration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === nextOrganizer?.id
    );

    if (!nextOrganizer || !nextRegistration) {
      return null;
    }

    if (refundRequest) {
      assertOrganizerRegistrationRefundEligibility(
        getRegistrationRefundSummary(nextRegistration, getRegistrationPayments(draft, registrationId), {
          currency: nextRegistration.currency
        })
      );

      const now = new Date().toISOString();
      draft.payments.unshift(
        buildOrganizerPendingRefundPaymentRecord({
          actorId,
          action: "organizer_cancel",
          cancelMode,
          note: "Stripe refund requested by organizer admin.",
          occurredAt: now,
          refundRequest,
          registration: nextRegistration,
          surface: "organizer_registration_cancel"
        })
      );
    }

    nextRegistration.status = "CANCELLED";
    nextRegistration.cancelledAt = new Date().toISOString();
    nextRegistration.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: nextOrganizer.id,
      registrationId: nextRegistration.id,
      eventType: refundRequest
        ? "organizer_registration_cancelled_with_refund_requested"
        : "organizer_registration_updated",
      entityType: "registration",
      entityId: nextRegistration.id,
      message: refundRequest
        ? `Cancelled ${nextRegistration.registrationCode || nextRegistration.id} and requested a Stripe refund.`
        : `Applied organizer action cancel to ${nextRegistration.registrationCode || nextRegistration.id}.`,
      metadata: buildOrganizerRegistrationAuditMetadata({
        action: refundRequest ? "cancel_with_refund_request" : "cancel",
        cancelMode,
        refundRequest
      })
    });

    const event = getEventById(draft, nextRegistration.eventTypeId);
    const occurrence = getOccurrenceById(draft, nextRegistration.occurrenceId);

    if (event && occurrence) {
      await sendStateRegistrationCancellationEmail(
        draft,
        nextOrganizer,
        event,
        occurrence,
        nextRegistration
      );
    }

    return nextRegistration;
  });
}

function buildOccurrenceRefundResult({
  errorMessage = null,
  reason = null,
  refundRequest = null,
  refundSummary = null,
  registration,
  status
}) {
  return {
    registrationId: registration.id,
    registrationCode: registration.registrationCode || registration.id,
    attendeeName: registration.attendeeName || "",
    status,
    reason,
    detailLabel:
      errorMessage ||
      refundSummary?.reasonLabel ||
      (refundRequest?.refundSummary?.refundableOnlineAmountLabel
        ? `${refundRequest.refundSummary.refundableOnlineAmountLabel} requested on Stripe.`
        : ""),
    amountCents:
      refundRequest?.refundSummary?.refundableOnlineAmountCents ||
      refundSummary?.refundableOnlineAmountCents ||
      0
  };
}

function buildOccurrenceCancellationSummary({
  cancelMode,
  cancelledRegistrations = [],
  refundResults = []
}) {
  return {
    cancelMode,
    cancelledCount: cancelledRegistrations.length,
    refundRequestedCount: refundResults.filter((entry) => entry.status === "REQUESTED").length,
    refundRequestedCents: refundResults
      .filter((entry) => entry.status === "REQUESTED")
      .reduce((sum, entry) => sum + Number(entry.amountCents || 0), 0),
    refundSkippedCount: refundResults.filter((entry) => entry.status === "SKIPPED").length,
    refundFailedCount: refundResults.filter((entry) => entry.status === "FAILED").length,
    refundResults
  };
}

function resolveOrganizerFailedRefundRetryContext(registration, payments = []) {
  const refundSummary = getRegistrationRefundSummary(registration, payments, {
    currency: registration.currency
  });
  const failedRefundPayment = getLatestFailedRefundPayment(payments);
  const metadata =
    failedRefundPayment?.metadata &&
    typeof failedRefundPayment.metadata === "object" &&
    !Array.isArray(failedRefundPayment.metadata)
      ? failedRefundPayment.metadata
      : {};

  if (registration.status !== "CANCELLED") {
    throw new Error("Only cancelled registrations can retry a failed Stripe refund.");
  }

  if (!failedRefundPayment || refundSummary.reason !== "refund_failed" || !refundSummary.retryable) {
    throw new Error("No failed Stripe refund is waiting for retry on this registration.");
  }

  return {
    refundSummary,
    failedRefundPayment,
    action:
      typeof metadata.refundAction === "string" && metadata.refundAction
        ? metadata.refundAction
        : "occurrence_cancel",
    cancelMode:
      typeof metadata.cancelMode === "string" && metadata.cancelMode
        ? metadata.cancelMode
        : ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
    surface:
      typeof metadata.passreserveSurface === "string" && metadata.passreserveSurface
        ? metadata.passreserveSurface
        : "organizer_occurrence_cancel"
  };
}

async function requestOrganizerOccurrenceRefundForRegistration(
  slug,
  registrationId,
  actorId = null
) {
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

    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        organizerId: organizer.id
      }
    });

    if (!registration) {
      return null;
    }

    const payments = await prisma.registrationPayment.findMany({
      where: {
        registrationId: registration.id
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
    const refundSummary = getRegistrationRefundSummary(registration, payments, {
      currency: registration.currency
    });

    if (!refundSummary.eligible) {
      return buildOccurrenceRefundResult({
        reason: refundSummary.reason,
        refundSummary,
        registration,
        status: "SKIPPED"
      });
    }

    let refundRequest;

    try {
      refundRequest = await requestOrganizerStripeRefund({
        action: "occurrence_cancel",
        actorId,
        cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
        organizer,
        registration,
        refundSummary,
        surface: "organizer_occurrence_cancel"
      });
    } catch (error) {
      const now = new Date();
      await prisma.registrationPayment.create({
        data: buildOrganizerFailedRefundPaymentRecord({
          actorId,
          action: "occurrence_cancel",
          cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
          note: "Stripe refund request failed after occurrence cancellation.",
          occurredAt: now,
          organizer,
          registration,
          refundSummary,
          errorMessage:
            error instanceof Error ? error.message : "Stripe refund request failed.",
          surface: "organizer_occurrence_cancel"
        })
      });
      await prisma.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: registration.id,
          eventType: "organizer_refund_request_failed",
          entityType: "registration",
          entityId: registration.id,
          message: `Stripe refund request failed after cancelling the occurrence for ${registration.registrationCode || registration.id}.`,
          metadata: buildOrganizerRefundFailureAuditMetadata({
            action: "occurrence_cancel",
            cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
            errorMessage:
              error instanceof Error ? error.message : "Stripe refund request failed.",
            refundSummary
          }),
          createdAt: now
        }
      });

      return buildOccurrenceRefundResult({
        errorMessage:
          error instanceof Error ? error.message : "Stripe refund request failed.",
        reason: refundSummary.reason,
        refundSummary,
        registration,
        status: "FAILED"
      });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const current = await tx.registration.findFirst({
        where: {
          id: registrationId,
          organizerId: organizer.id
        }
      });

      if (!current) {
        return null;
      }

      const currentPayments = await tx.registrationPayment.findMany({
        where: {
          registrationId: current.id
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
      const currentSummary = getRegistrationRefundSummary(current, currentPayments, {
        currency: current.currency
      });

      if (!currentSummary.eligible) {
        return buildOccurrenceRefundResult({
          reason: currentSummary.reason,
          refundSummary: currentSummary,
          registration: current,
          status: "SKIPPED"
        });
      }

      const now = new Date();
      await tx.registrationPayment.create({
        data: buildOrganizerPendingRefundPaymentRecord({
          actorId,
          action: "occurrence_cancel",
          cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
          note: "Stripe refund requested after occurrence cancellation.",
          occurredAt: now,
          refundRequest,
          registration: current,
          surface: "organizer_occurrence_cancel"
        })
      });

      await tx.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: current.id,
          eventType: "organizer_registration_updated",
          entityType: "registration",
          entityId: current.id,
          message: `Requested a Stripe refund after cancelling the occurrence for ${current.registrationCode || current.id}.`,
          metadata: buildOrganizerRegistrationAuditMetadata({
            action: "occurrence_cancel_refund_request",
            cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
            refundRequest
          }),
          createdAt: now
        }
      });

      return buildOccurrenceRefundResult({
        refundRequest,
        refundSummary: refundRequest.refundSummary,
        registration: current,
        status: "REQUESTED"
      });
    });

    return outcome;
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);
  const registration = state.registrations.find(
    (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
  );

  if (!organizer || !registration) {
    return null;
  }

  const refundSummary = getRegistrationRefundSummary(
    registration,
    getRegistrationPayments(state, registration.id),
    {
      currency: registration.currency
    }
  );

  if (!refundSummary.eligible) {
    return buildOccurrenceRefundResult({
      reason: refundSummary.reason,
      refundSummary,
      registration,
      status: "SKIPPED"
    });
  }

  let refundRequest;

  try {
    refundRequest = await requestOrganizerStripeRefund({
      action: "occurrence_cancel",
      actorId,
      cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
      organizer,
      registration,
      refundSummary,
      surface: "organizer_occurrence_cancel"
    });
  } catch (error) {
    await mutatePersistentState(async (draft) => {
      const now = new Date().toISOString();
      draft.payments.unshift(
        buildOrganizerFailedRefundPaymentRecord({
          actorId,
          action: "occurrence_cancel",
          cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
          note: "Stripe refund request failed after occurrence cancellation.",
          occurredAt: now,
          organizer,
          registration,
          refundSummary,
          errorMessage:
            error instanceof Error ? error.message : "Stripe refund request failed.",
          surface: "organizer_occurrence_cancel"
        })
      );
      await appendAuditLog(draft, {
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: registration.id,
        eventType: "organizer_refund_request_failed",
        entityType: "registration",
        entityId: registration.id,
        message: `Stripe refund request failed after cancelling the occurrence for ${registration.registrationCode || registration.id}.`,
        metadata: buildOrganizerRefundFailureAuditMetadata({
          action: "occurrence_cancel",
          cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
          errorMessage:
            error instanceof Error ? error.message : "Stripe refund request failed.",
          refundSummary
        })
      });
    });

    return buildOccurrenceRefundResult({
      errorMessage: error instanceof Error ? error.message : "Stripe refund request failed.",
      reason: refundSummary.reason,
      refundSummary,
      registration,
      status: "FAILED"
    });
  }

  return mutatePersistentState(async (draft) => {
    const nextOrganizer = getOrganizerRecord(draft, slug);
    const nextRegistration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === nextOrganizer?.id
    );

    if (!nextOrganizer || !nextRegistration) {
      return null;
    }

    const currentSummary = getRegistrationRefundSummary(
      nextRegistration,
      getRegistrationPayments(draft, nextRegistration.id),
      {
        currency: nextRegistration.currency
      }
    );

    if (!currentSummary.eligible) {
      return buildOccurrenceRefundResult({
        reason: currentSummary.reason,
        refundSummary: currentSummary,
        registration: nextRegistration,
        status: "SKIPPED"
      });
    }

    const now = new Date().toISOString();
    draft.payments.unshift(
      buildOrganizerPendingRefundPaymentRecord({
        actorId,
        action: "occurrence_cancel",
        cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
        note: "Stripe refund requested after occurrence cancellation.",
        occurredAt: now,
        refundRequest,
        registration: nextRegistration,
        surface: "organizer_occurrence_cancel"
      })
    );

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: nextOrganizer.id,
      registrationId: nextRegistration.id,
      eventType: "organizer_registration_updated",
      entityType: "registration",
      entityId: nextRegistration.id,
      message: `Requested a Stripe refund after cancelling the occurrence for ${nextRegistration.registrationCode || nextRegistration.id}.`,
      metadata: buildOrganizerRegistrationAuditMetadata({
        action: "occurrence_cancel_refund_request",
        cancelMode: ORGANIZER_OCCURRENCE_CANCEL_MODE.CANCEL_AND_REFUND_ELIGIBLE,
        refundRequest
      })
    });

    return buildOccurrenceRefundResult({
      refundRequest,
      refundSummary: refundRequest.refundSummary,
      registration: nextRegistration,
      status: "REQUESTED"
    });
  });
}

async function retryOrganizerRegistrationRefundRequest(slug, registrationId, actorId = null) {
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

    const registration = await prisma.registration.findFirst({
      where: {
        id: registrationId,
        organizerId: organizer.id
      }
    });

    if (!registration) {
      return null;
    }

    const payments = await prisma.registrationPayment.findMany({
      where: {
        registrationId: registration.id
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

    let retryContext;

    try {
      retryContext = resolveOrganizerFailedRefundRetryContext(registration, payments);
    } catch (error) {
      return buildOccurrenceRefundResult({
        errorMessage: error instanceof Error ? error.message : "Refund retry is unavailable.",
        refundSummary: getRegistrationRefundSummary(registration, payments, {
          currency: registration.currency
        }),
        registration,
        status: "SKIPPED"
      });
    }

    let refundRequest;

    try {
      refundRequest = await requestOrganizerStripeRefund({
        action: retryContext.action,
        actorId,
        allowFailedRetry: true,
        cancelMode: retryContext.cancelMode,
        organizer,
        registration,
        refundSummary: retryContext.refundSummary,
        surface: retryContext.surface
      });
    } catch (error) {
      const now = new Date();
      await prisma.registrationPayment.create({
        data: buildOrganizerFailedRefundPaymentRecord({
          actorId,
          action: retryContext.action,
          cancelMode: retryContext.cancelMode,
          note: "Stripe refund retry failed in backoffice.",
          occurredAt: now,
          organizer,
          registration,
          refundSummary: retryContext.refundSummary,
          errorMessage:
            error instanceof Error ? error.message : "Stripe refund retry failed.",
          surface: retryContext.surface
        })
      });
      await prisma.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: registration.id,
          eventType: "organizer_refund_request_failed",
          entityType: "registration",
          entityId: registration.id,
          message: `Stripe refund retry failed for ${registration.registrationCode || registration.id}.`,
          metadata: buildOrganizerRefundFailureAuditMetadata({
            action: retryContext.action,
            cancelMode: retryContext.cancelMode,
            errorMessage:
              error instanceof Error ? error.message : "Stripe refund retry failed.",
            refundSummary: retryContext.refundSummary
          }),
          createdAt: now
        }
      });

      return buildOccurrenceRefundResult({
        errorMessage: error instanceof Error ? error.message : "Stripe refund retry failed.",
        reason: retryContext.refundSummary.reason,
        refundSummary: retryContext.refundSummary,
        registration,
        status: "FAILED"
      });
    }

    return prisma.$transaction(async (tx) => {
      const current = await tx.registration.findFirst({
        where: {
          id: registrationId,
          organizerId: organizer.id
        }
      });

      if (!current) {
        return null;
      }

      const currentPayments = await tx.registrationPayment.findMany({
        where: {
          registrationId: current.id
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

      let currentRetryContext;

      try {
        currentRetryContext = resolveOrganizerFailedRefundRetryContext(current, currentPayments);
      } catch {
        return buildOccurrenceRefundResult({
          refundSummary: getRegistrationRefundSummary(current, currentPayments, {
            currency: current.currency
          }),
          registration: current,
          status: "SKIPPED"
        });
      }

      const now = new Date();
      await tx.registration.update({
        where: {
          id: current.id
        },
        data: {
          updatedAt: now
        }
      });
      await tx.registrationPayment.create({
        data: buildOrganizerPendingRefundPaymentRecord({
          actorId,
          action: currentRetryContext.action,
          cancelMode: currentRetryContext.cancelMode,
          note: "Stripe refund retry requested by organizer admin.",
          occurredAt: now,
          refundRequest,
          registration: current,
          surface: currentRetryContext.surface
        })
      });
      await tx.auditLog.create({
        data: {
          id: createToken(),
          actorType: "ORGANIZER_ADMIN",
          actorId,
          organizerId: organizer.id,
          registrationId: current.id,
          eventType: "organizer_refund_retry_requested",
          entityType: "registration",
          entityId: current.id,
          message: `Requested a Stripe refund retry for ${current.registrationCode || current.id}.`,
          metadata: buildOrganizerRegistrationAuditMetadata({
            action: "refund_retry",
            cancelMode: currentRetryContext.cancelMode,
            refundRequest
          }),
          createdAt: now
        }
      });

      return buildOccurrenceRefundResult({
        refundRequest,
        refundSummary: refundRequest.refundSummary,
        registration: current,
        status: "REQUESTED"
      });
    });
  }

  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);
  const registration = state.registrations.find(
    (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
  );

  if (!organizer || !registration) {
    return null;
  }

  const payments = getRegistrationPayments(state, registration.id);
  let retryContext;

  try {
    retryContext = resolveOrganizerFailedRefundRetryContext(registration, payments);
  } catch (error) {
    return buildOccurrenceRefundResult({
      errorMessage: error instanceof Error ? error.message : "Refund retry is unavailable.",
      refundSummary: getRegistrationRefundSummary(registration, payments, {
        currency: registration.currency
      }),
      registration,
      status: "SKIPPED"
    });
  }

  let refundRequest;

  try {
    refundRequest = await requestOrganizerStripeRefund({
      action: retryContext.action,
      actorId,
      allowFailedRetry: true,
      cancelMode: retryContext.cancelMode,
      organizer,
      registration,
      refundSummary: retryContext.refundSummary,
      surface: retryContext.surface
    });
  } catch (error) {
    await mutatePersistentState(async (draft) => {
      const now = new Date().toISOString();
      draft.payments.unshift(
        buildOrganizerFailedRefundPaymentRecord({
          actorId,
          action: retryContext.action,
          cancelMode: retryContext.cancelMode,
          note: "Stripe refund retry failed in backoffice.",
          occurredAt: now,
          organizer,
          registration,
          refundSummary: retryContext.refundSummary,
          errorMessage:
            error instanceof Error ? error.message : "Stripe refund retry failed.",
          surface: retryContext.surface
        })
      );
      await appendAuditLog(draft, {
        actorType: "ORGANIZER_ADMIN",
        actorId,
        organizerId: organizer.id,
        registrationId: registration.id,
        eventType: "organizer_refund_request_failed",
        entityType: "registration",
        entityId: registration.id,
        message: `Stripe refund retry failed for ${registration.registrationCode || registration.id}.`,
        metadata: buildOrganizerRefundFailureAuditMetadata({
          action: retryContext.action,
          cancelMode: retryContext.cancelMode,
          errorMessage:
            error instanceof Error ? error.message : "Stripe refund retry failed.",
          refundSummary: retryContext.refundSummary
        })
      });
    });

    return buildOccurrenceRefundResult({
      errorMessage: error instanceof Error ? error.message : "Stripe refund retry failed.",
      reason: retryContext.refundSummary.reason,
      refundSummary: retryContext.refundSummary,
      registration,
      status: "FAILED"
    });
  }

  return mutatePersistentState(async (draft) => {
    const nextOrganizer = getOrganizerRecord(draft, slug);
    const nextRegistration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === nextOrganizer?.id
    );

    if (!nextOrganizer || !nextRegistration) {
      return null;
    }

    const currentPayments = getRegistrationPayments(draft, nextRegistration.id);
    let currentRetryContext;

    try {
      currentRetryContext = resolveOrganizerFailedRefundRetryContext(
        nextRegistration,
        currentPayments
      );
    } catch {
      return buildOccurrenceRefundResult({
        refundSummary: getRegistrationRefundSummary(nextRegistration, currentPayments, {
          currency: nextRegistration.currency
        }),
        registration: nextRegistration,
        status: "SKIPPED"
      });
    }

    const now = new Date().toISOString();
    nextRegistration.updatedAt = now;
    draft.payments.unshift(
      buildOrganizerPendingRefundPaymentRecord({
        actorId,
        action: currentRetryContext.action,
        cancelMode: currentRetryContext.cancelMode,
        note: "Stripe refund retry requested by organizer admin.",
        occurredAt: now,
        refundRequest,
        registration: nextRegistration,
        surface: currentRetryContext.surface
      })
    );
    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: nextOrganizer.id,
      registrationId: nextRegistration.id,
      eventType: "organizer_refund_retry_requested",
      entityType: "registration",
      entityId: nextRegistration.id,
      message: `Requested a Stripe refund retry for ${nextRegistration.registrationCode || nextRegistration.id}.`,
      metadata: buildOrganizerRegistrationAuditMetadata({
        action: "refund_retry",
        cancelMode: currentRetryContext.cancelMode,
        refundRequest
      })
    });

    return buildOccurrenceRefundResult({
      refundRequest,
      refundSummary: refundRequest.refundSummary,
      registration: nextRegistration,
      status: "REQUESTED"
    });
  });
}

export async function retryOrganizerRegistrationRefund(slug, registrationId, actorId = null) {
  const result = await retryOrganizerRegistrationRefundRequest(slug, registrationId, actorId);

  if (!result) {
    return null;
  }

  if (result.status !== "REQUESTED") {
    throw new Error(result.detailLabel || "Stripe refund retry could not be requested.");
  }

  return result;
}

export async function retryOrganizerOccurrenceFailedRefunds(
  slug,
  occurrenceId,
  actorId = null
) {
  const data = await getOrganizerOccurrencesAdmin(slug);
  const occurrence = data?.occurrences?.find((entry) => entry.id === occurrenceId) || null;

  if (!occurrence) {
    return null;
  }

  const registrationsData = await getOrganizerRegistrationsAdmin(slug, "en");
  const retryableRegistrations = (registrationsData?.registrations || []).filter(
    (registration) =>
      registration.occurrenceId === occurrenceId &&
      registration.status === "CANCELLED" &&
      registration.refundSummary?.status === "FAILED" &&
      registration.refundSummary?.retryAvailable
  );
  const refundResults = [];

  for (const registration of retryableRegistrations) {
    const result = await retryOrganizerRegistrationRefundRequest(slug, registration.id, actorId);

    if (result) {
      refundResults.push(result);
    }
  }

  return {
    occurrenceId,
    retryableCount: retryableRegistrations.length,
    refundRequestedCount: refundResults.filter((entry) => entry.status === "REQUESTED").length,
    refundRequestedCents: refundResults
      .filter((entry) => entry.status === "REQUESTED")
      .reduce((sum, entry) => sum + Number(entry.amountCents || 0), 0),
    refundSkippedCount: refundResults.filter((entry) => entry.status === "SKIPPED").length,
    refundFailedCount: refundResults.filter((entry) => entry.status === "FAILED").length,
    refundResults
  };
}

async function sendOccurrenceCancellationEmailsForRegistrations({
  cancelledRegistrations = [],
  event,
  occurrence,
  organizer,
  slug
}) {
  if (!cancelledRegistrations.length) {
    return;
  }

  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    const siteSettings = await prisma.siteSettings.findUnique({
      where: {
        id: "site-settings"
      }
    });

    for (const registration of cancelledRegistrations) {
      await sendPrismaOccurrenceCancellationEmail(
        prisma,
        siteSettings,
        organizer,
        event,
        occurrence,
        registration
      );
    }

    return;
  }

  const registrationIds = new Set(cancelledRegistrations.map((entry) => entry.id));

  await mutatePersistentState(async (draft) => {
    const nextOrganizer = getOrganizerRecord(draft, slug);
    const nextEvent = getEventById(draft, event.id);
    const nextOccurrence = getOccurrenceById(draft, occurrence.id);

    if (!nextOrganizer || !nextEvent || !nextOccurrence) {
      return null;
    }

    for (const registration of draft.registrations.filter((entry) => registrationIds.has(entry.id))) {
      await sendStateOccurrenceCancellationEmail(
        draft,
        nextOrganizer,
        nextEvent,
        nextOccurrence,
        registration
      );
    }

    return null;
  });
}

export async function updateOrganizerRegistration(
  slug,
  registrationId,
  action,
  actorId = null,
  options = {}
) {
  if (action === "cancel") {
    return cancelOrganizerRegistration(slug, registrationId, options, actorId);
  }

  if (action === "retry_refund") {
    return retryOrganizerRegistrationRefund(slug, registrationId, actorId);
  }

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
        shouldSendCancellationEmail: false
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
      const remainingDueAtVenue = Math.max(
        0,
        registration.dueAtEventCents - registration.venueCollectedCents
      );

      registration.onlineCollectedCents = Math.max(
        registration.onlineCollectedCents,
        registration.onlineAmountCents
      );
      registration.status =
        remainingDueAtVenue > 0 ? "CONFIRMED_PARTIALLY_PAID" : "CONFIRMED_PAID";
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
