import { formatCurrencyFromCents } from "./passreserve-format.js";

function toSafeCents(value) {
  const resolved = Number(value || 0);

  if (!Number.isFinite(resolved)) {
    return 0;
  }

  return Math.max(0, Math.round(resolved));
}

function toComparableTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortPaymentsDescending(payments = []) {
  return (Array.isArray(payments) ? payments : []).slice().sort((left, right) => {
    const rightTimestamp = toComparableTimestamp(right.occurredAt || right.createdAt);
    const leftTimestamp = toComparableTimestamp(left.occurredAt || left.createdAt);
    return rightTimestamp - leftTimestamp;
  });
}

export function getRegistrationRefundableOnlineAmountCents(registration) {
  return Math.max(
    0,
    toSafeCents(registration?.onlineCollectedCents) - toSafeCents(registration?.refundedCents)
  );
}

export function getRegistrationPendingRefundPayments(payments = []) {
  return sortPaymentsDescending(payments).filter(
    (payment) => payment?.kind === "REFUND" && payment?.status === "PENDING"
  );
}

export function getRegistrationFailedRefundPayments(payments = []) {
  return sortPaymentsDescending(payments).filter(
    (payment) => payment?.kind === "REFUND" && payment?.status === "FAILED"
  );
}

export function getLatestFailedRefundPayment(payments = []) {
  return getRegistrationFailedRefundPayments(payments)[0] || null;
}

export function getLatestRefundableStripePayment(payments = []) {
  return (
    sortPaymentsDescending(payments).find(
      (payment) =>
        payment?.provider === "STRIPE" &&
        payment?.kind === "CAPTURE" &&
        payment?.status === "SUCCEEDED"
    ) || null
  );
}

export function getRegistrationRefundSummary(
  registration,
  payments = [],
  options = {}
) {
  const currency = options.currency || registration?.currency || "EUR";
  const onlineCollectedCents = toSafeCents(registration?.onlineCollectedCents);
  const alreadyRefundedCents = toSafeCents(registration?.refundedCents);
  const refundableOnlineAmountCents = getRegistrationRefundableOnlineAmountCents(registration);
  const pendingRefundPayments = getRegistrationPendingRefundPayments(payments);
  const failedRefundPayments = getRegistrationFailedRefundPayments(payments);
  const latestFailedRefundPayment = failedRefundPayments[0] || null;
  const pendingRefundCents = pendingRefundPayments.reduce(
    (sum, payment) => sum + toSafeCents(payment.amountCents),
    0
  );
  const latestStripePayment = getLatestRefundableStripePayment(payments);
  const stripePaymentIntentId = latestStripePayment?.stripePaymentIntentId || null;
  const stripeSessionId = latestStripePayment?.stripeSessionId || null;
  const stripeAccountId = latestStripePayment?.stripeAccountId || null;

  let reason = "ready";

  if (onlineCollectedCents <= 0) {
    reason = "no_online_collection";
  } else if (refundableOnlineAmountCents <= 0) {
    reason = "already_fully_refunded";
  } else if (pendingRefundCents > 0) {
    reason = "refund_pending";
  } else if (failedRefundPayments.length > 0) {
    reason = "refund_failed";
  } else if (!latestStripePayment) {
    reason = "missing_stripe_capture";
  } else if (!stripePaymentIntentId) {
    reason = "missing_payment_reference";
  }

  return {
    eligible: reason === "ready",
    reason,
    reasonLabel: getRegistrationRefundReasonLabel(reason),
    currency,
    onlineCollectedCents,
    onlineCollectedLabel: formatCurrencyFromCents(onlineCollectedCents, currency),
    alreadyRefundedCents,
    alreadyRefundedLabel: formatCurrencyFromCents(alreadyRefundedCents, currency),
    pendingRefundCents,
    pendingRefundLabel: formatCurrencyFromCents(pendingRefundCents, currency),
    failedRefundCount: failedRefundPayments.length,
    hasFailedRefund: failedRefundPayments.length > 0,
    latestFailedRefundId: latestFailedRefundPayment?.id || null,
    latestFailedRefundAt:
      latestFailedRefundPayment?.occurredAt || latestFailedRefundPayment?.createdAt || null,
    latestFailedRefundReason:
      latestFailedRefundPayment?.metadata?.errorMessage ||
      latestFailedRefundPayment?.metadata?.stripeFailureReason ||
      latestFailedRefundPayment?.note ||
      null,
    latestFailedRefundAction: latestFailedRefundPayment?.metadata?.refundAction || null,
    latestFailedRefundCancelMode: latestFailedRefundPayment?.metadata?.cancelMode || null,
    latestFailedRefundSurface: latestFailedRefundPayment?.metadata?.passreserveSurface || null,
    latestFailedRefundIdempotencyKey: latestFailedRefundPayment?.metadata?.idempotencyKey || null,
    refundableOnlineAmountCents,
    refundableOnlineAmountLabel: formatCurrencyFromCents(refundableOnlineAmountCents, currency),
    hasPendingRefund: pendingRefundCents > 0,
    retryable:
      refundableOnlineAmountCents > 0 &&
      pendingRefundCents === 0 &&
      Boolean(latestStripePayment) &&
      Boolean(stripePaymentIntentId),
    hasStripeCapture: Boolean(latestStripePayment),
    hasStripePaymentIntentReference: Boolean(stripePaymentIntentId),
    latestStripePaymentId: latestStripePayment?.id || null,
    stripePaymentIntentId,
    stripeSessionId,
    stripeAccountId
  };
}

export function getRegistrationRefundReasonLabel(reason) {
  switch (reason) {
    case "no_online_collection":
      return "No online payment was collected for this registration.";
    case "already_fully_refunded":
      return "The collected online amount has already been refunded.";
    case "refund_pending":
      return "A Stripe refund has already been requested and is still pending.";
    case "refund_failed":
      return "The last Stripe refund request failed and needs a retry.";
    case "missing_stripe_capture":
      return "No Stripe capture was found for the collected online amount.";
    case "missing_payment_reference":
      return "The Stripe payment exists but is missing a reusable payment reference.";
    default:
      return "This registration is ready for an automatic Stripe refund.";
  }
}
