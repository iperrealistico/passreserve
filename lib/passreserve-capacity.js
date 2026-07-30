const CONFIRMED_CAPACITY_STATUSES = [
  "CONFIRMED_UNPAID",
  "CONFIRMED_PARTIALLY_PAID",
  "CONFIRMED_PAID",
  "ATTENDED",
  "NO_SHOW"
];

function toTimestamp(value) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isRegistrationConsumingCapacity(
  registration,
  nowInput = new Date()
) {
  if (!registration || registration.status === "CANCELLED") {
    return false;
  }

  if (
    registration.status === "PENDING_CONFIRM" ||
    registration.status === "PENDING_PAYMENT"
  ) {
    const expiresAt = toTimestamp(registration.expiresAt);
    const now = toTimestamp(nowInput);

    return expiresAt == null || now == null || expiresAt > now;
  }

  return true;
}

export function buildCapacityRegistrationWhere(nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);

  return {
    OR: [
      {
        status: {
          in: CONFIRMED_CAPACITY_STATUSES
        }
      },
      {
        status: "PENDING_CONFIRM",
        OR: [
          {
            expiresAt: null
          },
          {
            expiresAt: {
              gt: now
            }
          }
        ]
      },
      {
        status: "PENDING_PAYMENT",
        OR: [
          {
            expiresAt: null
          },
          {
            expiresAt: {
              gt: now
            }
          }
        ]
      }
    ]
  };
}

export function summarizeOccurrenceCapacity({
  registrations = [],
  occurrence,
  event,
  now = new Date()
}) {
  const active = registrations.filter((registration) =>
    isRegistrationConsumingCapacity(registration, now)
  );
  const confirmed = active.filter((registration) =>
    CONFIRMED_CAPACITY_STATUSES.includes(registration.status)
  );
  const pendingHolds = active.filter(
    (registration) => registration.status === "PENDING_CONFIRM"
  );
  const pendingPayments = active.filter(
    (registration) => registration.status === "PENDING_PAYMENT"
  );
  const sumQuantity = (entries) =>
    entries.reduce(
      (sum, registration) => sum + Number(registration.quantity || 0),
      0
    );
  const reservedQuantity = sumQuantity(active);
  const remaining = Math.max(0, occurrence.capacity - reservedQuantity);

  return {
    totalCapacity: occurrence.capacity,
    confirmedCount: sumQuantity(confirmed),
    pendingHoldCount: sumQuantity(pendingHolds),
    pendingPaymentCount: sumQuantity(pendingPayments),
    reservedQuantity,
    remaining,
    capacityLabel:
      remaining <= 0
        ? "Sold out"
        : remaining === 1
          ? "1 spot left"
          : `${remaining} spots left`,
    statusLabel:
      remaining <= 0
        ? "Sold out"
        : remaining <= Math.max(2, Math.floor(occurrence.capacity * 0.2))
          ? "Almost full"
          : "Open",
    registrationStatusLabel: event.visibility === "PUBLIC" ? "Live" : "Draft"
  };
}
