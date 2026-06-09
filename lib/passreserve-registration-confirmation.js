import { normalizeText } from "./passreserve-format.js";

export const REGISTRATION_CONFIRMATION_MODE = Object.freeze({
  EMAIL_LINK_REQUIRED: "EMAIL_LINK_REQUIRED",
  DIRECT_CONFIRM: "DIRECT_CONFIRM"
});

const REGISTRATION_CONFIRMATION_MODE_SET = new Set(
  Object.values(REGISTRATION_CONFIRMATION_MODE)
);

export function normalizeRegistrationConfirmationMode(
  value,
  fallback = REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
) {
  const normalized = normalizeText(value).toUpperCase();
  return REGISTRATION_CONFIRMATION_MODE_SET.has(normalized) ? normalized : fallback;
}

export function resolveRegistrationConfirmationMode(organizer = null, event = null) {
  const organizerMode = normalizeRegistrationConfirmationMode(
    organizer?.registrationConfirmationMode,
    REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
  );

  if (!event?.registrationConfirmationMode) {
    return organizerMode;
  }

  return normalizeRegistrationConfirmationMode(event.registrationConfirmationMode, organizerMode);
}

export function requiresEmailLinkConfirmation(organizer = null, event = null) {
  return (
    resolveRegistrationConfirmationMode(organizer, event) ===
    REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
  );
}

export function getRegistrationConfirmationModeMeta(mode, locale = "en") {
  const resolved = normalizeRegistrationConfirmationMode(mode);
  const isItalian = String(locale || "en").trim().toLowerCase().startsWith("it");

  if (resolved === REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM) {
    return {
      mode: resolved,
      label: isItalian ? "Conferma immediata" : "Confirm immediately",
      detail: isItalian
        ? "Il prenotante conclude subito il flusso senza dover cliccare il link email."
        : "Guests finish the flow immediately without the extra email-link click."
    };
  }

  return {
    mode: REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED,
    label: isItalian ? "Link email obbligatorio" : "Require email confirmation link",
    detail: isItalian
      ? "Il prenotante deve aprire la mail e confermare prima che la registrazione prosegua."
      : "Guests must open the email and confirm before the registration continues."
  };
}
