const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatCurrencyFromCents(cents) {
  return currencyFormatter.format(cents / 100);
}

export const phaseFoundation = {
  label: "Phase 04",
  title: "Event domain and data model foundation",
  summary:
    "Passreserve.com now locks the event-platform vocabulary, entity boundaries, payment-state model, and transition rules in code so future phases build on a stable domain."
};

export const foundationHighlights = [
  {
    title: "Target model",
    detail:
      "Organizer, EventType, EventOccurrence, Registration, and PaymentRecord now define the core Passreserve.com event domain."
  },
  {
    title: "Bridge strategy",
    detail:
      "Legacy naming can remain internal-only where needed, but all new public-facing work stays organizer-first, attendee-first, and registration-first."
  },
  {
    title: "Payment clarity",
    detail:
      "Occurrences support zero-percent, deposit, or full online collection with explicit online and due-at-event amounts."
  }
];

export const domainEntities = [
  {
    name: "Organizer",
    bridge: "Bridges legacy Tenant",
    summary:
      "Public host account, organizer-admin identity, timezone owner, and branded event hub.",
    fields: [
      "slug and public name",
      "description and contact details",
      "timezone and venue defaults",
      "registration email identity",
      "organizer settings and token version"
    ]
  },
  {
    name: "EventType",
    bridge: "Replaces BikeType",
    summary:
      "Reusable event template with presentation copy, capacity defaults, pricing defaults, and deposit defaults.",
    fields: [
      "organizer relationship",
      "summary and long description",
      "venue and map defaults",
      "capacity and price defaults",
      "prepay percentage and visibility"
    ]
  },
  {
    name: "EventOccurrence",
    bridge: "Replaces slot-in-settings scheduling",
    summary:
      "First-class dated occurrence that owns the actual schedule, publication state, and event-day capacity truth.",
    fields: [
      "event type relationship",
      "start and end datetime",
      "status and publication flag",
      "capacity and price overrides",
      "sold-out and custom notes"
    ]
  },
  {
    name: "Registration",
    bridge: "Replaces Booking",
    summary:
      "Attendee-facing record that tracks confirmation, capacity holds, quantities, and registration lifecycle state.",
    fields: [
      "occurrence relationship",
      "registration code",
      "attendee contact details",
      "quantity and money totals",
      "confirmation token and expiry",
      "registration and payment status"
    ]
  },
  {
    name: "PaymentRecord",
    bridge: "Replaces ad hoc paidAmount truth",
    summary:
      "Payment ledger entry for Stripe references, online collection amounts, offline remainder, and reconciliation notes.",
    fields: [
      "registration relationship",
      "provider and currency",
      "online amount and due-at-event amount",
      "Stripe session and payment intent ids",
      "payment status and reconciliation metadata"
    ]
  }
];

export const transitionTracks = [
  {
    title: "Temporary bridge",
    summary:
      "Keep a minimal internal bridge to the legacy structure while the public product moves fully to Passreserve.com terms.",
    items: [
      "Tenant can remain the physical organizer store until the real event schema lands.",
      "Organizer preferences may stay in JSON settings, but schedules and capacity do not.",
      "Legacy booking and inventory fields remain reference-only once event replacements exist."
    ]
  },
  {
    title: "Immediate additions",
    summary:
      "These are the first durable event entities the active app should add when the backend layer is introduced.",
    items: [
      "EventType for reusable event presentation and defaults.",
      "EventOccurrence for dated, capacity-aware scheduled instances.",
      "Registration for attendee lifecycle and holds.",
      "PaymentRecord for Stripe truth and organizer reconciliation.",
      "TicketCategory as an optional extension once multiple admission types are needed."
    ]
  },
  {
    title: "Schema and migration path",
    summary:
      "Future Prisma work should migrate the model in layers rather than forcing events into the old slot and inventory abstractions.",
    items: [
      "Add first-class event tables before deleting bike-oriented reference structures.",
      "Move schedule and capacity logic into EventOccurrence instead of JSON slots.",
      "Translate public copy immediately even if physical table names remain transitional for a while.",
      "Remove legacy entities only after organizer, occurrence, registration, and payment flows are stable."
    ]
  }
];

export const registrationStatuses = [
  {
    code: "PENDING_CONFIRM",
    note:
      "A registration hold exists while the attendee reviews occurrence details and accepts the required terms."
  },
  {
    code: "PENDING_PAYMENT",
    note:
      "Confirmation is complete, but the online amount still needs to be collected before the registration is finalized."
  },
  {
    code: "CONFIRMED_UNPAID",
    note:
      "The attendee is confirmed and any required balance is expected at the event rather than online."
  },
  {
    code: "CONFIRMED_PARTIALLY_PAID",
    note:
      "A deposit was captured online and the organizer still expects a remaining balance at the venue."
  },
  {
    code: "CONFIRMED_PAID",
    note:
      "The attendee has cleared the full online amount and no remaining event-day balance exists."
  },
  {
    code: "ATTENDED",
    note:
      "Organizer operations recorded the attendee as checked in or successfully completed."
  },
  {
    code: "NO_SHOW",
    note:
      "The occurrence has passed without attendance and the registration should remain visible in operations history."
  },
  {
    code: "CANCELLED",
    note:
      "The registration is no longer active and its held capacity can be released back to the occurrence."
  }
];

export const paymentStatuses = [
  {
    code: "NONE",
    note:
      "No online collection is required because the attendee owes nothing online."
  },
  {
    code: "PENDING",
    note:
      "The checkout session or payment attempt exists, but funds are not yet confirmed."
  },
  {
    code: "PARTIALLY_PAID",
    note:
      "Only the deposit or online portion has been captured; a remainder is still due at the event."
  },
  {
    code: "PAID",
    note:
      "The online amount is fully settled and the organizer can treat the online payment as complete."
  },
  {
    code: "FAILED",
    note:
      "The payment attempt did not complete successfully and the registration needs follow-up or retry."
  },
  {
    code: "REFUNDED",
    note:
      "Collected online funds were returned or reversed and the record should stay auditable."
  }
];

export const publicationRules = [
  {
    title: "Occurrence-first capacity",
    detail:
      "Capacity is authoritative on each EventOccurrence, even when EventType provides helpful defaults."
  },
  {
    title: "Published future dates only",
    detail:
      "Public discovery should show only published organizers, visible event types, and future published occurrences."
  },
  {
    title: "Pending holds count",
    detail:
      "Pending registrations consume capacity until they expire, are cancelled, or move into a confirmed state."
  },
  {
    title: "Sold-out is occurrence specific",
    detail:
      "A single event type can be sold out on one date while other occurrences remain available."
  },
  {
    title: "Settings stay preference-only",
    detail:
      "JSON settings can hold organizer defaults and policy text, but not occurrence schedules or payment truth."
  }
];

export const compatibilityAreas = [
  {
    area: "Auth and sessions",
    detail:
      "Keep slug-scoped organizer admin access, iron-session patterns, and token-version invalidation as the account foundation."
  },
  {
    area: "Event logs and observability",
    detail:
      "Reuse audit logging and stdout JSON fan-out, but rename actor and entity vocabulary around organizers, occurrences, registrations, and payments."
  },
  {
    area: "Email and templates",
    detail:
      "Reuse the template-driven email system for registration confirmation, payment receipts, reminders, and organizer alerts."
  },
  {
    area: "Admin shells",
    detail:
      "Keep organizer-admin and super-admin layouts, navigation patterns, and operations-first flows while swapping in event-domain data."
  },
  {
    area: "Global settings and CMS",
    detail:
      "Preserve site settings, about-page storytelling, and platform operations tooling while rebranding them to the event product."
  }
];

export const antiCorruptionRules = [
  "Do not force events back into slot-style settings models; use dated EventOccurrence records instead.",
  "Do not let public Passreserve.com copy leak tenant, rider, booking, bike, or pickup wording back into the live app.",
  "Do not treat JSON settings as the source of truth for schedules, capacity history, or payment reconciliation.",
  "Do not remove legacy bridge structures until organizer, occurrence, registration, and payment flows are stable in the active workspace."
];

export const roadmap = [
  {
    step: "Phase 04",
    text:
      "Lock the event model, status language, publication rules, and migration boundaries in the active Passreserve.com app."
  },
  {
    step: "Phase 05",
    text:
      "Turn the public shell into discovery surfaces for organizers, cities, and event-first browsing."
  },
  {
    step: "Phase 06 to 08",
    text:
      "Build organizer pages, event detail presentation, occurrence-aware registration flows, and capacity enforcement."
  },
  {
    step: "Phase 09",
    text:
      "Add Stripe Checkout, deposit collection, and webhook-backed payment reconciliation once the event model is stable."
  }
];

export function calculatePaymentBreakdown({
  unitPrice,
  quantity = 1,
  prepayPercentage = 0
}) {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const safePrepayPercentage = Math.min(100, Math.max(0, prepayPercentage));
  const unitPriceCents = Math.round(unitPrice * 100);
  const subtotalCents = unitPriceCents * safeQuantity;
  const onlineAmountCents = Math.round(
    (subtotalCents * safePrepayPercentage) / 100
  );
  const dueAtEventCents = subtotalCents - onlineAmountCents;

  return {
    unitPrice,
    quantity: safeQuantity,
    prepayPercentage: safePrepayPercentage,
    subtotal: subtotalCents / 100,
    onlineAmount: onlineAmountCents / 100,
    dueAtEvent: dueAtEventCents / 100,
    subtotalLabel: formatCurrencyFromCents(subtotalCents),
    onlineAmountLabel: formatCurrencyFromCents(onlineAmountCents),
    dueAtEventLabel: formatCurrencyFromCents(dueAtEventCents)
  };
}

export const paymentExamples = [
  {
    label: "0 percent online",
    summary: "Community or pay-later events can confirm without forcing checkout.",
    ...calculatePaymentBreakdown({
      unitPrice: 75,
      quantity: 2,
      prepayPercentage: 0
    })
  },
  {
    label: "30 percent deposit",
    summary: "Attendees secure the spot online while the organizer still collects a venue balance.",
    ...calculatePaymentBreakdown({
      unitPrice: 75,
      quantity: 2,
      prepayPercentage: 30
    })
  },
  {
    label: "100 percent online",
    summary: "Premium or limited-capacity events can clear the entire amount before arrival.",
    ...calculatePaymentBreakdown({
      unitPrice: 75,
      quantity: 2,
      prepayPercentage: 100
    })
  }
];
