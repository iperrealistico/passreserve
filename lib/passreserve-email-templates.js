import { normalizeText } from "./passreserve-format.js";
import {
  REGISTRATION_LANGUAGE,
  normalizeRegistrationLocale
} from "./passreserve-registration-language.js";

export const EMAIL_TEMPLATE_LOCALES = Object.freeze([
  REGISTRATION_LANGUAGE.IT,
  REGISTRATION_LANGUAGE.EN
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeEmailTemplateTranslations(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const entries = EMAIL_TEMPLATE_LOCALES.flatMap((locale) => {
    const normalized = normalizeText(value[locale]);

    return normalized ? [[locale, normalized]] : [];
  });

  return entries.length ? Object.fromEntries(entries) : null;
}

function getLocalizedTemplateValue(translations, locale = REGISTRATION_LANGUAGE.EN) {
  const normalizedTranslations = normalizeEmailTemplateTranslations(translations);

  if (!normalizedTranslations) {
    return "";
  }

  const resolvedLocale = normalizeRegistrationLocale(locale);
  const exact = normalizeText(normalizedTranslations[resolvedLocale]);

  if (exact) {
    return exact;
  }

  if (resolvedLocale !== REGISTRATION_LANGUAGE.EN) {
    const englishFallback = normalizeText(normalizedTranslations[REGISTRATION_LANGUAGE.EN]);

    if (englishFallback) {
      return englishFallback;
    }
  }

  return normalizeText(normalizedTranslations[REGISTRATION_LANGUAGE.IT]);
}

export function resolveLocalizedEmailTemplate(template, locale = REGISTRATION_LANGUAGE.EN) {
  return {
    subject:
      getLocalizedTemplateValue(template?.subjectTranslations, locale) ||
      normalizeText(template?.subject),
    preview:
      getLocalizedTemplateValue(template?.previewTranslations, locale) ||
      normalizeText(template?.preview),
    bodyHtml:
      getLocalizedTemplateValue(template?.bodyHtmlTranslations, locale) ||
      normalizeText(template?.bodyHtml)
  };
}
