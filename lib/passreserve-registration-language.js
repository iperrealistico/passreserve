import { normalizeText } from "./passreserve-format.js";

export const REGISTRATION_LANGUAGE = Object.freeze({
  EN: "en",
  IT: "it"
});

export const REGISTRATION_LANGUAGE_OPTIONS = Object.freeze([
  {
    value: REGISTRATION_LANGUAGE.IT,
    labels: {
      en: "Italian",
      it: "Italiano"
    }
  },
  {
    value: REGISTRATION_LANGUAGE.EN,
    labels: {
      en: "English",
      it: "English"
    }
  }
]);

const REGISTRATION_LANGUAGE_SET = new Set(Object.values(REGISTRATION_LANGUAGE));

function normalizeRegistrationLanguageValue(value) {
  return normalizeText(value).slice(0, 2).toLowerCase();
}

export function normalizeRegistrationLocale(
  value,
  fallback = REGISTRATION_LANGUAGE.EN
) {
  const normalized = normalizeRegistrationLanguageValue(value);
  const safeFallback = REGISTRATION_LANGUAGE_SET.has(
    normalizeRegistrationLanguageValue(fallback)
  )
    ? normalizeRegistrationLanguageValue(fallback)
    : REGISTRATION_LANGUAGE.EN;

  return REGISTRATION_LANGUAGE_SET.has(normalized) ? normalized : safeFallback;
}

export function resolveRegistrationLanguagePromptEnabled(
  organizer = null,
  event = null
) {
  const organizerDefault =
    typeof organizer?.registrationLanguagePromptEnabled === "boolean"
      ? organizer.registrationLanguagePromptEnabled
      : true;

  if (typeof event?.registrationLanguagePromptEnabled !== "boolean") {
    return organizerDefault;
  }

  return event.registrationLanguagePromptEnabled;
}

export function normalizeRegistrationLanguagePromptEnabledInput(
  value,
  fallback = true
) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();

  if (["true", "1", "yes", "on", "prompt", "ask"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off", "inherit-page-language", "page"].includes(normalized)) {
    return false;
  }

  return Boolean(fallback);
}

export function getRegistrationLanguageOptions(locale = REGISTRATION_LANGUAGE.EN) {
  const resolvedLocale = normalizeRegistrationLocale(locale);

  return REGISTRATION_LANGUAGE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.labels[resolvedLocale]
  }));
}

export function getRegistrationLanguagePromptMeta(
  enabled,
  locale = REGISTRATION_LANGUAGE.EN
) {
  const resolvedLocale = normalizeRegistrationLocale(locale);
  const isItalian = resolvedLocale === REGISTRATION_LANGUAGE.IT;

  if (enabled) {
    return {
      enabled: true,
      label: isItalian
        ? "Chiedi la lingua della registrazione"
        : "Ask for the booking language",
      detail: isItalian
        ? "Il prenotante sceglie italiano o inglese e questa scelta guidera interfaccia e email successive."
        : "The lead guest chooses Italian or English and that choice will drive the booking interface and later emails."
    };
  }

  return {
    enabled: false,
    label: isItalian
      ? "Usa la lingua corrente della pagina"
      : "Use the current page language",
    detail: isItalian
      ? "Il flow non chiede una scelta esplicita: la registrazione eredita la lingua della pagina gia aperta."
      : "The flow does not ask explicitly: the registration inherits the language of the page already open."
  };
}
