"use server";

import { submitOrganizerRequest } from "../lib/passreserve-organizer-requests";

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

export async function submitOrganizerRequestAction(_previousState, formData) {
  const payload = {
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
  const fieldErrors = validateOrganizerRequest(payload);

  if (Object.keys(fieldErrors).length) {
    return {
      ...initialOrganizerRequestState,
      status: "error",
      message: "We still need a few details before we can save this request.",
      fieldErrors
    };
  }

  const result = await submitOrganizerRequest(payload);

  if (!result.ok) {
    return {
      ...initialOrganizerRequestState,
      status: "error",
      message: result.message,
      fieldErrors: {}
    };
  }

  return {
    ...initialOrganizerRequestState,
    status: "success",
    message: `Thanks, ${result.request.contactName}. ${result.request.organizerName} is now in the Passreserve launch inbox.`,
    detail: `${result.storage.label}. ${result.notifications.label}.`,
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
