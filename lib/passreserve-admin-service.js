import bcrypt from "bcryptjs";

import {
  ORGANIZER_BILLING_STATUS,
  getOrganizerOnlinePaymentsGate,
  getStripeAccountPatch,
  isOccurrenceUsingOnlinePayments,
  normalizeOrganizerBillingStatus,
  normalizeOrganizerPaymentSettings
} from "./passreserve-billing.js";
import { normalizeOrganizerBookingWindowSettings } from "./passreserve-booking-window.js";
import { sendTransactionalEmail } from "./passreserve-email.js";
import {
  DEFAULT_LOCAL_PASSWORD,
  getStorageSummary
} from "./passreserve-config.js";
import {
  addHours,
  asIso,
  createToken,
  formatCurrencyFromCents,
  formatDateLabel,
  formatDateTimeLabel,
  formatOccurrenceTimeRange,
  normalizeEmail,
  normalizeText,
  pluralize,
  slugify
} from "./passreserve-format.js";
import { loadPersistentState, mutatePersistentState } from "./passreserve-state.js";
import { getBaseUrl } from "./passreserve-config.js";
import {
  createStripeConnectedAccount,
  createStripeOnboardingAccountLink,
  getStripeEnvironmentState,
  retrieveStripeConnectedAccount
} from "./passreserve-payments.js";

function getOrganizerRecord(state, slug) {
  return applyOrganizerPaymentDefaults(
    state.organizers.find((organizer) => organizer.slug === slug) ?? null
  );
}

function getOrganizerById(state, organizerId) {
  return applyOrganizerPaymentDefaults(
    state.organizers.find((organizer) => organizer.id === organizerId) ?? null
  );
}

function getEventById(state, eventId) {
  return state.events.find((event) => event.id === eventId) ?? null;
}

function getOccurrenceById(state, occurrenceId) {
  return state.occurrences.find((occurrence) => occurrence.id === occurrenceId) ?? null;
}

function getTicketCategoryById(state, ticketCategoryId) {
  return state.ticketCategories.find((category) => category.id === ticketCategoryId) ?? null;
}

function getOrganizerEvents(state, organizerId) {
  return state.events
    .filter((event) => event.organizerId === organizerId)
    .sort((left, right) => left.title.localeCompare(right.title));
}

function getEventOccurrences(state, eventTypeId) {
  return state.occurrences
    .filter((occurrence) => occurrence.eventTypeId === eventTypeId)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function getOrganizerRegistrations(state, organizerId) {
  return state.registrations
    .filter((registration) => registration.organizerId === organizerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function getRegistrationPayments(state, registrationId) {
  return state.payments
    .filter((payment) => payment.registrationId === registrationId)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function isPendingConfirmExpired(registration) {
  return (
    registration.status === "PENDING_CONFIRM" &&
    registration.expiresAt &&
    new Date(registration.expiresAt).getTime() <= Date.now()
  );
}

function isPendingPaymentExpired(registration) {
  return (
    registration.status === "PENDING_PAYMENT" &&
    registration.expiresAt &&
    new Date(registration.expiresAt).getTime() <= Date.now()
  );
}

function isRegistrationActiveForCapacity(registration) {
  if (registration.status === "CANCELLED") {
    return false;
  }

  if (registration.status === "PENDING_CONFIRM") {
    return !isPendingConfirmExpired(registration);
  }

  if (registration.status === "PENDING_PAYMENT") {
    return !isPendingPaymentExpired(registration);
  }

  return true;
}

function getOccurrenceCapacitySummary(state, occurrence) {
  const registrations = state.registrations.filter(
    (registration) => registration.occurrenceId === occurrence.id
  );
  const reserved = registrations.filter(isRegistrationActiveForCapacity);
  const reservedQuantity = reserved.reduce((sum, registration) => sum + registration.quantity, 0);

  return {
    totalCapacity: occurrence.capacity,
    reservedQuantity,
    remaining: Math.max(0, occurrence.capacity - reservedQuantity),
    pendingPayments: reserved
      .filter((registration) => registration.status === "PENDING_PAYMENT")
      .reduce((sum, registration) => sum + registration.quantity, 0)
  };
}

function applyOrganizerPaymentDefaults(organizer) {
  if (!organizer) {
    return organizer;
  }

  Object.assign(organizer, normalizeOrganizerPaymentSettings(organizer));
  Object.assign(organizer, normalizeOrganizerBookingWindowSettings(organizer));

  return organizer;
}

function buildOrganizerBillingSnapshot(organizer, timeZone = "Europe/Rome") {
  const gate = getOrganizerOnlinePaymentsGate(organizer);

  return {
    ...gate,
    stripeConnectedAtLabel: gate.stripeConnectedAt
      ? formatDateTimeLabel(gate.stripeConnectedAt, timeZone)
      : "Not connected",
    stripeLastSyncedAtLabel: gate.stripeLastSyncedAt
      ? formatDateTimeLabel(gate.stripeLastSyncedAt, timeZone)
      : "Not synced yet",
    paidPublishingLabel: gate.enabled
      ? "Paid events can be published."
      : "Paid events stay blocked until Stripe and billing are ready."
  };
}

function getOrganizerSummary(state, organizer) {
  const registrations = getOrganizerRegistrations(state, organizer.id);
  const activeRegistrations = registrations.filter(
    (registration) =>
      !["CANCELLED", "NO_SHOW"].includes(registration.status) &&
      !isPendingConfirmExpired(registration) &&
      !isPendingPaymentExpired(registration)
  );
  const onlineCollected = registrations.reduce(
    (sum, registration) => sum + registration.onlineCollectedCents,
    0
  );
  const dueAtEvent = registrations.reduce(
    (sum, registration) =>
      sum + Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents),
    0
  );
  const upcomingOccurrences = getOrganizerEvents(state, organizer.id).flatMap((event) =>
    getEventOccurrences(state, event.id).filter(
      (occurrence) => new Date(occurrence.startsAt).getTime() > Date.now()
    )
  );

  return {
    activeCount: activeRegistrations.length,
    onlineCollected,
    onlineCollectedLabel: formatCurrencyFromCents(onlineCollected),
    dueAtEvent,
    dueAtEventLabel: formatCurrencyFromCents(dueAtEvent),
    pendingPayments: registrations.filter(
      (registration) => registration.status === "PENDING_PAYMENT"
    ).length,
    upcomingOccurrences: upcomingOccurrences.length
  };
}

function buildOrganizerLinks(organizer) {
  return {
    publicHref: `/${organizer.slug}`,
    dashboardHref: `/${organizer.slug}/admin/dashboard`,
    calendarHref: `/${organizer.slug}/admin/calendar`,
    registrationsHref: `/${organizer.slug}/admin/registrations`,
    paymentsHref: `/${organizer.slug}/admin/payments`,
    billingHref: `/${organizer.slug}/admin/billing`,
    settingsHref: `/${organizer.slug}/admin/settings`,
    eventsHref: `/${organizer.slug}/admin/events`,
    occurrencesHref: `/${organizer.slug}/admin/occurrences`
  };
}

async function appendAuditLog(draft, input) {
  draft.auditLogs.unshift({
    id: createToken(),
    createdAt: asIso(input.createdAt) || new Date().toISOString(),
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

function getTemplate(state, slug) {
  return state.emailTemplates.find((template) => template.slug === slug) ?? null;
}

async function sendTemplate(state, slug, to, replacements) {
  const template = getTemplate(state, slug);

  if (!template || !to) {
    return null;
  }

  return sendTransactionalEmail({
    to,
    subject: template.subject,
    html: template.bodyHtml,
    replacements
  });
}

function buildOrganizerAdminRecord(state, registration) {
  const organizer = getOrganizerById(state, registration.organizerId);
  const event = getEventById(state, registration.eventTypeId);
  const occurrence = getOccurrenceById(state, registration.occurrenceId);
  const ticketCategory = getTicketCategoryById(state, registration.ticketCategoryId);
  const payments = getRegistrationPayments(state, registration.id);

  return {
    id: registration.id,
    registrationCode: registration.registrationCode || "Pending",
    status: registration.status,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    quantityLabel: pluralize(registration.quantity, "attendee"),
    eventTitle: event?.title || "Unknown event",
    occurrenceLabel: occurrence
      ? formatDateLabel(occurrence.startsAt, organizer?.timeZone || "Europe/Rome")
      : "Unknown date",
    occurrenceTime: occurrence
      ? formatOccurrenceTimeRange(
          occurrence.startsAt,
          occurrence.endsAt,
          organizer?.timeZone || "Europe/Rome"
        )
      : "",
    onlineCollectedLabel: formatCurrencyFromCents(registration.onlineCollectedCents),
    dueAtEventOpenLabel: formatCurrencyFromCents(
      Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents)
    ),
    ticketLabel: ticketCategory?.name || "General admission",
    createdAtLabel: formatDateTimeLabel(
      registration.createdAt,
      organizer?.timeZone || "Europe/Rome"
    ),
    paymentCount: payments.length
  };
}

function getRegistrationActionOptions(registration) {
  const actions = [];

  if (["CONFIRMED_UNPAID", "CONFIRMED_PARTIALLY_PAID", "CONFIRMED_PAID"].includes(registration.status)) {
    actions.push("mark_attended", "mark_no_show", "cancel");
  }

  if (registration.status === "PENDING_PAYMENT") {
    actions.push("mark_paid", "cancel");
  }

  if (registration.status === "ATTENDED") {
    actions.push("record_venue_payment");
  }

  return actions;
}

export async function markAdminLogin(scope, userId) {
  await mutatePersistentState(async (draft) => {
    const collection = scope === "platform" ? draft.platformAdmins : draft.organizerAdmins;
    const admin = collection.find((entry) => entry.id === userId);

    if (admin) {
      admin.lastLoginAt = new Date().toISOString();
      admin.updatedAt = new Date().toISOString();
    }
  });
}

export async function getPlatformOverview() {
  const state = await loadPersistentState();
  const activeOrganizers = state.organizers.filter((organizer) => organizer.status === "ACTIVE");
  const publishedEvents = state.events.filter((event) => event.visibility === "PUBLIC");
  const publishedOccurrences = state.occurrences.filter((occurrence) => occurrence.published);
  const activeRegistrations = state.registrations.filter(
    (registration) =>
      !isPendingConfirmExpired(registration) &&
      !isPendingPaymentExpired(registration) &&
      registration.status !== "CANCELLED"
  );
  const onlineCollected = state.registrations.reduce(
    (sum, registration) => sum + registration.onlineCollectedCents,
    0
  );
  const dueAtEvent = state.registrations.reduce(
    (sum, registration) =>
      sum + Math.max(0, registration.dueAtEventCents - registration.venueCollectedCents),
    0
  );

  return {
    supportEmail: state.siteSettings.platformEmail,
    releaseLabel: "Production admin",
    summary: {
      organizerCount: activeOrganizers.length,
      eventCount: publishedEvents.length,
      occurrenceCount: publishedOccurrences.length,
      activeRegistrations: activeRegistrations.length,
      openRequestsCount: state.joinRequests.filter((request) => request.status === "PENDING").length,
      templateCount: state.emailTemplates.length,
      onlineCollectedLabel: formatCurrencyFromCents(onlineCollected),
      dueAtEventLabel: formatCurrencyFromCents(dueAtEvent),
      stripeModeLabel:
        getStripeEnvironmentState().mode === "live" ? "Connect enabled" : "Preview mode"
    },
    attentionQueue: [
      {
        title: `${state.joinRequests.filter((request) => request.status === "PENDING").length} organizer requests waiting`,
        detail: "Approve queued organizers or create new organizer accounts directly from platform admin.",
        href: "/admin/organizers",
        cta: "Open organizer queue"
      },
      {
        title: `${activeRegistrations.filter((registration) => registration.status === "PENDING_PAYMENT").length} registrations need payment follow-up`,
        detail: "Pending payment registrations stay visible so the team can support organizers quickly.",
        href: "/admin/logs",
        cta: "Review recent activity"
      },
      {
        title: getStorageSummary().label,
        detail: getStorageSummary().detail,
        href: "/admin/health",
        cta: "Check environment"
      }
    ],
    releaseTracks: [
      {
        title: "Organizer onboarding",
        detail: "Manual organizer approval with primary admin bootstrapping and reset links."
      },
      {
        title: "Content and settings",
        detail: "Editable site settings, about-page content, and email templates."
      },
      {
        title: "Ops and payments",
        detail: "Registration, payment, and audit activity are stored durably."
      }
    ]
  };
}

export async function getPlatformHealth() {
  const state = await loadPersistentState();
  const stripe = getStripeEnvironmentState();
  const storage = getStorageSummary();

  return {
    metrics: [
      {
        label: "Organizers",
        value: String(state.organizers.length)
      },
      {
        label: "Events",
        value: String(state.events.length)
      },
      {
        label: "Occurrences",
        value: String(state.occurrences.length)
      },
      {
        label: "Registrations",
        value: String(state.registrations.length)
      }
    ],
    checks: [
      {
        title: "Persistence",
        statusLabel: storage.label,
        statusTone: storage.mode === "database" ? "public" : "capacity-watch",
        detail: storage.detail
      },
      {
        title: "Stripe",
        statusLabel: stripe.mode === "live" ? "Live" : "Preview",
        statusTone: stripe.mode === "live" ? "public" : "capacity-watch",
        detail:
          stripe.mode === "live"
            ? "Stripe Connect can onboard organizers and create direct-charge Checkout sessions in this environment."
            : "Checkout stays in preview mode here until Stripe Connect credentials are configured."
      },
      {
        title: "Email delivery",
        statusLabel: process.env.RESEND_API_KEY?.trim() ? "Configured" : "Log only",
        statusTone: process.env.RESEND_API_KEY?.trim() ? "public" : "capacity-watch",
        detail:
          process.env.RESEND_API_KEY?.trim()
            ? "Transactional email is ready through Resend."
            : "Email is logged locally until Resend is configured."
      }
    ],
    risks: [
      {
        title: "Production still needs owner-managed secrets",
        detail:
          "Domain, Postgres, Stripe Connect secrets, and Resend still need to be connected by the owner account before launch."
      }
    ]
  };
}

export async function getPlatformOrganizers() {
  const state = await loadPersistentState();

  return state.organizers
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((organizer) => {
      const summary = getOrganizerSummary(state, organizer);
      const events = getOrganizerEvents(state, organizer.id);

      return {
        ...organizer,
        ...buildOrganizerLinks(organizer),
        summary,
        metrics: {
          eventCount: events.length,
          publishedEvents: events.filter((event) => event.visibility === "PUBLIC").length,
          publishedOccurrences: events.flatMap((event) => getEventOccurrences(state, event.id))
            .length
        },
        launchStatusLabel: organizer.status === "ACTIVE" ? "Active" : organizer.status,
        launchStatusTone: organizer.status === "ACTIVE" ? "public" : "capacity-watch",
        healthLabel: summary.pendingPayments > 0 ? "Needs payment follow-up" : "Healthy",
        healthTone: summary.pendingPayments > 0 ? "capacity-watch" : "public",
        featuredEventTitle: events[0]?.title || "No events yet",
        detailHref: `/admin/organizers/${organizer.slug}`
      };
    });
}

export async function listOrganizerRequests() {
  const state = await loadPersistentState();

  return state.joinRequests
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((request) => ({
      ...request,
      statusLabel:
        request.status === "APPROVED"
          ? "Approved"
          : request.status === "REJECTED"
            ? "Rejected"
            : request.status === "ARCHIVED"
              ? "Archived"
              : "Needs reply",
      statusTone:
        request.status === "APPROVED"
          ? "public"
          : request.status === "REJECTED"
            ? "unlisted"
            : request.status === "ARCHIVED"
              ? "unlisted"
              : "capacity-watch"
    }));
}

export async function getPlatformOrganizerDetail(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const summary = getOrganizerSummary(state, organizer);
  const admins = state.organizerAdmins.filter((admin) => admin.organizerId === organizer.id);
  const events = getOrganizerEvents(state, organizer.id);
  const recentRegistrations = getOrganizerRegistrations(state, organizer.id)
    .slice(0, 10)
    .map((registration) => buildOrganizerAdminRecord(state, registration));
  const recentJoinRequest = state.joinRequests.find((request) => request.organizerId === organizer.id);
  const billing = buildOrganizerBillingSnapshot(organizer, organizer.timeZone);

  return {
    organizer: {
      ...organizer,
      ...buildOrganizerLinks(organizer),
      summary,
      billing
    },
    admins,
    events: events.map((event) => ({
      ...event,
      occurrenceCount: getEventOccurrences(state, event.id).length
    })),
    recentRegistrations,
    recentJoinRequest
  };
}

export async function getEditablePlatformContent() {
  const state = await loadPersistentState();

  return {
    siteSettings: state.siteSettings,
    aboutPage: state.aboutPage,
    emailTemplates: state.emailTemplates
  };
}

export async function getOrganizerShell(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer: {
      ...organizer,
      ...buildOrganizerLinks(organizer),
      summary: getOrganizerSummary(state, organizer),
      billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
      totalUpcomingOccurrences: getOrganizerEvents(state, organizer.id).flatMap((event) =>
        getEventOccurrences(state, event.id).filter(
          (occurrence) => new Date(occurrence.startsAt).getTime() > Date.now()
        )
      ).length,
      supportEmail: organizer.publicEmail
    }
  };
}

export async function getOrganizerDashboard(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const summary = getOrganizerSummary(state, organizer);
  const upcomingOccurrences = getOrganizerEvents(state, organizer.id)
    .flatMap((event) =>
      getEventOccurrences(state, event.id).map((occurrence) => ({
        occurrence,
        event
      }))
    )
    .filter((entry) => new Date(entry.occurrence.startsAt).getTime() > Date.now())
    .sort((left, right) => left.occurrence.startsAt.localeCompare(right.occurrence.startsAt))
    .slice(0, 8)
    .map((entry) => ({
      id: entry.occurrence.id,
      eventTitle: entry.event.title,
      dateLabel: formatDateLabel(entry.occurrence.startsAt, organizer.timeZone),
      timeLabel: formatOccurrenceTimeRange(
        entry.occurrence.startsAt,
        entry.occurrence.endsAt,
        organizer.timeZone
      ),
      capacity: getOccurrenceCapacitySummary(state, entry.occurrence)
    }));
  const recentRegistrations = getOrganizerRegistrations(state, organizer.id)
    .slice(0, 8)
    .map((registration) => ({
      ...buildOrganizerAdminRecord(state, registration),
      actions: getRegistrationActionOptions(registration)
    }));

  return {
    organizer,
    summary,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    upcomingOccurrences,
    recentRegistrations
  };
}

export async function getOrganizerCalendar(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const entries = getOrganizerEvents(state, organizer.id)
    .flatMap((event) =>
      getEventOccurrences(state, event.id).map((occurrence) => ({
        id: occurrence.id,
        eventTitle: event.title,
        startsAt: occurrence.startsAt,
        dateLabel: formatDateLabel(occurrence.startsAt, organizer.timeZone),
        timeLabel: formatOccurrenceTimeRange(
          occurrence.startsAt,
          occurrence.endsAt,
          organizer.timeZone
        ),
        published: occurrence.published,
        status: occurrence.status,
        capacity: getOccurrenceCapacitySummary(state, occurrence)
      }))
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  return {
    organizer,
    entries
  };
}

export async function getOrganizerEventsAdmin(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    events: getOrganizerEvents(state, organizer.id).map((event) => ({
      ...event,
      basePriceLabel: formatCurrencyFromCents(event.basePriceCents),
      occurrenceCount: getEventOccurrences(state, event.id).length
    }))
  };
}

export async function getOrganizerOccurrencesAdmin(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    events: getOrganizerEvents(state, organizer.id),
    occurrences: getOrganizerEvents(state, organizer.id)
      .flatMap((event) =>
        getEventOccurrences(state, event.id).map((occurrence) => ({
          ...occurrence,
          eventTitle: event.title,
          usesOnlinePayments: isOccurrenceUsingOnlinePayments(occurrence),
          capacitySummary: getOccurrenceCapacitySummary(state, occurrence),
          startsAtLabel: formatDateTimeLabel(occurrence.startsAt, organizer.timeZone),
          endsAtLabel: formatDateTimeLabel(occurrence.endsAt, organizer.timeZone)
        }))
      )
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  };
}

export async function getOrganizerRegistrationsAdmin(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    registrations: getOrganizerRegistrations(state, organizer.id).map((registration) => ({
      ...buildOrganizerAdminRecord(state, registration),
      actions: getRegistrationActionOptions(registration)
    }))
  };
}

export async function getOrganizerPaymentsAdmin(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer,
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    payments: getOrganizerRegistrations(state, organizer.id).map((registration) => {
      const record = buildOrganizerAdminRecord(state, registration);

      return {
        ...record,
        venueCollectedLabel: formatCurrencyFromCents(registration.venueCollectedCents),
        dueAtEventOpenCents: Math.max(
          0,
          registration.dueAtEventCents - registration.venueCollectedCents
        ),
        ledger: getRegistrationPayments(state, registration.id).slice(0, 5).map((payment) => ({
          id: payment.id,
          note: payment.note,
          provider: payment.provider,
          kind: payment.kind,
          status: payment.status,
          amountLabel:
            payment.kind === "REFUND"
              ? `-${formatCurrencyFromCents(payment.amountCents)}`
              : formatCurrencyFromCents(payment.amountCents),
          occurredAtLabel: formatDateTimeLabel(payment.occurredAt, organizer.timeZone),
          stripeAccountId: payment.stripeAccountId || null
        }))
      };
    })
  };
}

export async function getOrganizerBillingAdmin(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  return {
    organizer: {
      ...organizer,
      ...buildOrganizerLinks(organizer)
    },
    billing: buildOrganizerBillingSnapshot(organizer, organizer.timeZone),
    stripeEnvironment: getStripeEnvironmentState()
  };
}

export async function getOrganizerSettingsAdmin(slug) {
  const state = await loadPersistentState();
  const organizer = getOrganizerRecord(state, slug);

  if (!organizer) {
    return null;
  }

  const primaryAdmin =
    state.organizerAdmins.find((entry) => entry.organizerId === organizer.id && entry.isPrimary) ||
    state.organizerAdmins.find((entry) => entry.organizerId === organizer.id) ||
    null;

  return {
    organizer: {
      ...organizer,
      ...buildOrganizerLinks(organizer)
    },
    primaryAdmin
  };
}

export async function updateOrganizerSettings(slug, input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    organizer.name = normalizeText(input.name) || organizer.name;
    organizer.tagline = normalizeText(input.tagline);
    organizer.description = normalizeText(input.description);
    organizer.city = normalizeText(input.city);
    organizer.region = normalizeText(input.region);
    organizer.publicEmail = normalizeEmail(input.publicEmail) || organizer.publicEmail;
    organizer.publicPhone = normalizeText(input.publicPhone);
    organizer.interestEmail = normalizeEmail(input.interestEmail) || organizer.interestEmail;
    organizer.venueTitle = normalizeText(input.venueTitle);
    organizer.venueDetail = normalizeText(input.venueDetail);
    organizer.venueMapHref = normalizeText(input.venueMapHref);
    organizer.minAdvanceHours = Math.max(0, Math.round(Number(input.minAdvanceHours || 0)));
    organizer.maxAdvanceDays = Math.max(0, Math.round(Number(input.maxAdvanceDays || 0))) || null;
    organizer.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_settings_updated",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Updated organizer settings for ${organizer.name}.`,
      metadata: {
        minAdvanceHours: organizer.minAdvanceHours,
        maxAdvanceDays: organizer.maxAdvanceDays
      }
    });

    return organizer;
  });
}

export async function changeOrganizerAdminPassword(
  slug,
  adminUserId,
  currentPassword,
  nextPassword
) {
  if (!currentPassword || !nextPassword || nextPassword.length < 8) {
    return {
      ok: false,
      message: "Use your current password and choose a new password with at least 8 characters."
    };
  }

  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const admin = draft.organizerAdmins.find(
      (entry) => entry.id === adminUserId && entry.organizerId === organizer?.id && entry.isActive
    );

    if (!organizer || !admin) {
      return {
        ok: false,
        message: "This organizer admin account could not be verified."
      };
    }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);

    if (!valid) {
      return {
        ok: false,
        message: "The current password did not match this organizer admin account."
      };
    }

    admin.passwordHash = await bcrypt.hash(nextPassword, 10);
    admin.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId: adminUserId,
      organizerId: organizer.id,
      eventType: "organizer_password_changed",
      entityType: "organizer_admin",
      entityId: admin.id,
      message: `Updated the password for organizer admin ${admin.email}.`
    });

    return {
      ok: true
    };
  });
}

export async function createOrganizerStripeConnectLink(slug, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    let account = organizer.stripeAccountId
      ? await retrieveStripeConnectedAccount(organizer.stripeAccountId)
      : null;
    const createdNow = !account;

    if (!account) {
      account = await createStripeConnectedAccount({
        organizerId: organizer.id,
        organizerName: organizer.name,
        organizerEmail: organizer.publicEmail,
        slug: organizer.slug
      });
    }

    Object.assign(organizer, getStripeAccountPatch(account, organizer));
    organizer.onlinePaymentsBillingStatus = normalizeOrganizerBillingStatus(
      organizer.onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    );
    organizer.updatedAt = new Date().toISOString();

    const baseUrl = getBaseUrl();
    const link = await createStripeOnboardingAccountLink({
      stripeAccountId: organizer.stripeAccountId,
      refreshUrl: `${baseUrl}/${organizer.slug}/admin/billing/connect`,
      returnUrl: `${baseUrl}/${organizer.slug}/admin/billing/return`
    });

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: createdNow
        ? "organizer_stripe_account_created"
        : "organizer_stripe_onboarding_reopened",
      entityType: "organizer",
      entityId: organizer.id,
      message: createdNow
        ? `Created Stripe Connect account ${organizer.stripeAccountId}.`
        : `Reopened Stripe Connect onboarding for ${organizer.name}.`,
      metadata: {
        stripeAccountId: organizer.stripeAccountId
      }
    });

    return {
      organizerId: organizer.id,
      url: link.url
    };
  });
}

export async function refreshOrganizerStripeConnection(slug, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    if (!organizer.stripeAccountId) {
      organizer.updatedAt = new Date().toISOString();

      return buildOrganizerBillingSnapshot(organizer, organizer.timeZone);
    }

    const account = await retrieveStripeConnectedAccount(organizer.stripeAccountId);

    if (!account) {
      return buildOrganizerBillingSnapshot(organizer, organizer.timeZone);
    }

    Object.assign(organizer, getStripeAccountPatch(account, organizer));
    organizer.onlinePaymentsBillingStatus = normalizeOrganizerBillingStatus(
      organizer.onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    );
    organizer.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: actorId ? "ORGANIZER_ADMIN" : "STRIPE",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_stripe_status_synced",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Synced Stripe Connect readiness for ${organizer.name}.`,
      metadata: {
        stripeAccountId: organizer.stripeAccountId,
        stripeConnectionStatus: organizer.stripeConnectionStatus,
        stripeChargesEnabled: organizer.stripeChargesEnabled,
        stripePayoutsEnabled: organizer.stripePayoutsEnabled
      }
    });

    return buildOrganizerBillingSnapshot(organizer, organizer.timeZone);
  });
}

export async function updateOrganizerBillingSettings(slug, input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    const onlinePaymentsMonthlyFeeCents = Math.max(
      0,
      Math.round(Number(input.onlinePaymentsMonthlyFeeCents || 0))
    );
    const onlinePaymentsBillingStatus = normalizeOrganizerBillingStatus(
      onlinePaymentsMonthlyFeeCents,
      input.onlinePaymentsBillingStatus
    );

    organizer.onlinePaymentsMonthlyFeeCents = onlinePaymentsMonthlyFeeCents;
    organizer.onlinePaymentsBillingStatus = onlinePaymentsBillingStatus;
    organizer.onlinePaymentsBillingActivatedAt =
      onlinePaymentsBillingStatus === ORGANIZER_BILLING_STATUS.ACTIVE
        ? organizer.onlinePaymentsBillingActivatedAt || new Date().toISOString()
        : null;
    organizer.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_billing_updated",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Updated billing settings for ${organizer.name}.`,
      metadata: {
        onlinePaymentsMonthlyFeeCents: organizer.onlinePaymentsMonthlyFeeCents,
        onlinePaymentsBillingStatus: organizer.onlinePaymentsBillingStatus
      }
    });

    return organizer;
  });
}

export async function updateSiteSettings(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    draft.siteSettings.siteName = normalizeText(input.siteName) || draft.siteSettings.siteName;
    draft.siteSettings.siteDescription =
      normalizeText(input.siteDescription) || draft.siteSettings.siteDescription;
    draft.siteSettings.platformEmail =
      normalizeEmail(input.platformEmail) || draft.siteSettings.platformEmail;
    draft.siteSettings.launchInbox =
      normalizeEmail(input.launchInbox) || draft.siteSettings.launchInbox;
    draft.siteSettings.adminNotifications =
      normalizeEmail(input.adminNotifications) || draft.siteSettings.adminNotifications;
    draft.siteSettings.supportResponseTarget =
      normalizeText(input.supportResponseTarget) || draft.siteSettings.supportResponseTarget;
    draft.siteSettings.customDomain = normalizeText(input.customDomain) || null;
    draft.siteSettings.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "site_settings_updated",
      entityType: "site_settings",
      entityId: draft.siteSettings.id,
      message: "Updated platform site settings."
    });
  });
}

export async function updateAboutPage(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    draft.aboutPage.heroEyebrow = normalizeText(input.heroEyebrow);
    draft.aboutPage.heroTitle = normalizeText(input.heroTitle);
    draft.aboutPage.heroSummary = normalizeText(input.heroSummary);
    draft.aboutPage.sections = {
      ...draft.aboutPage.sections,
      cta: {
        title: normalizeText(input.ctaTitle),
        detail: normalizeText(input.ctaDetail)
      }
    };
    draft.aboutPage.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "about_page_updated",
      entityType: "about_page",
      entityId: draft.aboutPage.id,
      message: "Updated about-page content."
    });
  });
}

export async function updateEmailTemplate(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const template = draft.emailTemplates.find((entry) => entry.id === input.id);

    if (!template) {
      return;
    }

    template.subject = normalizeText(input.subject);
    template.preview = normalizeText(input.preview);
    template.bodyHtml = normalizeText(input.bodyHtml);
    template.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      eventType: "email_template_updated",
      entityType: "email_template",
      entityId: template.id,
      message: `Updated email template ${template.slug}.`
    });
  });
}

async function bootstrapOrganizerAdmin(draft, organizer, adminEmail, adminName) {
  const passwordHash = await bcrypt.hash(DEFAULT_LOCAL_PASSWORD, 10);
  const resetToken = createToken();
  const admin = {
    id: createToken(),
    organizerId: organizer.id,
    email: normalizeEmail(adminEmail),
    name: normalizeText(adminName),
    passwordHash,
    isPrimary: true,
    isActive: true,
    passwordResetToken: resetToken,
    passwordResetExpires: addHours(new Date().toISOString(), 24),
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  draft.organizerAdmins.push(admin);

  const resetUrl = `${getBaseUrl()}/${organizer.slug}/admin/login/reset/${resetToken}`;

  await sendTemplate(draft, "password_reset", admin.email, {
    "{{reset_url}}": resetUrl,
    "{{account_name}}": admin.name
  });

  return admin;
}

export async function createOrganizerFromPlatform(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const slug = slugify(input.slug || input.name);

    if (draft.organizers.some((organizer) => organizer.slug === slug)) {
      throw new Error("An organizer with this slug already exists.");
    }

    const organizer = {
      id: createToken(),
      slug,
      name: normalizeText(input.name),
      status: "ACTIVE",
      description: normalizeText(input.description),
      tagline: normalizeText(input.tagline),
      city: normalizeText(input.city),
      region: normalizeText(input.region),
      timeZone: "Europe/Rome",
      publicEmail: normalizeEmail(input.publicEmail),
      publicPhone: normalizeText(input.publicPhone),
      venueTitle: normalizeText(input.venueTitle),
      venueDetail: normalizeText(input.venueDetail),
      venueMapHref: normalizeText(input.venueMapHref),
      interestEmail: normalizeEmail(input.publicEmail),
      themeTags: [],
      policies: [],
      faq: [],
      photoStory: [],
      imageUrl: null,
      minAdvanceHours: 0,
      maxAdvanceDays: null,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    draft.organizers.push(organizer);
    await bootstrapOrganizerAdmin(
      draft,
      organizer,
      input.adminEmail,
      input.adminName || `${organizer.name} Admin`
    );

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_created",
      entityType: "organizer",
      entityId: organizer.id,
      message: `Created organizer ${organizer.name}.`
    });

    return organizer;
  });
}

export async function approveOrganizerRequest(requestId, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const request = draft.joinRequests.find((entry) => entry.id === requestId);

    if (!request || request.status !== "PENDING") {
      return null;
    }

    const organizer = {
      id: createToken(),
      slug: slugify(request.organizerName),
      name: request.organizerName,
      status: "ACTIVE",
      description: request.eventFocus,
      tagline: `${request.organizerName} on Passreserve`,
      city: request.city,
      region: "Italy",
      timeZone: "Europe/Rome",
      publicEmail: request.contactEmail,
      publicPhone: request.contactPhone,
      venueTitle: `${request.city} host venue`,
      venueDetail: "Update the organizer venue details from the organizer dashboard.",
      venueMapHref: "",
      interestEmail: request.contactEmail,
      themeTags: [],
      policies: [],
      faq: [],
      photoStory: [],
      imageUrl: null,
      minAdvanceHours: 0,
      maxAdvanceDays: null,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    draft.organizers.push(organizer);
    await bootstrapOrganizerAdmin(draft, organizer, request.contactEmail, request.contactName);

    request.status = "APPROVED";
    request.organizerId = organizer.id;
    request.approvedById = actorId;
    request.approvedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "PLATFORM_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_request_approved",
      entityType: "organizer_join_request",
      entityId: request.id,
      message: `Approved organizer request for ${request.organizerName}.`
    });

    return organizer;
  });
}

export async function saveOrganizerEvent(slug, input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);

    if (!organizer) {
      return null;
    }

    let event = input.id ? draft.events.find((entry) => entry.id === input.id) : null;

    if (!event) {
      event = {
        id: createToken(),
        organizerId: organizer.id,
        slug: slugify(input.slug || input.title),
        createdAt: new Date().toISOString()
      };
      draft.events.push(event);
      draft.ticketCategories.push({
        id: createToken(),
        eventTypeId: event.id,
        slug: "general",
        name: "General admission",
        description: "Standard access to this event.",
        unitPriceCents: Math.round(Number(input.basePriceCents || 0)),
        isDefault: true,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    Object.assign(event, {
      title: normalizeText(input.title),
      category: normalizeText(input.category),
      visibility: input.visibility || "DRAFT",
      summary: normalizeText(input.summary),
      description: normalizeText(input.description),
      audience: normalizeText(input.audience),
      durationMinutes: Number(input.durationMinutes || 180),
      venueTitle: normalizeText(input.venueTitle) || organizer.venueTitle,
      venueDetail: normalizeText(input.venueDetail) || organizer.venueDetail,
      mapHref: normalizeText(input.mapHref),
      basePriceCents: Math.round(Number(input.basePriceCents || 0)),
      prepayPercentage: Math.max(0, Math.min(100, Number(input.prepayPercentage || 0))),
      attendeeInstructions: normalizeText(input.attendeeInstructions),
      organizerNotes: normalizeText(input.organizerNotes),
      cancellationPolicy: normalizeText(input.cancellationPolicy),
      highlights: normalizeText(input.highlights)
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
      included: normalizeText(input.included)
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
      policies: normalizeText(input.policies)
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean),
      faq: [],
      gallery: [],
      imageUrl: normalizeText(input.imageUrl) || null,
      updatedAt: new Date().toISOString()
    });

    const ticket = draft.ticketCategories.find((entry) => entry.eventTypeId === event.id);

    if (ticket) {
      ticket.unitPriceCents = event.basePriceCents;
      ticket.updatedAt = new Date().toISOString();
    }

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_event_saved",
      entityType: "event_type",
      entityId: event.id,
      message: `Saved event ${event.title}.`
    });

    return event;
  });
}

export async function saveOrganizerOccurrence(slug, input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const event = draft.events.find(
      (entry) => entry.id === input.eventTypeId && entry.organizerId === organizer?.id
    );

    if (!organizer || !event) {
      return null;
    }

    let occurrence = input.id ? draft.occurrences.find((entry) => entry.id === input.id) : null;

    if (!occurrence) {
      occurrence = {
        id: createToken(),
        eventTypeId: event.id,
        createdAt: new Date().toISOString()
      };
      draft.occurrences.push(occurrence);
    }

    const resolvedCapacity =
      input.capacity === "" || input.capacity == null ? 12 : Number(input.capacity);
    const resolvedPriceCents =
      input.priceCents === "" || input.priceCents == null
        ? event.basePriceCents
        : Number(input.priceCents);
    const resolvedPrepayPercentage =
      input.prepayPercentage === "" || input.prepayPercentage == null
        ? event.prepayPercentage
        : Number(input.prepayPercentage);

    const nextOccurrence = {
      ...occurrence,
      priceCents: Math.round(resolvedPriceCents),
      prepayPercentage: Math.max(0, Math.min(100, resolvedPrepayPercentage)),
      published: input.published === "true" || input.published === true
    };
    const billingGate = getOrganizerOnlinePaymentsGate(organizer);

    if (
      nextOccurrence.published &&
      isOccurrenceUsingOnlinePayments(nextOccurrence) &&
      !billingGate.enabled
    ) {
      throw new Error(billingGate.blockers[0] || "Paid occurrences cannot be published yet.");
    }

    Object.assign(occurrence, {
      status: input.status || "SCHEDULED",
      startsAt: normalizeText(input.startsAt),
      endsAt: normalizeText(input.endsAt),
      capacity: resolvedCapacity,
      priceCents: nextOccurrence.priceCents,
      prepayPercentage: nextOccurrence.prepayPercentage,
      venueTitle: normalizeText(input.venueTitle) || event.venueTitle,
      note: normalizeText(input.note),
      published: nextOccurrence.published,
      imageUrl: normalizeText(input.imageUrl) || null,
      updatedAt: new Date().toISOString()
    });

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_occurrence_saved",
      entityType: "event_occurrence",
      entityId: occurrence.id,
      message: `Saved an occurrence for ${event.title}.`
    });

    return occurrence;
  });
}

export async function updateOrganizerRegistration(slug, registrationId, action, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const registration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
    );

    if (!organizer || !registration) {
      return null;
    }

    if (action === "mark_paid") {
      registration.onlineCollectedCents = registration.onlineAmountCents;
      registration.status =
        registration.dueAtEventCents > 0 ? "CONFIRMED_PARTIALLY_PAID" : "CONFIRMED_PAID";
      draft.payments.unshift({
        id: createToken(),
        registrationId: registration.id,
        provider: "MANUAL",
        kind: "ADJUSTMENT",
        status: "SUCCEEDED",
        amountCents: registration.onlineAmountCents,
        currency: registration.currency,
        externalEventId: null,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        note: "Marked as paid manually by organizer admin.",
        metadata: null,
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
    } else if (action === "mark_attended") {
      registration.status = "ATTENDED";
      registration.attendedAt = new Date().toISOString();
    } else if (action === "mark_no_show") {
      registration.status = "NO_SHOW";
      registration.noShowAt = new Date().toISOString();
    } else if (action === "cancel") {
      registration.status = "CANCELLED";
      registration.cancelledAt = new Date().toISOString();
    }

    registration.updatedAt = new Date().toISOString();

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "organizer_registration_updated",
      entityType: "registration",
      entityId: registration.id,
      message: `Applied organizer action ${action} to ${registration.registrationCode || registration.id}.`
    });

    return registration;
  });
}

export async function recordVenuePayment(slug, registrationId, amountCents, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const organizer = getOrganizerRecord(draft, slug);
    const registration = draft.registrations.find(
      (entry) => entry.id === registrationId && entry.organizerId === organizer?.id
    );

    if (!organizer || !registration) {
      return null;
    }

    registration.venueCollectedCents += Math.max(0, Math.round(Number(amountCents || 0)));
    registration.updatedAt = new Date().toISOString();
    draft.payments.unshift({
      id: createToken(),
      registrationId: registration.id,
      provider: "VENUE",
      kind: "ADJUSTMENT",
      status: "SUCCEEDED",
      amountCents: Math.max(0, Math.round(Number(amountCents || 0))),
      currency: registration.currency,
      externalEventId: null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      note: "Recorded venue payment.",
      metadata: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    await appendAuditLog(draft, {
      actorType: "ORGANIZER_ADMIN",
      actorId,
      organizerId: organizer.id,
      registrationId: registration.id,
      eventType: "venue_payment_recorded",
      entityType: "registration_payment",
      entityId: registration.id,
      message: `Recorded a venue payment for ${registration.registrationCode || registration.id}.`
    });

    return registration;
  });
}
