import { sendTransactionalEmail } from "./passreserve-email.js";
import {
  createToken,
  formatCurrencyFromCents,
  normalizeEmail
} from "./passreserve-format.js";

export const DEFAULT_REGISTRATION_REMINDER_LEAD_HOURS = 24;

export const REGISTRATION_REMINDER_LEAD_OPTIONS = [
  {
    value: 2,
    label: "2 hours before start"
  },
  {
    value: 4,
    label: "4 hours before start"
  },
  {
    value: 24,
    label: "24 hours before start"
  },
  {
    value: 48,
    label: "48 hours before start"
  },
  {
    value: 72,
    label: "72 hours before start"
  }
];

export function normalizeReminderLeadHours(value) {
  const resolved = Number(value);

  return REGISTRATION_REMINDER_LEAD_OPTIONS.some((option) => option.value === resolved)
    ? resolved
    : DEFAULT_REGISTRATION_REMINDER_LEAD_HOURS;
}

export function buildEmailDeliveryDedupeKey(...parts) {
  return parts
    .flatMap((part) => {
      if (part == null) {
        return [];
      }

      const normalized = String(part).trim();

      return normalized ? [normalized] : [];
    })
    .join("::");
}

function buildFailureKey(dedupeKey) {
  return buildEmailDeliveryDedupeKey(
    dedupeKey,
    "failed",
    new Date().toISOString(),
    createToken().slice(0, 8)
  );
}

function buildLoggedDedupeKey(dedupeKey) {
  return dedupeKey || buildEmailDeliveryDedupeKey("email", createToken(), Date.now());
}

function buildEmailLogEntry({
  dedupeKey,
  deliveryStatus,
  metadata,
  occurrenceId,
  organizerId,
  providerMessageId,
  recipientEmail,
  registrationId,
  templateSlug
}) {
  const now = new Date().toISOString();

  return {
    id: createToken(),
    recipientEmail: normalizeEmail(recipientEmail),
    templateSlug,
    organizerId: organizerId || null,
    registrationId: registrationId || null,
    occurrenceId: occurrenceId || null,
    dedupeKey,
    deliveryStatus,
    providerMessageId: providerMessageId || null,
    sentAt: now,
    metadata: metadata || null,
    createdAt: now
  };
}

function hasSentDelivery(logs = [], dedupeKey) {
  if (!dedupeKey) {
    return false;
  }

  return logs.some(
    (entry) => entry.dedupeKey === dedupeKey && entry.deliveryStatus === "SENT"
  );
}

export function shouldSendReminderForRegistration(registration) {
  return ["CONFIRMED_UNPAID", "CONFIRMED_PARTIALLY_PAID", "CONFIRMED_PAID"].includes(
    registration.status
  );
}

export function shouldSendOccurrenceCancellationForRegistration(registration) {
  return !["PENDING_CONFIRM", "CANCELLED", "ATTENDED", "NO_SHOW"].includes(
    registration.status
  );
}

export function getRegistrationPaymentStateLabel(registration) {
  if (registration.refundedCents > 0) {
    return "Payment updated after a refund";
  }

  if (registration.onlineAmountCents <= 0) {
    return "Payment due at the event";
  }

  if (registration.onlineCollectedCents >= registration.onlineAmountCents) {
    return registration.dueAtEventCents > 0
      ? "Deposit paid online, balance due at the event"
      : "Paid online in full";
  }

  if (registration.status === "PENDING_PAYMENT") {
    return "Awaiting online payment";
  }

  if (registration.onlineCollectedCents > 0) {
    return "Online payment partially received";
  }

  return "Online payment still due";
}

export function getRegistrationRefundStateLabel(registration, currency = "EUR") {
  if (registration.refundedCents > 0) {
    return `${formatCurrencyFromCents(registration.refundedCents, currency)} has already been refunded online.`;
  }

  if (registration.onlineCollectedCents > 0) {
    return `${formatCurrencyFromCents(registration.onlineCollectedCents, currency)} was collected online. Follow up manually if a refund is needed.`;
  }

  if (registration.dueAtEventCents > 0) {
    return "No online amount was collected. Any balance was due at the event only.";
  }

  return "No payment was collected online for this registration.";
}

export function resolveOrganizerNotificationEmailFromState(state, organizer) {
  const primaryAdmin = state.organizerAdmins.find(
    (entry) => entry.organizerId === organizer.id && entry.isPrimary && entry.isActive
  );
  const fallbackAdmin = state.organizerAdmins.find(
    (entry) => entry.organizerId === organizer.id && entry.isActive
  );

  return (
    primaryAdmin?.email ||
    fallbackAdmin?.email ||
    organizer.interestEmail ||
    organizer.publicEmail ||
    null
  );
}

export async function resolveOrganizerNotificationEmailFromPrisma(prisma, organizer) {
  const primaryAdmin =
    (await prisma.organizerAdminUser.findFirst({
      where: {
        organizerId: organizer.id,
        isPrimary: true,
        isActive: true
      },
      orderBy: {
        createdAt: "asc"
      }
    })) ||
    (await prisma.organizerAdminUser.findFirst({
      where: {
        organizerId: organizer.id,
        isActive: true
      },
      orderBy: {
        createdAt: "asc"
      }
    })) ||
    null;

  return primaryAdmin?.email || organizer.interestEmail || organizer.publicEmail || null;
}

export async function sendStateTemplateEmail(state, options) {
  const template = state.emailTemplates.find((entry) => entry.slug === options.templateSlug);
  const to = normalizeEmail(options.to);
  const intendedDedupeKey = buildLoggedDedupeKey(options.dedupeKey);

  if (!template || !to) {
    return {
      ok: false,
      skipped: true
    };
  }

  if (!Array.isArray(state.emailDeliveries)) {
    state.emailDeliveries = [];
  }

  if (hasSentDelivery(state.emailDeliveries, intendedDedupeKey)) {
    return {
      ok: true,
      skipped: true
    };
  }

  const result = await sendTransactionalEmail({
    to,
    subject: template.subject,
    html: template.bodyHtml,
    replyTo: options.replyTo || null,
    replacements: options.replacements || {}
  });

  state.emailDeliveries.unshift(
    buildEmailLogEntry({
      dedupeKey: result.ok ? intendedDedupeKey : buildFailureKey(intendedDedupeKey),
      deliveryStatus: result.ok ? "SENT" : "FAILED",
      metadata: {
        ...(options.metadata || {}),
        intendedDedupeKey
      },
      occurrenceId: options.occurrenceId,
      organizerId: options.organizerId,
      providerMessageId: result.id,
      recipientEmail: to,
      registrationId: options.registrationId,
      templateSlug: options.templateSlug
    })
  );

  return result;
}

export async function sendPrismaTemplateEmail(prisma, options) {
  const to = normalizeEmail(options.to);
  const template = await prisma.emailTemplate.findFirst({
    where: {
      slug: options.templateSlug
    }
  });
  const intendedDedupeKey = buildLoggedDedupeKey(options.dedupeKey);

  if (!template || !to) {
    return {
      ok: false,
      skipped: true
    };
  }

  const existing = await prisma.emailDeliveryLog.findUnique({
    where: {
      dedupeKey: intendedDedupeKey
    }
  });

  if (existing?.deliveryStatus === "SENT") {
    return {
      ok: true,
      skipped: true
    };
  }

  const result = await sendTransactionalEmail({
    to,
    subject: template.subject,
    html: template.bodyHtml,
    replyTo: options.replyTo || null,
    replacements: options.replacements || {}
  });

  await prisma.emailDeliveryLog.create({
    data: buildEmailLogEntry({
      dedupeKey: result.ok ? intendedDedupeKey : buildFailureKey(intendedDedupeKey),
      deliveryStatus: result.ok ? "SENT" : "FAILED",
      metadata: {
        ...(options.metadata || {}),
        intendedDedupeKey
      },
      occurrenceId: options.occurrenceId,
      organizerId: options.organizerId,
      providerMessageId: result.id,
      recipientEmail: to,
      registrationId: options.registrationId,
      templateSlug: options.templateSlug
    })
  });

  return result;
}
