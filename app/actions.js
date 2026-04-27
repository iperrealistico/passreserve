"use server";

import { redirect } from "next/navigation";

import {
  ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS,
  ORGANIZER_REQUEST_MIN_SUBMIT_SECONDS,
  verifyOrganizerRequestAltchaPayload
} from "../lib/passreserve-antispam.js";
import {
  consumeOrganizerRequestCaptchaToken,
  consumeOrganizerRequestEmailRateLimit,
  consumeOrganizerRequestRateLimit
} from "../lib/passreserve-auth-security.js";
import { submitOrganizerRequest } from "../lib/passreserve-service.js";

const initialOrganizerRequestState = {
  status: "idle",
  message: "",
  detail: "",
  fieldErrors: {}
};

function toValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function validateOrganizerRequest(payload) {
  const errors = {};

  if (!payload.contactName) {
    errors.contactName = "Add the main contact name.";
  }

  if (!payload.contactEmail) {
    errors.contactEmail = "Add the contact email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contactEmail)) {
    errors.contactEmail = "Use a valid contact email.";
  }

  if (!payload.organizerName) {
    errors.organizerName = "Add the host or organizer name.";
  }

  if (!payload.city) {
    errors.city = "Add the main city for these events.";
  }

  if (!payload.eventFocus) {
    errors.eventFocus = "Tell us what kinds of events you host.";
  }

  return errors;
}

function buildOrganizerRequestPayload(formData) {
  return {
    contactName: toValue(formData, "contactName"),
    contactEmail: toValue(formData, "contactEmail"),
    contactPhone: toValue(formData, "contactPhone"),
    organizerName: toValue(formData, "organizerName"),
    city: toValue(formData, "city"),
    launchWindow: toValue(formData, "launchWindow"),
    paymentModel: toValue(formData, "paymentModel"),
    eventFocus: toValue(formData, "eventFocus"),
    note: toValue(formData, "note")
  };
}

function isLikelyBotSubmission(formData) {
  return Boolean(toValue(formData, "companyWebsite"));
}

function wasSubmittedTooQuickly(formData) {
  const startedAt = Number(toValue(formData, "formStartedAt"));

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return true;
  }

  return Date.now() - startedAt < ORGANIZER_REQUEST_MIN_SUBMIT_SECONDS * 1000;
}

function buildIgnoredRequestResult(payload) {
  return {
    ok: true,
    ignored: true,
    request: {
      contactName: payload.contactName || "there",
      organizerName: payload.organizerName || "your organizer"
    }
  };
}

async function submitProtectedOrganizerRequest(formData) {
  const payload = buildOrganizerRequestPayload(formData);
  const fieldErrors = validateOrganizerRequest(payload);

  if (Object.keys(fieldErrors).length) {
    return {
      ok: false,
      kind: "validation",
      fieldErrors,
      message: "We still need a few details before we can save this request."
    };
  }

  if (isLikelyBotSubmission(formData) || wasSubmittedTooQuickly(formData)) {
    return buildIgnoredRequestResult(payload);
  }

  const rateLimit = await consumeOrganizerRequestRateLimit();

  if (!rateLimit.success) {
    return {
      ok: false,
      kind: "security",
      fieldErrors: {},
      message: "Too many requests came from this network just now. Please wait a little and try again."
    };
  }

  const emailRateLimit = await consumeOrganizerRequestEmailRateLimit(payload.contactEmail);

  if (!emailRateLimit.success) {
    return {
      ok: false,
      kind: "security",
      fieldErrors: {},
      message: "We received too many signup attempts for this email just now. Please wait a little and try again."
    };
  }

  const verification = await verifyOrganizerRequestAltchaPayload(
    toValue(formData, "altcha")
  );

  if (!verification.ok) {
    return {
      ok: false,
      kind: "security",
      fieldErrors: {},
      message: verification.message
    };
  }

  const replayCheck = await consumeOrganizerRequestCaptchaToken(verification.challengeId, {
    windowSeconds: ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS
  });

  if (!replayCheck.success) {
    return {
      ok: false,
      kind: "security",
      fieldErrors: {},
      message: "This verification token was already used. Please reopen the form and try again."
    };
  }

  return submitOrganizerRequest(payload);
}

export async function submitOrganizerRequestAction(_previousState, formData) {
  const result = await submitProtectedOrganizerRequest(formData);

  if (!result.ok) {
    return {
      ...initialOrganizerRequestState,
      status: "error",
      message: result.message,
      fieldErrors: result.fieldErrors ?? {}
    };
  }

  if (result.ignored) {
    return {
      ...initialOrganizerRequestState,
      status: "success",
      message: `Thanks, ${result.request.contactName}. We received the request for ${result.request.organizerName}.`,
      detail: "If the submission was valid, the next onboarding email will arrive shortly.",
      fieldErrors: {},
      request: {
        id: null,
        organizerName: result.request.organizerName,
        city: "",
        launchWindow: "",
        paymentModel: ""
      }
    };
  }

  return {
    ...initialOrganizerRequestState,
    status: "success",
    message: `Thanks, ${result.request.contactName}. We received the request for ${result.request.organizerName}.`,
    detail: "If the submission was valid, the next onboarding email will arrive shortly.",
    fieldErrors: {},
    request: {
      id: result.request.id,
      organizerName: result.request.organizerName,
      city: result.request.city,
      launchWindow: result.request.launchWindow,
      paymentModel: result.request.paymentModel
    }
  };
}

export async function submitOrganizerRequestRedirectAction(formData) {
  const result = await submitProtectedOrganizerRequest(formData);

  if (!result.ok) {
    redirect("/?error=request");
  }

  redirect("/?message=request-saved");
}
