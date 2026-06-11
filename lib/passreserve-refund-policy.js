import { getLocalizedText } from "./passreserve-content.js";
import { normalizeText } from "./passreserve-format.js";
import { normalizeRegistrationLocale, REGISTRATION_LANGUAGE } from "./passreserve-registration-language.js";

export const REFUND_POLICY_TYPE = Object.freeze({
  REFUNDABLE: "REFUNDABLE",
  NON_REFUNDABLE: "NON_REFUNDABLE",
  REFUNDABLE_WITH_CONDITIONS: "REFUNDABLE_WITH_CONDITIONS"
});

const REFUND_POLICY_TYPE_SET = new Set(Object.values(REFUND_POLICY_TYPE));

function getGenericRefundPolicyMeta(locale = REGISTRATION_LANGUAGE.EN) {
  const isItalian = normalizeRegistrationLocale(locale) === REGISTRATION_LANGUAGE.IT;

  return {
    type: null,
    label: isItalian ? "Policy organizer" : "Organizer policy",
    summary: isItalian
      ? "Leggi con attenzione i termini di cancellazione e rimborso pubblicati dall'organizer."
      : "Read the organizer's published cancellation and refund terms carefully.",
    detailFallback: isItalian
      ? "L'organizer gestisce direttamente la policy di cancellazione e le eventuali condizioni di rimborso per questa prenotazione."
      : "The organizer directly manages the cancellation policy and any refund conditions for this booking."
  };
}

export function normalizeRefundPolicyType(value, fallback = null) {
  const normalized = normalizeText(value).toUpperCase();

  if (REFUND_POLICY_TYPE_SET.has(normalized)) {
    return normalized;
  }

  return REFUND_POLICY_TYPE_SET.has(fallback) ? fallback : null;
}

export function getRefundPolicyTypeMeta(
  value,
  locale = REGISTRATION_LANGUAGE.EN
) {
  const type = normalizeRefundPolicyType(value, null);
  const isItalian = normalizeRegistrationLocale(locale) === REGISTRATION_LANGUAGE.IT;

  if (!type) {
    return getGenericRefundPolicyMeta(locale);
  }

  if (type === REFUND_POLICY_TYPE.REFUNDABLE) {
    return {
      type,
      label: isItalian ? "Rimborsabile" : "Refundable",
      summary: isItalian
        ? "L'organizer dichiara che questa prenotazione puo essere rimborsata."
        : "The organizer states that this booking can be refunded.",
      detailFallback: isItalian
        ? "Consulta i dettagli qui sotto per eventuali tempi operativi, modalita e canali da seguire."
        : "See the details below for any timing, process, and contact instructions."
    };
  }

  if (type === REFUND_POLICY_TYPE.NON_REFUNDABLE) {
    return {
      type,
      label: isItalian ? "Non rimborsabile" : "Non-refundable",
      summary: isItalian
        ? "L'organizer dichiara che questa prenotazione non e rimborsabile."
        : "The organizer states that this booking is non-refundable.",
      detailFallback: isItalian
        ? "Eventuali eccezioni o casi particolari vengono indicati nei dettagli pubblicati dall'organizer."
        : "Any exceptions or special cases will be described in the organizer's published details."
    };
  }

  return {
    type,
    label: isItalian ? "Rimborsabile con condizioni" : "Refundable with conditions",
    summary: isItalian
      ? "L'organizer prevede rimborsi solo secondo le condizioni specificate qui sotto."
      : "The organizer allows refunds only under the conditions described below.",
    detailFallback: isItalian
      ? "Leggi attentamente condizioni, scadenze e modalita pubblicate dall'organizer prima di confermare."
      : "Read the organizer's published conditions, deadlines, and process carefully before confirming."
  };
}

export function getRefundPolicyTypeOptions(locale = REGISTRATION_LANGUAGE.EN) {
  return Object.values(REFUND_POLICY_TYPE).map((type) => ({
    value: type,
    ...getRefundPolicyTypeMeta(type, locale)
  }));
}

export function getRefundPolicyDetail(event, locale = REGISTRATION_LANGUAGE.EN) {
  return normalizeText(
    getLocalizedText(event, "cancellationPolicy", locale) || event?.cancellationPolicy || ""
  );
}

export function buildRefundPolicyView(event, locale = REGISTRATION_LANGUAGE.EN) {
  const type = normalizeRefundPolicyType(event?.refundPolicyType, null);
  const meta = getRefundPolicyTypeMeta(type, locale);
  const customDetail = getRefundPolicyDetail(event, locale);

  if (!type && !customDetail) {
    return null;
  }

  return {
    type,
    label: meta.label,
    summary: meta.summary,
    detail: customDetail || meta.detailFallback,
    customDetail,
    hasStructuredType: Boolean(type),
    hasCustomDetail: Boolean(customDetail),
    requiresAcceptance: true
  };
}

export function buildRefundPolicySnapshot(event, locale = REGISTRATION_LANGUAGE.EN) {
  const view = buildRefundPolicyView(event, locale);

  if (!view) {
    return null;
  }

  return {
    type: view.type,
    label: view.label,
    summary: view.summary,
    detail: view.detail,
    locale: normalizeRegistrationLocale(locale)
  };
}

export function requiresRefundPolicyAcceptance(event, locale = REGISTRATION_LANGUAGE.EN) {
  return Boolean(buildRefundPolicyView(event, locale)?.requiresAcceptance);
}
