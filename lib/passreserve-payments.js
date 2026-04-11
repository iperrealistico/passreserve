import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-02-25.clover";
const currencyFormatters = new Map();

function getCurrencyFormatter(currency) {
  const safeCurrency = String(currency || "eur").toUpperCase();

  if (!currencyFormatters.has(safeCurrency)) {
    currencyFormatters.set(
      safeCurrency,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    );
  }

  return currencyFormatters.get(safeCurrency);
}

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveBaseUrl() {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (explicitBaseUrl) {
    return stripTrailingSlash(explicitBaseUrl);
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionUrl) {
    return `https://${stripTrailingSlash(productionUrl)}`;
  }

  const previewUrl = process.env.VERCEL_URL?.trim();

  if (previewUrl) {
    return `https://${stripTrailingSlash(previewUrl)}`;
  }

  return "http://localhost:3000";
}

let stripeClient = null;

export const paymentPhase = {
  label: "Phase 09",
  title: "Payments, Stripe Checkout, and payment reconciliation",
  summary:
    "Passreserve.com now hands payment-required registrations into organizer-owned Stripe Checkout, returns through success and cancel routes, and logs webhook reconciliation metadata without skipping the existing hold-and-confirm lifecycle."
};

export const stripeEnvironmentRequirements = [
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe Connect platform secret key",
    requiredFor: "Stripe Connect onboarding, connected-account Checkout, and platform-side Stripe API access",
    optional: false
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe webhook secret",
    requiredFor: "Webhook signature verification for connected-account and platform Stripe events",
    optional: false
  },
  {
    key: "STRIPE_CURRENCY_DEFAULT",
    label: "Default collection currency",
    requiredFor: "Charge currency selection",
    optional: true
  },
  {
    key: "NEXT_PUBLIC_BASE_URL",
    label: "Public base URL",
    requiredFor: "Reliable success and cancel return URLs outside the default Vercel host",
    optional: true
  }
];

export function formatCurrencyFromMinorUnits(amountMinor, currency = "eur") {
  return getCurrencyFormatter(currency).format(amountMinor / 100);
}

export function getStripeEnvironmentState() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const defaultCurrency = (process.env.STRIPE_CURRENCY_DEFAULT?.trim() || "eur").toLowerCase();

  return {
    apiVersion: STRIPE_API_VERSION,
    baseUrl: resolveBaseUrl(),
    defaultCurrency,
    liveCheckoutEnabled: Boolean(stripeSecretKey),
    webhookEnabled: Boolean(stripeSecretKey && stripeWebhookSecret),
    mode: stripeSecretKey ? "live" : "preview",
    requirements: stripeEnvironmentRequirements.map((requirement) => ({
      ...requirement,
      present: Boolean(process.env[requirement.key]?.trim())
    }))
  };
}

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return null;
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION
  });

  return stripeClient;
}

function buildPreviewUrl({
  slug,
  eventSlug,
  paymentToken
}) {
  return `/${slug}/events/${eventSlug}/register/payment/preview/${paymentToken}`;
}

function buildStripeRequestOptions(stripeAccountId = null) {
  return stripeAccountId
    ? {
        stripeAccount: stripeAccountId
      }
    : undefined;
}

function buildStripeConnectAccountMetadata({
  organizerId,
  organizerName,
  slug
}) {
  return {
    organizer_id: organizerId,
    organizer_name: organizerName,
    organizer_slug: slug,
    passreserve_surface: "organizer_billing"
  };
}

export async function createStripeConnectedAccount({
  organizerId,
  organizerName,
  organizerEmail,
  slug
}) {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe Connect onboarding is unavailable until STRIPE_SECRET_KEY is configured.");
  }

  return stripe.accounts.create({
    type: "standard",
    email: organizerEmail || undefined,
    capabilities: {
      card_payments: {
        requested: true
      },
      transfers: {
        requested: true
      }
    },
    metadata: buildStripeConnectAccountMetadata({
      organizerId,
      organizerName,
      slug
    })
  });
}

export async function retrieveStripeConnectedAccount(stripeAccountId) {
  if (!stripeAccountId) {
    return null;
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return null;
  }

  return stripe.accounts.retrieve(stripeAccountId);
}

export async function createStripeOnboardingAccountLink({
  stripeAccountId,
  refreshUrl,
  returnUrl
}) {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe Connect onboarding is unavailable until STRIPE_SECRET_KEY is configured.");
  }

  return stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding"
  });
}

export function buildStripeCheckoutSessionRequest({
  attendeeEmail,
  dueAtEventMinor,
  eventSlug,
  eventTitle,
  holdExpiresAt,
  occurrenceId,
  occurrenceLabel,
  onlineAmountMinor,
  organizerName,
  payment,
  paymentFingerprint,
  quantity,
  registrationCode,
  resolvedBaseUrl,
  slug,
  stripeAccountId,
  ticketCategoryLabel
}) {
  const environment = getStripeEnvironmentState();
  const metadata = {
    passreserve_phase: "12-connect",
    organizer_slug: slug,
    event_slug: eventSlug,
    occurrence_id: occurrenceId,
    registration_code: registrationCode,
    quantity: String(quantity),
    ticket_category: ticketCategoryLabel,
    payment_token_fingerprint: paymentFingerprint,
    online_amount_minor: String(onlineAmountMinor),
    due_at_event_minor: String(dueAtEventMinor)
  };

  if (stripeAccountId) {
    metadata.connected_account_id = stripeAccountId;
  }

  return {
    params: {
      mode: "payment",
      client_reference_id: registrationCode,
      customer_email: attendeeEmail,
      success_url: `${resolvedBaseUrl}/${slug}/events/${eventSlug}/register/payment/success/{CHECKOUT_SESSION_ID_PLACEHOLDER}`,
      cancel_url: `${resolvedBaseUrl}/${slug}/events/${eventSlug}/register/payment/cancel/{PAYMENT_TOKEN_PLACEHOLDER}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: environment.defaultCurrency,
            unit_amount: onlineAmountMinor,
            product_data: {
              name: `${eventTitle} online amount`,
              description: `${occurrenceLabel} · ${quantity} attendee${quantity === 1 ? "" : "s"} · ${payment.dueAtEventLabel} due at the event`
            }
          }
        }
      ],
      metadata,
      payment_intent_data: {
        metadata
      },
      ...(holdExpiresAt
        ? {
            expires_at: Math.floor(new Date(holdExpiresAt).getTime() / 1000)
          }
        : {}),
      custom_text: {
        submit: {
          message: `${organizerName} keeps ${payment.dueAtEventLabel} due at the event after this online amount is collected.`
        }
      }
    },
    requestOptions: buildStripeRequestOptions(stripeAccountId)
  };
}

export async function createStripeCheckoutSession({
  attendeeEmail,
  baseUrl,
  eventSlug,
  eventTitle,
  holdExpiresAt,
  occurrenceId,
  occurrenceLabel,
  organizerName,
  payment,
  paymentFingerprint,
  paymentToken,
  quantity,
  registrationCode,
  slug,
  stripeAccountId,
  ticketCategoryLabel
}) {
  const environment = getStripeEnvironmentState();
  const resolvedBaseUrl = baseUrl ? stripTrailingSlash(baseUrl) : environment.baseUrl;

  if (!environment.liveCheckoutEnabled) {
    return {
      mode: "preview",
      sessionId: null,
      url: buildPreviewUrl({
        slug,
        eventSlug,
        paymentToken
      })
    };
  }

  const stripe = getStripeClient();

  if (!stripe) {
    throw new Error("Stripe Checkout could not start because the Stripe client is unavailable.");
  }

  if (!stripeAccountId) {
    throw new Error("This organizer has not finished Stripe Connect onboarding yet.");
  }

  const onlineAmountMinor = Math.round(payment.onlineAmount * 100);
  const dueAtEventMinor = Math.round(payment.dueAtEvent * 100);
  const request = buildStripeCheckoutSessionRequest({
    attendeeEmail,
    dueAtEventMinor,
    eventSlug,
    eventTitle,
    holdExpiresAt,
    occurrenceId,
    occurrenceLabel,
    onlineAmountMinor,
    organizerName,
    payment,
    paymentFingerprint,
    quantity,
    registrationCode,
    resolvedBaseUrl,
    slug,
    stripeAccountId,
    ticketCategoryLabel
  });
  const session = await stripe.checkout.sessions.create(
    {
      ...request.params,
      success_url: `${resolvedBaseUrl}/${slug}/events/${eventSlug}/register/payment/success/${paymentToken}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${resolvedBaseUrl}/${slug}/events/${eventSlug}/register/payment/cancel/${paymentToken}`
    },
    request.requestOptions
  );

  return {
    mode: "live",
    sessionId: session.id,
    url: session.url
  };
}

export async function retrieveStripeCheckoutSession(sessionId, stripeAccountId = null) {
  if (!sessionId) {
    return null;
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return null;
  }

  return stripe.checkout.sessions.retrieve(
    sessionId,
    {
      expand: ["payment_intent"]
    },
    buildStripeRequestOptions(stripeAccountId)
  );
}

export function summarizeStripeCheckoutSession(session) {
  if (!session) {
    return null;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  return {
    sessionId: session.id,
    paymentIntentId,
    sessionStatus: session.status,
    paymentStatus: session.payment_status,
    currency: String(session.currency || "eur").toUpperCase(),
    customerEmail: session.customer_details?.email || session.customer_email || null,
    amountTotalMinor: session.amount_total ?? 0,
    amountTotalLabel: formatCurrencyFromMinorUnits(
      session.amount_total ?? 0,
      session.currency || "eur"
    ),
    createdAt: new Date(session.created * 1000).toISOString()
  };
}

export async function constructStripeWebhookEvent(request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe) {
    return {
      ok: false,
      status: 503,
      message: "Stripe Checkout is not configured in this environment."
    };
  }

  if (!webhookSecret) {
    return {
      ok: false,
      status: 503,
      message: "STRIPE_WEBHOOK_SECRET is required before webhook verification can run."
    };
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return {
      ok: false,
      status: 400,
      message: "Missing Stripe signature header."
    };
  }

  const rawBody = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    return {
      ok: true,
      event
    };
  } catch (error) {
    return {
      ok: false,
      status: 400,
      message: error instanceof Error ? error.message : "Webhook signature verification failed."
    };
  }
}

export function summarizeStripeWebhookEvent(event) {
  const payload = event?.data?.object ?? {};
  const paymentIntentId =
    typeof payload.payment_intent === "string"
      ? payload.payment_intent
      : payload.payment_intent?.id ?? null;

  return {
    eventId: event.id,
    eventType: event.type,
    connectedAccountId: event.account || null,
    checkoutSessionId: payload.id ?? null,
    registrationCode: payload.client_reference_id || payload.metadata?.registration_code || null,
    organizerSlug: payload.metadata?.organizer_slug || null,
    eventSlug: payload.metadata?.event_slug || null,
    occurrenceId: payload.metadata?.occurrence_id || null,
    paymentStatus: payload.payment_status || null,
    sessionStatus: payload.status || null,
    paymentIntentId,
    amountTotalMinor: payload.amount_total ?? null,
    amountTotalLabel:
      payload.amount_total != null
        ? formatCurrencyFromMinorUnits(payload.amount_total, payload.currency || "eur")
        : null
  };
}
