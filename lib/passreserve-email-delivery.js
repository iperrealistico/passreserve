import { sendTransactionalEmail } from "./passreserve-email.js";
import { resolveLocalizedEmailTemplate } from "./passreserve-email-templates.js";
import { createToken, normalizeEmail } from "./passreserve-format.js";
import { getRegistrationRefundSummary } from "./passreserve-refunds.js";
import { REGISTRATION_LANGUAGE, normalizeRegistrationLocale } from "./passreserve-registration-language.js";

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

export function getRegistrationSourceLabel(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  return getRegistrationSourceLabelLocalized(registration, locale);
}

export function getRegistrationSourceLabelLocalized(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  const isItalian = normalizeRegistrationLocale(locale) === REGISTRATION_LANGUAGE.IT;

  if (registration?.source === "ORGANIZER_MANUAL") {
    return isItalian ? "Inserita dallo staff" : "Manual organizer entry";
  }

  if (registration?.source === "IMPORT") {
    return isItalian ? "Registrazione importata" : "Imported registration";
  }

  return isItalian ? "Registrazione pubblica" : "Public registration";
}

export function getRegistrationOriginLabel(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  return getRegistrationOriginLabelLocalized(registration, locale);
}

export function getRegistrationOriginLabelLocalized(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  const isItalian = normalizeRegistrationLocale(locale) === REGISTRATION_LANGUAGE.IT;

  if (registration?.source === "IMPORT") {
    return isItalian ? "Record importato" : "Imported record";
  }

  const origin = String(registration?.origin || "").trim().toLowerCase();

  if (origin === "walk-in") {
    return isItalian ? "Banco walk-in" : "Walk-in desk";
  }

  if (origin === "phone") {
    return isItalian ? "Richiesta telefonica" : "Phone request";
  }

  if (origin === "email") {
    return isItalian ? "Richiesta via email" : "Email request";
  }

  if (registration?.source === "ORGANIZER_MANUAL") {
    return isItalian ? "Staff organizer" : "Organizer staff";
  }

  return isItalian ? "Flusso pubblico di prenotazione" : "Public booking flow";
}

export function getRegistrationSourceNote(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  return getRegistrationSourceNoteLocalized(registration, locale);
}

export function getRegistrationSourceNoteLocalized(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  const resolvedLocale = normalizeRegistrationLocale(locale);
  const isItalian = resolvedLocale === REGISTRATION_LANGUAGE.IT;

  if (registration?.source === "ORGANIZER_MANUAL") {
    return isItalian
      ? `Questa registrazione è stata preparata dallo staff dell'organizer tramite ${getRegistrationOriginLabelLocalized(registration, resolvedLocale).toLowerCase()}.`
      : `This registration was prepared by the organizer team via ${getRegistrationOriginLabelLocalized(registration, resolvedLocale).toLowerCase()}.`;
  }

  if (registration?.source === "IMPORT") {
    return isItalian
      ? "Questa registrazione è stata importata in Passreserve ed è ora tracciata nella coda live."
      : "This registration was imported into Passreserve and is now tracked in the live queue.";
  }

  return isItalian
    ? "Questa registrazione è tracciata tramite il normale flusso di prenotazione Passreserve."
    : "This registration is tracked through the standard Passreserve booking flow.";
}

export function getRegistrationPaymentStateLabel(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  return getRegistrationPaymentStateLabelLocalized(registration, locale);
}

export function getRegistrationPaymentStateLabelLocalized(
  registration,
  locale = REGISTRATION_LANGUAGE.EN
) {
  const isItalian = normalizeRegistrationLocale(locale) === REGISTRATION_LANGUAGE.IT;
  const onlineAmountCents = Number(registration.onlineAmountCents || 0);
  const onlineCollectedCents = Number(registration.onlineCollectedCents || 0);
  const dueAtEventCents = Number(registration.dueAtEventCents || 0);
  const venueCollectedCents = Number(registration.venueCollectedCents || 0);
  const remainingOnlineCents = Math.max(0, onlineAmountCents - onlineCollectedCents);
  const remainingVenueCents = Math.max(0, dueAtEventCents - venueCollectedCents);
  const isOrganizerManual = registration?.source === "ORGANIZER_MANUAL";

  if (registration.refundedCents > 0) {
    return isItalian ? "Pagamento aggiornato dopo un rimborso" : "Payment updated after a refund";
  }

  if (remainingOnlineCents === 0 && remainingVenueCents === 0) {
    if (onlineCollectedCents > 0 && dueAtEventCents > 0) {
      return isOrganizerManual
        ? isItalian
          ? "L'organizer ha segnato questa registrazione come saldata"
          : "Organizer marked this registration as fully settled"
        : isItalian
          ? "Pagata online e saldata per intero"
          : "Paid online and settled in full";
    }

    if (onlineCollectedCents > 0) {
      return isOrganizerManual
        ? isItalian
          ? "L'organizer ha registrato questa prenotazione come pagata"
          : "Organizer recorded this registration as paid"
        : isItalian
          ? "Pagata online per intero"
          : "Paid online in full";
    }

    if (venueCollectedCents > 0) {
      return isItalian ? "Pagata sul posto" : "Paid at the venue";
    }

    return isItalian ? "Nessun pagamento dovuto" : "No payment due";
  }

  if (onlineAmountCents <= 0) {
    if (venueCollectedCents > 0) {
      return isItalian ? "Pagamento sul posto parzialmente incassato" : "Venue payment partially collected";
    }

    return isItalian ? "Pagamento dovuto all'evento" : "Payment due at the event";
  }

  if (onlineCollectedCents >= onlineAmountCents) {
    return dueAtEventCents > 0
      ? isOrganizerManual
        ? isItalian
          ? "L'organizer ha registrato l'acconto, saldo dovuto all'evento"
          : "Organizer recorded the deposit, balance due at the event"
        : isItalian
          ? "Acconto pagato online, saldo dovuto all'evento"
          : "Deposit paid online, balance due at the event"
      : isOrganizerManual
        ? isItalian
          ? "L'organizer ha registrato questa prenotazione come pagata"
          : "Organizer recorded this registration as paid"
        : isItalian
          ? "Pagata online per intero"
          : "Paid online in full";
  }

  if (registration.status === "PENDING_PAYMENT") {
    return isItalian ? "In attesa del pagamento online" : "Awaiting online payment";
  }

  if (onlineCollectedCents > 0) {
    return isOrganizerManual
      ? isItalian
        ? "L'organizer ha registrato un pagamento online equivalente parziale"
        : "Organizer recorded a partial online-payment equivalent"
      : isItalian
        ? "Pagamento online parzialmente ricevuto"
        : "Online payment partially received";
  }

  return isOrganizerManual
    ? isItalian
      ? "L'equivalente del pagamento online deve ancora essere incassato"
      : "Online-payment equivalent still needs to be collected"
    : isItalian
      ? "Pagamento online ancora dovuto"
      : "Online payment still due";
}

export function getRegistrationRefundStateLabel(
  registration,
  currency = "EUR",
  payments = [],
  locale = REGISTRATION_LANGUAGE.EN
) {
  return getRegistrationRefundStateLabelLocalized(registration, currency, payments, locale);
}

export function getRegistrationRefundStateLabelLocalized(
  registration,
  currency = "EUR",
  payments = [],
  locale = REGISTRATION_LANGUAGE.EN
) {
  const isItalian = normalizeRegistrationLocale(locale) === REGISTRATION_LANGUAGE.IT;
  const refundSummary = getRegistrationRefundSummary(registration, payments, {
    currency
  });

  if (refundSummary.pendingRefundCents > 0) {
    return isItalian
      ? `Rimborso avviato: ${refundSummary.pendingRefundLabel} è stato richiesto su Stripe ed è in attesa di conferma.`
      : `Refund initiated: ${refundSummary.pendingRefundLabel} has been requested on Stripe and is waiting for confirmation.`;
  }

  if (refundSummary.alreadyRefundedCents > 0) {
    return isItalian
      ? `Rimborso completato: ${refundSummary.alreadyRefundedLabel} risulta già confermato come rimborsato online.`
      : `Refund completed: ${refundSummary.alreadyRefundedLabel} has already been confirmed as refunded online.`;
  }

  if (refundSummary.onlineCollectedCents > 0) {
    return isItalian
      ? `Follow-up manuale: ${refundSummary.onlineCollectedLabel} è stato incassato online. Rispondi se hai bisogno che l'organizer organizzi manualmente il rimborso.`
      : `Manual follow-up: ${refundSummary.onlineCollectedLabel} was collected online. Reply if you need the organizer to arrange the refund manually.`;
  }

  if (registration.dueAtEventCents > 0) {
    return isItalian
      ? "Nessun rimborso online: non è stato incassato alcun importo online. L'eventuale saldo era dovuto solo all'evento."
      : "No online refund: no online amount was collected. Any balance was due at the event only.";
  }

  return isItalian
    ? "Nessun rimborso online: per questa registrazione non è stato incassato alcun pagamento online."
    : "No online refund: no payment was collected online for this registration.";
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
  const locale = options.locale ? normalizeRegistrationLocale(options.locale) : null;

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

  const localizedTemplate = resolveLocalizedEmailTemplate(
    template,
    locale || REGISTRATION_LANGUAGE.EN
  );
  const result = await sendTransactionalEmail({
    to,
    subject: localizedTemplate.subject,
    html: localizedTemplate.bodyHtml,
    replyTo: options.replyTo || null,
    replacements: options.replacements || {}
  });

  state.emailDeliveries.unshift(
    buildEmailLogEntry({
      dedupeKey: result.ok ? intendedDedupeKey : buildFailureKey(intendedDedupeKey),
      deliveryStatus: result.ok ? "SENT" : "FAILED",
      metadata: {
        ...(options.metadata || {}),
        intendedDedupeKey,
        ...(locale
          ? {
              locale
            }
          : {})
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
  const locale = options.locale ? normalizeRegistrationLocale(options.locale) : null;

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

  const localizedTemplate = resolveLocalizedEmailTemplate(
    template,
    locale || REGISTRATION_LANGUAGE.EN
  );
  const result = await sendTransactionalEmail({
    to,
    subject: localizedTemplate.subject,
    html: localizedTemplate.bodyHtml,
    replyTo: options.replyTo || null,
    replacements: options.replacements || {}
  });

  await prisma.emailDeliveryLog.create({
    data: buildEmailLogEntry({
      dedupeKey: result.ok ? intendedDedupeKey : buildFailureKey(intendedDedupeKey),
      deliveryStatus: result.ok ? "SENT" : "FAILED",
      metadata: {
        ...(options.metadata || {}),
        intendedDedupeKey,
        ...(locale
          ? {
              locale
            }
          : {})
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
