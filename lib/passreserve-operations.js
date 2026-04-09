import { calculatePaymentBreakdown } from "./passreserve-domain";
import { getOrganizerAdminBySlug, getOrganizerAdminSlugs } from "./passreserve-admin";

const OPERATIONS_REFERENCE_ISO = "2026-04-05T09:30:00+02:00";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const attendeeFirstNames = [
  "Giulia",
  "Luca",
  "Marta",
  "Tommaso",
  "Chiara",
  "Nico",
  "Sofia",
  "Elia",
  "Pietro",
  "Lea",
  "Irene",
  "Matteo"
];

const attendeeLastNames = [
  "Rinaldi",
  "Conti",
  "Marchi",
  "Sala",
  "Bassi",
  "Gallo",
  "Bruni",
  "Vitali",
  "Ferri",
  "Moretti",
  "Greco",
  "Fabbri"
];

const venueNotes = [
  "Check-in desk opens 20 minutes before the start time.",
  "Late arrivals need organizer approval before the seat can be reassigned.",
  "Family and accessibility notes stay attached to the occurrence, not just the event type.",
  "Venue balances are closed at the front desk after check-in.",
  "Organizers use this note slot for room changes, rain plans, or quiet follow-up."
];

const providerModes = {
  venue: "Venue collection",
  "stripe-live": "Stripe Checkout",
  "stripe-preview": "Stripe preview",
  manual: "Manual adjustment"
};

const registrationStatusMeta = {
  PENDING_CONFIRM: {
    label: "Pending confirm",
    tone: "draft"
  },
  PENDING_PAYMENT: {
    label: "Pending payment",
    tone: "capacity-watch"
  },
  CONFIRMED_UNPAID: {
    label: "Confirmed, venue balance due",
    tone: "unlisted"
  },
  CONFIRMED_PARTIALLY_PAID: {
    label: "Deposit received",
    tone: "public"
  },
  CONFIRMED_PAID: {
    label: "Paid in full",
    tone: "public"
  },
  ATTENDED: {
    label: "Attended",
    tone: "public"
  },
  NO_SHOW: {
    label: "No-show",
    tone: "cancelled"
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "cancelled"
  }
};

const paymentStatusMeta = {
  NONE: {
    label: "No online payment",
    tone: "neutral"
  },
  PENDING: {
    label: "Pending",
    tone: "pending"
  },
  PARTIALLY_PAID: {
    label: "Partially paid",
    tone: "partial"
  },
  PAID: {
    label: "Paid",
    tone: "paid"
  },
  FAILED: {
    label: "Failed",
    tone: "failed"
  },
  REFUNDED: {
    label: "Refunded",
    tone: "failed"
  }
};

export const organizerOperationsPhase = {
  label: "Host dashboard",
  title: "Dates, registrations, payments, and guest follow-up",
  summary:
    "Passreserve.com keeps registrations, calendar views, payments, and day-of follow-up together so hosts can run events without extra tools."
};

export const organizerOperationsGuidance = [
  {
    title: "Registration and revenue stay visible",
    detail:
      "Hosts can see confirmations, payment follow-up, online collection, and any balance still due at the venue in one place."
  },
  {
    title: "The calendar stays date-first",
    detail:
      "Each day highlights attendees, payments, and capacity so the team can prep the event with confidence."
  },
  {
    title: "Payments stay straightforward",
    detail:
      "Hosts can confirm registrations, cancel them, mark no-shows, record online payments, and close venue balances without losing context."
  }
];

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function getFormatter(timeZone, options) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    ...options
  });
}

function formatDateInTimeZone(value, timeZone) {
  return getFormatter(timeZone, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatWeekdayInTimeZone(value, timeZone) {
  return getFormatter(timeZone, {
    weekday: "long"
  }).format(new Date(value));
}

function formatDateTimeInTimeZone(value, timeZone) {
  return getFormatter(timeZone, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatTimeInTimeZone(value, timeZone) {
  return getFormatter(timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatTimeRange(startValue, endValue, timeZone) {
  return `${formatTimeInTimeZone(startValue, timeZone)} to ${formatTimeInTimeZone(
    endValue,
    timeZone
  )}`;
}

function toDayKey(value, timeZone) {
  const parts = getFormatter(timeZone, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function addDays(value, days) {
  const date = new Date(value);

  date.setDate(date.getDate() + days);

  return date.toISOString();
}

function addHours(value, hours) {
  const date = new Date(value);

  date.setHours(date.getHours() + hours);

  return date.toISOString();
}

function simpleHash(value) {
  return Array.from(String(value)).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) % 2147483647,
    17
  );
}

function buildReference(prefix, seed) {
  return `${prefix}_${simpleHash(seed).toString(36).padStart(10, "0").slice(0, 10)}`;
}

function getOrganizerTimeZone(organizer) {
  return organizer.timeZone || "Europe/Rome";
}

function formatQuantityLabel(quantity) {
  return `${quantity} attendee${quantity === 1 ? "" : "s"}`;
}

function flattenPublishedOccurrences(organizer) {
  return organizer.events
    .flatMap((event) =>
      event.occurrences
        .filter((occurrence) => occurrence.published)
        .map((occurrence) => ({
          ...occurrence,
          eventSlug: event.slug,
          eventTitle: event.title
        }))
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function createPaymentSnapshot(payment, scenario, seed) {
  const normalizedScenario =
    (scenario === "pending-payment" || scenario === "failed-payment") &&
    payment.onlineAmount === 0
      ? "confirmed"
      : scenario;

  let providerMode = payment.onlineAmount > 0 ? "stripe-live" : "venue";
  let onlineCollected = 0;
  let venueCollected = 0;
  let refundedAmount = 0;
  let paymentStatus = "NONE";

  switch (normalizedScenario) {
    case "pending-payment":
      paymentStatus = "PENDING";
      break;
    case "failed-payment":
      paymentStatus = "FAILED";
      break;
    case "confirmed":
      if (payment.onlineAmount > 0) {
        onlineCollected = payment.onlineAmount;
        paymentStatus = payment.dueAtEvent > 0 ? "PARTIALLY_PAID" : "PAID";
      }
      break;
    case "attended":
      onlineCollected = payment.onlineAmount;
      venueCollected = payment.dueAtEvent;
      paymentStatus = "PAID";
      break;
    case "no-show":
      onlineCollected = payment.onlineAmount;
      paymentStatus = payment.onlineAmount > 0 ? "PARTIALLY_PAID" : "NONE";
      break;
    case "cancelled":
      refundedAmount = payment.onlineAmount;
      paymentStatus = payment.onlineAmount > 0 ? "REFUNDED" : "NONE";
      break;
    default:
      providerMode = payment.onlineAmount > 0 ? "stripe-live" : "venue";
      paymentStatus = "NONE";
  }

  return {
    providerMode,
    providerLabel: providerModes[providerMode],
    onlineAmountExpected: payment.onlineAmount,
    dueAtEventExpected: payment.dueAtEvent,
    subtotal: payment.subtotal,
    onlineCollected,
    venueCollected,
    refundedAmount,
    paymentStatus,
    sessionId:
      payment.onlineAmount > 0 && normalizedScenario !== "pending-confirm"
        ? buildReference("cs", `${seed}-session`)
        : null,
    paymentIntentId:
      payment.onlineAmount > 0 &&
      ["confirmed", "attended", "pending-payment", "failed-payment", "cancelled"].includes(
        normalizedScenario
      )
        ? buildReference("pi", `${seed}-intent`)
        : null
  };
}

function decoratePaymentState(payment) {
  const dueAtEventOutstanding = Math.max(
    0,
    payment.dueAtEventExpected - payment.venueCollected
  );

  let collectionSummary = "No online amount collected yet.";

  if (payment.refundedAmount > 0) {
    collectionSummary = `${formatCurrency(payment.refundedAmount)} refunded after cancellation.`;
  } else if (payment.onlineCollected > 0 && dueAtEventOutstanding > 0) {
    collectionSummary = `${formatCurrency(payment.onlineCollected)} collected online, ${formatCurrency(
      dueAtEventOutstanding
    )} still due at the venue.`;
  } else if (payment.onlineCollected > 0) {
    collectionSummary = `${formatCurrency(payment.onlineCollected)} fully settled online.`;
  } else if (dueAtEventOutstanding > 0) {
    collectionSummary = `${formatCurrency(dueAtEventOutstanding)} still due at the venue.`;
  }

  return {
    ...payment,
    paymentStatusLabel: paymentStatusMeta[payment.paymentStatus].label,
    paymentStatusTone: paymentStatusMeta[payment.paymentStatus].tone,
    subtotalLabel: formatCurrency(payment.subtotal),
    onlineAmountExpectedLabel: formatCurrency(payment.onlineAmountExpected),
    onlineCollectedLabel: formatCurrency(payment.onlineCollected),
    dueAtEventExpectedLabel: formatCurrency(payment.dueAtEventExpected),
    dueAtEventOutstanding,
    dueAtEventOutstandingLabel: formatCurrency(dueAtEventOutstanding),
    venueCollectedLabel: formatCurrency(payment.venueCollected),
    refundedAmountLabel: formatCurrency(payment.refundedAmount),
    collectionSummary
  };
}

function decorateRecord(record) {
  const statusMeta = registrationStatusMeta[record.status];
  const timeZone = record.timeZone;

  return {
    ...record,
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
    startsAtLabel: formatDateTimeInTimeZone(record.startsAt, timeZone),
    dayLabel: `${formatWeekdayInTimeZone(record.startsAt, timeZone)} · ${formatDateInTimeZone(
      record.startsAt,
      timeZone
    )}`,
    timeRangeLabel: formatTimeRange(record.startsAt, record.endsAt, timeZone),
    createdAtLabel: formatDateTimeInTimeZone(record.createdAt, timeZone),
    payment: decoratePaymentState(record.payment)
  };
}

function createRecord({
  organizer,
  occurrence,
  quantity,
  scenario,
  createdAt,
  occurrenceOffsetDays = 0,
  note,
  actionHint,
  recordIndex
}) {
  const timeZone = getOrganizerTimeZone(organizer);
  const startsAt = occurrenceOffsetDays ? addDays(occurrence.startsAt, occurrenceOffsetDays) : occurrence.startsAt;
  const endsAt = occurrenceOffsetDays ? addDays(occurrence.endsAt, occurrenceOffsetDays) : occurrence.endsAt;
  const payment = calculatePaymentBreakdown({
    unitPrice: occurrence.price,
    quantity,
    prepayPercentage: occurrence.prepayPercentage
  });
  const seed = `${organizer.slug}-${occurrence.eventSlug}-${occurrence.id}-${scenario}-${recordIndex}`;
  const attendeeIndex = simpleHash(seed) % attendeeFirstNames.length;
  const registrationCode = `PR-${simpleHash(`${seed}-code`)
    .toString(16)
    .toUpperCase()
    .padStart(10, "0")
    .slice(0, 10)}`;
  const attendeeName = `${attendeeFirstNames[attendeeIndex]} ${
    attendeeLastNames[(attendeeIndex + recordIndex) % attendeeLastNames.length]
  }`;
  const emailStem = attendeeName.toLowerCase().replace(/[^a-z]+/g, ".");

  const rawRecord = {
    id: `reg-${simpleHash(`${seed}-record`).toString(36)}`,
    organizerSlug: organizer.slug,
    organizerName: organizer.name,
    timeZone,
    eventSlug: occurrence.eventSlug,
    eventTitle: occurrence.eventTitle,
    occurrenceId: occurrence.id,
    occurrenceLabel: formatDateInTimeZone(startsAt, timeZone),
    startsAt,
    endsAt,
    quantity,
    quantityLabel: formatQuantityLabel(quantity),
    attendeeName,
    attendeeEmail: `${emailStem || "attendee"}@guest.passreserve.app`,
    attendeePhone: `+39 3${String(200000000 + simpleHash(`${seed}-phone`) % 700000000)}`,
    ticketLabel: quantity > 1 ? "Group entry" : "General entry",
    createdAt,
    registrationCode,
    note,
    actionHint,
    historical:
      new Date(startsAt).getTime() < new Date(OPERATIONS_REFERENCE_ISO).getTime(),
    publicEventHref: `/${organizer.slug}/events/${occurrence.eventSlug}`,
    adminCalendarHref: `/${organizer.slug}/admin/calendar`,
    adminPaymentsHref: `/${organizer.slug}/admin/payments`,
    adminRegistrationsHref: `/${organizer.slug}/admin/registrations`,
    venue: occurrence.venue,
    venueNote: venueNotes[(attendeeIndex + 2) % venueNotes.length],
    status:
      scenario === "pending-confirm"
        ? "PENDING_CONFIRM"
        : scenario === "pending-payment" || scenario === "failed-payment"
          ? "PENDING_PAYMENT"
          : scenario === "attended"
            ? "ATTENDED"
            : scenario === "no-show"
              ? "NO_SHOW"
              : scenario === "cancelled"
                ? "CANCELLED"
                : payment.onlineAmount === 0
                  ? "CONFIRMED_UNPAID"
                  : payment.dueAtEvent > 0
                    ? "CONFIRMED_PARTIALLY_PAID"
                    : "CONFIRMED_PAID",
    payment: createPaymentSnapshot(payment, scenario, seed)
  };

  return decorateRecord(rawRecord);
}

function buildOrganizerRecords(organizer) {
  const upcomingOccurrences = flattenPublishedOccurrences(organizer);
  const venueOccurrence =
    upcomingOccurrences.find((occurrence) => occurrence.prepayPercentage === 0) ??
    upcomingOccurrences[0];
  const depositOccurrence =
    upcomingOccurrences.find(
      (occurrence) => occurrence.prepayPercentage > 0 && occurrence.prepayPercentage < 100
    ) ??
    upcomingOccurrences.find((occurrence) => occurrence.prepayPercentage > 0) ??
    venueOccurrence;
  const fullPaymentOccurrence =
    upcomingOccurrences.find((occurrence) => occurrence.prepayPercentage === 100) ??
    depositOccurrence ??
    venueOccurrence;
  const records = [
    createRecord({
      organizer,
      occurrence: venueOccurrence,
      quantity: 2,
      scenario: "pending-confirm",
      createdAt: addHours(OPERATIONS_REFERENCE_ISO, -2),
      note: "Attendee is reviewing venue notes before capacity hold expires.",
      actionHint: "Confirm to lock the seat or cancel to release the hold.",
      recordIndex: 1
    }),
    createRecord({
      organizer,
      occurrence: depositOccurrence,
      quantity: 2,
      scenario: depositOccurrence.prepayPercentage > 0 ? "pending-payment" : "confirmed",
      createdAt: addHours(OPERATIONS_REFERENCE_ISO, -6),
      note: "Payment handoff was created after confirmation and still needs organizer follow-up.",
      actionHint: "Mark the online amount as received after the provider confirms settlement.",
      recordIndex: 2
    }),
    createRecord({
      organizer,
      occurrence: depositOccurrence,
      quantity: 3,
      scenario: "confirmed",
      createdAt: addHours(OPERATIONS_REFERENCE_ISO, -18),
      note: "Deposit is collected and the venue balance remains open for check-in day.",
      actionHint: "Reconcile the venue balance once staff receives the remaining amount.",
      recordIndex: 3
    }),
    createRecord({
      organizer,
      occurrence: fullPaymentOccurrence,
      quantity: 1,
      scenario: "confirmed",
      createdAt: addHours(OPERATIONS_REFERENCE_ISO, -28),
      note: "Fully online-paid attendee with no remaining venue balance.",
      actionHint: "Mark attended once the organizer closes check-in.",
      recordIndex: 4
    }),
    createRecord({
      organizer,
      occurrence: fullPaymentOccurrence,
      quantity: 1,
      scenario:
        fullPaymentOccurrence.prepayPercentage > 0 ? "failed-payment" : "confirmed",
      createdAt: addHours(OPERATIONS_REFERENCE_ISO, -34),
      note: "A provider-side issue left this attendee in a payment-failed state.",
      actionHint: "Retry the online amount or cancel the registration cleanly.",
      recordIndex: 5
    }),
    createRecord({
      organizer,
      occurrence: venueOccurrence,
      quantity: 2,
      scenario: "attended",
      occurrenceOffsetDays: -14,
      createdAt: addDays(venueOccurrence.startsAt, -17),
      note: "Historical attended registration kept so organizers can audit completions.",
      actionHint: "Completed registrations stay visible for reporting and support follow-up.",
      recordIndex: 6
    }),
    createRecord({
      organizer,
      occurrence: depositOccurrence,
      quantity: 1,
      scenario: "no-show",
      occurrenceOffsetDays: -7,
      createdAt: addDays(depositOccurrence.startsAt, -9),
      note: "Organizer marked this attendee as a no-show after the grace window expired.",
      actionHint: "No-show handling keeps attendance history and deposit state visible.",
      recordIndex: 7
    }),
    createRecord({
      organizer,
      occurrence: fullPaymentOccurrence,
      quantity: 2,
      scenario: "cancelled",
      occurrenceOffsetDays: -3,
      createdAt: addDays(fullPaymentOccurrence.startsAt, -6),
      note: "Registration was cancelled after confirmation and the online amount was refunded.",
      actionHint: "Cancelled registrations remain in the ledger for audit and support clarity.",
      recordIndex: 8
    })
  ];

  return records.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function sumRecordQuantities(records, predicate) {
  return records.filter(predicate).reduce((sum, record) => sum + record.quantity, 0);
}

export function summarizeRegistrationOperations(records) {
  const activeRecords = records.filter(
    (record) => !["ATTENDED", "CANCELLED", "NO_SHOW"].includes(record.status)
  );

  return {
    activeCount: activeRecords.length,
    activeAttendees: activeRecords.reduce((sum, record) => sum + record.quantity, 0),
    queuedToday: records.filter(
      (record) =>
        toDayKey(record.createdAt, record.timeZone) ===
        toDayKey(OPERATIONS_REFERENCE_ISO, record.timeZone)
    ).length,
    pendingConfirmations: records.filter((record) => record.status === "PENDING_CONFIRM").length,
    pendingPayments: records.filter(
      (record) =>
        record.status === "PENDING_PAYMENT" ||
        ["PENDING", "FAILED"].includes(record.payment.paymentStatus)
    ).length,
    onlineCollected: records.reduce(
      (sum, record) => sum + record.payment.onlineCollected,
      0
    ),
    onlineCollectedLabel: formatCurrency(
      records.reduce((sum, record) => sum + record.payment.onlineCollected, 0)
    ),
    dueAtEvent: records
      .filter((record) => record.status !== "CANCELLED")
      .reduce((sum, record) => sum + record.payment.dueAtEventOutstanding, 0),
    dueAtEventLabel: formatCurrency(
      records
        .filter((record) => record.status !== "CANCELLED")
        .reduce((sum, record) => sum + record.payment.dueAtEventOutstanding, 0)
    ),
    pendingOnlineAmountLabel: formatCurrency(
      records.reduce((sum, record) => {
        if (!["PENDING", "FAILED"].includes(record.payment.paymentStatus)) {
          return sum;
        }

        return sum + Math.max(0, record.payment.onlineAmountExpected - record.payment.onlineCollected);
      }, 0)
    ),
    refundedLabel: formatCurrency(
      records.reduce((sum, record) => sum + record.payment.refundedAmount, 0)
    ),
    noShowCount: records.filter((record) => record.status === "NO_SHOW").length,
    attendedCount: records.filter((record) => record.status === "ATTENDED").length,
    openVenueBalances: sumRecordQuantities(
      records,
      (record) =>
        record.payment.dueAtEventOutstanding > 0 && record.status !== "CANCELLED"
    )
  };
}

function buildCalendarDays(organizer, records) {
  const timeZone = getOrganizerTimeZone(organizer);
  const dayMap = new Map();

  for (const occurrence of flattenPublishedOccurrences(organizer).slice(0, 8)) {
    const dayKey = toDayKey(occurrence.startsAt, timeZone);
    const occurrenceRecords = records.filter(
      (record) => !record.historical && record.occurrenceId === occurrence.id
    );

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        key: dayKey,
        dateLabel: formatDateInTimeZone(occurrence.startsAt, timeZone),
        weekdayLabel: formatWeekdayInTimeZone(occurrence.startsAt, timeZone),
        occurrences: []
      });
    }

    dayMap.get(dayKey).occurrences.push({
      ...occurrence,
      timeLabel: formatTimeRange(occurrence.startsAt, occurrence.endsAt, timeZone),
      attendeeCountLabel: `${occurrence.registeredCount} booked`,
      paymentStateLabel:
        occurrenceRecords.length > 0
          ? `${occurrenceRecords.filter((record) => record.status === "PENDING_PAYMENT").length} payment follow-up`
          : "No active payment follow-up",
      onlineCollectedLabel: formatCurrency(
        occurrenceRecords.reduce((sum, record) => sum + record.payment.onlineCollected, 0)
      ),
      dueAtEventLabel: formatCurrency(
        occurrenceRecords.reduce(
          (sum, record) => sum + record.payment.dueAtEventOutstanding,
          0
        )
      ),
      registrationsHref: `/${organizer.slug}/admin/registrations`,
      paymentsHref: `/${organizer.slug}/admin/payments`
    });
  }

  return [...dayMap.values()];
}

function buildTimeZoneAudit(organizer) {
  const timeZone = getOrganizerTimeZone(organizer);
  const referenceLabel = formatDateTimeInTimeZone(OPERATIONS_REFERENCE_ISO, timeZone);

  return {
    timeZone,
    referenceLabel,
    items: [
      {
        title: "Organizer-local day buckets",
        detail: `Calendar grouping, daily totals, and queue timestamps all resolve in ${timeZone}. This snapshot is anchored to ${referenceLabel}.`
      },
      {
        title: "Occurrence rendering",
        detail:
          "Occurrence cards show local start and end times rather than server-local windows, which keeps daily plans aligned with the venue schedule."
      },
      {
        title: "Reconciliation timing",
        detail:
          "Payment follow-up, no-show handling, and venue-balance closure stay tied to the local occurrence date so staff do not reconcile against the wrong day."
      }
    ]
  };
}

function buildProviderSummary(records) {
  return Object.entries(providerModes)
    .map(([mode, label]) => {
      const modeRecords = records.filter((record) => record.payment.providerMode === mode);

      return {
        mode,
        label,
        count: modeRecords.length,
        amountLabel: formatCurrency(
          modeRecords.reduce((sum, record) => sum + record.payment.onlineCollected, 0)
        )
      };
    })
    .filter((entry) => entry.count > 0);
}

function buildOperationLinks(organizer) {
  return {
    dashboardHref: `/${organizer.slug}/admin/dashboard`,
    calendarHref: `/${organizer.slug}/admin/calendar`,
    registrationsHref: `/${organizer.slug}/admin/registrations`,
    paymentsHref: `/${organizer.slug}/admin/payments`,
    eventsHref: organizer.eventsHref,
    occurrencesHref: organizer.occurrencesHref
  };
}

function buildOrganizerOperations(organizer) {
  const operationLinks = buildOperationLinks(organizer);
  const records = buildOrganizerRecords(organizer);
  const summary = summarizeRegistrationOperations(records);
  const calendarDays = buildCalendarDays(organizer, records);
  const allOccurrences = flattenPublishedOccurrences(organizer);
  const hotOccurrences = allOccurrences.filter(
    (occurrence) => occurrence.remainingCount <= 4 || occurrence.status === "capacity-watch"
  );

  return {
    ...organizer,
    ...operationLinks,
    timeZone: getOrganizerTimeZone(organizer),
    phase: organizerOperationsPhase,
    summary,
    records,
    recentRegistrations: records.slice(0, 5),
    paymentQueue: records.filter(
      (record) =>
        record.status === "PENDING_PAYMENT" ||
        record.payment.dueAtEventOutstanding > 0 ||
        record.payment.paymentStatus === "FAILED"
    ),
    calendarDays,
    hotOccurrences,
    providerSummary: buildProviderSummary(records),
    timeZoneAudit: buildTimeZoneAudit(organizer),
    totalUpcomingOccurrences: allOccurrences.length
  };
}

export function getAvailableRegistrationActions(record) {
  switch (record.status) {
    case "PENDING_CONFIRM":
      return [
        {
          id: "confirm",
          label: "Confirm",
          tone: "primary"
        },
        {
          id: "cancel",
          label: "Cancel",
          tone: "danger"
        }
      ];
    case "PENDING_PAYMENT":
      return [
        {
          id: "mark-online-paid",
          label: "Mark online paid",
          tone: "primary"
        },
        {
          id: "cancel",
          label: "Cancel",
          tone: "danger"
        }
      ];
    case "CONFIRMED_UNPAID":
      return [
        {
          id: "record-venue-payment",
          label: "Record venue payment",
          tone: "primary"
        },
        {
          id: "mark-attended",
          label: "Mark attended",
          tone: "secondary"
        },
        {
          id: "mark-no-show",
          label: "Mark no-show",
          tone: "secondary"
        },
        {
          id: "cancel",
          label: "Cancel",
          tone: "danger"
        }
      ];
    case "CONFIRMED_PARTIALLY_PAID":
      return [
        {
          id: "record-venue-payment",
          label: "Reconcile venue balance",
          tone: "primary"
        },
        {
          id: "mark-attended",
          label: "Mark attended",
          tone: "secondary"
        },
        {
          id: "mark-no-show",
          label: "Mark no-show",
          tone: "secondary"
        }
      ];
    case "CONFIRMED_PAID":
      return [
        {
          id: "mark-attended",
          label: "Mark attended",
          tone: "primary"
        },
        {
          id: "mark-no-show",
          label: "Mark no-show",
          tone: "secondary"
        }
      ];
    default:
      return [];
  }
}

function updatePayment(record, nextPayment) {
  return decorateRecord({
    ...record,
    payment: {
      ...record.payment,
      ...nextPayment
    }
  });
}

function settleOnlinePayment(record) {
  const onlineCollected = record.payment.onlineAmountExpected;
  const paymentStatus =
    record.payment.dueAtEventExpected > 0 ? "PARTIALLY_PAID" : "PAID";
  const nextStatus =
    record.payment.dueAtEventExpected > 0 ? "CONFIRMED_PARTIALLY_PAID" : "CONFIRMED_PAID";

  return updatePayment(
    {
      ...record,
      status: nextStatus,
      note: "Organizer confirmed the online amount after provider reconciliation."
    },
    {
      onlineCollected,
      paymentStatus,
      providerMode: "stripe-live",
      providerLabel: providerModes["stripe-live"],
      sessionId: record.payment.sessionId || buildReference("cs", `${record.id}-settled`),
      paymentIntentId:
        record.payment.paymentIntentId || buildReference("pi", `${record.id}-settled`)
    }
  );
}

function settleVenuePayment(record) {
  const nextStatus =
    record.status === "ATTENDED" ? "ATTENDED" : "CONFIRMED_PAID";

  return updatePayment(
    {
      ...record,
      status: nextStatus,
      note: "Venue balance was marked paid from the host dashboard."
    },
    {
      venueCollected: record.payment.dueAtEventExpected,
      paymentStatus: "PAID"
    }
  );
}

function confirmRegistration(record) {
  if (record.payment.onlineAmountExpected > 0) {
    return decorateRecord({
      ...record,
      status: "PENDING_PAYMENT",
      note: "Registration is confirmed and now waits for the online amount to clear.",
      payment: {
        ...record.payment,
        paymentStatus: "PENDING",
        providerMode: "stripe-live",
        providerLabel: providerModes["stripe-live"],
        sessionId: record.payment.sessionId || buildReference("cs", `${record.id}-confirm`)
      }
    });
  }

  return decorateRecord({
    ...record,
    status: "CONFIRMED_UNPAID",
    note: "Organizer confirmed the registration and kept the full amount due at the venue."
  });
}

function cancelRegistration(record) {
  return updatePayment(
    {
      ...record,
      status: "CANCELLED",
      note: "Registration was cancelled from the host dashboard."
    },
    {
      paymentStatus: record.payment.onlineCollected > 0 ? "REFUNDED" : "NONE",
      refundedAmount:
        record.payment.onlineCollected > 0
          ? record.payment.onlineCollected
          : record.payment.refundedAmount,
      onlineCollected: 0,
      venueCollected: 0
    }
  );
}

function markNoShow(record) {
  return decorateRecord({
    ...record,
    status: "NO_SHOW",
    note: "Organizer closed the registration as a no-show while preserving the payment trail."
  });
}

function markAttended(record) {
  const nextRecord = decorateRecord({
    ...record,
    status: "ATTENDED",
    note: "Organizer closed check-in and marked the attendee as present."
  });

  if (nextRecord.payment.dueAtEventOutstanding > 0) {
    return settleVenuePayment(nextRecord);
  }

  return nextRecord;
}

export function applyRegistrationOperation(records, recordId, actionId) {
  let message = "No change was applied.";

  const nextRecords = records.map((record) => {
    if (record.id !== recordId) {
      return record;
    }

    switch (actionId) {
      case "confirm":
        message = `${record.registrationCode} confirmed and moved to the next step.`;
        return confirmRegistration(record);
      case "mark-online-paid":
        message = `${record.registrationCode} now shows the online amount as settled.`;
        return settleOnlinePayment(record);
      case "record-venue-payment":
        message = `${record.registrationCode} now shows the venue balance as reconciled.`;
        return settleVenuePayment(record);
      case "mark-attended":
        message = `${record.registrationCode} closed as attended.`;
        return markAttended(record);
      case "mark-no-show":
        message = `${record.registrationCode} closed as a no-show.`;
        return markNoShow(record);
      case "cancel":
        message = `${record.registrationCode} cancelled and removed from the active queue.`;
        return cancelRegistration(record);
      default:
        return record;
    }
  });

  return {
    records: nextRecords,
    message
  };
}

export function getOrganizerOperationSlugs() {
  return getOrganizerAdminSlugs();
}

export function getOrganizerOperationsBySlug(slug) {
  const organizer = getOrganizerAdminBySlug(slug);

  return organizer ? buildOrganizerOperations(organizer) : null;
}
