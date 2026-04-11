import bcrypt from "bcryptjs";

import { publicOrganizers } from "./passreserve-public.js";
import {
  DEFAULT_LOCAL_PASSWORD,
  getBootstrapPlatformAdmin,
  getDefaultCurrency
} from "./passreserve-config.js";
import {
  addHours,
  addMinutes,
  createRegistrationCode,
  createToken,
  normalizeEmail,
  parseCapacityValue,
  parseDurationMinutes,
  slugify
} from "./passreserve-format.js";

function createId(prefix, slug, suffix = "") {
  const safeSuffix = suffix ? `-${suffix}` : "";

  return `${prefix}-${slug}${safeSuffix}`;
}

function createDefaultEmailTemplates() {
  return [
    {
      id: "email-organizer-request-acknowledgement",
      slug: "organizer_request_acknowledgement",
      audience: "Organizer lead",
      category: "Host requests",
      subject: "We received your Passreserve organizer request",
      trigger: "New organizer join request submitted from the public site",
      preview:
        "Confirms the launch request and sets expectations for the next platform reply.",
      placeholders: [
        "{{organizer_name}}",
        "{{contact_name}}",
        "{{launch_window}}",
        "{{payment_model}}"
      ],
      bodyHtml:
        "<p>Hi {{contact_name}},</p><p>We received the Passreserve request for <strong>{{organizer_name}}</strong>.</p><p>We’ll review the launch window ({{launch_window}}) and payment model ({{payment_model}}) and follow up shortly.</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-attendee-pending-confirmation",
      slug: "attendee_pending_confirmation",
      audience: "Attendee",
      category: "Registration updates",
      subject: "Confirm your Passreserve registration",
      trigger: "A registration hold is created and still needs attendee confirmation",
      preview:
        "Invites the attendee to confirm the hold and repeats the payment split clearly.",
      placeholders: [
        "{{event_name}}",
        "{{occurrence_label}}",
        "{{confirmation_url}}",
        "{{online_amount}}",
        "{{due_at_event}}"
      ],
      bodyHtml:
        "<p>Hi {{attendee_name}},</p><p>Your place for <strong>{{event_name}}</strong> on {{occurrence_label}} is being held briefly.</p><p>Confirm here: <a href=\"{{confirmation_url}}\">{{confirmation_url}}</a></p><p>Online now: {{online_amount}}. Due at the event: {{due_at_event}}.</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-attendee-registration-confirmed",
      slug: "attendee_registration_confirmed",
      audience: "Attendee",
      category: "Registration updates",
      subject: "Your Passreserve registration is confirmed",
      trigger: "A registration moves into a confirmed state",
      preview: "Shares the registration code, event summary, and arrival guidance.",
      placeholders: [
        "{{registration_code}}",
        "{{event_name}}",
        "{{venue_name}}",
        "{{due_at_event}}"
      ],
      bodyHtml:
        "<p>Your registration <strong>{{registration_code}}</strong> for {{event_name}} is confirmed.</p><p>Venue: {{venue_name}}</p><p>Amount still due at the event: {{due_at_event}}</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-attendee-payment-received",
      slug: "attendee_payment_received",
      audience: "Attendee",
      category: "Payments",
      subject: "Payment received for your Passreserve registration",
      trigger: "Stripe or platform reconciliation confirms the online amount",
      preview: "Confirms the online amount and repeats any remaining venue balance.",
      placeholders: [
        "{{registration_code}}",
        "{{paid_online}}",
        "{{due_at_event}}",
        "{{event_name}}"
      ],
      bodyHtml:
        "<p>Payment received for {{event_name}}.</p><p>Registration: {{registration_code}}</p><p>Paid online: {{paid_online}}</p><p>Due at the event: {{due_at_event}}</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-password-reset",
      slug: "password_reset",
      audience: "Organizer and platform admins",
      category: "Auth",
      subject: "Reset your Passreserve password",
      trigger: "An approved admin account requests a password reset",
      preview: "Sends a one-time password reset link.",
      placeholders: ["{{reset_url}}", "{{account_name}}"],
      bodyHtml:
        "<p>Hi {{account_name}},</p><p>Reset your password here: <a href=\"{{reset_url}}\">{{reset_url}}</a></p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    }
  ];
}

function createAboutPageContent() {
  return {
    id: "about-page",
    heroEyebrow: "About Passreserve.com",
    heroTitle: "A calmer home for local events and the people who host them.",
    heroSummary:
      "Passreserve.com helps people discover local events, understand what they are joining, and sign up without guesswork.",
    sections: {
      metrics: [
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
            "Each organizer gets a page with venue guidance, upcoming dates, and featured experiences instead of a generic ticket wall."
        },
        {
          id: "events",
          title: "Event pages answer the questions visitors actually have.",
          detail:
            "Every event page explains the format, what is included, who it is for, and which dates are currently available."
        },
        {
          id: "registration",
          title: "Registrations stay clear from selection to confirmation.",
          detail:
            "Passreserve.com keeps the signup flow short and direct so attendees understand the payment split and next step without uncertainty."
        }
      ],
      faq: [
        {
          question: "Do attendees choose a specific date before they register?",
          answer:
            "Yes. Registrations begin from a dated occurrence so pricing, capacity, and event-day expectations stay clear from the start."
        },
        {
          question: "Can organizers collect only a deposit?",
          answer:
            "Yes. Organizers can choose no online payment, a deposit, or full online collection depending on the event."
        }
      ],
      cta: {
        title: "Browse events or request host access.",
        detail:
          "Guests can stay focused on event details, while hosts can request access from the homepage when they are ready to launch."
      }
    },
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T09:00:00.000Z"
  };
}

function createSiteSettings() {
  return {
    id: "site-settings",
    siteName: "Passreserve.com",
    siteDescription:
      "Find local events, compare dates and prices clearly, and sign up with confidence.",
    keywords: [
      "Passreserve.com",
      "local events",
      "event registration",
      "event hosts",
      "event dates",
      "event pricing"
    ],
    platformEmail: "platform@passreserve.com",
    launchInbox: "launch@passreserve.com",
    adminNotifications: "ops@passreserve.com",
    supportResponseTarget: "Reply to organizer requests within one business day.",
    stripeCurrencyDefault: getDefaultCurrency().toLowerCase(),
    deploymentRule:
      "Every production change should be checked on the live deployment before it is marked complete.",
    customDomain: process.env.NEXT_PUBLIC_BASE_URL?.trim() || null,
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T09:00:00.000Z"
  };
}

function buildTicketCategory(eventTypeId, event) {
  const now = "2026-04-01T09:00:00.000Z";

  return {
    id: createId("ticket", eventTypeId, "general"),
    eventTypeId,
    slug: "general",
    name: "General admission",
    description: "Standard access to this occurrence.",
    unitPriceCents: Math.round(event.basePrice * 100),
    isDefault: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now
  };
}

function buildOrganizerRecord(organizer) {
  const now = "2026-04-01T09:00:00.000Z";

  return {
    id: createId("org", organizer.slug),
    slug: organizer.slug,
    name: organizer.name,
    status: "ACTIVE",
    description: organizer.description,
    tagline: organizer.tagline,
    city: organizer.city,
    region: organizer.region,
    timeZone: "Europe/Rome",
    publicEmail: organizer.contact.email,
    publicPhone: organizer.contact.phone,
    venueTitle: organizer.venue.title,
    venueDetail: organizer.venue.detail,
    venueMapHref: organizer.venue.mapHref,
    interestEmail: organizer.contact.email,
    themeTags: organizer.themeTags,
    policies: organizer.policies,
    faq: organizer.faq,
    photoStory: organizer.photoStory,
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };
}

function buildEventRecord(organizerRecord, event) {
  const now = "2026-04-01T09:00:00.000Z";
  const eventTypeId = createId("event", organizerRecord.slug, event.slug);

  return {
    id: eventTypeId,
    organizerId: organizerRecord.id,
    slug: event.slug,
    title: event.title,
    category: event.category,
    visibility: "PUBLIC",
    summary: event.summary,
    description: event.description,
    audience: event.audience,
    durationMinutes: parseDurationMinutes(event.duration),
    venueTitle: organizerRecord.venueTitle,
    venueDetail: event.venueDetail,
    mapHref: organizerRecord.venueMapHref,
    basePriceCents: Math.round(event.basePrice * 100),
    prepayPercentage: event.prepayPercentage,
    attendeeInstructions:
      "Arrive 15 minutes early and keep your registration code ready for check-in.",
    organizerNotes: "",
    cancellationPolicy:
      event.policies?.[0] || "Published policies on the event page apply to each occurrence.",
    highlights: event.highlights,
    included: event.included,
    policies: event.policies,
    faq: event.faq,
    gallery: event.gallery,
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };
}

function buildOccurrenceRecord(eventRecord, organizerRecord, event, occurrence) {
  const startsAt = new Date(occurrence.startsAt).toISOString();
  const endsAt = addMinutes(startsAt, eventRecord.durationMinutes);
  const now = "2026-04-01T09:00:00.000Z";

  return {
    id: occurrence.id,
    eventTypeId: eventRecord.id,
    status: "SCHEDULED",
    startsAt,
    endsAt,
    capacity: Math.max(8, parseCapacityValue(occurrence.capacity)),
    priceCents: eventRecord.basePriceCents,
    prepayPercentage: event.prepayPercentage,
    venueTitle: event.venueDetail || organizerRecord.venueTitle,
    note: occurrence.note,
    published: true,
    imageUrl: null,
    createdAt: now,
    updatedAt: now
  };
}

function createRegistrationSeed({
  organizer,
  eventType,
  occurrence,
  ticketCategory,
  attendeeName,
  attendeeEmail,
  attendeePhone,
  quantity,
  subtotalCents,
  onlineAmountCents,
  dueAtEventCents,
  onlineCollectedCents,
  venueCollectedCents,
  status,
  createdAt,
  confirmedAt,
  attendedAt
}) {
  const id = createId(
    "reg",
    occurrence.id,
    slugify(`${attendeeName}-${attendeeEmail}-${status}`)
  );

  return {
    id,
    organizerId: organizer.id,
    eventTypeId: eventType.id,
    occurrenceId: occurrence.id,
    ticketCategoryId: ticketCategory.id,
    status,
    attendeeName,
    attendeeEmail: normalizeEmail(attendeeEmail),
    attendeePhone,
    quantity,
    currency: getDefaultCurrency(),
    subtotalCents,
    onlineAmountCents,
    dueAtEventCents,
    onlineCollectedCents,
    venueCollectedCents,
    refundedCents: 0,
    holdToken: null,
    paymentToken:
      status === "PENDING_PAYMENT" || status === "CONFIRMED_PARTIALLY_PAID"
        ? createToken()
        : null,
    confirmationToken: createToken(),
    registrationCode: createRegistrationCode(),
    expiresAt:
      status === "PENDING_PAYMENT" ? addHours(confirmedAt || createdAt, 12) : null,
    confirmedAt,
    cancelledAt: null,
    attendedAt: attendedAt || null,
    noShowAt: null,
    termsAcceptedAt: confirmedAt || createdAt,
    responsibilityAt: confirmedAt || createdAt,
    note: "",
    createdAt,
    updatedAt: attendedAt || confirmedAt || createdAt
  };
}

function createPaymentSeed({
  registrationId,
  amountCents,
  status,
  kind,
  note,
  occurredAt,
  externalEventId = null
}) {
  return {
    id: createId("payment", registrationId, slugify(`${kind}-${status}-${occurredAt}`)),
    registrationId,
    provider: "STRIPE",
    kind,
    status,
    amountCents,
    currency: getDefaultCurrency(),
    externalEventId,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    note,
    metadata: null,
    occurredAt,
    createdAt: occurredAt
  };
}

function assertSeedEntity(value, label) {
  if (!value) {
    throw new Error(`Seed bootstrap could not find ${label}.`);
  }

  return value;
}

async function buildAdmins(organizers) {
  const organizerAdmins = [];

  for (const organizer of organizers) {
    const passwordHash = await bcrypt.hash(DEFAULT_LOCAL_PASSWORD, 10);

    organizerAdmins.push({
      id: createId("org-admin", organizer.slug),
      organizerId: organizer.id,
      email: `admin@${organizer.slug}.passreserve.local`,
      name: `${organizer.name} Admin`,
      passwordHash,
      isPrimary: true,
      isActive: true,
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLoginAt: null,
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    });
  }

  return organizerAdmins;
}

async function buildPlatformAdmins() {
  const bootstrap = getBootstrapPlatformAdmin();
  const passwordHash = await bcrypt.hash(bootstrap.password, 10);

  return [
    {
      id: "platform-admin-bootstrap",
      email: bootstrap.email,
      name: bootstrap.name,
      passwordHash,
      isActive: true,
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLoginAt: null,
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    }
  ];
}

export async function buildSeedState() {
  const organizers = publicOrganizers.map(buildOrganizerRecord);
  const events = [];
  const ticketCategories = [];
  const occurrences = [];
  const registrations = [];
  const payments = [];

  for (const organizer of publicOrganizers) {
    const organizerRecord = organizers.find((entry) => entry.slug === organizer.slug);

    for (const event of organizer.events) {
      const eventRecord = buildEventRecord(organizerRecord, event);
      const ticketCategory = buildTicketCategory(eventRecord.id, event);

      events.push(eventRecord);
      ticketCategories.push(ticketCategory);

      for (const occurrence of event.occurrences) {
        occurrences.push(
          buildOccurrenceRecord(eventRecord, organizerRecord, event, occurrence)
        );
      }
    }
  }

  const alpineOrganizer = assertSeedEntity(
    organizers.find((entry) => entry.slug === "alpine-trail-lab"),
    "alpine organizer seed"
  );
  const alpineEvent = assertSeedEntity(
    events.find((entry) => entry.slug === "sunrise-ridge-session"),
    "alpine event seed"
  );
  const alpineOccurrence = assertSeedEntity(
    occurrences.find((entry) => entry.id === "atl-sunrise-2026-04-18"),
    "alpine occurrence seed"
  );
  const alpineTicket = assertSeedEntity(
    ticketCategories.find((entry) => entry.eventTypeId === alpineEvent.id),
    "alpine ticket seed"
  );
  const alpineDepositRegistration = createRegistrationSeed({
    organizer: alpineOrganizer,
    eventType: alpineEvent,
    occurrence: alpineOccurrence,
    ticketCategory: alpineTicket,
    attendeeName: "Giulia Bernardi",
    attendeeEmail: "giulia@example.com",
    attendeePhone: "+39 348 555 1122",
    quantity: 2,
    subtotalCents: alpineTicket.unitPriceCents * 2,
    onlineAmountCents: Math.round((alpineTicket.unitPriceCents * 2 * 30) / 100),
    dueAtEventCents: alpineTicket.unitPriceCents * 2 - Math.round((alpineTicket.unitPriceCents * 2 * 30) / 100),
    onlineCollectedCents: Math.round((alpineTicket.unitPriceCents * 2 * 30) / 100),
    venueCollectedCents: 0,
    status: "CONFIRMED_PARTIALLY_PAID",
    createdAt: "2026-04-08T08:15:00.000Z",
    confirmedAt: "2026-04-08T08:20:00.000Z"
  });
  registrations.push(alpineDepositRegistration);
  payments.push(
    createPaymentSeed({
      registrationId: alpineDepositRegistration.id,
      amountCents: alpineDepositRegistration.onlineCollectedCents,
      status: "SUCCEEDED",
      kind: "CAPTURE",
      note: "Seeded Stripe deposit payment.",
      occurredAt: alpineDepositRegistration.confirmedAt
    })
  );

  const gravelOrganizer = assertSeedEntity(
    organizers.find((entry) => entry.slug === "officina-gravel-house"),
    "gravel organizer seed"
  );
  const gravelEvent = assertSeedEntity(
    events.find((entry) => entry.slug === "gravel-social-camp"),
    "gravel event seed"
  );
  const gravelOccurrence = assertSeedEntity(
    occurrences.find((entry) => entry.id === "ogh-camp-2026-05-09"),
    "gravel occurrence seed"
  );
  const gravelTicket = assertSeedEntity(
    ticketCategories.find((entry) => entry.eventTypeId === gravelEvent.id),
    "gravel ticket seed"
  );
  const gravelRegistration = createRegistrationSeed({
    organizer: gravelOrganizer,
    eventType: gravelEvent,
    occurrence: gravelOccurrence,
    ticketCategory: gravelTicket,
    attendeeName: "Marco Rossi",
    attendeeEmail: "marco@example.com",
    attendeePhone: "+39 333 222 4455",
    quantity: 1,
    subtotalCents: gravelTicket.unitPriceCents,
    onlineAmountCents: 0,
    dueAtEventCents: gravelTicket.unitPriceCents,
    onlineCollectedCents: 0,
    venueCollectedCents: 0,
    status: "CONFIRMED_UNPAID",
    createdAt: "2026-04-09T10:30:00.000Z",
    confirmedAt: "2026-04-09T10:35:00.000Z"
  });
  registrations.push(gravelRegistration);

  const alpinePendingOccurrence = assertSeedEntity(
    occurrences.find((entry) => entry.id === "atl-clinic-2026-04-26"),
    "pending occurrence seed"
  );
  const alpinePendingEvent = assertSeedEntity(
    events.find((entry) => entry.slug === "alpine-switchback-clinic"),
    "pending event seed"
  );
  const alpinePendingTicket = assertSeedEntity(
    ticketCategories.find((entry) => entry.eventTypeId === alpinePendingEvent.id),
    "pending ticket seed"
  );
  const pendingRegistration = createRegistrationSeed({
    organizer: alpineOrganizer,
    eventType: alpinePendingEvent,
    occurrence: alpinePendingOccurrence,
    ticketCategory: alpinePendingTicket,
    attendeeName: "Luca Ferri",
    attendeeEmail: "luca@example.com",
    attendeePhone: "+39 347 111 8899",
    quantity: 1,
    subtotalCents: alpinePendingTicket.unitPriceCents,
    onlineAmountCents: Math.round((alpinePendingTicket.unitPriceCents * 50) / 100),
    dueAtEventCents: alpinePendingTicket.unitPriceCents - Math.round((alpinePendingTicket.unitPriceCents * 50) / 100),
    onlineCollectedCents: 0,
    venueCollectedCents: 0,
    status: "PENDING_PAYMENT",
    createdAt: "2026-04-10T09:15:00.000Z",
    confirmedAt: "2026-04-10T09:20:00.000Z"
  });
  registrations.push(pendingRegistration);

  const organizerAdmins = await buildAdmins(organizers);
  const platformAdmins = await buildPlatformAdmins();
  const auditLogs = [
    {
      id: "audit-bootstrap-01",
      actorType: "SYSTEM",
      actorId: null,
      organizerId: null,
      registrationId: null,
      eventType: "bootstrap",
      entityType: "state",
      entityId: null,
      message: "Passreserve runtime state initialized from seed data.",
      metadata: {
        organizers: organizers.length,
        events: events.length
      },
      createdAt: "2026-04-01T09:00:00.000Z"
    }
  ];

  return {
    version: 1,
    organizers,
    organizerAdmins,
    platformAdmins,
    joinRequests: [],
    events,
    ticketCategories,
    occurrences,
    registrations,
    payments,
    emailTemplates: createDefaultEmailTemplates(),
    siteSettings: createSiteSettings(),
    aboutPage: createAboutPageContent(),
    auditLogs
  };
}
