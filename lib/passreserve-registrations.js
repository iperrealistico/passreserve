import { formatDateLabel } from "./passreserve-format.js";
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
};

export function getOccurrenceDateLabel(value) {
  return formatDateLabel(value, "Europe/Rome");
}
