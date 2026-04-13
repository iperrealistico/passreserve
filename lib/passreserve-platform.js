import { getOrganizerAdminBySlug } from "./passreserve-admin";
import {
  getOrganizerRequestStorageState,
  listOrganizerRequests
} from "./passreserve-organizer-requests";
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
  label: "Team tools",
  title: "Hosts, content, and internal checks",
  summary:
    "Passreserve.com keeps hosts, page content, emails, logs, and internal checks together for approved staff."
};

export const platformAdminGuidance = [
  {
    title: "Hosts stay at the center",
    detail:
      "Every support action is framed around hosts, events, registrations, and payments so the team speaks the same language as the live product."
  },
  {
    title: "The about page stays visitor-ready",
    detail:
      "Shared about-page copy and metadata stay easy to review so public messaging remains clear and current."
  },
  {
    title: "Checks stay practical",
    detail:
      "Emails, recent activity, and internal checks stay close together so a small team can keep the site current."
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
    label: "About page",
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

export const emailTemplateCatalog = [
  {
    id: "organizer_request_acknowledgement",
    audience: "Organizer lead",
    category: "Host requests",
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
    audience: "Team",
    category: "Host requests",
    subject: "New organizer request for Passreserve.com",
    trigger: "Join request needs platform triage",
    preview:
      "Highlights organizer name, city, intended launch window, and the first support note so the team can reply quickly.",
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
    category: "Registration updates",
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
    category: "Registration updates",
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
    id: "attendee_registration_cancelled",
    audience: "Attendee",
    category: "Registration updates",
    subject: "Your Passreserve registration has been cancelled",
    trigger: "A single registration is cancelled by the host or platform team",
    preview:
      "Confirms the cancellation clearly and explains any payment or refund state in plain language.",
    placeholders: [
      "{{registration_code}}",
      "{{event_name}}",
      "{{occurrence_label}}",
      "{{refund_state}}",
      "{{support_reply_email}}"
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
    id: "attendee_occurrence_reminder",
    audience: "Attendee",
    category: "Reminders",
    subject: "Coming up soon: {{event_name}}",
    trigger: "A confirmed registration reaches the organizer reminder window",
    preview:
      "Reminds the guest about the date, time, venue, and anything still due at the event.",
    placeholders: [
      "{{attendee_name}}",
      "{{event_name}}",
      "{{occurrence_label}}",
      "{{occurrence_time}}",
      "{{venue_name}}",
      "{{registration_code}}",
      "{{due_at_event}}",
      "{{organizer_reminder_note}}",
      "{{support_reply_email}}"
    ]
  },
  {
    id: "attendee_occurrence_cancelled",
    audience: "Attendee",
    category: "Schedule changes",
    subject: "Date cancelled: {{event_name}}",
    trigger: "A published occurrence is cancelled",
    preview:
      "Explains that a specific event date has been cancelled and repeats the payment or refund state clearly.",
    placeholders: [
      "{{event_name}}",
      "{{occurrence_label}}",
      "{{refund_state}}",
      "{{support_reply_email}}"
    ]
  },
  {
    id: "organizer_new_registration",
    audience: "Organizer",
    category: "Host updates",
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
    category: "Host updates",
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
    category: "Schedule changes",
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

export async function getOrganizerRequestInbox() {
  const [requests, storage] = await Promise.all([
    listOrganizerRequests(),
    getOrganizerRequestStorageState()
  ]);
  const openRequests = requests.filter((request) => request.status === "PENDING");

  return {
    requests,
    storage,
    openRequestsCount: openRequests.length
  };
}

export async function getEmailDeliverySummary() {
  const inbox = await getOrganizerRequestInbox();

  return [
    {
      label: "Templates",
      value: String(emailTemplateCatalog.length)
    },
    {
      label: "Inbox open",
      value: String(inbox.openRequestsCount)
    },
    {
      label: "Request storage",
      value: inbox.storage.mode === "database" ? "Database" : inbox.storage.mode === "file" ? "Local file" : "Unavailable"
    },
    {
      label: "Webhook state",
      value: stripeEnvironment.webhookEnabled ? "Ready" : "Needs env"
    }
  ];
}

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
      "The live site is serving the latest host pages and registration changes.",
    detail:
      "After each update, check a few public pages to confirm dates, prices, and sign-up links still read clearly."
  },
  {
    id: "log-02",
    occurredAt: "2026-04-05T22:47:00+02:00",
    levelLabel: "Warning",
    levelTone: "capacity-watch",
    eventType: "PAYMENT_ENV_TEST_MODE",
    actor: "Payments",
    entity: "stripe",
    message:
      "Stripe Checkout is running in test mode locally because live secrets are not configured in this environment.",
    detail:
      "Keep all team communication clear that payments are test-only here until live keys are present."
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
      "A payment-required registration completed successfully and the guest now sees the paid-online and due-at-event split.",
    detail:
      "Use the same wording in follow-up emails and host support replies."
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
        label: "Open public host page",
        href: organizer.organizerHref,
        detail: "Review the public host page, live event pages, and attendee-facing policy copy."
      },
      {
        label: "Open organizer dashboard",
        href: operations.dashboardHref,
        detail: "See registrations, payment follow-up, and upcoming dates in the host view."
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
    title: "A calmer home for local events and the people who host them.",
    summary:
      "Passreserve.com helps people discover local events, understand what they are joining, and sign up without guesswork.",
    secondary:
      "Hosts get a clear public page plus a simple dashboard for dates, registrations, and payments."
  },
  metrics: [
    {
      label: "Hosts",
      value: `${platformOrganizers.length} active organizers`
    },
    {
      label: "Places",
      value: `${new Set(platformOrganizers.map((organizer) => organizer.city)).size} cities`
    },
    {
      label: "Online collection",
      value: "0% to full prepay"
    },
    {
      label: "Support style",
      value: "Clear, local, and practical"
    }
  ],
  sections: [
    {
      id: "hosts",
      title: "Local hosts stay recognizable from the first click.",
      detail:
        "Each organizer can publish a page that feels like a real destination, with venue guidance, upcoming dates, and featured experiences instead of a generic ticket wall.",
      bullets: [
        "Organizer pages lead with identity, venue guidance, and upcoming dates.",
        "Featured events make it easy to see what a host is known for.",
        "Public copy stays focused on what visitors need before they sign up."
      ]
    },
    {
      id: "events",
      title: "Event pages answer the questions visitors actually have.",
      detail:
        "Every event page is designed to explain the format, what is included, who it is for, and which dates are currently available.",
      bullets: [
        "Event descriptions stay specific instead of collapsing into generic ticket copy.",
        "Date cards make price, venue, and online collection clear before registration starts.",
        "Attendees can move from browsing into the right event without extra detours."
      ]
    },
    {
      id: "registration",
      title: "Registrations stay clear from selection to confirmation.",
      detail:
        "Passreserve.com keeps the signup flow short and direct so attendees can choose a date, confirm their details, and understand the payment split without uncertainty.",
      bullets: [
        "Registrations begin from a specific date, not an abstract request flow.",
        "Online payment and any balance due at the venue are shown separately.",
        "Confirmation and follow-up pages stay written for attendees, not for the build team."
      ]
    },
    {
      id: "host-flexibility",
      title: "Hosts keep control over timing, pricing, and collection style.",
      detail:
        "Passreserve.com helps hosts choose the payment model that fits each format, from pay-later community events to deposit-led experiences and full prepayment when needed.",
      bullets: [
        "Hosts can publish clear event pages without forcing every guest into full online checkout.",
        "Deposits and pay-at-event collection stay visible before anyone starts registration.",
        "Smaller teams can manage dates, registrations, payments, and follow-up without paying for a bloated setup."
      ]
    }
  ],
  faq: [
    {
      question: "Do attendees choose a specific date before they register?",
      answer:
        "Yes. Registrations begin from a dated event occurrence so pricing, capacity, and event-day expectations stay clear from the start."
    },
    {
      question: "Can organizers collect only a deposit?",
      answer:
        "Yes. Organizers can choose no online payment, a deposit, or full online collection depending on the event."
    },
    {
      question: "Can small teams manage events without extra tools?",
      answer:
        "That is the goal. The host dashboard keeps dates, registrations, payments, and event setup in one place so small teams can stay focused."
    }
  ],
  cta: {
    title: "Browse events or request host access.",
    detail:
      "Guests can stay focused on event details, while hosts can request access from the homepage when they are ready to launch."
  }
};

export const aboutCmsBlocks = [
  {
    title: "Hero",
    statusLabel: "Published",
    statusTone: "public",
    summary:
      "Sets the public Passreserve.com story around clear event details, transparent pricing, and confident sign-up."
  },
  {
    title: "Host and event story",
    statusLabel: "Live",
    statusTone: "public",
    summary:
      "Explains host pages, event details, attendee confirmation, and the practical flow from discovery to sign-up."
  },
  {
    title: "Host tools section",
    statusLabel: "Needs future polish",
    statusTone: "unlisted",
    summary:
      "Explains how hosts manage dates, registrations, and payments without overwhelming visitors."
  },
  {
    title: "FAQ and CTA",
    statusLabel: "Published",
    statusTone: "public",
    summary:
      "Keeps public wording calm and specific, with direct links back into live host pages and the team sign-in."
  }
];

export const siteSettingsSnapshot = {
  seo: {
    title: "Passreserve.com",
    description:
      "Find local events, compare dates and prices clearly, and sign up with confidence.",
    keywords: [
      "Passreserve.com",
      "local events",
      "event registration",
      "event hosts",
      "event dates",
      "event pricing"
    ]
  },
  operations: {
    platformEmail: "platform@passreserve.com",
    launchInbox: "launch@passreserve.com",
    adminNotifications: "ops@passreserve.com",
    supportResponseTarget: "Reply to organizer requests within one business day.",
    deploymentRule:
      "Every production change should be checked on the live deployment before it is marked complete."
  },
  vercel: {
    projectName: "passreserve",
    projectId: "prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn",
    teamId: "team_HkXanAKxflViaTU8bv2zg4Cf",
    productionAlias: "https://passreserve.vercel.app",
    baseUrl: stripeEnvironment.baseUrl
  },
  stripe: {
    modeLabel: stripeEnvironment.mode === "live" ? "Live Checkout" : "Test Checkout",
    detail:
      stripeEnvironment.mode === "live"
        ? "Live Stripe secrets are available in this environment."
        : "Checkout is running in test mode in this environment until live Stripe secrets are configured.",
    requirements: stripeEnvironment.requirements
  }
};

export async function getPlatformOverview() {
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
  const inbox = await getOrganizerRequestInbox();
  const openRequests = inbox.requests.filter((request) => request.status === "PENDING");

  return {
    supportEmail: siteSettingsSnapshot.operations.platformEmail,
    releaseLabel: "Hosts, emails, and internal checks",
    summary: {
      organizerCount,
      eventCount,
      occurrenceCount,
      activeRegistrations,
      openRequestsCount: openRequests.length,
      templateCount: emailTemplateCatalog.length,
      onlineCollectedLabel: formatCurrency(onlineCollected),
      dueAtEventLabel: formatCurrency(dueAtEvent),
      stripeModeLabel: siteSettingsSnapshot.stripe.modeLabel,
      inboxStorageLabel: inbox.storage.label
    },
    attentionQueue: [
      {
        title:
          openRequests.length > 0
            ? `${openRequests.length} host requests need a reply`
            : "No new host requests right now",
        detail:
          openRequests.length > 0
            ? "Each request saves the host’s target timing, payment setup, and event focus so the team can reply without extra back-and-forth."
            : "New host requests from the public site will appear here as soon as they are submitted.",
        href: "/admin/emails",
        cta: "Open inbox"
      },
      {
        title: `${pendingPayments} host payment follow-ups remain open`,
        detail:
          "Host dashboards already surface guest payment follow-up, and this view keeps the same work visible for the team.",
        href: "/admin/organizers",
        cta: "Review hosts"
      },
      {
        title: inbox.storage.label,
        detail:
          inbox.storage.detail,
        href: "/admin/health",
        cta: "Check storage"
      },
      {
        title: siteSettingsSnapshot.stripe.detail,
        detail:
          "Internal checks keep payment readiness beside live-site confirmation so the team does not overstate what is available.",
        href: "/admin/health",
        cta: "View checks"
      }
    ],
    releaseTracks: [
      {
        title: "Host support",
        detail:
          "Each host has one detail view with links to public pages, dashboards, dates, and payments."
      },
      {
        title: "Public messaging",
        detail:
          "The about page, metadata, and brand copy explain Passreserve.com in clear event language."
      },
      {
        title: "Emails and internal checks",
        detail:
          "Email templates, new host requests, recent activity, and internal checks are grouped so the team can respond quickly."
      }
    ]
  };
}

export async function getPlatformHealth() {
  const inbox = await getOrganizerRequestInbox();

  return {
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
          "The live site and metadata use Passreserve.com language for hosts, events, registrations, and guest support."
      },
      {
        title: "Stripe environment clarity",
        statusLabel: stripeEnvironment.mode === "live" ? "Live" : "Test mode",
        statusTone: stripeEnvironment.mode === "live" ? "public" : "capacity-watch",
        detail: siteSettingsSnapshot.stripe.detail
      },
      {
        title: "Host pages and team tools",
        statusLabel: "Healthy",
        statusTone: "public",
        detail:
          "Every host has a public page plus dashboard, calendar, registrations, payments, event catalog, and date planner."
      },
      {
        title: "Launch inbox storage",
        statusLabel: inbox.storage.label,
        statusTone:
          inbox.storage.mode === "database"
            ? "public"
            : inbox.storage.mode === "file"
              ? "capacity-watch"
              : "unlisted",
        detail: inbox.storage.detail
      },
      {
        title: "Live-site check",
        statusLabel: "Required",
        statusTone: "unlisted",
        detail: siteSettingsSnapshot.operations.deploymentRule
      }
    ],
    risks: [
      {
        title: "Live organizer inbox depends on configured storage",
        detail:
          inbox.storage.mode === "database"
            ? "Organizer requests are stored in the configured database, so this path now depends on database availability."
            : "Organizer requests are using the local file fallback in this environment, so production still needs database storage before launch."
      },
      {
        title: "Local Stripe remains in test mode",
        detail:
          "Checkout and webhook code paths exist, but local verification must still report test mode until real secrets are configured."
      },
      {
        title: "Live deployment checks still matter",
        detail:
          "A successful local build does not replace checking the live deployment after changes ship."
      }
    ]
  };
}
