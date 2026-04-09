import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes
} from "node:crypto";

import { calculatePaymentBreakdown } from "./passreserve-domain.js";
import {
  createStripeCheckoutSession,
  getStripeEnvironmentState,
  retrieveStripeCheckoutSession,
  summarizeStripeCheckoutSession
} from "./passreserve-payments.js";
import { getEventBySlugs, getEventRouteParams } from "./passreserve-public.js";

const HOLD_DURATION_MINUTES = 30;
const TOKEN_KEY = createHash("sha256")
  .update(process.env.SESSION_SECRET || "passreserve-registration-secret")
  .digest();

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

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Rome"
});

const requestSchema = [
  {
    field: "occurrenceId",
    label: "Occurrence",
    detail: "Choose a published date with enough remaining space for the quantity you want."
  },
  {
    field: "ticketCategoryId",
    label: "Ticket category",
    detail: "Select the admission format that matches how you want to join this date."
  },
  {
    field: "quantity",
    label: "Quantity",
    detail: "Choose a quantity that still fits within the spaces left for this date."
  },
  {
    field: "attendeeName",
    label: "Attendee name",
    detail: "Use the main contact name that should appear on the registration."
  },
  {
    field: "attendeeEmail",
    label: "Attendee email",
    detail: "This email receives the confirmation link, next steps, and any payment updates."
  },
  {
    field: "attendeePhone",
    label: "Attendee phone",
    detail: "Add a reachable number for last-minute venue or timing updates."
  }
];

const confirmationSchema = [
  {
    field: "termsAccepted",
    label: "Terms acceptance",
    detail: "Confirm that you understand the host's registration and venue terms."
  },
  {
    field: "responsibilityAccepted",
    label: "Responsibility acknowledgement",
    detail: "Confirm that the timing works for you and that the selected quantity is intentional."
  }
];

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value));
}

function parseRemainingCount(label) {
  const match = label.match(/(\d+)/);

  return match ? Number(match[1]) : 0;
}

function pluralize(value, singular, plural = `${singular}s`) {
  return value === 1 ? singular : plural;
}

function formatRemainingLabel(count) {
  if (count <= 0) {
    return "Sold out";
  }

  return `${count} ${pluralize(count, "seat")} remaining`;
}

function formatQuantityLabel(quantity) {
  return `${quantity} ${pluralize(quantity, "attendee")}`;
}

function seedCount(seed, min, max) {
  const byte = createHash("sha256").update(seed).digest()[0];

  return min + (byte % (max - min + 1));
}

function encryptPayload(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", TOKEN_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

function decryptPayload(token) {
  const [ivValue, tagValue, encryptedValue] = token.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    return null;
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      TOKEN_KEY,
      Buffer.from(ivValue, "base64url")
    );

    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

function hashSensitive(value) {
  return createHmac("sha256", TOKEN_KEY)
    .update(value)
    .digest("hex")
    .slice(0, 12);
}

function buildHoldId(token) {
  return `HLD-${createHash("sha256").update(token).digest("hex").slice(0, 8).toUpperCase()}`;
}

function buildRegistrationCode(token) {
  return `PR-${createHash("sha256").update(token).digest("hex").slice(0, 10).toUpperCase()}`;
}

function getPendingPaymentStatusCopy(payment, environment) {
  if (environment.mode === "preview") {
    return {
      registrationStatus: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      headline: "Registration confirmed, payment ready",
      nextStep:
        "A secure payment step opens next so you can finish the online amount and keep this registration active."
    };
  }

  if (payment.onlineAmount > 0) {
    return {
      registrationStatus: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      headline: "Registration confirmed, payment still pending",
      nextStep:
        "Stripe Checkout opens next so Passreserve.com can collect the online amount before the registration moves beyond the pending-payment state."
    };
  }

  return {
    registrationStatus: "CONFIRMED_UNPAID",
    paymentStatus: "NONE",
    headline: "Registration confirmed",
    nextStep:
      "No online payment is required for this occurrence. The attendee can arrive with the registration code and settle any listed balance at the venue."
  };
}

function getFinalizedStatusCopy(payload) {
  switch (payload.registrationStatus) {
    case "CONFIRMED_PAID":
      return {
        headline: "Payment received and registration confirmed",
        nextStep:
          "The online amount has been fully collected. The attendee can arrive with the registration code and does not owe anything further at the event."
      };
    case "CONFIRMED_PARTIALLY_PAID":
      return {
        headline: "Deposit received, registration confirmed",
        nextStep: `The online amount of ${payload.payment.onlineAmountLabel} is settled and ${payload.payment.dueAtEventLabel} remains due at the event.`
      };
    case "CONFIRMED_UNPAID":
    default:
      return {
        headline: "Registration confirmed",
        nextStep:
          "No online payment is required for this occurrence. The attendee can arrive with the registration code and settle any listed balance at the venue."
      };
  }
}

function getProviderLabel(providerMode) {
  switch (providerMode) {
    case "stripe-live":
      return "Secure online payment";
    case "stripe-preview":
      return "Online payment";
    case "venue":
    default:
      return "Pay at the event";
  }
}

function buildPendingPaymentPayload(holdView, confirmedAt, registrationCode) {
  return {
    version: 1,
    slug: holdView.organizer.slug,
    eventSlug: holdView.event.slug,
    occurrenceId: holdView.occurrence.id,
    ticketCategoryId: holdView.ticketCategory.id,
    quantity: holdView.quantity,
    attendeeName: holdView.attendee.name,
    attendeeEmail: holdView.attendee.email,
    attendeePhone: holdView.attendee.phone,
    payment: holdView.payment,
    createdAt: holdView.hold.createdAt,
    confirmedAt,
    paymentExpiresAt: holdView.hold.expiresAt,
    registrationCode,
    registrationStatus: "PENDING_PAYMENT",
    paymentStatus: "PENDING"
  };
}

function buildFinalizedRegistrationPayload(payload, options = {}) {
  const providerMode = options.providerMode || (payload.payment.onlineAmount > 0 ? "stripe-live" : "venue");
  const providerLabel = getProviderLabel(providerMode);
  const reconciliationTime = options.reconciledAt || new Date().toISOString();
  const sessionSummary = options.sessionSummary ?? null;
  const registrationStatus =
    payload.payment.onlineAmount > 0
      ? payload.payment.dueAtEvent > 0
        ? "CONFIRMED_PARTIALLY_PAID"
        : "CONFIRMED_PAID"
      : "CONFIRMED_UNPAID";
  const paymentStatus =
    payload.payment.onlineAmount > 0
      ? payload.payment.dueAtEvent > 0
        ? "PARTIALLY_PAID"
        : "PAID"
      : "NONE";

  return {
    version: 1,
    slug: payload.slug,
    eventSlug: payload.eventSlug,
    occurrenceId: payload.occurrenceId,
    ticketCategoryId: payload.ticketCategoryId,
    quantity: payload.quantity,
    attendeeName: payload.attendeeName,
    attendeeEmail: payload.attendeeEmail,
    attendeePhone: payload.attendeePhone,
    payment: payload.payment,
    createdAt: payload.createdAt,
    confirmedAt: payload.confirmedAt,
    registrationCode: payload.registrationCode,
    registrationStatus,
    paymentStatus,
    paymentProvider: {
      mode: providerMode,
      label: providerLabel,
      sessionId: sessionSummary?.sessionId ?? options.previewSessionId ?? null,
      paymentIntentId:
        sessionSummary?.paymentIntentId ?? options.previewPaymentIntentId ?? null,
      currency: sessionSummary?.currency ?? "EUR",
      amountCollectedLabel: payload.payment.onlineAmountLabel,
      amountCollected: payload.payment.onlineAmount,
      reconciliationSource:
        providerMode === "stripe-preview"
          ? "Local preview return because live Stripe keys are not configured in this environment."
          : providerMode === "stripe-live"
            ? "Stripe Checkout success return verified against the provider session metadata."
            : "No online collection was required for this registration.",
      reconciledAt: reconciliationTime
    }
  };
}

function buildTicketCategories(event) {
  const categories = [
    {
      id: "general",
      label: "General admission",
      summary: "Standard registration for the published occurrence.",
      unitPrice: event.basePrice
    }
  ];

  if (event.category.toLowerCase().includes("weekend")) {
    categories.push({
      id: "resident-pass",
      label: "Resident pass",
      summary: "Includes the tighter logistics handoff used for overnight or two-day formats.",
      unitPrice: event.basePrice + 28
    });
  } else if (event.category.toLowerCase().includes("workshop")) {
    categories.push({
      id: "chef-table",
      label: "Front counter seat",
      summary: "A smaller workshop seat with closer facilitator access and material planning.",
      unitPrice: event.basePrice + 18
    });
  } else if (event.category.toLowerCase().includes("clinic")) {
    categories.push({
      id: "coach-support",
      label: "Coach support seat",
      summary: "Keeps the same occurrence while adding a tighter coaching ratio and follow-up notes.",
      unitPrice: event.basePrice + 14
    });
  } else {
    categories.push({
      id: "host-circle",
      label: "Host circle seat",
      summary: "A supporter-style ticket that keeps the same occurrence but carries a higher contribution.",
      unitPrice: event.basePrice + 12
    });
  }

  return categories.map((category) => {
    const payment = calculatePaymentBreakdown({
      unitPrice: category.unitPrice,
      quantity: 1,
      prepayPercentage: event.prepayPercentage
    });

    return {
      ...category,
      payment,
      unitPriceLabel: formatCurrency(category.unitPrice),
      onlineAmountLabel: payment.onlineAmountLabel,
      dueAtEventLabel: payment.dueAtEventLabel
    };
  });
}

function buildOccurrenceCapacity(event, occurrence) {
  const remainingCount = parseRemainingCount(occurrence.capacity);
  const pendingHoldCount =
    event.prepayPercentage === 0
      ? seedCount(`${occurrence.id}:hold`, 0, 1)
      : seedCount(`${occurrence.id}:hold`, 1, 2);
  const pendingPaymentCount =
    event.prepayPercentage > 0
      ? seedCount(`${occurrence.id}:payment`, 0, 2)
      : 0;
  const confirmedCount = seedCount(`${occurrence.id}:confirmed`, 3, 8);
  const totalCapacity =
    remainingCount + pendingHoldCount + pendingPaymentCount + confirmedCount;
  const statusLabel =
    remainingCount <= 3
      ? "Capacity watch"
      : remainingCount <= 7
        ? "Filling steadily"
        : "Open availability";

  return {
    totalCapacity,
    remainingCount,
    confirmedCount,
    pendingHoldCount,
    pendingPaymentCount,
    reservedCount: totalCapacity - remainingCount,
    remainingLabel: formatRemainingLabel(remainingCount),
    statusLabel,
    soldOut: remainingCount <= 0
  };
}

function buildRegistrationHref(slug, eventSlug, occurrenceId) {
  const searchParams = new URLSearchParams({
    occurrence: occurrenceId
  });

  return `/${slug}/events/${eventSlug}/register?${searchParams.toString()}`;
}

function buildDecoratedOccurrence(organizer, event, occurrence) {
  const capacity = buildOccurrenceCapacity(event, occurrence);
  const ticketCategories = buildTicketCategories(event);

  return {
    ...occurrence,
    capacity,
    capacityLabel: capacity.remainingLabel,
    published: true,
    registrationHref: buildRegistrationHref(
      organizer.slug,
      event.slug,
      occurrence.id
    ),
    registrationStatusLabel:
      event.prepayPercentage > 0
        ? "Review details, then secure online payment"
        : "Review details, then confirm",
    ticketCategories
  };
}

function decorateRegistrationEvent(entry) {
  const { organizer, event } = entry;
  const occurrences = event.occurrences.map((occurrence) =>
    buildDecoratedOccurrence(organizer, event, occurrence)
  );
  const totalRemainingCapacity = occurrences.reduce(
    (sum, occurrence) => sum + occurrence.capacity.remainingCount,
    0
  );

  return {
    organizer,
    event: {
      ...event,
      occurrences,
      nextOccurrence: occurrences[0] ?? null,
      totalRemainingCapacity,
      registrationModeLabel:
        event.prepayPercentage > 0
          ? "Capacity-aware hold, confirmation, then hosted payment"
          : "Capacity-aware hold, confirmation, then venue payment"
    }
  };
}

function normalizeQuantity(value) {
  const quantity = Number.parseInt(String(value), 10);

  return Number.isFinite(quantity) ? quantity : 0;
}

function getMaxQuantity(occurrence) {
  return Math.min(6, Math.max(1, occurrence.capacity.remainingCount));
}

function getSelectedOccurrence(event, occurrenceId) {
  return (
    event.occurrences.find((occurrence) => occurrence.id === occurrenceId) ??
    event.occurrences[0] ??
    null
  );
}

function getSelectedTicketCategory(occurrence, ticketCategoryId) {
  return (
    occurrence?.ticketCategories.find((category) => category.id === ticketCategoryId) ??
    occurrence?.ticketCategories[0] ??
    null
  );
}

function validateRegistrationRequest(input, context) {
  const errors = {};
  const quantity = normalizeQuantity(input.quantity);

  if (!context.selectedOccurrence) {
    errors.occurrenceId = "Choose an occurrence before continuing.";
  }

  if (!context.selectedTicketCategory) {
    errors.ticketCategoryId = "Select a ticket category for this attendee.";
  }

  if (quantity < 1) {
    errors.quantity = "Choose at least one attendee.";
  } else if (quantity > getMaxQuantity(context.selectedOccurrence)) {
    errors.quantity = `Only ${context.selectedOccurrence.capacity.remainingCount} seats remain on this occurrence.`;
  }

  if (!String(input.attendeeName || "").trim()) {
    errors.attendeeName = "Enter the main attendee name.";
  } else if (String(input.attendeeName).trim().length < 2) {
    errors.attendeeName = "Use at least two characters for the attendee name.";
  }

  if (!String(input.attendeeEmail || "").trim()) {
    errors.attendeeEmail = "Enter an attendee email address.";
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(input.attendeeEmail).trim())) {
    errors.attendeeEmail = "Use a valid attendee email address.";
  }

  if (!String(input.attendeePhone || "").trim()) {
    errors.attendeePhone = "Enter an attendee phone number.";
  } else if (String(input.attendeePhone).trim().length < 6) {
    errors.attendeePhone = "Use a phone number that the organizer can reach on event day.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

function validateRegistrationConfirmation(input) {
  const errors = {};

  if (input.termsAccepted !== "yes") {
    errors.termsAccepted = "Accept the organizer terms before confirming the registration.";
  }

  if (input.responsibilityAccepted !== "yes") {
    errors.responsibilityAccepted =
      "Confirm the attendee responsibility acknowledgement before continuing.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

function logRegistrationEvent(eventType, payload) {
  console.info(
    JSON.stringify({
      source: "passreserve-phase-09",
      level: "info",
      timestamp: new Date().toISOString(),
      eventType,
      organizerSlug: payload.slug,
      eventSlug: payload.eventSlug,
      occurrenceId: payload.occurrenceId,
      quantity: payload.quantity,
      holdId: payload.holdId ?? null,
      registrationCode: payload.registrationCode ?? null,
      checkoutMode: payload.checkoutMode ?? null,
      stripeSessionId: payload.stripeSessionId ?? null,
      stripePaymentIntentId: payload.stripePaymentIntentId ?? null,
      attendeeEmailHash: payload.attendeeEmail
        ? hashSensitive(payload.attendeeEmail)
        : null,
      message: payload.message
    })
  );
}

function isPaymentExpired(paymentExpiresAt) {
  return Date.now() > new Date(paymentExpiresAt).getTime();
}

function getPendingPaymentContext(slug, eventSlug, paymentToken) {
  const payload = decryptPayload(paymentToken);

  if (!payload || payload.slug !== slug || payload.eventSlug !== eventSlug) {
    return {
      state: "invalid",
      title: "This payment link could not be verified.",
      message:
        "Open the event page again and create a fresh registration if you still need to pay online."
    };
  }

  const context = getRegistrationExperienceBySlugs(slug, eventSlug, {
    occurrenceId: payload.occurrenceId,
    ticketCategoryId: payload.ticketCategoryId
  });

  if (!context || !context.selectedOccurrence || !context.selectedTicketCategory) {
    return {
      state: "invalid",
      title: "The original occurrence is no longer available.",
      message:
        "This payment link points to a date that is no longer published."
    };
  }

  return {
    state: "ready",
    environment: getStripeEnvironmentState(),
    organizer: context.organizer,
    event: context.event,
    occurrence: context.selectedOccurrence,
    ticketCategory: context.selectedTicketCategory,
    attendee: {
      name: payload.attendeeName,
      email: payload.attendeeEmail,
      phone: payload.attendeePhone
    },
    quantity: payload.quantity,
    quantityLabel: formatQuantityLabel(payload.quantity),
    payment: payload.payment,
    registrationCode: payload.registrationCode,
    createdAt: payload.createdAt,
    confirmedAt: payload.confirmedAt,
    confirmedAtLabel: formatDateTime(payload.confirmedAt),
    paymentExpiresAt: payload.paymentExpiresAt,
    paymentExpiresAtLabel: formatDateTime(payload.paymentExpiresAt),
    paymentExpired: isPaymentExpired(payload.paymentExpiresAt),
    paymentToken,
    payload,
    restartHref: context.selectedOccurrence.registrationHref
  };
}

function verifyCheckoutSession(context, sessionSummary, session) {
  if (!session || !sessionSummary) {
    return false;
  }

  return (
    session.client_reference_id === context.registrationCode &&
    session.metadata?.organizer_slug === context.organizer.slug &&
    session.metadata?.event_slug === context.event.slug &&
    session.metadata?.occurrence_id === context.occurrence.id &&
    sessionSummary.amountTotalMinor === Math.round(context.payment.onlineAmount * 100)
  );
}

export const registrationRequestSchema = requestSchema;

export const registrationConfirmationSchema = confirmationSchema;

export function getRegistrationRouteParams() {
  return getEventRouteParams();
}

export function getRegistrationExperienceBySlugs(
  slug,
  eventSlug,
  options = {}
) {
  const entry = getEventBySlugs(slug, eventSlug);

  if (!entry) {
    return null;
  }

  const decorated = decorateRegistrationEvent(entry);
  const selectedOccurrence = getSelectedOccurrence(
    decorated.event,
    options.occurrenceId
  );
  const selectedTicketCategory = getSelectedTicketCategory(
    selectedOccurrence,
    options.ticketCategoryId
  );

  return {
    ...decorated,
    selectedOccurrence,
    selectedTicketCategory
  };
}

export function createRegistrationHold(input) {
  const context = getRegistrationExperienceBySlugs(input.slug, input.eventSlug, {
    occurrenceId: input.occurrenceId,
    ticketCategoryId: input.ticketCategoryId
  });

  if (!context || !context.selectedOccurrence || !context.selectedTicketCategory) {
    return {
      ok: false,
      message: "This date is no longer available for registration.",
      fieldErrors: {
        occurrenceId: "Choose an available date and try again."
      }
    };
  }

  const validation = validateRegistrationRequest(input, context);

  if (!validation.valid) {
    return {
      ok: false,
      message: "Check the highlighted registration fields and try again.",
      fieldErrors: validation.errors
    };
  }

  const quantity = normalizeQuantity(input.quantity);
  const payment = calculatePaymentBreakdown({
    unitPrice: context.selectedTicketCategory.unitPrice,
    quantity,
    prepayPercentage: context.event.prepayPercentage
  });
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + HOLD_DURATION_MINUTES * 60 * 1000);
  const holdPayload = {
    version: 1,
    slug: input.slug,
    eventSlug: input.eventSlug,
    occurrenceId: context.selectedOccurrence.id,
    ticketCategoryId: context.selectedTicketCategory.id,
    quantity,
    attendeeName: String(input.attendeeName).trim(),
    attendeeEmail: String(input.attendeeEmail).trim().toLowerCase(),
    attendeePhone: String(input.attendeePhone).trim(),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    payment
  };
  const holdToken = encryptPayload(holdPayload);
  const holdId = buildHoldId(holdToken);

  logRegistrationEvent("REGISTRATION_HOLD_CREATED", {
    ...holdPayload,
    holdId,
    message: `Created a ${HOLD_DURATION_MINUTES}-minute registration hold for ${context.event.title}.`
  });

  return {
    ok: true,
    holdId,
    redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirm/${holdToken}`
  };
}

export function getRegistrationHoldView(slug, eventSlug, holdToken) {
  const payload = decryptPayload(holdToken);

  if (!payload || payload.slug !== slug || payload.eventSlug !== eventSlug) {
    return {
      state: "invalid",
      title: "This registration hold could not be verified.",
      message:
        "Open the event page again and start a fresh registration hold for the selected occurrence."
    };
  }

  const context = getRegistrationExperienceBySlugs(slug, eventSlug, {
    occurrenceId: payload.occurrenceId,
    ticketCategoryId: payload.ticketCategoryId
  });

  if (!context || !context.selectedOccurrence || !context.selectedTicketCategory) {
    return {
      state: "invalid",
      title: "The selected occurrence is no longer available.",
      message:
        "Return to the event page and choose a currently published occurrence before continuing."
    };
  }

  const expiresAt = new Date(payload.expiresAt);

  if (Date.now() > expiresAt.getTime()) {
    return {
      state: "expired",
      title: "This registration hold has expired.",
      message:
        "Registration holds last 30 minutes. Please return to the event page and choose your date again.",
      organizer: context.organizer,
      event: context.event,
      restartHref: context.selectedOccurrence.registrationHref
    };
  }

  if (payload.quantity > context.selectedOccurrence.capacity.remainingCount) {
    return {
      state: "unavailable",
      title: "Capacity shifted before this hold could be confirmed.",
      message:
        "The selected quantity now exceeds the remaining seats on this occurrence. Open the event page and restart with a smaller quantity or another date.",
      organizer: context.organizer,
      event: context.event,
      restartHref: context.selectedOccurrence.registrationHref
    };
  }

  const payment = calculatePaymentBreakdown({
    unitPrice: context.selectedTicketCategory.unitPrice,
    quantity: payload.quantity,
    prepayPercentage: context.event.prepayPercentage
  });
  const afterHoldRemaining =
    context.selectedOccurrence.capacity.remainingCount - payload.quantity;

  return {
    state: "ready",
    organizer: context.organizer,
    event: context.event,
    occurrence: context.selectedOccurrence,
    ticketCategory: context.selectedTicketCategory,
    attendee: {
      name: payload.attendeeName,
      email: payload.attendeeEmail,
      phone: payload.attendeePhone
    },
    quantity: payload.quantity,
    quantityLabel: formatQuantityLabel(payload.quantity),
    payment,
    hold: {
      token: holdToken,
      id: buildHoldId(holdToken),
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
      createdAtLabel: formatDateTime(payload.createdAt),
      expiresAtLabel: formatDateTime(payload.expiresAt)
    },
    capacity: {
      beforeRemaining: context.selectedOccurrence.capacity.remainingCount,
      afterHoldRemaining,
      confirmedCount: context.selectedOccurrence.capacity.confirmedCount,
      pendingHoldCount: context.selectedOccurrence.capacity.pendingHoldCount,
      pendingPaymentCount: context.selectedOccurrence.capacity.pendingPaymentCount,
      totalCapacity: context.selectedOccurrence.capacity.totalCapacity
    },
    timeline: [
      {
        title: "Capacity checked",
        detail: `${context.selectedOccurrence.capacity.remainingLabel} were available before this hold.`
      },
      {
        title: "Pending hold created",
        detail: `Hold ${buildHoldId(holdToken)} expires at ${formatDateTime(
          payload.expiresAt
        )}.`
      },
      {
        title: "Attendee confirmation pending",
        detail:
          payment.onlineAmount > 0
            ? `Confirming here opens the payment step for ${payment.onlineAmountLabel} online before the registration is fully settled.`
            : "Confirming here finalizes the registration and keeps the full balance due at the event."
      }
    ]
  };
}

export async function confirmRegistrationHold(input) {
  const validation = validateRegistrationConfirmation(input);

  if (!validation.valid) {
    return {
      ok: false,
      message: "Accept both confirmation requirements before finishing the registration.",
      fieldErrors: validation.errors
    };
  }

  const holdView = getRegistrationHoldView(input.slug, input.eventSlug, input.holdToken);

  if (holdView.state !== "ready") {
    return {
      ok: false,
      message:
        "This hold is no longer ready to confirm. Return to the event page and start a fresh registration flow.",
      fieldErrors: {}
    };
  }

  const confirmedAt = new Date().toISOString();
  const registrationCode = buildRegistrationCode(input.holdToken);
  const basePayload = {
    version: 1,
    slug: input.slug,
    eventSlug: input.eventSlug,
    occurrenceId: holdView.occurrence.id,
    ticketCategoryId: holdView.ticketCategory.id,
    quantity: holdView.quantity,
    attendeeName: holdView.attendee.name,
    attendeeEmail: holdView.attendee.email,
    attendeePhone: holdView.attendee.phone,
    payment: holdView.payment,
    createdAt: holdView.hold.createdAt,
    confirmedAt,
    registrationCode
  };

  if (holdView.payment.onlineAmount > 0) {
    try {
      const environment = getStripeEnvironmentState();
      const pendingPaymentPayload = buildPendingPaymentPayload(
        holdView,
        confirmedAt,
        registrationCode
      );
      const paymentToken = encryptPayload(pendingPaymentPayload);
      const paymentFingerprint = hashSensitive(paymentToken);
      const checkoutSession = await createStripeCheckoutSession({
        attendeeEmail: holdView.attendee.email,
        baseUrl: input.baseUrl,
        eventSlug: input.eventSlug,
        eventTitle: holdView.event.title,
        holdExpiresAt: holdView.hold.expiresAt,
        occurrenceId: holdView.occurrence.id,
        occurrenceLabel: holdView.occurrence.label,
        organizerName: holdView.organizer.name,
        payment: holdView.payment,
        paymentFingerprint,
        paymentToken,
        quantity: holdView.quantity,
        registrationCode,
        slug: input.slug,
        ticketCategoryLabel: holdView.ticketCategory.label
      });
      const statusCopy = getPendingPaymentStatusCopy(
        holdView.payment,
        environment
      );

      logRegistrationEvent("REGISTRATION_PAYMENT_STARTED", {
        ...pendingPaymentPayload,
        checkoutMode: checkoutSession.mode,
        registrationCode,
        stripeSessionId: checkoutSession.sessionId,
        message: `${statusCopy.registrationStatus} for ${holdView.event.title} via ${checkoutSession.mode === "preview" ? "preview checkout" : "Stripe Checkout"}.`
      });

      return {
        ok: true,
        redirectHref: checkoutSession.url
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Stripe Checkout could not be prepared for this registration.",
        fieldErrors: {}
      };
    }
  }

  const confirmationPayload = buildFinalizedRegistrationPayload(basePayload, {
    providerMode: "venue"
  });
  const confirmationToken = encryptPayload(confirmationPayload);

  logRegistrationEvent("REGISTRATION_CONFIRMED", {
    ...confirmationPayload,
    registrationCode,
    message: `${confirmationPayload.registrationStatus} for ${holdView.event.title}.`
  });

  return {
    ok: true,
    redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${confirmationToken}`
  };
}

export function getConfirmedRegistrationView(slug, eventSlug, confirmationToken) {
  const payload = decryptPayload(confirmationToken);

  if (!payload || payload.slug !== slug || payload.eventSlug !== eventSlug) {
    return {
      state: "invalid",
      title: "This registration confirmation could not be verified.",
      message:
        "Return to the event page and start a fresh registration if you still want to join this event."
    };
  }

  const context = getRegistrationExperienceBySlugs(slug, eventSlug, {
    occurrenceId: payload.occurrenceId,
    ticketCategoryId: payload.ticketCategoryId
  });

  if (!context || !context.selectedOccurrence || !context.selectedTicketCategory) {
    return {
      state: "invalid",
      title: "The original occurrence is no longer available.",
      message:
        "The original date is no longer available on the event page."
    };
  }

  const statusCopy = getFinalizedStatusCopy(payload);
  const paymentProvider = payload.paymentProvider ?? {
    label: "Venue collection",
    mode: "venue",
    sessionId: null,
    paymentIntentId: null,
    amountCollectedLabel: payload.payment.onlineAmountLabel,
    reconciliationSource: "No online collection was required for this registration.",
    reconciledAt: payload.confirmedAt
  };
  const reconciledAtLabel = paymentProvider.reconciledAt
    ? formatDateTime(paymentProvider.reconciledAt)
    : null;

  return {
    state: "ready",
    organizer: context.organizer,
    event: context.event,
    occurrence: context.selectedOccurrence,
    ticketCategory: context.selectedTicketCategory,
    attendee: {
      name: payload.attendeeName,
      email: payload.attendeeEmail,
      phone: payload.attendeePhone
    },
    quantity: payload.quantity,
    quantityLabel: formatQuantityLabel(payload.quantity),
    payment: payload.payment,
    registrationCode: payload.registrationCode,
    registrationStatus: payload.registrationStatus,
    paymentStatus: payload.paymentStatus,
    paymentProvider,
    headline: statusCopy.headline,
    nextStep: statusCopy.nextStep,
    createdAtLabel: formatDateTime(payload.createdAt),
    confirmedAtLabel: formatDateTime(payload.confirmedAt),
    reconciledAtLabel,
    timeline: [
      {
        title: "Hold created",
        detail: `The attendee hold was opened on ${formatDateTime(payload.createdAt)}.`
      },
      {
        title: "Attendee confirmed",
        detail: `The confirmation step completed on ${formatDateTime(payload.confirmedAt)}.`
      },
      {
        title: "Registration status",
        detail:
          payload.payment.onlineAmount > 0
            ? `${paymentProvider.label} recorded ${payload.payment.onlineAmountLabel} online and the registration is now confirmed.`
            : `The registration is live with ${payload.payment.dueAtEventLabel} due at the event.`
      },
      {
        title: "Reconciliation",
        detail: `${paymentProvider.reconciliationSource}${reconciledAtLabel ? ` Verified on ${reconciledAtLabel}.` : ""}`
      }
    ]
  };
}

export function getRegistrationPaymentPreviewView(slug, eventSlug, paymentToken) {
  return getPendingPaymentContext(slug, eventSlug, paymentToken);
}

export function getRegistrationPaymentCancellationView(slug, eventSlug, paymentToken) {
  return getPendingPaymentContext(slug, eventSlug, paymentToken);
}

export async function resumeRegistrationPayment(input) {
  const context = getPendingPaymentContext(
    input.slug,
    input.eventSlug,
    input.paymentToken
  );

  if (context.state !== "ready") {
    return {
      ok: false,
      message:
        "This payment link is no longer available. Return to the event page and start a fresh registration if needed."
    };
  }

  if (context.paymentExpired) {
    return {
      ok: false,
      message:
        "The payment window has expired, so this registration can no longer reopen the payment step."
    };
  }

  try {
    const checkoutSession = await createStripeCheckoutSession({
      attendeeEmail: context.attendee.email,
      baseUrl: input.baseUrl,
      eventSlug: input.eventSlug,
      eventTitle: context.event.title,
      holdExpiresAt: context.paymentExpiresAt,
      occurrenceId: context.occurrence.id,
      occurrenceLabel: context.occurrence.label,
      organizerName: context.organizer.name,
      payment: context.payment,
      paymentFingerprint: hashSensitive(context.paymentToken),
      paymentToken: context.paymentToken,
      quantity: context.quantity,
      registrationCode: context.registrationCode,
      slug: input.slug,
      ticketCategoryLabel: context.ticketCategory.label
    });

    logRegistrationEvent("REGISTRATION_PAYMENT_RESUMED", {
      ...context.payload,
      checkoutMode: checkoutSession.mode,
      registrationCode: context.registrationCode,
      stripeSessionId: checkoutSession.sessionId,
      message: `Reopened the payment step for ${context.event.title}.`
    });

    return {
      ok: true,
      redirectHref: checkoutSession.url
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "The payment step could not be reopened."
    };
  }
}

export async function resolveSuccessfulRegistrationConfirmation(input) {
  const context = getPendingPaymentContext(
    input.slug,
    input.eventSlug,
    input.paymentToken
  );

  if (context.state !== "ready") {
    return context;
  }

  if (input.preview === "1") {
    const previewId = `preview_${hashSensitive(context.paymentToken)}`;
    const confirmationPayload = buildFinalizedRegistrationPayload(context.payload, {
      providerMode: "stripe-preview",
      previewPaymentIntentId: `${previewId}_intent`,
      previewSessionId: `${previewId}_session`,
      reconciledAt: new Date().toISOString()
    });
    const confirmationToken = encryptPayload(confirmationPayload);

    logRegistrationEvent("REGISTRATION_PAYMENT_PREVIEW_CONFIRMED", {
      ...confirmationPayload,
      checkoutMode: "preview",
      registrationCode: context.registrationCode,
      stripeSessionId: confirmationPayload.paymentProvider.sessionId,
      stripePaymentIntentId: confirmationPayload.paymentProvider.paymentIntentId,
      message: `Preview payment marked complete for ${context.event.title}.`
    });

    return {
      state: "redirect",
      redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${confirmationToken}`
    };
  }

  if (!input.sessionId) {
    return {
      state: "invalid",
      title: "We couldn’t verify this payment return.",
      message:
        "Return to the payment page to try again or go back to the event page and start a new registration."
    };
  }

  const session = await retrieveStripeCheckoutSession(input.sessionId);
  const sessionSummary = summarizeStripeCheckoutSession(session);

  if (!verifyCheckoutSession(context, sessionSummary, session)) {
    return {
      state: "invalid",
      title: "The Stripe session does not match this registration.",
      message:
        "The provider returned a session that does not match the organizer, event, or registration code tied to this payment token."
    };
  }

  if (sessionSummary.paymentStatus === "paid") {
    const confirmationPayload = buildFinalizedRegistrationPayload(context.payload, {
      providerMode: "stripe-live",
      sessionSummary,
      reconciledAt: new Date().toISOString()
    });
    const confirmationToken = encryptPayload(confirmationPayload);

    logRegistrationEvent("REGISTRATION_PAYMENT_RECONCILED", {
      ...confirmationPayload,
      checkoutMode: "live",
      registrationCode: context.registrationCode,
      stripeSessionId: sessionSummary.sessionId,
      stripePaymentIntentId: sessionSummary.paymentIntentId,
      message: `Stripe Checkout completed for ${context.event.title}.`
    });

    return {
      state: "redirect",
      redirectHref: `/${input.slug}/events/${input.eventSlug}/register/confirmed/${confirmationToken}`
    };
  }

  if (context.paymentExpired || sessionSummary.sessionStatus === "expired") {
    return {
      state: "expired",
      title: "The payment window has expired.",
      message:
        "Stripe did not confirm the online amount before the payment window closed. Return to the event page and create a fresh registration if seats are still available."
    };
  }

  return {
    state: "pending",
    title: "The payment has not been confirmed yet.",
    message:
      "The online amount is still waiting for confirmation. You can reopen the payment page and try again."
  };
}

export function getRegistrationQuantityOptions(occurrence) {
  return Array.from(
    { length: getMaxQuantity(occurrence) },
    (_, index) => index + 1
  );
}

export function getRegistrationFieldRules() {
  return requestSchema;
}

export function getConfirmationFieldRules() {
  return confirmationSchema;
}

export function getOccurrenceDateLabel(value) {
  return formatDate(value);
}
