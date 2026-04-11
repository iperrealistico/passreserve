import { formatDateLabel } from "./passreserve-format.js";
import {
  confirmRegistrationHold,
  createRegistrationHold,
  getConfirmationFieldRules,
  getConfirmedRegistrationView,
  getRegistrationExperienceBySlugs,
  getRegistrationFieldRules,
  getRegistrationHoldView,
  getRegistrationPaymentCancellationView,
  getRegistrationPaymentPreviewView,
  getRegistrationQuantityOptions,
  getRegistrationRouteParams,
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
  getRegistrationPaymentCancellationView,
  getRegistrationPaymentPreviewView,
  getRegistrationQuantityOptions,
  getRegistrationRouteParams,
  registrationConfirmationSchema,
  registrationRequestSchema,
  resolveSuccessfulRegistrationConfirmation,
  resumeRegistrationPayment
};

export function getOccurrenceDateLabel(value) {
  return formatDateLabel(value, "Europe/Rome");
}
