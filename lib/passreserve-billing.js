import { formatCurrencyFromCents } from "./passreserve-format.js";

export const ORGANIZER_STRIPE_CONNECTION_STATUS = {
  NOT_CONNECTED: "NOT_CONNECTED",
  PENDING: "PENDING",
  CONNECTED: "CONNECTED",
  RESTRICTED: "RESTRICTED"
};

export const ORGANIZER_BILLING_STATUS = {
  NOT_REQUIRED: "NOT_REQUIRED",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE"
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeOrganizerBillingStatus(monthlyFeeCents, billingStatus) {
  if (safeNumber(monthlyFeeCents, 0) <= 0) {
    return ORGANIZER_BILLING_STATUS.NOT_REQUIRED;
  }

  return billingStatus === ORGANIZER_BILLING_STATUS.ACTIVE
    ? ORGANIZER_BILLING_STATUS.ACTIVE
    : ORGANIZER_BILLING_STATUS.INACTIVE;
}

export function normalizeOrganizerPaymentSettings(organizer = {}) {
  const onlinePaymentsMonthlyFeeCents = Math.max(
    0,
    Math.round(safeNumber(organizer.onlinePaymentsMonthlyFeeCents, 0))
  );

  return {
    stripeAccountId: organizer.stripeAccountId || null,
    stripeConnectionStatus:
      organizer.stripeConnectionStatus || ORGANIZER_STRIPE_CONNECTION_STATUS.NOT_CONNECTED,
    stripeDetailsSubmitted: Boolean(organizer.stripeDetailsSubmitted),
    stripeChargesEnabled: Boolean(organizer.stripeChargesEnabled),
    stripePayoutsEnabled: Boolean(organizer.stripePayoutsEnabled),
    stripeConnectedAt: organizer.stripeConnectedAt || null,
    stripeLastSyncedAt: organizer.stripeLastSyncedAt || null,
    onlinePaymentsMonthlyFeeCents,
    onlinePaymentsBillingStatus: normalizeOrganizerBillingStatus(
      onlinePaymentsMonthlyFeeCents,
      organizer.onlinePaymentsBillingStatus
    ),
    onlinePaymentsBillingActivatedAt:
      organizer.onlinePaymentsBillingActivatedAt || null
  };
}

export function isOccurrenceUsingOnlinePayments(entry = {}) {
  const priceCents = Math.max(
    0,
    Math.round(safeNumber(entry.priceCents ?? entry.basePriceCents, 0))
  );
  const prepayPercentage = Math.max(0, Math.min(100, safeNumber(entry.prepayPercentage, 0)));

  return priceCents > 0 && prepayPercentage > 0;
}

function getConnectionStatusLabel(status) {
  switch (status) {
    case ORGANIZER_STRIPE_CONNECTION_STATUS.CONNECTED:
      return "Connected";
    case ORGANIZER_STRIPE_CONNECTION_STATUS.RESTRICTED:
      return "Restricted";
    case ORGANIZER_STRIPE_CONNECTION_STATUS.PENDING:
      return "Needs onboarding";
    default:
      return "Not connected";
  }
}

function getBillingStatusLabel(status) {
  switch (status) {
    case ORGANIZER_BILLING_STATUS.ACTIVE:
      return "Active";
    case ORGANIZER_BILLING_STATUS.INACTIVE:
      return "Inactive";
    default:
      return "Not required";
  }
}

export function getOrganizerOnlinePaymentsGate(organizer = {}) {
  const settings = normalizeOrganizerPaymentSettings(organizer);
  const monthlyFeeRequired = settings.onlinePaymentsMonthlyFeeCents > 0;
  const stripeReady = Boolean(
    settings.stripeAccountId &&
      settings.stripeDetailsSubmitted &&
      settings.stripeChargesEnabled &&
      settings.stripePayoutsEnabled
  );
  const billingReady =
    !monthlyFeeRequired || settings.onlinePaymentsBillingStatus === ORGANIZER_BILLING_STATUS.ACTIVE;
  const blockers = [];

  if (!settings.stripeAccountId) {
    blockers.push("Connect a Stripe account before publishing paid dates.");
  } else if (!stripeReady) {
    blockers.push("Finish Stripe onboarding so charges and payouts are enabled.");
  }

  if (monthlyFeeRequired && !billingReady) {
    blockers.push("Passreserve billing is not active for online payments yet.");
  }

  const enabled = stripeReady && billingReady;

  return {
    ...settings,
    enabled,
    stripeReady,
    billingReady,
    monthlyFeeRequired,
    blockers,
    stripeConnectionStatusLabel: getConnectionStatusLabel(settings.stripeConnectionStatus),
    billingStatusLabel: getBillingStatusLabel(settings.onlinePaymentsBillingStatus),
    monthlyFeeLabel: formatCurrencyFromCents(settings.onlinePaymentsMonthlyFeeCents),
    checklist: enabled
      ? []
      : [
          ...(!settings.stripeAccountId
            ? ["Connect your Stripe account from the billing page."]
            : []),
          ...(settings.stripeAccountId && !stripeReady
            ? ["Finish Stripe onboarding until Stripe reports charges and payouts enabled."]
            : []),
          ...(monthlyFeeRequired && !billingReady
            ? ["Ask the platform team to activate billing for paid events."]
            : [])
        ]
  };
}

export function getStripeAccountPatch(account, organizer = {}) {
  if (!account?.id) {
    return {
      stripeAccountId: null,
      stripeConnectionStatus: ORGANIZER_STRIPE_CONNECTION_STATUS.NOT_CONNECTED,
      stripeDetailsSubmitted: false,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      stripeConnectedAt: null,
      stripeLastSyncedAt: new Date().toISOString()
    };
  }

  let stripeConnectionStatus = ORGANIZER_STRIPE_CONNECTION_STATUS.PENDING;

  if (account.requirements?.disabled_reason) {
    stripeConnectionStatus = ORGANIZER_STRIPE_CONNECTION_STATUS.RESTRICTED;
  } else if (account.charges_enabled && account.payouts_enabled) {
    stripeConnectionStatus = ORGANIZER_STRIPE_CONNECTION_STATUS.CONNECTED;
  }

  return {
    stripeAccountId: account.id,
    stripeConnectionStatus,
    stripeDetailsSubmitted: Boolean(account.details_submitted),
    stripeChargesEnabled: Boolean(account.charges_enabled),
    stripePayoutsEnabled: Boolean(account.payouts_enabled),
    stripeConnectedAt: organizer.stripeConnectedAt || new Date().toISOString(),
    stripeLastSyncedAt: new Date().toISOString()
  };
}
