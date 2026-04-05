import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes
} from "node:crypto";

import { calculatePaymentBreakdown } from "./passreserve-domain";
import { getEventBySlugs, getEventRouteParams } from "./passreserve-public";

const HOLD_DURATION_MINUTES = 30;
const TOKEN_KEY = createHash("sha256")
  .update(process.env.SESSION_SECRET || "passreserve-phase-08-demo-secret")
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
    detail: "Choose a published occurrence with enough remaining capacity for the selected quantity."
  },
  {
    field: "ticketCategoryId",
    label: "Ticket category",
    detail: "Select the admission format that matches how this attendee is joining the occurrence."
  },
  {
    field: "quantity",
    label: "Quantity",
    detail: "Keep each request within the remaining capacity window so the hold can be created safely."
  },
  {
    field: "attendeeName",
    label: "Attendee name",
    detail: "Use the main attendee contact name for confirmation and organizer operations."
  },
  {
    field: "attendeeEmail",
    label: "Attendee email",
    detail: "This email receives the confirmation hold, next-step summary, and future payment messaging."
  },
  {
    field: "attendeePhone",
    label: "Attendee phone",
    detail: "Keep a reachable number for last-minute venue or timing updates."
  }
];

const confirmationSchema = [
  {
    field: "termsAccepted",
    label: "Terms acceptance",
    detail: "The attendee must confirm they understand the organizer's published registration and venue terms."
  },
  {
    field: "responsibilityAccepted",
    label: "Responsibility acknowledgement",
    detail: "The attendee confirms arrival timing, event readiness, and that the selected quantity is intentional."
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

function getRegistrationStatusCopy(payment) {
  if (payment.onlineAmount > 0) {
    return {
      registrationStatus: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      headline: "Registration confirmed, payment still pending",
      nextStep:
        "Phase 09 adds Stripe Checkout. This Phase 08 build keeps the attendee lifecycle honest by reserving the code, the online amount, and the balance due at the event without collecting funds yet."
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
      event.prepayPercentage > 0 ? "Registration hold then payment" : "Registration hold then confirmation",
    ticketCategories
  };
}

function decorateRegistrationEvent(entry) {
  const { organizer, event } = entry;
  const occurrences = event.occurrences.map((occurrence) =>
    buildDecoratedOccurrence(organizer, event, occurrence)
  );
  const openOccurrences = occurrences.filter((occurrence) => !occurrence.capacity.soldOut);
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
          ? "Capacity-aware hold, confirmation, then online amount"
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
      source: "passreserve-phase-08",
      level: "info",
      timestamp: new Date().toISOString(),
      eventType,
      organizerSlug: payload.slug,
      eventSlug: payload.eventSlug,
      occurrenceId: payload.occurrenceId,
      quantity: payload.quantity,
      holdId: payload.holdId ?? null,
      registrationCode: payload.registrationCode ?? null,
      attendeeEmailHash: payload.attendeeEmail
        ? hashSensitive(payload.attendeeEmail)
        : null,
      message: payload.message
    })
  );
}

export const registrationFlowPhase = {
  label: "Phase 08",
  title: "Registration flow, capacity engine, and attendee lifecycle",
  summary:
    "Passreserve.com now turns published occurrences into a capacity-aware attendee flow with hold expiry, confirmation review, lifecycle states, and generated registration codes."
};

export const registrationLifecycleSignals = [
  {
    title: "Occurrence-first capacity",
    detail:
      "Each published occurrence now owns the available-seat calculation, including confirmed attendees, pending holds, and pending-payment pressure."
  },
  {
    title: "Signed pending holds",
    detail:
      "Submitting the registration flow creates a 30-minute hold token before the attendee confirms the details."
  },
  {
    title: "Lifecycle honesty",
    detail:
      "Occurrences that require an online amount move into a payment-pending state now, while Stripe itself arrives in Phase 09."
  }
];

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
      message: "This occurrence could not be matched to a live registration route.",
      fieldErrors: {
        occurrenceId: "Choose a live occurrence and try again."
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
        "Registration holds last 30 minutes so capacity can be released cleanly. Start a fresh hold from the event route.",
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
            ? "Confirming here moves the registration into a payment-pending state until Stripe arrives in Phase 09."
            : "Confirming here finalizes the registration and keeps the full balance due at the event."
      }
    ]
  };
}

export function confirmRegistrationHold(input) {
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
  const statusCopy = getRegistrationStatusCopy(holdView.payment);
  const confirmationPayload = {
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
    registrationCode,
    registrationStatus: statusCopy.registrationStatus,
    paymentStatus: statusCopy.paymentStatus
  };
  const confirmationToken = encryptPayload(confirmationPayload);

  logRegistrationEvent("REGISTRATION_CONFIRMED", {
    ...confirmationPayload,
    registrationCode,
    message: `${statusCopy.registrationStatus} for ${holdView.event.title}.`
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
        "Return to the event route and start a fresh registration if you still need a live attendee code."
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
        "The confirmation token points to an occurrence that is no longer published in this sample dataset."
    };
  }

  const statusCopy = getRegistrationStatusCopy(payload.payment);

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
    headline: statusCopy.headline,
    nextStep: statusCopy.nextStep,
    createdAtLabel: formatDateTime(payload.createdAt),
    confirmedAtLabel: formatDateTime(payload.confirmedAt),
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
        title: "Lifecycle state",
        detail:
          payload.payment.onlineAmount > 0
            ? `The registration now waits on ${payload.payment.onlineAmountLabel} online before moving beyond ${payload.registrationStatus}.`
            : `The registration is live with ${payload.payment.dueAtEventLabel} due at the event.`
      }
    ]
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
