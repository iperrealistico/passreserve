import { z } from "zod";

import { getOrganizerOnlinePaymentsGate } from "./passreserve-billing.js";
import { getRegistrationAvailabilityGate } from "./passreserve-booking-window.js";
import { PAYMENT_WINDOW_HOURS, getBaseUrl, getStorageMode } from "./passreserve-config.js";
import {
  addHours,
  createRegistrationCode,
  createToken,
  formatCurrencyFromCents,
  formatDateLabel,
  pluralize
} from "./passreserve-format.js";
import { getLocalizedText } from "./passreserve-content.js";
import {
  buildEmailDeliveryDedupeKey,
  getRegistrationOriginLabel,
  getRegistrationPaymentStateLabel,
  getRegistrationSourceLabel,
  getRegistrationSourceNote,
  resolveOrganizerNotificationEmailFromPrisma,
  resolveOrganizerNotificationEmailFromState,
  sendPrismaTemplateEmail,
  sendStateTemplateEmail
} from "./passreserve-email-delivery.js";
import {
  createStripeCheckoutSession,
  getStripeEnvironmentState
} from "./passreserve-payments.js";
import { getPrismaClient, logDatabaseFallback } from "./passreserve-prisma.js";
import {
  buildPendingConfirmationRegistration,
  buildRegistrationRecord,
  prepareRegistrationBuild
} from "./passreserve-registration-core.js";
import { getOrganizerPublicSlug } from "./passreserve-organizer-identity.js";
import {
  resolveRegistrationQuestionnaireConfig,
  shouldCollectDietaryFromQuestionnaire
} from "./passreserve-registration-questionnaire.js";
import { normalizeRegistrationLocale } from "./passreserve-registration-language.js";
import { mutatePersistentState } from "./passreserve-state.js";

export const ORGANIZER_MANUAL_REGISTRATION_MODE = {
  REQUEST_CONFIRMATION: "REQUEST_CONFIRMATION",
  CONFIRM_UNPAID: "CONFIRM_UNPAID",
  SEND_PAYMENT_LINK: "SEND_PAYMENT_LINK",
  MARK_DEPOSIT_PAID: "MARK_DEPOSIT_PAID",
  MARK_FULLY_PAID: "MARK_FULLY_PAID"
};

export const ORGANIZER_MANUAL_REGISTRATION_ORIGIN = {
  WALK_IN: "walk-in",
  PHONE: "phone",
  EMAIL: "email",
  STAFF: "staff"
};

const organizerManualRegistrationModeValues = Object.values(
  ORGANIZER_MANUAL_REGISTRATION_MODE
);
const organizerManualRegistrationOriginValues = Object.values(
  ORGANIZER_MANUAL_REGISTRATION_ORIGIN
);

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

export const organizerManualRegistrationSchema = z.object({
  eventTypeId: z.string().trim().min(1),
  occurrenceId: z.string().trim().min(1),
  items: z.array(registrationItemSchema).min(1).max(8),
  registrationLocale: z.string().trim().optional().default("en"),
  origin: z.enum(organizerManualRegistrationOriginValues).optional().default("staff"),
  attendees: z.array(attendeeSchema).min(1).max(8),
  mode: z.enum(organizerManualRegistrationModeValues),
  note: z.string().trim().optional().default(""),
  baseUrl: z.string().trim().optional().default("")
});

function toIsoDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function toDateOrNull(value) {
  return value ? new Date(value) : null;
}

function getOrganizerRecord(state, slug) {
  return Array.isArray(state.organizers)
    ? state.organizers.find((organizer) => organizer.slug === slug) ?? null
    : null;
}

function getEventRecord(state, organizerId, eventTypeId) {
  return Array.isArray(state.events)
    ? state.events.find(
        (event) => event.id === eventTypeId && event.organizerId === organizerId
      ) ?? null
    : null;
}

function getOccurrenceRecord(state, eventTypeId, occurrenceId) {
  return Array.isArray(state.occurrences)
    ? state.occurrences.find(
        (occurrence) => occurrence.id === occurrenceId && occurrence.eventTypeId === eventTypeId
      ) ?? null
    : null;
}

function getTicketCategoriesForEvent(state, eventTypeId) {
  return (Array.isArray(state.ticketCategories) ? state.ticketCategories : [])
    .filter((category) => category.eventTypeId === eventTypeId && category.isActive !== false)
    .sort(
      (left, right) =>
        Number(left.sortOrder || 0) - Number(right.sortOrder || 0) ||
        String(left.name || "").localeCompare(String(right.name || ""))
    );
}

function isPendingConfirmExpired(registration, now = new Date()) {
  return (
    registration?.status === "PENDING_CONFIRM" &&
    registration?.expiresAt &&
    new Date(registration.expiresAt).getTime() <= now.getTime()
  );
}

function isPendingPaymentExpired(registration, now = new Date()) {
  return (
    registration?.status === "PENDING_PAYMENT" &&
    registration?.expiresAt &&
    new Date(registration.expiresAt).getTime() <= now.getTime()
  );
}

function isRegistrationActiveForCapacity(registration, now = new Date()) {
  if (!registration || registration.status === "CANCELLED") {
    return false;
  }

  if (registration.status === "PENDING_CONFIRM") {
    return !isPendingConfirmExpired(registration, now);
  }

  if (registration.status === "PENDING_PAYMENT") {
    return !isPendingPaymentExpired(registration, now);
  }

  return true;
}

function getRemainingCapacityForOccurrence(occurrence, registrations, now = new Date()) {
  const reservedQuantity = registrations
    .filter((registration) => isRegistrationActiveForCapacity(registration, now))
    .reduce((sum, registration) => sum + Number(registration.quantity || 0), 0);

  return Math.max(0, Number(occurrence?.capacity || 0) - reservedQuantity);
}

function buildPublicRegistrationLinks(organizer, event, registration) {
  const organizerSlug = getOrganizerPublicSlug(organizer) || organizer.slug;
  const eventHref = `/${organizerSlug}/events/${event.slug}`;

  return {
    eventHref,
    confirmationHref: registration.holdToken
      ? `${eventHref}/register/confirm/${registration.holdToken}`
      : null,
    confirmedHref: registration.confirmationToken
      ? `${eventHref}/register/confirmed/${registration.confirmationToken}`
      : null,
    paymentPreviewHref: registration.paymentToken
      ? `${eventHref}/register/payment/preview/${registration.paymentToken}`
      : null
  };
}

function buildAbsoluteHref(baseUrl, href) {
  const normalizedBase = String(baseUrl || getBaseUrl()).trim().replace(/\/$/, "");

  if (!href) {
    return null;
  }

  return href.startsWith("http") ? href : `${normalizedBase}${href.startsWith("/") ? href : `/${href}`}`;
}

function getSupportReplyEmail(siteSettings, organizer) {
  return organizer?.publicEmail || organizer?.interestEmail || siteSettings?.platformEmail || null;
}

function buildOrganizerRegistrationEmailContext({
  organizer,
  event,
  occurrence,
  registration,
  organizerNotificationEmail,
  supportReplyEmail,
  platformReplyEmail
}) {
  const locale = normalizeRegistrationLocale(registration?.registrationLocale);

  return {
    organizer,
    event,
    occurrence,
    registration,
    locale,
    eventName: getLocalizedText(event, "title", locale) || event?.title || "",
    occurrenceLabel: occurrence
      ? formatDateLabel(occurrence.startsAt, organizer?.timeZone || "Europe/Rome", locale)
      : "Unknown date",
    venueName:
      getLocalizedText(occurrence, "venueTitle", locale) ||
      occurrence?.venueTitle ||
      getLocalizedText(event, "venueTitle", locale) ||
      event?.venueTitle ||
      getLocalizedText(organizer, "venueTitle", locale) ||
      organizer?.venueTitle ||
      "",
    organizerNotificationEmail,
    supportReplyEmail,
    platformReplyEmail
  };
}

function buildRegistrationAuditMetadata(input, registration) {
  return {
    mode: input.mode,
    source: registration.source || "PUBLIC",
    origin: registration.origin || "",
    registrationStatus: registration.status,
    registrationCode: registration.registrationCode || null,
    holdToken: registration.holdToken || null,
    paymentToken: registration.paymentToken || null
  };
}

async function appendAuditLog(draft, input) {
  if (!Array.isArray(draft.auditLogs)) {
    draft.auditLogs = [];
  }

  draft.auditLogs.unshift({
    id: createToken(),
    createdAt: input.createdAt || new Date().toISOString(),
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

async function writeOrganizerRegistrationAuditLogs(draft, organizer, event, registration, input, actorId) {
  const metadata = buildRegistrationAuditMetadata(input, registration);

  await appendAuditLog(draft, {
    actorType: "ORGANIZER_ADMIN",
    actorId: actorId || null,
    organizerId: organizer.id,
    registrationId: registration.id,
    eventType: "organizer_registration_created",
    entityType: "registration",
    entityId: registration.id,
    message: `Created manual registration ${registration.registrationCode || registration.id} for ${event.title}.`,
    metadata
  });

  if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION) {
    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId: actorId || null,
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "organizer_registration_confirmation_requested",
      entityType: "registration",
      entityId: registration.id,
      message: `Requested attendee confirmation for manual registration ${registration.id}.`,
      metadata
    });
  }
}

function buildPendingConfirmationEmailReplacements(context, baseUrl, registration) {
  return {
    "{{attendee_name}}": registration.attendeeName,
    "{{event_name}}": context.eventName,
    "{{occurrence_label}}": context.occurrenceLabel,
    "{{confirmation_url}}": buildAbsoluteHref(baseUrl, buildPublicRegistrationLinks(
      context.organizer,
      context.event,
      registration
    ).confirmationHref),
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

function buildPaymentRequestedEmailReplacements(context, baseUrl, registration) {
  return {
    "{{attendee_name}}": registration.attendeeName,
    "{{registration_code}}": registration.registrationCode,
    "{{event_name}}": context.eventName,
    "{{occurrence_label}}": context.occurrenceLabel,
    "{{payment_url}}": buildAbsoluteHref(baseUrl, buildPublicRegistrationLinks(
      context.organizer,
      context.event,
      registration
    ).paymentPreviewHref),
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
    "{{support_reply_email}}": context.supportReplyEmail || ""
  };
}

function buildOrganizerNewRegistrationReplacements(context, registration) {
  return {
    "{{organizer_name}}": context.organizer.name,
    "{{event_name}}": context.event.title,
    "{{attendee_name}}": registration.attendeeName,
    "{{occurrence_label}}": context.occurrenceLabel,
    "{{quantity_label}}": pluralize(registration.quantity, "attendee"),
    "{{registration_code}}": registration.registrationCode,
    "{{payment_state}}": getRegistrationPaymentStateLabel(registration),
    "{{registration_source_label}}": getRegistrationSourceLabel(registration),
    "{{registration_origin_label}}": getRegistrationOriginLabel(registration)
  };
}

function createManualPaymentRecord({
  registrationId,
  provider,
  kind,
  amountCents,
  currency,
  note,
  occurredAt
}) {
  return {
    id: createToken(),
    registrationId,
    provider,
    kind,
    status: "SUCCEEDED",
    amountCents: Math.max(0, Math.round(Number(amountCents || 0))),
    currency,
    externalEventId: null,
    stripeAccountId: null,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    note,
    metadata: null,
    occurredAt,
    createdAt: occurredAt
  };
}

function createPendingCheckoutPaymentRecord({
  registrationId,
  sessionId,
  stripeAccountId,
  amountCents,
  currency,
  occurredAt
}) {
  return {
    id: createToken(),
    registrationId,
    provider: "STRIPE",
    kind: "CHECKOUT_SESSION",
    status: "PENDING",
    amountCents,
    currency,
    externalEventId: null,
    stripeAccountId: stripeAccountId || null,
    stripeSessionId: sessionId || null,
    stripePaymentIntentId: null,
    note: "Checkout session created by organizer admin.",
    metadata: null,
    occurredAt,
    createdAt: occurredAt
  };
}

function resolveManualRegistrationStatus(registration) {
  const remainingVenueBalance = Math.max(
    0,
    Number(registration.dueAtEventCents || 0) - Number(registration.venueCollectedCents || 0)
  );

  if (Number(registration.onlineCollectedCents || 0) >= Number(registration.onlineAmountCents || 0)) {
    if (remainingVenueBalance === 0) {
      return Number(registration.onlineAmountCents || 0) > 0 ||
        Number(registration.venueCollectedCents || 0) > 0
        ? "CONFIRMED_PAID"
        : "CONFIRMED_UNPAID";
    }

    return Number(registration.onlineAmountCents || 0) > 0
      ? "CONFIRMED_PARTIALLY_PAID"
      : "CONFIRMED_UNPAID";
  }

  return "CONFIRMED_UNPAID";
}

function validateOrganizerManualContext({
  organizer,
  event,
  occurrence,
  registrations,
  requestedQuantity,
  now
}) {
  if (!organizer || !event || !occurrence) {
    return {
      ok: false,
      message: "That event occurrence is no longer available."
    };
  }

  if (occurrence.status === "CANCELLED") {
    return {
      ok: false,
      message: "That event occurrence is no longer available."
    };
  }

  if (occurrence.endsAt && new Date(occurrence.endsAt).getTime() <= now.getTime()) {
    return {
      ok: false,
      message: "That event occurrence has already ended."
    };
  }

  const bookingWindow = getRegistrationAvailabilityGate(organizer, event, occurrence, now);

  if (!bookingWindow.allowed) {
    return {
      ok: false,
      message: bookingWindow.reason,
      fieldErrors: {
        occurrenceId: bookingWindow.reason
      }
    };
  }

  const remainingCapacity = getRemainingCapacityForOccurrence(occurrence, registrations, now);

  if (requestedQuantity > remainingCapacity) {
    return {
      ok: false,
      message: "That quantity is no longer available for the selected occurrence.",
      fieldErrors: {
        items: "Choose a smaller quantity or a different date."
      }
    };
  }

  return {
    ok: true
  };
}

async function buildOrganizerRegistrationPayload({
  organizer,
  event,
  occurrence,
  ticketCategories,
  registrations,
  currency,
  input
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const registrationQuestionnaireConfig = resolveRegistrationQuestionnaireConfig(
    organizer,
    event
  );
  const buildResult = prepareRegistrationBuild({
    items: input.items,
    attendees: input.attendees,
    ticketCategories,
    collectDietaryInfo: shouldCollectDietaryFromQuestionnaire(registrationQuestionnaireConfig),
    registrationQuestionnaireConfig,
    prepayPercentage: occurrence.prepayPercentage ?? event.prepayPercentage,
    nowIso,
    paymentMode:
      input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.CONFIRM_UNPAID
        ? "FULL_VENUE"
        : "STANDARD"
  });

  if (!buildResult.ok) {
    return buildResult;
  }

  const contextValidation = validateOrganizerManualContext({
    organizer,
    event,
    occurrence,
    registrations,
    requestedQuantity: buildResult.requestedQuantity,
    now
  });

  if (!contextValidation.ok) {
    return contextValidation;
  }

  const billingGate = getOrganizerOnlinePaymentsGate(organizer);
  const environment = getStripeEnvironmentState();
  const needsOnlineAmount = buildResult.lineItems.some(
    (item) => Number(item.onlineAmountCents || 0) > 0
  );

  if (
    input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK &&
    !needsOnlineAmount
  ) {
    return {
      ok: false,
      message: "This occurrence does not require an online amount.",
      fieldErrors: {
        mode: "Choose a different confirmation mode for this occurrence."
      }
    };
  }

  if (
    input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID &&
    !needsOnlineAmount
  ) {
    return {
      ok: false,
      message: "This occurrence does not require an online deposit.",
      fieldErrors: {
        mode: "Choose a different confirmation mode for this occurrence."
      }
    };
  }

  if (
    input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK &&
    environment.mode === "live" &&
    !billingGate.enabled
  ) {
    return {
      ok: false,
      message: billingGate.blockers[0] || "Online payments are not ready for this organizer yet.",
      fieldErrors: {
        mode: billingGate.blockers[0] || "Online payments are not ready for this organizer yet."
      }
    };
  }

  let registration;
  const payments = [];
  let checkoutSession = null;

  if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION) {
    registration = buildPendingConfirmationRegistration({
      organizerId: organizer.id,
      eventTypeId: event.id,
      occurrenceId: occurrence.id,
      registrationLocale: input.registrationLocale,
      requestedItems: buildResult.requestedItems,
      attendees: buildResult.attendees,
      lineItems: buildResult.lineItems,
      currency,
      nowIso,
      note: input.note,
      source: "ORGANIZER_MANUAL",
      origin: input.origin
    });
  } else {
    registration = buildRegistrationRecord({
      organizerId: organizer.id,
      eventTypeId: event.id,
      occurrenceId: occurrence.id,
      status: "CONFIRMED_UNPAID",
      registrationLocale: input.registrationLocale,
      requestedItems: buildResult.requestedItems,
      attendees: buildResult.attendees,
      lineItems: buildResult.lineItems,
      currency,
      nowIso,
      note: input.note,
      confirmationToken: createToken(),
      registrationCode: createRegistrationCode(),
      confirmedAt: nowIso,
      source: "ORGANIZER_MANUAL",
      origin: input.origin
    });

    if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK) {
      registration.status = "PENDING_PAYMENT";
      registration.paymentToken = createToken();
      registration.expiresAt = addHours(nowIso, PAYMENT_WINDOW_HOURS);
      checkoutSession = await createStripeCheckoutSession({
        attendeeEmail: registration.attendeeEmail,
        baseUrl: input.baseUrl || getBaseUrl(),
        eventSlug: event.slug,
        eventTitle: event.title,
        holdExpiresAt: registration.expiresAt,
        occurrenceId: occurrence.id,
        occurrenceLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
        organizerName: organizer.name,
        payment: {
          onlineAmount: registration.onlineAmountCents / 100,
          onlineAmountLabel: formatCurrencyFromCents(registration.onlineAmountCents),
          dueAtEvent: registration.dueAtEventCents / 100,
          dueAtEventLabel: formatCurrencyFromCents(registration.dueAtEventCents)
        },
        paymentFingerprint: registration.paymentToken,
        paymentToken: registration.paymentToken,
        quantity: registration.quantity,
        registrationCode: registration.registrationCode,
        slug: getOrganizerPublicSlug(organizer) || organizer.slug,
        stripeAccountId: organizer.stripeAccountId,
        ticketCategoryLabel: registration.items
          .map((item) => {
            const ticketCategory = ticketCategories.find((entry) => entry.id === item.ticketCategoryId);
            return `${ticketCategory?.name || "Ticket"} x${item.quantity}`;
          })
          .join(" · ")
      });

      if (checkoutSession.sessionId) {
        payments.push(
          createPendingCheckoutPaymentRecord({
            registrationId: registration.id,
            sessionId: checkoutSession.sessionId,
            stripeAccountId: organizer.stripeAccountId,
            amountCents: registration.onlineAmountCents,
            currency: registration.currency,
            occurredAt: nowIso
          })
        );
      }
    } else if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_DEPOSIT_PAID) {
      registration.onlineCollectedCents = registration.onlineAmountCents;
      registration.status = resolveManualRegistrationStatus(registration);

      if (registration.onlineAmountCents > 0) {
        payments.push(
          createManualPaymentRecord({
            registrationId: registration.id,
            provider: "MANUAL",
            kind: "ADJUSTMENT",
            amountCents: registration.onlineAmountCents,
            currency: registration.currency,
            note: "Recorded the online amount as collected offline by organizer admin.",
            occurredAt: nowIso
          })
        );
      }
    } else if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.MARK_FULLY_PAID) {
      registration.onlineCollectedCents = registration.onlineAmountCents;
      registration.venueCollectedCents = registration.dueAtEventCents;
      registration.status = resolveManualRegistrationStatus(registration);

      if (registration.onlineAmountCents > 0) {
        payments.push(
          createManualPaymentRecord({
            registrationId: registration.id,
            provider: "MANUAL",
            kind: "ADJUSTMENT",
            amountCents: registration.onlineAmountCents,
            currency: registration.currency,
            note: "Recorded the online amount as collected offline by organizer admin.",
            occurredAt: nowIso
          })
        );
      }

      if (registration.dueAtEventCents > 0) {
        payments.push(
          createManualPaymentRecord({
            registrationId: registration.id,
            provider: "VENUE",
            kind: "CAPTURE",
            amountCents: registration.dueAtEventCents,
            currency: registration.currency,
            note: "Recorded the venue balance as already settled by organizer admin.",
            occurredAt: nowIso
          })
        );
      }
    }
  }

  const links = buildPublicRegistrationLinks(organizer, event, registration);

  return {
    ok: true,
    registration,
    payments,
    checkoutSession,
    links,
    registrationQuestionnaireConfig
  };
}

function buildSuccessResult({ organizer, event, registration, checkoutSession, links }) {
  return {
    ok: true,
    registrationId: registration.id,
    registrationCode: registration.registrationCode || null,
    registrationStatus: registration.status,
    holdToken: registration.holdToken || null,
    paymentToken: registration.paymentToken || null,
    confirmationToken: registration.confirmationToken || null,
    redirectHref: checkoutSession?.url || links.confirmedHref || links.confirmationHref,
    checkoutMode: checkoutSession?.mode || null,
    eventHref: links.eventHref,
    confirmationHref: links.confirmationHref,
    confirmedHref: links.confirmedHref,
    paymentPreviewHref: links.paymentPreviewHref,
    adminRegistrationsHref: `/${organizer.slug}/admin/registrations`,
    eventSlug: event.slug
  };
}

function createFieldErrorResult(parsedError) {
  const fieldErrors = {};

  for (const issue of parsedError.issues) {
    fieldErrors[issue.path[0]] = issue.message;
  }

  return {
    ok: false,
    message: "We still need a few registration details before this registration can be created.",
    fieldErrors
  };
}

function buildDatabaseCreateData(registration, payments) {
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
    },
    ...(payments.length
      ? {
          payments: {
            create: payments.map((payment) => ({
              id: payment.id,
              provider: payment.provider,
              kind: payment.kind,
              status: payment.status,
              amountCents: payment.amountCents,
              currency: payment.currency,
              externalEventId: payment.externalEventId,
              stripeAccountId: payment.stripeAccountId,
              stripeSessionId: payment.stripeSessionId,
              stripePaymentIntentId: payment.stripePaymentIntentId,
              note: payment.note,
              metadata: payment.metadata,
              occurredAt: new Date(payment.occurredAt),
              createdAt: new Date(payment.createdAt)
            }))
          }
        }
      : {})
  };
}

async function sendStateOrganizerRegistrationEmails(
  draft,
  organizer,
  event,
  occurrence,
  registration,
  input,
  options = {}
) {
  const context = buildOrganizerRegistrationEmailContext({
    organizer,
    event,
    occurrence,
    registration,
    organizerNotificationEmail: resolveOrganizerNotificationEmailFromState(draft, organizer),
    supportReplyEmail: getSupportReplyEmail(draft.siteSettings, organizer),
    platformReplyEmail: draft.siteSettings?.platformEmail || null
  });
  const baseUrl = options.baseUrl || getBaseUrl();

  if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION) {
    await sendStateTemplateEmail(draft, {
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
        registrationCode: registration.registrationCode || null,
        source: registration.source || "PUBLIC",
        origin: registration.origin || ""
      }
    });

    return;
  }

  if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK) {
    await sendStateTemplateEmail(draft, {
      templateSlug: "attendee_payment_requested",
      to: registration.attendeeEmail,
      registrationId: registration.id,
      occurrenceId: registration.occurrenceId,
      organizerId: registration.organizerId,
      dedupeKey: buildEmailDeliveryDedupeKey("attendee_payment_requested", registration.id),
      locale: context.locale,
      replyTo: context.supportReplyEmail,
      replacements: buildPaymentRequestedEmailReplacements(context, baseUrl, registration),
      metadata: {
        registrationCode: registration.registrationCode || null,
        source: registration.source || "PUBLIC",
        origin: registration.origin || ""
      }
    });
  } else {
    await sendStateTemplateEmail(draft, {
      templateSlug: "attendee_registration_confirmed",
      to: registration.attendeeEmail,
      registrationId: registration.id,
      occurrenceId: registration.occurrenceId,
      organizerId: registration.organizerId,
      dedupeKey: buildEmailDeliveryDedupeKey("attendee_registration_confirmed", registration.id),
      locale: context.locale,
      replyTo: context.supportReplyEmail,
      replacements: buildConfirmedRegistrationEmailReplacements(context, registration),
      metadata: {
        registrationCode: registration.registrationCode || null,
        source: registration.source || "PUBLIC",
        origin: registration.origin || ""
      }
    });
  }

  if (!context.organizerNotificationEmail) {
    return;
  }

  await sendStateTemplateEmail(draft, {
    templateSlug: "organizer_new_registration",
    to: context.organizerNotificationEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("organizer_new_registration", registration.id),
    replyTo: context.platformReplyEmail,
    replacements: buildOrganizerNewRegistrationReplacements(context, registration),
    metadata: {
      registrationCode: registration.registrationCode || null,
      source: registration.source || "PUBLIC",
      origin: registration.origin || ""
    }
  });
}

async function sendPrismaOrganizerRegistrationEmails(
  prisma,
  organizer,
  event,
  occurrence,
  registration,
  input,
  options = {}
) {
  const siteSettings = await prisma.siteSettings.findUnique({
    where: {
      id: "site-settings"
    }
  });
  const context = buildOrganizerRegistrationEmailContext({
    organizer,
    event,
    occurrence,
    registration,
    organizerNotificationEmail: await resolveOrganizerNotificationEmailFromPrisma(prisma, organizer),
    supportReplyEmail: getSupportReplyEmail(siteSettings, organizer),
    platformReplyEmail: siteSettings?.platformEmail || null
  });
  const baseUrl = options.baseUrl || getBaseUrl();

  if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION) {
    await sendPrismaTemplateEmail(prisma, {
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
        registrationCode: registration.registrationCode || null,
        source: registration.source || "PUBLIC",
        origin: registration.origin || ""
      }
    });

    return;
  }

  if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.SEND_PAYMENT_LINK) {
    await sendPrismaTemplateEmail(prisma, {
      templateSlug: "attendee_payment_requested",
      to: registration.attendeeEmail,
      registrationId: registration.id,
      occurrenceId: registration.occurrenceId,
      organizerId: registration.organizerId,
      dedupeKey: buildEmailDeliveryDedupeKey("attendee_payment_requested", registration.id),
      locale: context.locale,
      replyTo: context.supportReplyEmail,
      replacements: buildPaymentRequestedEmailReplacements(context, baseUrl, registration),
      metadata: {
        registrationCode: registration.registrationCode || null,
        source: registration.source || "PUBLIC",
        origin: registration.origin || ""
      }
    });
  } else {
    await sendPrismaTemplateEmail(prisma, {
      templateSlug: "attendee_registration_confirmed",
      to: registration.attendeeEmail,
      registrationId: registration.id,
      occurrenceId: registration.occurrenceId,
      organizerId: registration.organizerId,
      dedupeKey: buildEmailDeliveryDedupeKey("attendee_registration_confirmed", registration.id),
      locale: context.locale,
      replyTo: context.supportReplyEmail,
      replacements: buildConfirmedRegistrationEmailReplacements(context, registration),
      metadata: {
        registrationCode: registration.registrationCode || null,
        source: registration.source || "PUBLIC",
        origin: registration.origin || ""
      }
    });
  }

  if (!context.organizerNotificationEmail) {
    return;
  }

  await sendPrismaTemplateEmail(prisma, {
    templateSlug: "organizer_new_registration",
    to: context.organizerNotificationEmail,
    registrationId: registration.id,
    occurrenceId: registration.occurrenceId,
    organizerId: registration.organizerId,
    dedupeKey: buildEmailDeliveryDedupeKey("organizer_new_registration", registration.id),
    replyTo: context.platformReplyEmail,
    replacements: buildOrganizerNewRegistrationReplacements(context, registration),
    metadata: {
      registrationCode: registration.registrationCode || null,
      source: registration.source || "PUBLIC",
      origin: registration.origin || ""
    }
  });
}

async function createOrganizerRegistrationInDatabase(slug, input, options = {}) {
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
    return {
      ok: false,
      message: "That event occurrence is no longer available."
    };
  }

  const event = await prisma.eventType.findFirst({
    where: {
      id: input.eventTypeId,
      organizerId: organizer.id
    }
  });

  if (!event) {
    return {
      ok: false,
      message: "That event occurrence is no longer available."
    };
  }

  const [occurrence, ticketCategories, registrations] = await Promise.all([
    prisma.eventOccurrence.findFirst({
      where: {
        id: input.occurrenceId,
        eventTypeId: event.id
      }
    }),
    prisma.ticketCategory.findMany({
      where: {
        eventTypeId: event.id,
        isActive: true
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          name: "asc"
        }
      ]
    }),
    prisma.registration.findMany({
      where: {
        occurrenceId: input.occurrenceId
      },
      select: {
        id: true,
        status: true,
        quantity: true,
        expiresAt: true
      }
    })
  ]);

  const payload = await buildOrganizerRegistrationPayload({
    organizer: {
      ...organizer,
      slug: organizer.slug
    },
    event: {
      ...event,
      id: event.id,
      slug: event.slug,
      collectDietaryInfo: event.collectDietaryInfo
    },
    occurrence: {
      ...(occurrence || {}),
      startsAt: toIsoDate(occurrence?.startsAt),
      endsAt: toIsoDate(occurrence?.endsAt),
      salesWindowStartsAt: toIsoDate(occurrence?.salesWindowStartsAt),
      salesWindowEndsAt: toIsoDate(occurrence?.salesWindowEndsAt)
    },
    ticketCategories: ticketCategories.map((category) => ({
      ...category
    })),
    registrations: registrations.map((registration) => ({
      ...registration,
      expiresAt: toIsoDate(registration.expiresAt)
    })),
    currency: siteSettings?.stripeCurrencyDefault || "eur",
    input
  });

  if (!payload.ok) {
    return payload;
  }

  await prisma.$transaction(async (tx) => {
    await tx.registration.create({
      data: buildDatabaseCreateData(payload.registration, payload.payments)
    });

    await tx.auditLog.create({
      data: {
        id: createToken(),
        createdAt: new Date(),
        actorType: "ORGANIZER_ADMIN",
        actorId: options.actorId || null,
        organizerId: organizer.id,
        registrationId: payload.registration.id,
        eventType: "organizer_registration_created",
        entityType: "registration",
        entityId: payload.registration.id,
        message: `Created manual registration ${payload.registration.registrationCode || payload.registration.id} for ${event.title}.`,
        metadata: buildRegistrationAuditMetadata(input, payload.registration)
      }
    });

    if (input.mode === ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION) {
      await tx.auditLog.create({
        data: {
          id: createToken(),
          createdAt: new Date(),
          actorType: "ORGANIZER_ADMIN",
          actorId: options.actorId || null,
          organizerId: organizer.id,
          registrationId: payload.registration.id,
          eventType: "organizer_registration_confirmation_requested",
          entityType: "registration",
          entityId: payload.registration.id,
          message: `Requested attendee confirmation for manual registration ${payload.registration.id}.`,
          metadata: buildRegistrationAuditMetadata(input, payload.registration)
        }
      });
    }
  });

  await sendPrismaOrganizerRegistrationEmails(
    prisma,
    organizer,
    event,
    occurrence,
    payload.registration,
    input,
    {
      baseUrl: input.baseUrl || getBaseUrl()
    }
  );

  return buildSuccessResult({
    organizer,
    event,
    registration: payload.registration,
    checkoutSession: payload.checkoutSession,
    links: payload.links
  });
}

async function createOrganizerRegistrationInFileState(slug, input, options = {}) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const event = organizer ? getEventRecord(draft, organizer.id, input.eventTypeId) : null;
    const occurrence = event ? getOccurrenceRecord(draft, event.id, input.occurrenceId) : null;
    const ticketCategories = event ? getTicketCategoriesForEvent(draft, event.id) : [];
    const registrations = occurrence
      ? (Array.isArray(draft.registrations) ? draft.registrations : []).filter(
          (registration) => registration.occurrenceId === occurrence.id
        )
      : [];
    const payload = await buildOrganizerRegistrationPayload({
      organizer,
      event,
      occurrence,
      ticketCategories,
      registrations,
      currency: draft.siteSettings?.stripeCurrencyDefault || "eur",
      input
    });

    if (!payload.ok) {
      return payload;
    }

    draft.registrations.unshift(payload.registration);

    for (const payment of payload.payments.slice().reverse()) {
      draft.payments.unshift(payment);
    }

    await writeOrganizerRegistrationAuditLogs(
      draft,
      organizer,
      event,
      payload.registration,
      input,
      options.actorId
    );
    await sendStateOrganizerRegistrationEmails(
      draft,
      organizer,
      event,
      occurrence,
      payload.registration,
      input,
      {
        baseUrl: input.baseUrl || getBaseUrl()
      }
    );

    return buildSuccessResult({
      organizer,
      event,
      registration: payload.registration,
      checkoutSession: payload.checkoutSession,
      links: payload.links
    });
  });
}

export async function createOrganizerRegistration(slug, input, options = {}) {
  const parsed = organizerManualRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return createFieldErrorResult(parsed.error);
  }

  if (getStorageMode() === "database") {
    try {
      return await createOrganizerRegistrationInDatabase(slug, parsed.data, options);
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-organizer-registrations] organizer manual registration failed in database mode, falling back to file state",
        error
      );
    }
  }

  return createOrganizerRegistrationInFileState(slug, parsed.data, options);
}
