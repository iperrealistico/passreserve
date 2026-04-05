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

export const phaseDiscovery = {
  label: "Phase 05",
  title: "Public information architecture and discovery surfaces",
  summary:
    "Passreserve.com now frames the public shell around event discovery, organizer credibility, and calm organizer onboarding paths."
};

export const publicNavigation = [
  {
    label: "Discover",
    href: "#discover"
  },
  {
    label: "Signals",
    href: "#signals"
  },
  {
    label: "Journeys",
    href: "#journeys"
  },
  {
    label: "Search logic",
    href: "#search-rules"
  },
  {
    label: "Organizer launch",
    href: "#organizer-launch"
  }
];

export const discoveryModes = [
  {
    id: "all",
    label: "All signals"
  },
  {
    id: "organizer",
    label: "Organizers"
  },
  {
    id: "city",
    label: "Cities"
  },
  {
    id: "keyword",
    label: "Keywords"
  }
];

export const discoveryQuickSearches = [
  {
    label: "Trail House",
    query: "trail house",
    mode: "organizer"
  },
  {
    label: "Bologna",
    query: "bologna",
    mode: "city"
  },
  {
    label: "Family festival",
    query: "family festival",
    mode: "keyword"
  },
  {
    label: "Dolomites sunrise",
    query: "dolomites sunrise",
    mode: "keyword"
  }
];

export const discoveryEntries = [
  {
    id: "alpine-trail-lab",
    featuredRank: 1,
    slug: "alpine-trail-lab",
    eventSlug: "sunrise-ridge-session",
    organizer: "Alpine Trail Lab",
    city: "Bolzano",
    region: "Dolomites",
    event: "Sunrise Ridge Session",
    nextOccurrence: "18 Apr 2026 · 06:15",
    priceFrom: "from 65 EUR",
    deposit: "30% online",
    capacity: "7 spots left",
    description:
      "A small-group alpine skills morning with coffee at first light, route coaching, and a clear deposit split before arrival.",
    audience:
      "Best for attendees searching sunrise, alpine, skills clinic, or guided trail queries.",
    organizerNote:
      "Organizer page leads with the next three dated occurrences and a route-to-venue map.",
    keywords: [
      "dolomites",
      "sunrise",
      "trail",
      "skills",
      "guided"
    ]
  },
  {
    id: "lago-studio-pass",
    featuredRank: 2,
    slug: "lago-studio-pass",
    eventSlug: "lakeside-flow-weekender",
    organizer: "Lago Studio Pass",
    city: "Como",
    region: "Lake Como",
    event: "Lakeside Flow Weekender",
    nextOccurrence: "25 Apr 2026 · 09:30",
    priceFrom: "from 120 EUR",
    deposit: "50% online",
    capacity: "12 places open",
    description:
      "A two-day lakefront movement and paddle experience with accommodation notes, weekend schedule framing, and venue-first logistics.",
    audience:
      "Useful for attendees typing lake, weekender, paddle, wellness, or Como.",
    organizerNote:
      "Organizer page groups nearby dates into a calmer agenda view instead of a long scrolling catalog.",
    keywords: [
      "lake",
      "weekender",
      "wellness",
      "paddle",
      "como"
    ]
  },
  {
    id: "officina-gravel-house",
    featuredRank: 3,
    slug: "officina-gravel-house",
    eventSlug: "gravel-social-camp",
    organizer: "Officina Gravel House",
    city: "Bologna",
    region: "Emilia-Romagna",
    event: "Gravel Social Camp",
    nextOccurrence: "09 May 2026 · 08:00",
    priceFrom: "from 95 EUR",
    deposit: "0% online",
    capacity: "20 passes available",
    description:
      "A low-friction social camp built around route groups, coffee stops, and pay-later check-in for community-heavy weekends.",
    audience:
      "Strong match for gravel, social ride, Bologna, crew weekend, and beginner-friendly queries.",
    organizerNote:
      "Organizer hub keeps featured event types above the fold and lets city searches land directly on them.",
    keywords: [
      "gravel",
      "social",
      "camp",
      "bologna",
      "community"
    ]
  },
  {
    id: "atelier-del-gusto",
    featuredRank: 4,
    slug: "atelier-del-gusto",
    eventSlug: "fire-and-pasta-night",
    organizer: "Atelier del Gusto",
    city: "Parma",
    region: "Food Valley",
    event: "Fire and Pasta Night",
    nextOccurrence: "14 May 2026 · 19:00",
    priceFrom: "from 78 EUR",
    deposit: "100% online",
    capacity: "4 seats left",
    description:
      "An evening cooking format where the event page must explain what is included, what to bring, and how full prepayment secures scarce seats.",
    audience:
      "Designed for food, workshop, pasta, Parma, and date-night discovery terms.",
    organizerNote:
      "Event detail page takes over once the attendee wants the full menu, inclusions, and policy language.",
    keywords: [
      "food",
      "workshop",
      "pasta",
      "parma",
      "date night"
    ]
  },
  {
    id: "comune-aperto",
    featuredRank: 5,
    slug: "comune-aperto",
    eventSlug: "family-lantern-walk",
    organizer: "Comune Aperto",
    city: "Verona",
    region: "Veneto",
    event: "Family Lantern Walk",
    nextOccurrence: "30 May 2026 · 18:45",
    priceFrom: "from 18 EUR",
    deposit: "0% online",
    capacity: "45 family passes",
    description:
      "A family-first city event that benefits from keyword discovery, visible accessibility notes, and a straightforward quantity-based registration CTA.",
    audience:
      "Built for family, lantern, kids, city walk, and community event searches.",
    organizerNote:
      "City results surface family-friendly signals before the attendee drills into occurrence details.",
    keywords: [
      "family",
      "lantern",
      "kids",
      "walk",
      "community"
    ]
  },
  {
    id: "studio-movimento-sud",
    featuredRank: 6,
    slug: "studio-movimento-sud",
    eventSlug: "sunset-breathwork-terrace",
    organizer: "Studio Movimento Sud",
    city: "Lecce",
    region: "Salento",
    event: "Sunset Breathwork Terrace",
    nextOccurrence: "12 Jun 2026 · 20:15",
    priceFrom: "from 42 EUR",
    deposit: "30% online",
    capacity: "16 spots available",
    description:
      "A warm-weather evening format where keyword discovery and organizer credibility matter more than classic category navigation.",
    audience:
      "A clear match for sunset, breathwork, Lecce, terrace, and wellness browsing.",
    organizerNote:
      "Organizer page emphasizes seasonal series and recurring sunset dates rather than generic inventory listings.",
    keywords: [
      "sunset",
      "breathwork",
      "lecce",
      "terrace",
      "wellness"
    ]
  }
];

export const discoveryMetrics = [
  {
    label: "Phase",
    value: "06"
  },
  {
    label: "Organizers",
    value: String(discoveryEntries.length)
  },
  {
    label: "Cities",
    value: String(new Set(discoveryEntries.map((entry) => entry.city)).size)
  },
  {
    label: "Payment range",
    value: "0-100%"
  }
];

export const discoverySignals = [
  {
    title: "Organizer pages act like destinations",
    detail:
      "Exact organizer matches should land on a credible organizer hub first, then expose that organizer's featured event types and next occurrences."
  },
  {
    title: "City discovery stays future-facing",
    detail:
      "City and region browsing should show only published organizers with future dated occurrences, so the landing page feels current instead of archival."
  },
  {
    title: "Keywords explain intent fast",
    detail:
      "Passreserve.com should reward theme words such as family, sunrise, workshop, sunset, or gravel without forcing the user into a rigid category tree."
  }
];

export const discoveryJourneys = [
  {
    title: "Start from a city",
    description:
      "A place-led attendee can type a city, compare nearby organizers, then jump into the next live dates without reading the whole platform first.",
    steps: [
      "Enter a city or region such as Bologna, Como, or Dolomites.",
      "See published organizers with future occurrences ranked above generic content.",
      "Open the best-fit organizer hub, then continue to a specific event page."
    ]
  },
  {
    title: "Follow an organizer",
    description:
      "An attendee who already knows the host should reach that organizer's public page immediately and browse upcoming event types from there.",
    steps: [
      "Use an organizer name as the primary query signal.",
      "Expose the organizer hero, next three dates, and featured event cards first.",
      "Let the event detail page handle full logistics, policies, and payment explanation."
    ]
  },
  {
    title: "Request an organizer launch",
    description:
      "A new organizer should understand the onboarding path quickly: define identity, shape a first event catalog, and choose how online collection works.",
    steps: [
      "Share organizer name, city, and launch timing from the root experience.",
      "Choose whether events collect 0%, a deposit, or 100% online by default.",
      "Prepare a launch brief before the deeper organizer-admin tooling arrives."
    ]
  }
];

export const publicNavigationBlueprint = [
  {
    title: "Discover",
    detail:
      "Root landing page handles first contact for attendees searching by organizer, city, or event keyword."
  },
  {
    title: "Organizer pages",
    detail:
      "Each organizer becomes a public event hub with identity, featured events, upcoming dates, venue signals, and policy summaries."
  },
  {
    title: "Event pages",
    detail:
      "Every event type needs its own presentation page with photos, description, pricing, and upcoming occurrences."
  },
  {
    title: "Organizer launch",
    detail:
      "A root-level organizer join path captures intent early and hands later phases a cleaner onboarding story."
  }
];

export const searchPrinciples = [
  {
    title: "Exact organizer matches rank first",
    detail:
      "If the attendee already knows the organizer, the public hub should outrank city and theme matches so the next click feels decisive."
  },
  {
    title: "City queries fan out to nearby organizers",
    detail:
      "City and region searches should group future published organizers first, then expose the nearest dated occurrences within those organizers."
  },
  {
    title: "Keyword queries use event and audience text",
    detail:
      "Discovery should inspect event names, short descriptions, and keyword tags together so themed queries feel intentionally curated."
  },
  {
    title: "Future published occurrences only",
    detail:
      "Expired, hidden, or unpublished occurrences should never drive public search ranking, even when historical content still exists internally."
  },
  {
    title: "No dead-end empty states",
    detail:
      "When no exact match exists, the root page should propose nearby cities, clearer organizer names, or event themes rather than stopping at a blank result."
  }
];

export const organizerLaunchSteps = [
  {
    title: "Position the organizer",
    detail:
      "Capture the public organizer name, city, and event style so the first Passreserve.com page already feels location-aware and credible."
  },
  {
    title: "Shape the first event lineup",
    detail:
      "Define featured event types, earliest occurrences, and venue defaults before the organizer starts operating from the admin side."
  },
  {
    title: "Choose collection rules",
    detail:
      "Set whether the default payment expectation is 0% online, a deposit, or full online collection so attendee messaging stays clear."
  }
];

export const organizerLaunchWindows = [
  {
    id: "next-30",
    label: "Within 30 days"
  },
  {
    id: "next-60",
    label: "Within 60 days"
  },
  {
    id: "seasonal",
    label: "For a seasonal launch"
  }
];

export const organizerPaymentModels = [
  {
    id: "none",
    label: "0% online"
  },
  {
    id: "deposit",
    label: "Deposit online"
  },
  {
    id: "full",
    label: "100% online"
  }
];

function normalizeDiscoveryText(value) {
  return value.toLowerCase().trim();
}

function buildDiscoveryFieldMap(entry) {
  return {
    organizer: [entry.organizer, entry.slug],
    city: [entry.city, entry.region],
    keyword: [entry.event, entry.description, entry.audience, ...entry.keywords]
  };
}

function scoreDiscoveryEntry(entry, tokens, mode) {
  const fields = buildDiscoveryFieldMap(entry);
  let score = 0;

  for (const token of tokens) {
    if ((mode === "all" || mode === "organizer") &&
      fields.organizer.some((field) => normalizeDiscoveryText(field).includes(token))) {
      score += 8;
    }

    if ((mode === "all" || mode === "city") &&
      fields.city.some((field) => normalizeDiscoveryText(field).includes(token))) {
      score += 6;
    }

    if ((mode === "all" || mode === "keyword") &&
      fields.keyword.some((field) => normalizeDiscoveryText(field).includes(token))) {
      score += 4;
    }
  }

  return score;
}

export function getDiscoveryResults(query = "", mode = "all") {
  const normalizedQuery = normalizeDiscoveryText(query);

  if (!normalizedQuery) {
    return [...discoveryEntries].sort(
      (left, right) => left.featuredRank - right.featuredRank
    );
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return discoveryEntries
    .map((entry) => ({
      ...entry,
      score: scoreDiscoveryEntry(entry, tokens, mode)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.featuredRank - right.featuredRank;
    });
}
