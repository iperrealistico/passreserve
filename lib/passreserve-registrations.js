import { formatDateLabel } from "./passreserve-format.js";
import {
  createOrganizerRegistration,
  organizerManualRegistrationSchema,
  ORGANIZER_MANUAL_REGISTRATION_MODE
} from "./passreserve-organizer-registrations.js";
import {
  confirmRegistrationHold,
  createRegistrationHold,
  getConfirmationFieldRules,
  getConfirmedRegistrationView,
  getRegistrationExperienceBySlugs,
  getRegistrationFieldRules,
  getRegistrationHoldView,
  getRegistrationPendingView,
  getRegistrationPaymentCancellationView,
  getRegistrationPaymentPreviewView,
  getRegistrationQuantityOptions,
  getRegistrationRouteParams,
  processRegistrationReminderDeliveries,
  registrationConfirmationSchema,
  registrationRequestSchema,
  resolveSuccessfulRegistrationConfirmation,
  resumeRegistrationPayment
} from "./passreserve-service.js";

export {
  confirmRegistrationHold,
  createOrganizerRegistration,
  createRegistrationHold,
  getConfirmationFieldRules,
  getConfirmedRegistrationView,
  getRegistrationExperienceBySlugs,
  getRegistrationFieldRules,
  getRegistrationHoldView,
  getRegistrationPendingView,
  getRegistrationPaymentCancellationView,
  getRegistrationPaymentPreviewView,
  getRegistrationQuantityOptions,
  getRegistrationRouteParams,
  ORGANIZER_MANUAL_REGISTRATION_MODE,
  organizerManualRegistrationSchema,
  processRegistrationReminderDeliveries,
  registrationConfirmationSchema,
  registrationRequestSchema,
  resolveSuccessfulRegistrationConfirmation,
  resumeRegistrationPayment
};

export function getOccurrenceDateLabel(value) {
  return formatDateLabel(value, "Europe/Rome");
}
