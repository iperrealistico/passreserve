"use server";

import { redirect } from "next/navigation";

import {
  confirmRegistrationHold,
  createRegistrationHold,
  resumeRegistrationPayment
} from "../../../../../lib/passreserve-registrations";

const defaultActionState = {
  message: "",
  fieldErrors: {}
};

function toStringValue(formData, key) {
  return String(formData.get(key) || "");
}

export async function createRegistrationHoldAction(_previousState, formData) {
  const result = createRegistrationHold({
    slug: toStringValue(formData, "slug"),
    eventSlug: toStringValue(formData, "eventSlug"),
    occurrenceId: toStringValue(formData, "occurrenceId"),
    ticketCategoryId: toStringValue(formData, "ticketCategoryId"),
    quantity: toStringValue(formData, "quantity"),
    attendeeName: toStringValue(formData, "attendeeName"),
    attendeeEmail: toStringValue(formData, "attendeeEmail"),
    attendeePhone: toStringValue(formData, "attendeePhone")
  });

  if (!result.ok) {
    return {
      ...defaultActionState,
      message: result.message,
      fieldErrors: result.fieldErrors ?? {}
    };
  }

  redirect(result.redirectHref);
}

export async function confirmRegistrationAction(_previousState, formData) {
  const result = await confirmRegistrationHold({
    slug: toStringValue(formData, "slug"),
    eventSlug: toStringValue(formData, "eventSlug"),
    holdToken: toStringValue(formData, "holdToken"),
    baseUrl: toStringValue(formData, "baseUrl"),
    termsAccepted: toStringValue(formData, "termsAccepted"),
    responsibilityAccepted: toStringValue(formData, "responsibilityAccepted")
  });

  if (!result.ok) {
    return {
      ...defaultActionState,
      message: result.message,
      fieldErrors: result.fieldErrors ?? {}
    };
  }

  redirect(result.redirectHref);
}

export async function resumeRegistrationPaymentAction(_previousState, formData) {
  const result = await resumeRegistrationPayment({
    slug: toStringValue(formData, "slug"),
    eventSlug: toStringValue(formData, "eventSlug"),
    paymentToken: toStringValue(formData, "paymentToken"),
    baseUrl: toStringValue(formData, "baseUrl")
  });

  if (!result.ok) {
    return {
      ...defaultActionState,
      message: result.message,
      fieldErrors: result.fieldErrors ?? {}
    };
  }

  redirect(result.redirectHref);
}
