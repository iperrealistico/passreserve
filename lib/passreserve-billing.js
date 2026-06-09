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

const BILLING_STEP_STATUS = {
  COMPLETE: "COMPLETE",
  PENDING: "PENDING",
  BLOCKED: "BLOCKED",
  NOT_REQUIRED: "NOT_REQUIRED"
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

function getBillingStepStatusLabel(status) {
  switch (status) {
    case BILLING_STEP_STATUS.COMPLETE:
      return "Complete";
    case BILLING_STEP_STATUS.NOT_REQUIRED:
      return "Not required";
    case BILLING_STEP_STATUS.BLOCKED:
      return "Blocked";
    default:
      return "Pending";
  }
}

function getBillingStepTone(status) {
  switch (status) {
    case BILLING_STEP_STATUS.COMPLETE:
      return "success";
    case BILLING_STEP_STATUS.NOT_REQUIRED:
      return "muted";
    case BILLING_STEP_STATUS.BLOCKED:
      return "danger";
    default:
      return "warning";
  }
}

function formatStripeAccountLabel(stripeAccountId) {
  if (!stripeAccountId) {
    return "No connected account saved";
  }

  if (stripeAccountId.length <= 15) {
    return stripeAccountId;
  }

  return `${stripeAccountId.slice(0, 9)}...${stripeAccountId.slice(-4)}`;
}

export function getOrganizerOnlinePaymentsGate(organizer = {}) {
  const settings = normalizeOrganizerPaymentSettings(organizer);
  const monthlyFeeRequired = settings.onlinePaymentsMonthlyFeeCents > 0;
  const stripeAccountLinked = Boolean(settings.stripeAccountId);
  const stripeDetailsReady = stripeAccountLinked && settings.stripeDetailsSubmitted;
  const stripeChargesReady = stripeAccountLinked && settings.stripeChargesEnabled;
  const stripePayoutsReady = stripeAccountLinked && settings.stripePayoutsEnabled;
  const stripeReady = Boolean(
    stripeAccountLinked && stripeDetailsReady && stripeChargesReady && stripePayoutsReady
  );
  const billingReady =
    !monthlyFeeRequired || settings.onlinePaymentsBillingStatus === ORGANIZER_BILLING_STATUS.ACTIVE;
  const blockers = [];
  const blockerDetails = [];

  if (!stripeAccountLinked) {
    blockers.push("Connect a Stripe account before publishing paid dates.");
    blockerDetails.push(
      "Passreserve does not have a saved Stripe connected account for this organizer yet."
    );
  } else if (!stripeReady) {
    blockers.push("Finish Stripe onboarding so charges and payouts are enabled.");

    if (!stripeDetailsReady) {
      blockerDetails.push("Stripe onboarding details have not been fully submitted yet.");
    }

    if (!stripeChargesReady) {
      blockerDetails.push("Stripe has not enabled card charges for this organizer yet.");
    }

    if (!stripePayoutsReady) {
      blockerDetails.push("Stripe has not enabled payouts for this organizer yet.");
    }
  }

  if (monthlyFeeRequired && !billingReady) {
    blockers.push("Passreserve billing is not active for online payments yet.");
    blockerDetails.push("Passreserve billing activation for paid events is still pending.");
  }

  const enabled = stripeReady && billingReady;
  const progressSteps = [
    {
      id: "stripe-account",
      label: "Stripe account linked",
      status: stripeAccountLinked ? BILLING_STEP_STATUS.COMPLETE : BILLING_STEP_STATUS.BLOCKED,
      statusLabel: getBillingStepStatusLabel(
        stripeAccountLinked ? BILLING_STEP_STATUS.COMPLETE : BILLING_STEP_STATUS.BLOCKED
      ),
      tone: getBillingStepTone(
        stripeAccountLinked ? BILLING_STEP_STATUS.COMPLETE : BILLING_STEP_STATUS.BLOCKED
      ),
      detail: stripeAccountLinked
        ? `Passreserve saved ${formatStripeAccountLabel(settings.stripeAccountId)} for this organizer.`
        : "No connected Stripe account has been saved for this organizer yet."
    },
    {
      id: "stripe-details",
      label: "Onboarding details submitted",
      status: stripeAccountLinked
        ? stripeDetailsReady
          ? BILLING_STEP_STATUS.COMPLETE
          : BILLING_STEP_STATUS.PENDING
        : BILLING_STEP_STATUS.BLOCKED,
      statusLabel: getBillingStepStatusLabel(
        stripeAccountLinked
          ? stripeDetailsReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.PENDING
          : BILLING_STEP_STATUS.BLOCKED
      ),
      tone: getBillingStepTone(
        stripeAccountLinked
          ? stripeDetailsReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.PENDING
          : BILLING_STEP_STATUS.BLOCKED
      ),
      detail: !stripeAccountLinked
        ? "Stripe cannot report onboarding progress until an account is linked."
        : stripeDetailsReady
          ? "Stripe says the organizer submitted the onboarding details."
          : "Stripe is still waiting for onboarding details or additional verification."
    },
    {
      id: "stripe-charges",
      label: "Charges enabled",
      status: stripeAccountLinked
        ? stripeChargesReady
          ? BILLING_STEP_STATUS.COMPLETE
          : BILLING_STEP_STATUS.PENDING
        : BILLING_STEP_STATUS.BLOCKED,
      statusLabel: getBillingStepStatusLabel(
        stripeAccountLinked
          ? stripeChargesReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.PENDING
          : BILLING_STEP_STATUS.BLOCKED
      ),
      tone: getBillingStepTone(
        stripeAccountLinked
          ? stripeChargesReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.PENDING
          : BILLING_STEP_STATUS.BLOCKED
      ),
      detail: !stripeAccountLinked
        ? "Charges stay blocked until a Stripe account is linked."
        : stripeChargesReady
          ? "Stripe enabled live card charges for this organizer."
          : "Stripe has not enabled charges yet, so paid checkout stays blocked."
    },
    {
      id: "stripe-payouts",
      label: "Payouts enabled",
      status: stripeAccountLinked
        ? stripePayoutsReady
          ? BILLING_STEP_STATUS.COMPLETE
          : BILLING_STEP_STATUS.PENDING
        : BILLING_STEP_STATUS.BLOCKED,
      statusLabel: getBillingStepStatusLabel(
        stripeAccountLinked
          ? stripePayoutsReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.PENDING
          : BILLING_STEP_STATUS.BLOCKED
      ),
      tone: getBillingStepTone(
        stripeAccountLinked
          ? stripePayoutsReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.PENDING
          : BILLING_STEP_STATUS.BLOCKED
      ),
      detail: !stripeAccountLinked
        ? "Payouts stay blocked until a Stripe account is linked."
        : stripePayoutsReady
          ? "Stripe enabled payouts for this organizer."
          : "Stripe still needs to finish payout checks before paid events can go live."
    },
    {
      id: "passreserve-billing",
      label: "Passreserve billing",
      status: monthlyFeeRequired
        ? billingReady
          ? BILLING_STEP_STATUS.COMPLETE
          : BILLING_STEP_STATUS.BLOCKED
        : BILLING_STEP_STATUS.NOT_REQUIRED,
      statusLabel: getBillingStepStatusLabel(
        monthlyFeeRequired
          ? billingReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.BLOCKED
          : BILLING_STEP_STATUS.NOT_REQUIRED
      ),
      tone: getBillingStepTone(
        monthlyFeeRequired
          ? billingReady
            ? BILLING_STEP_STATUS.COMPLETE
            : BILLING_STEP_STATUS.BLOCKED
          : BILLING_STEP_STATUS.NOT_REQUIRED
      ),
      detail: monthlyFeeRequired
        ? billingReady
          ? "Passreserve billing is active for paid events."
          : "Passreserve billing still needs activation before paid events can be published."
        : "No monthly billing fee is required for this organizer right now."
    }
  ];
  const completedCoreStripeSteps = [
    stripeAccountLinked,
    stripeDetailsReady,
    stripeChargesReady,
    stripePayoutsReady
  ].filter(Boolean).length;
  let statusHeadline = "Paid events stay blocked until Stripe and billing are ready.";
  let nextActionTitle = "Connect Stripe";
  let nextActionDetail =
    "Open Connect Stripe, finish the Stripe onboarding flow, return to Passreserve, then refresh the status here.";

  if (!stripeAccountLinked) {
    statusHeadline = "No Stripe account is linked to this organizer yet.";
    nextActionDetail =
      "Connect Stripe to save a connected account for this organizer. After Stripe returns here, refresh the status again.";
  } else if (!stripeReady) {
    statusHeadline = "Stripe is linked, but onboarding is still incomplete.";
    nextActionTitle =
      settings.stripeConnectionStatus === ORGANIZER_STRIPE_CONNECTION_STATUS.RESTRICTED
        ? "Resolve the Stripe restrictions"
        : "Finish Stripe onboarding";
    nextActionDetail =
      settings.stripeConnectionStatus === ORGANIZER_STRIPE_CONNECTION_STATUS.RESTRICTED
        ? "Open Stripe again, resolve the missing or restricted requirements there, then return here and refresh the status."
        : "Finish the Stripe onboarding requirements, return to Passreserve, and refresh the status here.";
  } else if (monthlyFeeRequired && !billingReady) {
    statusHeadline = "Stripe is ready, but Passreserve billing is still inactive.";
    nextActionTitle = "Activate Passreserve billing";
    nextActionDetail =
      "Ask the platform team to activate billing for this organizer before publishing paid dates.";
  } else if (enabled) {
    statusHeadline = "Stripe and billing are ready for paid events.";
    nextActionTitle = "Publish paid dates";
    nextActionDetail =
      "This organizer can now publish paid dates and collect online checkout through Stripe.";
  }

  return {
    ...settings,
    enabled,
    stripeReady,
    billingReady,
    monthlyFeeRequired,
    blockers,
    blockerDetails,
    progressSteps,
    completedCoreStripeSteps,
    totalCoreStripeSteps: 4,
    progressLabel: `${completedCoreStripeSteps}/4 Stripe readiness steps complete`,
    statusHeadline,
    nextActionTitle,
    nextActionDetail,
    stripeAccountLabel: formatStripeAccountLabel(settings.stripeAccountId),
    stripeConnectionStatusLabel: getConnectionStatusLabel(settings.stripeConnectionStatus),
    billingStatusLabel: getBillingStatusLabel(settings.onlinePaymentsBillingStatus),
    monthlyFeeLabel: formatCurrencyFromCents(settings.onlinePaymentsMonthlyFeeCents),
    checklist: enabled
      ? []
      : [
          ...(!stripeAccountLinked
            ? ["Connect your Stripe account from the billing page."]
            : []),
          ...(stripeAccountLinked && !stripeReady
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
