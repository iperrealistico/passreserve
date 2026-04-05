import { getOrganizerAdminBySlug } from "./passreserve-admin";
import { getStripeEnvironmentState } from "./passreserve-payments";
import { getOrganizerOperationsBySlug } from "./passreserve-operations";
import { publicOrganizers } from "./passreserve-public";

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

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

function sumValues(entries, selector) {
  return entries.reduce((sum, entry) => sum + selector(entry), 0);
}

const stripeEnvironment = getStripeEnvironmentState();

export const platformAdminPhase = {
  label: "Phase 11",
  title: "Super-admin adaptation, CMS, emails, and platform operations",
  summary:
    "Passreserve.com now adds the missing platform-admin layer: organizer management, global settings, about-page storytelling, email scenarios, signup triage, logs, and platform health."
};

export const platformAdminGuidance = [
  {
    title: "Organizer management replaces tenant support",
    detail:
      "Platform admins now work in organizer, event, registration, and payment terms instead of tenant, booking, and inventory language."
  },
  {
    title: "CMS stays structured",
    detail:
      "The public story remains code-owned in layout but DB-like in spirit, with typed content blocks for the about page, metadata, and reusable guidance."
  },
  {
    title: "Email and ops stay practical",
    detail:
      "Signup triage, template scenarios, delivery visibility, and deployment-health context all live together so a small platform team can operate calmly."
  }
];

export const platformAdminNavigation = [
  {
    label: "Overview",
    href: "/admin"
  },
  {
    label: "Organizers",
    href: "/admin/organizers"
  },
  {
    label: "Settings",
    href: "/admin/settings"
  },
  {
    label: "About CMS",
    href: "/admin/about"
  },
  {
    label: "Emails",
    href: "/admin/emails"
  },
  {
    label: "Logs",
    href: "/admin/logs"
  },
  {
    label: "Health",
    href: "/admin/health"
  }
];

export const signupRequestCatalog = [
  {
    id: "signup-bosco-civic-lab",
    contactName: "Sara Benetti",
    organizerName: "Bosco Civic Lab",
    city: "Trento",
    submittedAt: "2026-04-05T08:25:00+02:00",
    launchWindow: "2 to 4 weeks",
    paymentModel: "30% online deposit",
    eventFocus: "Urban nature walks and civic workshops",
    note:
      "Wants the organizer page to lead with accessibility guidance, family tickets, and venue maps for monthly community dates.",
    statusLabel: "Needs reply",
    statusTone: "capacity-watch"
  },
  {
    id: "signup-casa-cultura-mare",
    contactName: "Lorenzo Pinna",
    organizerName: "Casa Cultura Mare",
    city: "Cagliari",
    submittedAt: "2026-04-04T17:10:00+02:00",
    launchWindow: "This month",
    paymentModel: "0% online, venue collection",
    eventFocus: "Seasonal talks, tastings, and rooftop evenings",
    note:
      "Needs help translating a mixed free-plus-paid calendar into one organizer page without making the public site feel like a generic ticket catalog.",
    statusLabel: "Queued for onboarding",
    statusTone: "unlisted"
  },
  {
    id: "signup-atelier-notturno",
    contactName: "Viola Ferri",
    organizerName: "Atelier Notturno",
    city: "Turin",
    submittedAt: "2026-04-03T11:40:00+02:00",
    launchWindow: "6+ weeks",
    paymentModel: "100% online prepay",
    eventFocus: "Small-seat dinner workshops and chef collaborations",
    note:
      "Asked for premium full-prepay templates, sold-out language, and a clean way to separate members-only dates from public dates.",
    statusLabel: "Replied",
    statusTone: "public"
  }
];

export const emailTemplateCatalog = [
  {
    id: "organizer_request_acknowledgement",
    audience: "Organizer lead",
    category: "Organizer pipeline",
    subject: "We received your Passreserve organizer request",
    trigger: "New organizer join request submitted from the public site",
    preview:
      "Confirms the launch request, restates the organizer's event focus, and sets expectations for the next platform reply.",
    placeholders: [
      "{{organizer_name}}",
      "{{contact_name}}",
      "{{launch_window}}",
      "{{payment_model}}"
    ]
  },
  {
    id: "organizer_request_alert",
    audience: "Platform admin",
    category: "Organizer pipeline",
    subject: "New organizer request for Passreserve.com",
    trigger: "Join request needs platform triage",
    preview:
      "Highlights organizer name, city, intended launch window, and the first support note so ops can reply quickly.",
    placeholders: [
      "{{organizer_name}}",
      "{{city}}",
      "{{event_focus}}",
      "{{platform_reply_email}}"
    ]
  },
  {
    id: "attendee_pending_confirmation",
    audience: "Attendee",
    category: "Registration lifecycle",
    subject: "Confirm your Passreserve registration",
    trigger: "A registration hold is created and still needs attendee confirmation",
    preview:
      "Names the event and occurrence first, then explains the confirmation step and any online-versus-venue payment split.",
    placeholders: [
      "{{event_name}}",
      "{{occurrence_label}}",
      "{{confirmation_url}}",
      "{{online_amount}}",
      "{{due_at_event}}"
    ]
  },
  {
    id: "attendee_registration_confirmed",
    audience: "Attendee",
    category: "Registration lifecycle",
    subject: "Your Passreserve registration is confirmed",
    trigger: "A registration moves into a confirmed state",
    preview:
      "Keeps the registration code, event logistics, and next arrival guidance in the first screenful.",
    placeholders: [
      "{{registration_code}}",
      "{{event_name}}",
      "{{venue_name}}",
      "{{due_at_event}}"
    ]
  },
  {
    id: "attendee_payment_received",
    audience: "Attendee",
    category: "Payments",
    subject: "Payment received for your Passreserve registration",
    trigger: "Stripe or platform reconciliation confirms the online amount",
    preview:
      "Separates paid online from any amount still due at the event and repeats the occurrence details clearly.",
    placeholders: [
      "{{registration_code}}",
      "{{paid_online}}",
      "{{due_at_event}}",
      "{{event_name}}"
    ]
  },
  {
    id: "organizer_new_registration",
    audience: "Organizer",
    category: "Organizer operations",
    subject: "New registration for {{event_name}}",
    trigger: "A registration is confirmed or payment-cleared",
    preview:
      "Gives organizers the attendee name, quantity, occurrence label, and the current payment state without rental-era wording.",
    placeholders: [
      "{{organizer_name}}",
      "{{event_name}}",
      "{{attendee_name}}",
      "{{payment_state}}"
    ]
  },
  {
    id: "organizer_payment_received",
    audience: "Organizer",
    category: "Organizer operations",
    subject: "Payment received for {{event_name}}",
    trigger: "Online collection completes successfully",
    preview:
      "Highlights the online amount, remaining venue balance if any, and the registration code for reconciliation.",
    placeholders: [
      "{{registration_code}}",
      "{{paid_online}}",
      "{{due_at_event}}",
      "{{occurrence_label}}"
    ]
  },
  {
    id: "organizer_occurrence_cancelled",
    audience: "Organizer and attendee",
    category: "Operations exceptions",
    subject: "Occurrence cancelled: {{event_name}}",
    trigger: "An organizer or platform operator cancels a published occurrence",
    preview:
      "Explains the cancelled date, the organizer follow-up path, and the payment outcome or replacement-date guidance.",
    placeholders: [
      "{{event_name}}",
      "{{occurrence_label}}",
      "{{refund_state}}",
      "{{support_reply_email}}"
    ]
  }
];

export const emailDeliverySummary = [
  {
    label: "Templates",
    value: String(emailTemplateCatalog.length)
  },
  {
    label: "Inbox open",
    value: String(signupRequestCatalog.filter((item) => item.statusTone !== "public").length)
  },
  {
    label: "Stripe mode",
    value: stripeEnvironment.mode === "live" ? "Live" : "Preview"
  },
  {
    label: "Webhook state",
    value: stripeEnvironment.webhookEnabled ? "Ready" : "Needs env"
  }
];

export const platformLogCatalog = [
  {
    id: "log-01",
    occurredAt: "2026-04-05T22:50:00+02:00",
    levelLabel: "Info",
    levelTone: "public",
    eventType: "VERCEL_DEPLOYMENT_READY",
    actor: "Platform delivery",
    entity: "passreserve.vercel.app",
    message:
      "Production alias served the latest organizer payments surface after the Phase 10 push.",
    detail:
      "Deployment verification currently falls back to public-alias checks when Vercel MCP auth is unavailable in-session."
  },
  {
    id: "log-02",
    occurredAt: "2026-04-05T22:47:00+02:00",
    levelLabel: "Warning",
    levelTone: "capacity-watch",
    eventType: "PAYMENT_ENV_PREVIEW_MODE",
    actor: "Payments",
    entity: "stripe",
    message:
      "Stripe Checkout remains in preview mode locally because live secrets are not configured in this environment.",
    detail:
      "The platform-admin health view should keep that distinction visible so Phase 09 style flows are not misreported as live-provider verified."
  },
  {
    id: "log-03",
    occurredAt: "2026-04-05T21:18:00+02:00",
    levelLabel: "Info",
    levelTone: "public",
    eventType: "REGISTRATION_PAYMENT_CONFIRMED",
    actor: "Attendee flow",
    entity: "registration",
    message:
      "A payment-required registration completed the success-return path and surfaced the paid-online versus due-at-event split.",
    detail:
      "This is the model the organizer and platform email scenarios now need to explain consistently."
  },
  {
    id: "log-04",
    occurredAt: "2026-04-05T19:29:00+02:00",
    levelLabel: "Warning",
    levelTone: "capacity-watch",
    eventType: "DEV_TOOLING_FALLBACK",
    actor: "Build tooling",
    entity: "next-dev",
    message:
      "Webpack remains the standard local dev path after Turbopack hit a JSON.parse failure on static organizer-admin routes.",
    detail:
      "Platform operators need this surfaced because local verification instructions depend on `npm run dev --webpack` remaining the stable path."
  }
];

function buildPlatformOrganizer(organizer, index) {
  const admin = getOrganizerAdminBySlug(organizer.slug);
  const operations = getOrganizerOperationsBySlug(organizer.slug);

  const healthTone =
    admin.metrics.conflictCount > 0
      ? "capacity-watch"
      : operations.summary.pendingPayments > 0
        ? "unlisted"
        : "public";
  const healthLabel =
    admin.metrics.conflictCount > 0
      ? "Schedule conflict watch"
      : operations.summary.pendingPayments > 0
        ? "Payment follow-up open"
        : "Healthy";

  return {
    slug: organizer.slug,
    name: organizer.name,
    city: organizer.city,
    region: organizer.region,
    tagline: organizer.tagline,
    timeZone: operations.timeZone,
    publicHref: organizer.organizerHref,
    detailHref: `/admin/organizers/${organizer.slug}`,
    dashboardHref: operations.dashboardHref,
    calendarHref: operations.calendarHref,
    registrationsHref: operations.registrationsHref,
    paymentsHref: operations.paymentsHref,
    eventsHref: admin.eventsHref,
    occurrencesHref: admin.occurrencesHref,
    supportEmail: organizer.contact.email,
    supportPhone: organizer.contact.phone,
    launchStatusLabel: index < 4 ? "Live organizer" : "Recent launch",
    launchStatusTone: index < 4 ? "public" : "unlisted",
    joinedAtLabel: formatDate(`2026-03-${String(index + 8).padStart(2, "0")}T09:00:00+01:00`),
    healthTone,
    healthLabel,
    featuredEventTitle: organizer.featuredEvent.title,
    collectionLabel: organizer.featuredEvent.collectionLabel,
    metrics: admin.metrics,
    summary: operations.summary,
    eventsPreview: admin.events.slice(0, 3),
    recentRegistrations: operations.recentRegistrations.slice(0, 3),
    hotOccurrences: operations.hotOccurrences.slice(0, 3),
    providerSummary: operations.providerSummary,
    timeZoneAudit: operations.timeZoneAudit,
    supportActions: [
      {
        label: "Open public organizer page",
        href: organizer.organizerHref,
        detail: "Review the public organizer hub, live event pages, and attendee-facing policy copy."
      },
      {
        label: "Open organizer dashboard",
        href: operations.dashboardHref,
        detail: "See registration pressure, payment follow-up, and attendee operations in organizer-local terms."
      },
      {
        label: "Open event catalog",
        href: admin.eventsHref,
        detail: "Adjust the organizer's event mix, default pricing, visibility, and prepayment framing."
      },
      {
        label: "Open payments",
        href: operations.paymentsHref,
        detail: "Review online collection, venue balances, and reconciliation notes for this organizer."
      }
    ]
  };
}

export const platformOrganizers = publicOrganizers.map(buildPlatformOrganizer);

export function getPlatformOrganizerSlugs() {
  return platformOrganizers.map((organizer) => organizer.slug);
}

export function getPlatformOrganizerBySlug(slug) {
  return platformOrganizers.find((organizer) => organizer.slug === slug) ?? null;
}

export const aboutPageStory = {
  hero: {
    eyebrow: "About Passreserve.com",
    title: "A calmer event platform for organizers who need operations to stay human-scale.",
    summary:
      "Passreserve.com takes the strongest parts of the old MTB Reserve architecture and reorients them around organizers, event pages, registration codes, deposits, and practical platform operations.",
    secondary:
      "The public story is no longer about bike inventory or storefront rentals. It is about finding the right organizer, understanding the occurrence, and moving from confirmation to payment with clear expectations."
  },
  metrics: [
    {
      label: "Organizer model",
      value: `${platformOrganizers.length} live organizers`
    },
    {
      label: "Payment logic",
      value: "0-100% online"
    },
    {
      label: "Route structure",
      value: "Public, organizer admin, platform admin"
    },
    {
      label: "Ops style",
      value: "Server-owned, practical, auditable"
    }
  ],
  sections: [
    {
      id: "story",
      title: "Passreserve.com is built for clear event stories, not generic checkout funnels.",
      detail:
        "Every organizer can publish a destination-like public page, every event type can carry its own long-form explanation, and every occurrence can own its own capacity and payment rules.",
      bullets: [
        "Organizer hubs lead with identity, venue guidance, and upcoming occurrences.",
        "Event pages explain the experience, who it is for, and what is included.",
        "Occurrence-level pricing and prepayment keep the public flow honest."
      ]
    },
    {
      id: "attendee",
      title: "Attendees stay in a low-friction registration flow.",
      detail:
        "Passreserve.com keeps the calm, form-light spirit of the original system while replacing booking language with registration, confirmation, and event-day clarity.",
      bullets: [
        "Registration starts with a specific occurrence and capacity-aware quantity.",
        "Confirmation happens before payment so the server stays in control of the state.",
        "Emails explain paid online versus due at event without vague commerce jargon."
      ]
    },
    {
      id: "organizer",
      title: "Organizers keep one practical admin surface.",
      detail:
        "The organizer side remains intentionally operations-first: dashboards, calendar pressure, registrations, payments, event catalog, and occurrences sit inside the same slug-based admin shell.",
      bullets: [
        "Registrations, no-shows, and venue balances are visible without bouncing between tools.",
        "Event defaults live in the catalog while dated overrides live on occurrences.",
        "Organizer-local timezone handling stays explicit in daily operations."
      ]
    },
    {
      id: "platform",
      title: "Platform operators can finally manage the whole product coherently.",
      detail:
        "Phase 11 brings the missing super-admin story back into the active Passreserve.com app: organizer support, CMS, email scenarios, logs, and health checks all speak the new event vocabulary.",
      bullets: [
        "Organizer onboarding now reads like platform enablement instead of tenant provisioning.",
        "The about story and SEO settings match the public Passreserve.com narrative.",
        "Ops pages keep Vercel deployment and Stripe configuration context close at hand."
      ]
    }
  ],
  faq: [
    {
      question: "Does Passreserve.com replace the lightweight MTB Reserve feel?",
      answer:
        "No. The point of the transformation is to keep the simple monolith, slug-based organizer routing, and practical admin rhythms while changing the domain from rentals to events."
    },
    {
      question: "Why keep confirmation before payment?",
      answer:
        "The extra confirmation step keeps the server in charge of the registration state, makes payment math explicit, and avoids jumping attendees straight into Stripe without context."
    },
    {
      question: "Can organizers collect only deposits?",
      answer:
        "Yes. Occurrences can require 0%, a deposit, or full online payment, and Passreserve.com keeps the paid-online and due-at-event amounts separate in both UI and emails."
    }
  ],
  cta: {
    title: "Explore the live organizer routes or open the platform admin layer.",
    detail:
      "The public story, organizer operations, and platform-admin surfaces now work together inside the same sample-data Passreserve.com workspace."
  }
};

export const aboutCmsBlocks = [
  {
    title: "Hero",
    statusLabel: "Published",
    statusTone: "public",
    summary:
      "Sets the public Passreserve.com narrative around event clarity, deposits, and operator-friendly workflows."
  },
  {
    title: "Product story",
    statusLabel: "Live",
    statusTone: "public",
    summary:
      "Explains organizer hubs, event detail pages, attendee confirmation, and the shift away from rental-era language."
  },
  {
    title: "Organizer operations section",
    statusLabel: "Needs future polish",
    statusTone: "unlisted",
    summary:
      "Already aligned to Phase 10 and Phase 11 wording, but still intentionally sample-data based until later persistence work lands."
  },
  {
    title: "FAQ and CTA",
    statusLabel: "Published",
    statusTone: "public",
    summary:
      "Keeps public wording calm and specific, with direct links back into live organizer hubs and the platform-admin login entry."
  }
];

export const siteSettingsSnapshot = {
  seo: {
    title: "Passreserve.com",
    description:
      "Simple event registration, deposits, organizer admin, and platform operations for recurring and seasonal experiences.",
    keywords: [
      "Passreserve.com",
      "event registration",
      "organizer admin",
      "event deposits",
      "platform operations"
    ]
  },
  operations: {
    platformEmail: "platform@passreserve.com",
    launchInbox: "launch@passreserve.com",
    adminNotifications: "ops@passreserve.com",
    supportResponseTarget: "Reply to organizer requests within one business day.",
    deploymentRule:
      "Every pushed phase must be followed by Vercel deployment verification before the handoff is considered complete."
  },
  vercel: {
    projectName: "passreserve",
    projectId: "prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn",
    teamId: "team_HkXanAKxflViaTU8bv2zg4Cf",
    productionAlias: "https://passreserve.vercel.app",
    baseUrl: stripeEnvironment.baseUrl
  },
  stripe: {
    modeLabel: stripeEnvironment.mode === "live" ? "Live Checkout" : "Preview Checkout",
    detail:
      stripeEnvironment.mode === "live"
        ? "Live Stripe secrets are available in this environment."
        : "Local verification still relies on preview mode because live Stripe secrets are not configured here.",
    requirements: stripeEnvironment.requirements
  }
};

export function getPlatformOverview() {
  const organizerCount = platformOrganizers.length;
  const eventCount = sumValues(platformOrganizers, (organizer) => organizer.metrics.eventCount);
  const occurrenceCount = sumValues(
    platformOrganizers,
    (organizer) => organizer.metrics.publishedOccurrences
  );
  const activeRegistrations = sumValues(
    platformOrganizers,
    (organizer) => organizer.summary.activeCount
  );
  const onlineCollected = sumValues(
    platformOrganizers,
    (organizer) => organizer.summary.onlineCollected
  );
  const dueAtEvent = sumValues(platformOrganizers, (organizer) => organizer.summary.dueAtEvent);
  const pendingPayments = sumValues(
    platformOrganizers,
    (organizer) => organizer.summary.pendingPayments
  );
  const openRequests = signupRequestCatalog.filter((request) => request.statusTone !== "public");

  return {
    supportEmail: siteSettingsSnapshot.operations.platformEmail,
    releaseLabel: "Platform admin",
    summary: {
      organizerCount,
      eventCount,
      occurrenceCount,
      activeRegistrations,
      openRequestsCount: openRequests.length,
      templateCount: emailTemplateCatalog.length,
      onlineCollectedLabel: formatCurrency(onlineCollected),
      dueAtEventLabel: formatCurrency(dueAtEvent),
      stripeModeLabel: siteSettingsSnapshot.stripe.modeLabel
    },
    attentionQueue: [
      {
        title: `${openRequests.length} organizer requests need platform follow-up`,
        detail:
          "The inbox now tracks organizer launch notes, payment-model intent, and event focus so the platform team can reply without legacy partner jargon.",
        href: "/admin/emails",
        cta: "Open inbox"
      },
      {
        title: `${pendingPayments} pending organizer payment actions remain visible`,
        detail:
          "Phase 10 queues already surface attendee payment pressure; Phase 11 makes that visible from the platform side too.",
        href: "/admin/organizers",
        cta: "Review organizers"
      },
      {
        title: siteSettingsSnapshot.stripe.detail,
        detail:
          "Health checks now keep Stripe env readiness beside Vercel deployment expectations so payment claims stay accurate.",
        href: "/admin/health",
        cta: "Open health"
      }
    ],
    releaseTracks: [
      {
        title: "Organizer management",
        detail:
          "Organizers now replace tenants across the platform-admin layer, with direct links into public hubs and organizer-admin routes."
      },
      {
        title: "CMS and storytelling",
        detail:
          "The about story, SEO settings, and brand framing now explain Passreserve.com as an event platform instead of a rental storefront."
      },
      {
        title: "Email and ops visibility",
        detail:
          "Template scenarios, signup triage, event logs, and health checks are grouped so the platform team can operate without guesswork."
      }
    ]
  };
}

export const platformHealth = {
  metrics: [
    {
      label: "Organizers",
      value: String(platformOrganizers.length)
    },
    {
      label: "Published events",
      value: String(sumValues(platformOrganizers, (organizer) => organizer.metrics.publishedEvents))
    },
    {
      label: "Upcoming occurrences",
      value: String(
        sumValues(platformOrganizers, (organizer) => organizer.metrics.publishedOccurrences)
      )
    },
    {
      label: "Active registrations",
      value: String(sumValues(platformOrganizers, (organizer) => organizer.summary.activeCount))
    }
  ],
  checks: [
    {
      title: "Brand and SEO references",
      statusLabel: "Healthy",
      statusTone: "public",
      detail:
        "The active app metadata and CMS story now use Passreserve.com language for organizers, events, registrations, and platform operations."
    },
    {
      title: "Stripe environment clarity",
      statusLabel: stripeEnvironment.mode === "live" ? "Live" : "Preview mode",
      statusTone: stripeEnvironment.mode === "live" ? "public" : "capacity-watch",
      detail: siteSettingsSnapshot.stripe.detail
    },
    {
      title: "Organizer route coverage",
      statusLabel: "Healthy",
      statusTone: "public",
      detail:
        "Every seeded organizer has a public hub plus dashboard, calendar, registrations, payments, event catalog, and occurrences routes."
    },
    {
      title: "Platform inbox and templates",
      statusLabel: "Live",
      statusTone: "public",
      detail:
        "Organizer join requests, registration emails, payment receipts, and organizer alerts are mapped to explicit Phase 11 scenarios."
    },
    {
      title: "Deployment verification rule",
      statusLabel: "Required",
      statusTone: "unlisted",
      detail: siteSettingsSnapshot.operations.deploymentRule
    }
  ],
  risks: [
    {
      title: "Sample-data platform layer",
      detail:
        "These routes are intentionally demo-backed, so organizer actions and CMS edits are illustrative rather than persisted mutations."
    },
    {
      title: "Local Stripe remains preview only",
      detail:
        "Checkout and webhook code paths exist, but local verification must still report preview mode until real secrets are configured."
    },
    {
      title: "Vercel must stay the final check",
      detail:
        "A successful local build does not replace production verification. Each completed phase still needs push-triggered Vercel confirmation."
    }
  ]
};
