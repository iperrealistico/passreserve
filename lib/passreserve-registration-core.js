import { HOLD_DURATION_MINUTES } from "./passreserve-config.js";
import { calculatePaymentBreakdown } from "./passreserve-domain.js";
import {
  addMinutes,
  createToken,
  normalizeEmail,
  normalizeText
} from "./passreserve-format.js";
import {
  buildDefaultRegistrationQuestionnaireConfig,
  normalizeRegistrationQuestionnaireAttendees,
  validateRegistrationQuestionnaireAttendees
} from "./passreserve-registration-questionnaire.js";

function getSafeEntries(value) {
  return Array.isArray(value) ? value : [];
}

export function sumRegistrationItemQuantity(items = []) {
  return getSafeEntries(items).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function buildRegistrationPaymentTotals(items = []) {
  return getSafeEntries(items).reduce(
    (totals, item) => ({
      subtotalCents: totals.subtotalCents + Number(item.subtotalCents || 0),
      onlineAmountCents: totals.onlineAmountCents + Number(item.onlineAmountCents || 0),
      dueAtEventCents: totals.dueAtEventCents + Number(item.dueAtEventCents || 0)
    }),
    {
      subtotalCents: 0,
      onlineAmountCents: 0,
      dueAtEventCents: 0
    }
  );
}

export function normalizeRegistrationLocale(locale) {
  const normalized = normalizeText(locale).slice(0, 2).toLowerCase();
  return normalized === "it" ? "it" : "en";
}

export function normalizeRegistrationAttendees(
  attendees = [],
  nowIso = new Date().toISOString(),
  options = {}
) {
  const questionnaireConfig = options.registrationQuestionnaireConfig
    ? options.registrationQuestionnaireConfig
    : buildDefaultRegistrationQuestionnaireConfig({
        collectDietaryInfo: options.collectDietaryInfo
      });

  return normalizeRegistrationQuestionnaireAttendees(
    getSafeEntries(attendees).map((attendee) => ({
      ...attendee,
      id: attendee?.id || createToken(),
      ticketCategoryId: normalizeText(attendee.ticketCategoryId),
      firstName: normalizeText(attendee.firstName),
      lastName: normalizeText(attendee.lastName),
      address: normalizeText(attendee.address),
      phone: normalizeText(attendee.phone),
      email: normalizeEmail(attendee.email)
    })),
    questionnaireConfig,
    nowIso
  );
}

export function normalizeRequestedItems(items = []) {
  const aggregated = new Map();

  for (const item of getSafeEntries(items)) {
    const ticketCategoryId = normalizeText(item.ticketCategoryId);
    const quantity = Number(item.quantity || 0);

    if (!ticketCategoryId || quantity <= 0) {
      continue;
    }

    aggregated.set(ticketCategoryId, (aggregated.get(ticketCategoryId) || 0) + quantity);
  }

  return Array.from(aggregated.entries()).map(([ticketCategoryId, quantity], index) => ({
    ticketCategoryId,
    quantity,
    sortOrder: index
  }));
}

export function buildRequestedItemsByTicket(items = []) {
  return new Map(
    getSafeEntries(items).map((item) => [item.ticketCategoryId, Number(item.quantity || 0)])
  );
}

export function countAttendeesByTicket(attendees = []) {
  const counts = new Map();

  for (const attendee of getSafeEntries(attendees)) {
    const ticketCategoryId = normalizeText(attendee.ticketCategoryId);

    if (!ticketCategoryId) {
      continue;
    }

    counts.set(ticketCategoryId, (counts.get(ticketCategoryId) || 0) + 1);
  }

  return counts;
}

export function buildRegistrationLineItems(
  requestedItems,
  ticketCategoryMap,
  prepayPercentage,
  nowIso
) {
  return getSafeEntries(requestedItems).map((item, index) => {
    const ticketCategory = ticketCategoryMap.get(item.ticketCategoryId);
    const payment = calculatePaymentBreakdown({
      unitPrice: (ticketCategory?.unitPriceCents || 0) / 100,
      quantity: item.quantity,
      prepayPercentage
    });

    return {
      id: createToken(),
      registrationId: null,
      ticketCategoryId: item.ticketCategoryId,
      sortOrder: index,
      quantity: item.quantity,
      unitPriceCents: ticketCategory?.unitPriceCents || 0,
      subtotalCents: Math.round(payment.subtotal * 100),
      onlineAmountCents: Math.round(payment.onlineAmount * 100),
      dueAtEventCents: Math.round(payment.dueAtEvent * 100),
      createdAt: nowIso,
      updatedAt: nowIso
    };
  });
}

export function buildDueAtVenueOnlyLineItems(lineItems = []) {
  return getSafeEntries(lineItems).map((item) => ({
    ...item,
    onlineAmountCents: 0,
    dueAtEventCents: Number(item.subtotalCents || 0)
  }));
}

export function prepareRegistrationBuild({
  items = [],
  attendees = [],
  ticketCategories = [],
  collectDietaryInfo = true,
  registrationQuestionnaireConfig = null,
  prepayPercentage = 0,
  nowIso = new Date().toISOString(),
  paymentMode = "STANDARD"
}) {
  const requestedItems = normalizeRequestedItems(items);
  const requestedQuantity = sumRegistrationItemQuantity(requestedItems);

  if (!requestedItems.length || requestedQuantity <= 0) {
    return {
      ok: false,
      message: "Select at least one ticket before continuing.",
      fieldErrors: {
        items: "Choose one or more ticket quantities."
      }
    };
  }

  if (requestedQuantity !== getSafeEntries(attendees).length) {
    return {
      ok: false,
      message: "The participant count must match the selected ticket quantities.",
      fieldErrors: {
        attendees: "Add one full participant form for each reserved ticket."
      }
    };
  }

  const ticketCategoryMap = new Map(
    getSafeEntries(ticketCategories).map((category) => [category.id, category])
  );

  if (
    requestedItems.some(
      (item) => !ticketCategoryMap.has(item.ticketCategoryId) || !ticketCategoryMap.get(item.ticketCategoryId)
    )
  ) {
    return {
      ok: false,
      message: "One or more selected ticket types are no longer available.",
      fieldErrors: {
        items: "Refresh the page and choose the available ticket types again."
      }
    };
  }

  const resolvedQuestionnaireConfig =
    registrationQuestionnaireConfig ||
    buildDefaultRegistrationQuestionnaireConfig({
      collectDietaryInfo
    });
  const normalizedAttendees = normalizeRegistrationAttendees(attendees, nowIso, {
    collectDietaryInfo,
    registrationQuestionnaireConfig: resolvedQuestionnaireConfig
  });
  const questionnaireValidation = validateRegistrationQuestionnaireAttendees(
    normalizedAttendees,
    resolvedQuestionnaireConfig
  );

  if (!questionnaireValidation.ok) {
    return {
      ok: false,
      message: "Complete the required participant fields before continuing.",
      fieldErrors: {
        attendees: "Review the participant cards and complete the required fields."
      }
    };
  }

  const requestedItemsByTicket = buildRequestedItemsByTicket(requestedItems);
  const attendeeCountsByTicket = countAttendeesByTicket(normalizedAttendees);

  for (const item of requestedItems) {
    if (attendeeCountsByTicket.get(item.ticketCategoryId) !== item.quantity) {
      return {
        ok: false,
        message: "Each participant must be assigned to one of the selected ticket types.",
        fieldErrors: {
          attendees: "Review the participant forms and match them to the selected ticket quantities."
        }
      };
    }
  }

  if (
    Array.from(attendeeCountsByTicket.keys()).some(
      (ticketCategoryId) => !requestedItemsByTicket.has(ticketCategoryId)
    )
  ) {
    return {
      ok: false,
      message: "Each participant must be assigned to one of the selected ticket types.",
      fieldErrors: {
        attendees: "Review the participant forms and match them to the selected ticket quantities."
      }
    };
  }

  let lineItems = buildRegistrationLineItems(
    requestedItems,
    ticketCategoryMap,
    prepayPercentage,
    nowIso
  );

  if (paymentMode === "FULL_VENUE") {
    lineItems = buildDueAtVenueOnlyLineItems(lineItems);
  }

  return {
    ok: true,
    requestedItems,
    requestedQuantity,
    attendees: normalizedAttendees,
    lineItems,
    ticketCategoryMap,
    registrationQuestionnaireConfig: resolvedQuestionnaireConfig
  };
}

export function buildRegistrationRecord({
  organizerId,
  eventTypeId,
  occurrenceId,
  status,
  registrationLocale = "en",
  requestedItems = [],
  attendees = [],
  lineItems = [],
  currency = "EUR",
  nowIso = new Date().toISOString(),
  onlineCollectedCents = 0,
  venueCollectedCents = 0,
  refundedCents = 0,
  holdToken = null,
  paymentToken = null,
  confirmationToken = null,
  registrationCode = null,
  expiresAt = null,
  confirmedAt = null,
  cancelledAt = null,
  attendedAt = null,
  noShowAt = null,
  termsAcceptedAt = null,
  responsibilityAt = null,
  note = "",
  source = "PUBLIC",
  origin = ""
}) {
  const payment = buildRegistrationPaymentTotals(lineItems);
  const quantity = sumRegistrationItemQuantity(requestedItems);
  const leadAttendee = attendees[0] ?? {};
  const leadItem = lineItems[0] ?? null;
  const registrationId = createToken();

  return {
    id: registrationId,
    organizerId,
    eventTypeId,
    occurrenceId,
    ticketCategoryId:
      leadItem?.ticketCategoryId ||
      requestedItems[0]?.ticketCategoryId ||
      leadAttendee.ticketCategoryId ||
      null,
    status,
    attendeeName: `${leadAttendee.firstName || ""} ${leadAttendee.lastName || ""}`.trim(),
    attendeeEmail: leadAttendee.email || "",
    attendeePhone: leadAttendee.phone || "",
    registrationLocale: normalizeRegistrationLocale(registrationLocale),
    quantity,
    currency: normalizeText(currency).toUpperCase() || "EUR",
    subtotalCents: payment.subtotalCents,
    onlineAmountCents: payment.onlineAmountCents,
    dueAtEventCents: payment.dueAtEventCents,
    onlineCollectedCents: Number(onlineCollectedCents || 0),
    venueCollectedCents: Number(venueCollectedCents || 0),
    refundedCents: Number(refundedCents || 0),
    holdToken,
    paymentToken,
    confirmationToken,
    registrationCode,
    expiresAt,
    confirmedAt,
    cancelledAt,
    attendedAt,
    noShowAt,
    termsAcceptedAt,
    responsibilityAt,
    source: normalizeText(source) || "PUBLIC",
    origin: normalizeText(origin),
    note: normalizeText(note),
    items: lineItems.map((item) => ({
      ...item,
      registrationId
    })),
    attendees,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

export function buildPendingConfirmationRegistration({
  organizerId,
  eventTypeId,
  occurrenceId,
  registrationLocale = "en",
  requestedItems = [],
  attendees = [],
  lineItems = [],
  currency = "EUR",
  nowIso = new Date().toISOString(),
  holdDurationMinutes = HOLD_DURATION_MINUTES,
  note = "",
  source = "PUBLIC",
  origin = ""
}) {
  return buildRegistrationRecord({
    organizerId,
    eventTypeId,
    occurrenceId,
    status: "PENDING_CONFIRM",
    registrationLocale,
    requestedItems,
    attendees,
    lineItems,
    currency,
    nowIso,
    holdToken: createToken(),
    note,
    expiresAt: addMinutes(nowIso, holdDurationMinutes),
    source,
    origin
  });
}
