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

export function createDefaultEmailTemplates() {
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
      id: "email-organizer-request-alert",
      slug: "organizer_request_alert",
      audience: "Team",
      category: "Host requests",
      subject: "New organizer request for Passreserve.com",
      trigger: "Join request needs platform triage",
      preview:
        "Highlights the organizer, city, and event focus so the team can reply quickly.",
      placeholders: [
        "{{organizer_name}}",
        "{{city}}",
        "{{event_focus}}",
        "{{platform_reply_email}}"
      ],
      bodyHtml:
        "<p>A new organizer request is waiting in Passreserve.</p><p><strong>Organizer:</strong> {{organizer_name}}</p><p><strong>City:</strong> {{city}}</p><p><strong>Event focus:</strong> {{event_focus}}</p><p>Reply from {{platform_reply_email}} when you are ready to follow up.</p>",
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
      id: "email-attendee-registration-cancelled",
      slug: "attendee_registration_cancelled",
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
      ],
      bodyHtml:
        "<p>Your registration <strong>{{registration_code}}</strong> for {{event_name}} on {{occurrence_label}} has been cancelled.</p><p>{{refund_state}}</p><p>If you need help or want to discuss a replacement date, reply to {{support_reply_email}}.</p>",
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
      id: "email-attendee-occurrence-reminder",
      slug: "attendee_occurrence_reminder",
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
      ],
      bodyHtml:
        "<p>Hi {{attendee_name}},</p><p>This is a reminder for <strong>{{event_name}}</strong> on {{occurrence_label}} at {{occurrence_time}}.</p><p><strong>Venue:</strong> {{venue_name}}</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Due at the event:</strong> {{due_at_event}}</p><p>{{organizer_reminder_note}}</p><p>Reply to {{support_reply_email}} if you need help before the event.</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-attendee-occurrence-cancelled",
      slug: "attendee_occurrence_cancelled",
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
      ],
      bodyHtml:
        "<p>The scheduled date for <strong>{{event_name}}</strong> on {{occurrence_label}} has been cancelled.</p><p>{{refund_state}}</p><p>Please reply to {{support_reply_email}} if you need help with next steps.</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-organizer-new-registration",
      slug: "organizer_new_registration",
      audience: "Organizer",
      category: "Host updates",
      subject: "New registration for {{event_name}}",
      trigger: "A registration is confirmed or moves into the payment step",
      preview:
        "Gives hosts the attendee, date, quantity, and current payment state right away.",
      placeholders: [
        "{{organizer_name}}",
        "{{event_name}}",
        "{{attendee_name}}",
        "{{occurrence_label}}",
        "{{quantity_label}}",
        "{{registration_code}}",
        "{{payment_state}}"
      ],
      bodyHtml:
        "<p>A new registration is now active for <strong>{{event_name}}</strong>.</p><p><strong>Attendee:</strong> {{attendee_name}}</p><p><strong>Date:</strong> {{occurrence_label}}</p><p><strong>Quantity:</strong> {{quantity_label}}</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Payment state:</strong> {{payment_state}}</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-organizer-payment-received",
      slug: "organizer_payment_received",
      audience: "Organizer",
      category: "Host updates",
      subject: "Payment received for {{event_name}}",
      trigger: "Online collection completes successfully",
      preview:
        "Highlights the online amount received and any balance still due at the event.",
      placeholders: [
        "{{registration_code}}",
        "{{paid_online}}",
        "{{due_at_event}}",
        "{{occurrence_label}}",
        "{{event_name}}"
      ],
      bodyHtml:
        "<p>Online payment has been received for <strong>{{event_name}}</strong>.</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Date:</strong> {{occurrence_label}}</p><p><strong>Paid online:</strong> {{paid_online}}</p><p><strong>Still due at the event:</strong> {{due_at_event}}</p>",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T09:00:00.000Z"
    },
    {
      id: "email-organizer-occurrence-cancelled",
      slug: "organizer_occurrence_cancelled",
      audience: "Organizer and attendee",
      category: "Schedule changes",
      subject: "Occurrence cancelled: {{event_name}}",
      trigger: "An organizer or platform operator cancels a published occurrence",
      preview:
        "Explains the cancelled date, follow-up path, and current refund state clearly.",
      placeholders: [
        "{{event_name}}",
        "{{occurrence_label}}",
        "{{refund_state}}",
        "{{support_reply_email}}"
      ],
      bodyHtml:
        "<p>The date for <strong>{{event_name}}</strong> on {{occurrence_label}} has been cancelled.</p><p>{{refund_state}}</p><p>Reply to {{support_reply_email}} if you need help coordinating the follow-up.</p>",
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

export function createSiteSettings() {
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
    registrationRemindersEnabled: false,
    supportResponseTarget: "Reply to organizer requests within one business day.",
    stripeCurrencyDefault: getDefaultCurrency().toLowerCase(),
    deploymentRule:
      "Every production change should be checked on the live deployment before it is marked complete.",
    customDomain: process.env.NEXT_PUBLIC_BASE_URL?.trim() || null,
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T09:00:00.000Z"
  };
}

export function appendMissingPublicCatalog(state) {
  let changed = false;
  const organizers = Array.isArray(state.organizers) ? state.organizers : [];
  const events = Array.isArray(state.events) ? state.events : [];
  const ticketCategories = Array.isArray(state.ticketCategories) ? state.ticketCategories : [];
  const occurrences = Array.isArray(state.occurrences) ? state.occurrences : [];

  if (!Array.isArray(state.organizers)) {
    state.organizers = organizers;
    changed = true;
  }

  if (!Array.isArray(state.events)) {
    state.events = events;
    changed = true;
  }

  if (!Array.isArray(state.ticketCategories)) {
    state.ticketCategories = ticketCategories;
    changed = true;
  }

  if (!Array.isArray(state.occurrences)) {
    state.occurrences = occurrences;
    changed = true;
  }

  for (const organizer of publicOrganizers) {
    let organizerRecord = state.organizers.find((entry) => entry.slug === organizer.slug) ?? null;

    if (!organizerRecord) {
      organizerRecord = buildOrganizerRecord(organizer);
      state.organizers.push(organizerRecord);
      changed = true;
    }

    for (const event of organizer.events) {
      const eventId = createId("event", organizerRecord.slug, event.slug);
      let eventRecord =
        state.events.find(
          (entry) => entry.id === eventId || (entry.organizerId === organizerRecord.id && entry.slug === event.slug)
        ) ?? null;

      if (!eventRecord) {
        eventRecord = buildEventRecord(organizerRecord, event);
        state.events.push(eventRecord);
        changed = true;
      }

      if (!state.ticketCategories.some((entry) => entry.eventTypeId === eventRecord.id)) {
        state.ticketCategories.push(buildTicketCategory(eventRecord.id, event));
        changed = true;
      }

      for (const occurrence of event.occurrences) {
        if (!state.occurrences.some((entry) => entry.id === occurrence.id)) {
          state.occurrences.push(
            buildOccurrenceRecord(eventRecord, organizerRecord, event, occurrence)
          );
          changed = true;
        }
      }
    }
  }

  return changed;
}

function buildTicketCategory(eventTypeId, event) {
  const now = "2026-04-01T09:00:00.000Z";
  const included = Array.isArray(event.included) ? event.included.filter(Boolean) : [];

  return {
    id: createId("ticket", eventTypeId, "general"),
    eventTypeId,
    slug: "general",
    name: "General admission",
    description: "Standard access to this occurrence.",
    contentI18n: null,
    included,
    unitPriceCents: Math.round(event.basePrice * 100),
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now
  };
}

function buildOrganizerRecord(organizer) {
  const now = "2026-04-01T09:00:00.000Z";
  const photoStory = Array.isArray(organizer.photoStory)
    ? organizer.photoStory.filter((item) => item?.imageUrl)
    : [];

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
    photoStory,
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
    createdAt: now,
    updatedAt: now
  };
}

function buildEventRecord(organizerRecord, event) {
  const now = "2026-04-01T09:00:00.000Z";
  const eventTypeId = createId("event", organizerRecord.slug, event.slug);
  const gallery = Array.isArray(event.gallery) ? event.gallery.filter((item) => item?.imageUrl) : [];

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
    salesWindowStartsAt: null,
    salesWindowEndsAt: null,
    highlights: event.highlights,
    included: event.included,
    policies: event.policies,
    faq: event.faq,
    gallery,
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
    salesWindowStartsAt: null,
    salesWindowEndsAt: null,
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
  registrationLocale = "en",
  attendees = [],
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
    registrationLocale,
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
    items: [
      {
        id: createId("reg-item", id, "1"),
        registrationId: id,
        ticketCategoryId: ticketCategory.id,
        sortOrder: 0,
        quantity,
        unitPriceCents: quantity > 0 ? Math.round(subtotalCents / quantity) : subtotalCents,
        subtotalCents,
        onlineAmountCents,
        dueAtEventCents,
        createdAt,
        updatedAt: attendedAt || confirmedAt || createdAt
      }
    ],
    attendees: attendees.length
      ? attendees.map((attendee, index) => ({
          id: createId("reg-attendee", id, String(index + 1)),
          ticketCategoryId: ticketCategory.id,
          sortOrder: index,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          address: attendee.address,
          phone: attendee.phone,
          email: normalizeEmail(attendee.email),
          dietaryFlags: attendee.dietaryFlags || [],
          dietaryOther: attendee.dietaryOther || "",
          createdAt,
          updatedAt: attendedAt || confirmedAt || createdAt
        }))
      : [
          {
            id: createId("reg-attendee", id, "1"),
            ticketCategoryId: ticketCategory.id,
            sortOrder: 0,
            firstName: attendeeName.split(" ").slice(0, -1).join(" ") || attendeeName,
            lastName: attendeeName.split(" ").slice(-1).join("") || "",
            address: "",
            phone: attendeePhone,
            email: normalizeEmail(attendeeEmail),
            dietaryFlags: [],
            dietaryOther: "",
            createdAt,
            updatedAt: attendedAt || confirmedAt || createdAt
          }
        ],
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
    stripeAccountId: null,
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
      tokenVersion: 0,
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
      tokenVersion: 0,
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
    registrationLocale: "it",
    attendees: [
      {
        firstName: "Giulia",
        lastName: "Bernardi",
        address: "Via del Sole 12, Bolzano",
        phone: "+39 348 555 1122",
        email: "giulia@example.com",
        dietaryFlags: ["gluten"],
        dietaryOther: ""
      },
      {
        firstName: "Elena",
        lastName: "Venturi",
        address: "Via del Sole 12, Bolzano",
        phone: "+39 340 555 4421",
        email: "elena@example.com",
        dietaryFlags: ["lactose"],
        dietaryOther: "Prefers lactose-free breakfast."
      }
    ],
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
    registrationLocale: "it",
    attendees: [
      {
        firstName: "Marco",
        lastName: "Rossi",
        address: "Via San Luca 8, Parma",
        phone: "+39 333 222 4455",
        email: "marco@example.com",
        dietaryFlags: ["vegetarian"],
        dietaryOther: ""
      }
    ],
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
    registrationLocale: "it",
    attendees: [
      {
        firstName: "Luca",
        lastName: "Ferri",
        address: "Via Mazzini 4, Trento",
        phone: "+39 347 111 8899",
        email: "luca@example.com",
        dietaryFlags: ["nuts"],
        dietaryOther: "Carries an epinephrine injector."
      }
    ],
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
    emailDeliveries: [],
    emailTemplates: createDefaultEmailTemplates(),
    siteSettings: createSiteSettings(),
    aboutPage: createAboutPageContent(),
    auditLogs
  };
}
