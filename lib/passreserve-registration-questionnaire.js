import { dietaryFlags } from "./passreserve-dietary.js";
import { normalizeEmail, normalizeText } from "./passreserve-format.js";

export const REGISTRATION_QUESTIONNAIRE_ROLE = Object.freeze({
  LEAD: "lead",
  PARTICIPANT: "participant"
});

export const REGISTRATION_QUESTIONNAIRE_MODE = Object.freeze({
  REQUIRED: "required",
  OPTIONAL: "optional",
  HIDDEN: "hidden"
});

export const REGISTRATION_QUESTIONNAIRE_FIELDS = Object.freeze([
  {
    id: "firstName",
    kind: "text",
    labels: {
      en: "First name",
      it: "Nome"
    },
    detail: {
      en: "Use the participant's real first name for guest lists and check-in.",
      it: "Usa il nome reale del partecipante per lista ospiti e check-in."
    },
    minLength: 2
  },
  {
    id: "lastName",
    kind: "text",
    labels: {
      en: "Last name",
      it: "Cognome"
    },
    detail: {
      en: "Keep the surname available for tickets, check-in, and organizer records.",
      it: "Mantieni il cognome disponibile per ticket, check-in e archivio organizer."
    },
    minLength: 2
  },
  {
    id: "address",
    kind: "text",
    labels: {
      en: "Address",
      it: "Indirizzo"
    },
    detail: {
      en: "Collect a contact address only when it is actually useful for this event.",
      it: "Raccogli un indirizzo di contatto solo quando è davvero utile per questo evento."
    },
    minLength: 4
  },
  {
    id: "phone",
    kind: "text",
    labels: {
      en: "Phone",
      it: "Telefono"
    },
    detail: {
      en: "Use a reachable number for day-of-event questions or last-minute schedule updates.",
      it: "Usa un numero raggiungibile per domande last-minute o aggiornamenti di programma."
    },
    minLength: 6
  },
  {
    id: "email",
    kind: "email",
    labels: {
      en: "Email",
      it: "Email"
    },
    detail: {
      en: "The lead email receives confirmations, payment updates, and organizer follow-up.",
      it: "L'email del capogruppo riceve conferme, aggiornamenti pagamento e follow-up organizer."
    }
  },
  {
    id: "dietaryFlags",
    kind: "multi-select",
    labels: {
      en: "Dietary restrictions",
      it: "Restrizioni alimentari"
    },
    detail: {
      en: "Ask for allergies, intolerances, or standard dietary flags only when the host needs them.",
      it: "Chiedi allergie, intolleranze o flag standard solo quando l'organizer ne ha davvero bisogno."
    }
  },
  {
    id: "dietaryOther",
    kind: "textarea",
    labels: {
      en: "Dietary note",
      it: "Nota alimentare"
    },
    detail: {
      en: "Free-text note for allergies, menu exceptions, or service notes.",
      it: "Nota libera per allergie, eccezioni menu o note di servizio."
    },
    minLength: 1
  }
]);

const QUESTIONNAIRE_FIELD_IDS = REGISTRATION_QUESTIONNAIRE_FIELDS.map((field) => field.id);
const QUESTIONNAIRE_ROLES = Object.values(REGISTRATION_QUESTIONNAIRE_ROLE);
const QUESTIONNAIRE_MODES = new Set(Object.values(REGISTRATION_QUESTIONNAIRE_MODE));
const dietaryFlagIds = new Set(dietaryFlags.map((flag) => flag.id));
const emailPattern = /^\S+@\S+\.\S+$/;

const DEFAULT_ROLE_CONFIG = Object.freeze({
  firstName: REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED,
  lastName: REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED,
  address: REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED,
  phone: REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED,
  email: REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED,
  dietaryFlags: REGISTRATION_QUESTIONNAIRE_MODE.OPTIONAL,
  dietaryOther: REGISTRATION_QUESTIONNAIRE_MODE.OPTIONAL
});

function cloneRoleConfig(config = DEFAULT_ROLE_CONFIG) {
  return Object.fromEntries(QUESTIONNAIRE_FIELD_IDS.map((field) => [field, config[field]]));
}

function cloneQuestionnaireConfig(config) {
  return {
    version: 1,
    lead: cloneRoleConfig(config?.lead),
    participant: cloneRoleConfig(config?.participant)
  };
}

function hideDietaryFields(config) {
  const next = cloneQuestionnaireConfig(config);

  for (const role of QUESTIONNAIRE_ROLES) {
    next[role].dietaryFlags = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    next[role].dietaryOther = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
  }

  return next;
}

function applyQuestionnaireGuardrails(config) {
  const next = cloneQuestionnaireConfig(config);

  next.lead.email = REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED;

  for (const role of QUESTIONNAIRE_ROLES) {
    if (next[role].firstName === REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN) {
      next[role].firstName = REGISTRATION_QUESTIONNAIRE_MODE.OPTIONAL;
    }

    if (next[role].lastName === REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN) {
      next[role].lastName = REGISTRATION_QUESTIONNAIRE_MODE.OPTIONAL;
    }
  }

  return next;
}

export function buildDefaultRegistrationQuestionnaireConfig(options = {}) {
  const next = cloneQuestionnaireConfig({
    lead: DEFAULT_ROLE_CONFIG,
    participant: DEFAULT_ROLE_CONFIG
  });

  if (options.collectDietaryInfo === false) {
    return hideDietaryFields(next);
  }

  return applyQuestionnaireGuardrails(next);
}

export function normalizeRegistrationQuestionnaireConfig(value, options = {}) {
  const baseConfig = options.baseConfig
    ? cloneQuestionnaireConfig(options.baseConfig)
    : buildDefaultRegistrationQuestionnaireConfig({
        collectDietaryInfo: options.collectDietaryInfo
      });

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return applyQuestionnaireGuardrails(baseConfig);
  }

  const next = cloneQuestionnaireConfig(baseConfig);

  for (const role of QUESTIONNAIRE_ROLES) {
    const roleConfig = value[role];

    if (!roleConfig || typeof roleConfig !== "object" || Array.isArray(roleConfig)) {
      continue;
    }

    for (const field of QUESTIONNAIRE_FIELD_IDS) {
      const candidate = String(roleConfig[field] || "").trim().toLowerCase();

      if (QUESTIONNAIRE_MODES.has(candidate)) {
        next[role][field] = candidate;
      }
    }
  }

  return applyQuestionnaireGuardrails(next);
}

export function getRegistrationQuestionnaireRole(index) {
  return index === 0
    ? REGISTRATION_QUESTIONNAIRE_ROLE.LEAD
    : REGISTRATION_QUESTIONNAIRE_ROLE.PARTICIPANT;
}

export function resolveRegistrationQuestionnaireConfig(organizer = null, event = null) {
  const organizerConfig = organizer?.registrationQuestionnaireConfig
    ? normalizeRegistrationQuestionnaireConfig(organizer.registrationQuestionnaireConfig)
    : buildDefaultRegistrationQuestionnaireConfig();
  const eventConfig = event?.registrationQuestionnaireConfig
    ? normalizeRegistrationQuestionnaireConfig(event.registrationQuestionnaireConfig, {
        baseConfig: organizerConfig
      })
    : organizerConfig;

  if (!event?.registrationQuestionnaireConfig && event?.collectDietaryInfo === false) {
    return hideDietaryFields(eventConfig);
  }

  return applyQuestionnaireGuardrails(eventConfig);
}

export function shouldCollectDietaryFromQuestionnaire(config) {
  const resolved = normalizeRegistrationQuestionnaireConfig(config);

  return QUESTIONNAIRE_ROLES.some((role) =>
    ["dietaryFlags", "dietaryOther"].some(
      (field) => resolved[role][field] !== REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN
    )
  );
}

export function getRegistrationQuestionnaireFieldMode(config, role, field) {
  const resolved = normalizeRegistrationQuestionnaireConfig(config);
  const safeRole = QUESTIONNAIRE_ROLES.includes(role)
    ? role
    : REGISTRATION_QUESTIONNAIRE_ROLE.PARTICIPANT;

  return resolved[safeRole][field] || REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
}

export function isRegistrationQuestionnaireFieldVisible(config, role, field) {
  return (
    getRegistrationQuestionnaireFieldMode(config, role, field) !==
    REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN
  );
}

export function isRegistrationQuestionnaireFieldRequired(config, role, field) {
  return (
    getRegistrationQuestionnaireFieldMode(config, role, field) ===
    REGISTRATION_QUESTIONNAIRE_MODE.REQUIRED
  );
}

export function getRegistrationQuestionnaireFieldMeta(fieldId) {
  return REGISTRATION_QUESTIONNAIRE_FIELDS.find((field) => field.id === fieldId) ?? null;
}

export function getRegistrationQuestionnaireFieldLabel(fieldId, locale = "en") {
  const field = getRegistrationQuestionnaireFieldMeta(fieldId);
  return field?.labels?.[locale === "it" ? "it" : "en"] || fieldId;
}

function getNormalizedQuestionnaireValue(fieldId, rawValue) {
  switch (fieldId) {
    case "dietaryFlags":
      return Array.isArray(rawValue)
        ? [...new Set(rawValue.filter((flag) => dietaryFlagIds.has(flag)))]
        : [];
    case "email":
      return normalizeEmail(rawValue);
    default:
      return normalizeText(rawValue);
  }
}

function hasValidFieldValue(fieldMeta, value) {
  if (fieldMeta.id === "dietaryFlags") {
    return Array.isArray(value) && value.length > 0;
  }

  if (fieldMeta.id === "email") {
    return emailPattern.test(String(value || "").trim());
  }

  const textValue = String(value || "").trim();
  const minLength = Number(fieldMeta.minLength || 1);
  return textValue.length >= minLength;
}

function hasOptionalFieldIssue(fieldMeta, value) {
  if (fieldMeta.id === "dietaryFlags") {
    return false;
  }

  const textValue = String(value || "").trim();

  if (!textValue) {
    return false;
  }

  if (fieldMeta.id === "email") {
    return !emailPattern.test(textValue);
  }

  return fieldMeta.minLength ? textValue.length < fieldMeta.minLength : false;
}

export function normalizeRegistrationQuestionnaireAttendee(
  attendee = {},
  config,
  index,
  nowIso = new Date().toISOString()
) {
  const resolved = normalizeRegistrationQuestionnaireConfig(config);
  const role = getRegistrationQuestionnaireRole(index);

  return {
    id: attendee.id || "",
    sortOrder: index,
    ticketCategoryId: normalizeText(attendee.ticketCategoryId),
    firstName: isRegistrationQuestionnaireFieldVisible(resolved, role, "firstName")
      ? getNormalizedQuestionnaireValue("firstName", attendee.firstName)
      : "",
    lastName: isRegistrationQuestionnaireFieldVisible(resolved, role, "lastName")
      ? getNormalizedQuestionnaireValue("lastName", attendee.lastName)
      : "",
    address: isRegistrationQuestionnaireFieldVisible(resolved, role, "address")
      ? getNormalizedQuestionnaireValue("address", attendee.address)
      : "",
    phone: isRegistrationQuestionnaireFieldVisible(resolved, role, "phone")
      ? getNormalizedQuestionnaireValue("phone", attendee.phone)
      : "",
    email: isRegistrationQuestionnaireFieldVisible(resolved, role, "email")
      ? getNormalizedQuestionnaireValue("email", attendee.email)
      : "",
    dietaryFlags: isRegistrationQuestionnaireFieldVisible(resolved, role, "dietaryFlags")
      ? getNormalizedQuestionnaireValue("dietaryFlags", attendee.dietaryFlags)
      : [],
    dietaryOther: isRegistrationQuestionnaireFieldVisible(resolved, role, "dietaryOther")
      ? getNormalizedQuestionnaireValue("dietaryOther", attendee.dietaryOther)
      : "",
    createdAt: attendee.createdAt || nowIso,
    updatedAt: nowIso
  };
}

export function normalizeRegistrationQuestionnaireAttendees(
  attendees = [],
  config,
  nowIso = new Date().toISOString()
) {
  return Array.isArray(attendees)
    ? attendees.map((attendee, index) =>
        normalizeRegistrationQuestionnaireAttendee(attendee, config, index, nowIso)
      )
    : [];
}

export function getRegistrationQuestionnaireMissingFields(
  attendee = {},
  config,
  index,
  locale = "en"
) {
  const resolved = normalizeRegistrationQuestionnaireConfig(config);
  const role = getRegistrationQuestionnaireRole(index);
  const missing = [];

  for (const field of REGISTRATION_QUESTIONNAIRE_FIELDS) {
    if (
      !isRegistrationQuestionnaireFieldRequired(resolved, role, field.id) ||
      !isRegistrationQuestionnaireFieldVisible(resolved, role, field.id)
    ) {
      continue;
    }

    const value = getNormalizedQuestionnaireValue(field.id, attendee[field.id]);

    if (!hasValidFieldValue(field, value)) {
      missing.push(getRegistrationQuestionnaireFieldLabel(field.id, locale));
    }
  }

  return missing;
}

export function isRegistrationQuestionnaireAttendeeComplete(attendee, config, index) {
  return getRegistrationQuestionnaireMissingFields(attendee, config, index, "en").length === 0;
}

export function validateRegistrationQuestionnaireAttendees(
  attendees = [],
  config,
  options = {}
) {
  const locale = options.locale === "it" ? "it" : "en";
  const fieldIssues = [];
  const missingByIndex = [];

  for (const [index, attendee] of attendees.entries()) {
    const role = getRegistrationQuestionnaireRole(index);
    const missingFields = getRegistrationQuestionnaireMissingFields(
      attendee,
      config,
      index,
      locale
    );

    if (missingFields.length) {
      missingByIndex.push({
        index,
        role,
        fields: missingFields
      });
    }

    for (const field of REGISTRATION_QUESTIONNAIRE_FIELDS) {
      if (!isRegistrationQuestionnaireFieldVisible(config, role, field.id)) {
        continue;
      }

      const value = getNormalizedQuestionnaireValue(field.id, attendee[field.id]);
      const isRequired = isRegistrationQuestionnaireFieldRequired(config, role, field.id);

      if (isRequired && !hasValidFieldValue(field, value)) {
        fieldIssues.push({
          index,
          role,
          field: field.id,
          type: "required"
        });
        continue;
      }

      if (!isRequired && hasOptionalFieldIssue(field, value)) {
        fieldIssues.push({
          index,
          role,
          field: field.id,
          type: "invalid_optional"
        });
      }
    }
  }

  if (!fieldIssues.length) {
    return {
      ok: true,
      fieldIssues: [],
      missingByIndex: []
    };
  }

  return {
    ok: false,
    fieldIssues,
    missingByIndex
  };
}

export function getRegistrationQuestionnaireFieldRules(config, locale = "en") {
  const resolved = normalizeRegistrationQuestionnaireConfig(config);
  const isItalian = locale === "it";

  return REGISTRATION_QUESTIONNAIRE_FIELDS.map((field) => ({
    field: field.id,
    label: field.labels[isItalian ? "it" : "en"],
    detail: field.detail[isItalian ? "it" : "en"],
    leadMode: resolved.lead[field.id],
    participantMode: resolved.participant[field.id]
  }));
}
