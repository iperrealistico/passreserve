"use client";

import { useMemo, useState } from "react";

import {
  buildDefaultRegistrationQuestionnaireConfig,
  normalizeRegistrationQuestionnaireConfig,
  REGISTRATION_QUESTIONNAIRE_FIELDS,
  REGISTRATION_QUESTIONNAIRE_MODE
} from "../../../lib/passreserve-registration-questionnaire.js";

const ROLE_META = {
  lead: {
    en: {
      title: "Lead booking participant",
      detail: "This is the primary contact who receives confirmation and payment updates."
    },
    it: {
      title: "Prenotante principale",
      detail: "È il contatto principale che riceve conferme e aggiornamenti pagamento."
    }
  },
  participant: {
    en: {
      title: "Other participants",
      detail: "Use this column for everyone else added to the same registration."
    },
    it: {
      title: "Altri partecipanti",
      detail: "Usa questa colonna per tutte le altre persone aggiunte alla stessa registrazione."
    }
  }
};

const MODE_LABELS = {
  required: {
    en: "Required",
    it: "Obbligatorio"
  },
  optional: {
    en: "Optional",
    it: "Opzionale"
  },
  hidden: {
    en: "Hidden",
    it: "Nascosto"
  }
};

const PRESET_META = {
  full: {
    en: {
      label: "Full",
      detail: "Keep the current v1 behavior: everything asked, dietary still optional."
    },
    it: {
      label: "Completo",
      detail: "Mantieni il comportamento attuale v1: tutto richiesto, dietary ancora opzionale."
    }
  },
  lean: {
    en: {
      label: "Lean group",
      detail: "Keep the lead complete, but slim down the rest of the group to essential identity only."
    },
    it: {
      label: "Gruppo essenziale",
      detail: "Mantieni completo il lead, ma alleggerisci il resto del gruppo ai soli dati essenziali."
    }
  },
  noDietary: {
    en: {
      label: "No dietary",
      detail: "Hide allergies and food notes for everyone."
    },
    it: {
      label: "Senza dietary",
      detail: "Nascondi allergie e note alimentari per tutti."
    }
  }
};

function buildPresetConfig(preset) {
  const base = buildDefaultRegistrationQuestionnaireConfig();

  if (preset === "lean") {
    base.participant.address = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.participant.phone = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.participant.email = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.participant.dietaryFlags = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.participant.dietaryOther = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    return normalizeRegistrationQuestionnaireConfig(base);
  }

  if (preset === "noDietary") {
    base.lead.dietaryFlags = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.lead.dietaryOther = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.participant.dietaryFlags = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    base.participant.dietaryOther = REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN;
    return normalizeRegistrationQuestionnaireConfig(base);
  }

  return normalizeRegistrationQuestionnaireConfig(base);
}

function getLocaleValue(meta, isItalian, key) {
  return meta?.[isItalian ? "it" : "en"]?.[key] || "";
}

function getVisibleFields(config, role, isItalian) {
  return REGISTRATION_QUESTIONNAIRE_FIELDS.filter(
    (field) => config[role][field.id] !== REGISTRATION_QUESTIONNAIRE_MODE.HIDDEN
  ).map((field) => ({
    id: field.id,
    label: field.labels[isItalian ? "it" : "en"],
    mode: config[role][field.id]
  }));
}

function ModeBadge({ mode, isItalian }) {
  return (
    <span className={`admin-badge admin-badge-${mode === "required" ? "public" : "pending_confirm"}`}>
      {MODE_LABELS[mode][isItalian ? "it" : "en"]}
    </span>
  );
}

export function RegistrationQuestionnaireEditor({
  allowInherit = false,
  inheritedConfig = null,
  initialConfig = null,
  initialOverrideEnabled = true,
  inputName = "registrationQuestionnaireConfigJson",
  isItalian = false
}) {
  const normalizedInheritedConfig = useMemo(
    () => normalizeRegistrationQuestionnaireConfig(inheritedConfig || buildDefaultRegistrationQuestionnaireConfig()),
    [inheritedConfig]
  );
  const normalizedInitialConfig = useMemo(
    () =>
      normalizeRegistrationQuestionnaireConfig(
        initialConfig || normalizedInheritedConfig || buildDefaultRegistrationQuestionnaireConfig()
      ),
    [initialConfig, normalizedInheritedConfig]
  );
  const [overrideEnabled, setOverrideEnabled] = useState(
    allowInherit ? Boolean(initialOverrideEnabled) : true
  );
  const [config, setConfig] = useState(normalizedInitialConfig);

  const effectiveConfig = overrideEnabled ? config : normalizedInheritedConfig;
  const serializedConfig = overrideEnabled ? JSON.stringify(config) : "";

  function updateField(role, fieldId, mode) {
    setConfig((current) =>
      normalizeRegistrationQuestionnaireConfig({
        ...current,
        [role]: {
          ...current[role],
          [fieldId]: mode
        }
      })
    );
  }

  function applyPreset(preset) {
    setConfig(buildPresetConfig(preset));
    if (allowInherit) {
      setOverrideEnabled(true);
    }
  }

  return (
    <div className="questionnaire-editor">
      <input name={inputName} type="hidden" value={serializedConfig} />

      {allowInherit ? (
        <div className="questionnaire-scope-toggle">
          <button
            className={`questionnaire-toggle ${!overrideEnabled ? "questionnaire-toggle-active" : ""}`}
            onClick={() => setOverrideEnabled(false)}
            type="button"
          >
            {isItalian ? "Usa default organizer" : "Use organizer defaults"}
          </button>
          <button
            className={`questionnaire-toggle ${overrideEnabled ? "questionnaire-toggle-active" : ""}`}
            onClick={() => setOverrideEnabled(true)}
            type="button"
          >
            {isItalian ? "Personalizza questo evento" : "Customize this event"}
          </button>
        </div>
      ) : null}

      {!overrideEnabled && allowInherit ? (
        <div className="registration-message">
          {isItalian
            ? "Questo evento usa esattamente il questionario organizer. Attiva la personalizzazione solo se qui ti serve una variante diversa."
            : "This event is inheriting the organizer questionnaire as-is. Enable customization only when this event needs a different participant form."}
        </div>
      ) : null}

      <div className="questionnaire-toolbar">
        {Object.entries(PRESET_META).map(([preset, meta]) => (
          <button
            className="quick-chip"
            key={preset}
            onClick={() => applyPreset(preset)}
            type="button"
          >
            {getLocaleValue(meta, isItalian, "label")}
          </button>
        ))}
      </div>

      <div className="questionnaire-preset-note">
        <span className="admin-filter-label">{isItalian ? "Preset rapidi" : "Quick presets"}</span>
        <p>
          {isItalian
            ? "Puoi partire da un preset e poi rifinire ruolo per ruolo. L'email del prenotante principale resta sempre obbligatoria."
            : "Start from a preset and then fine-tune role by role. The lead participant email always stays required."}
        </p>
      </div>

      <div className="questionnaire-grid">
        {["lead", "participant"].map((role) => (
          <section className="questionnaire-role-card" key={role}>
            <div className="questionnaire-role-head">
              <div>
                <h4>{ROLE_META[role][isItalian ? "it" : "en"].title}</h4>
                <p>{ROLE_META[role][isItalian ? "it" : "en"].detail}</p>
              </div>
              <div className="admin-badge-row">
                {getVisibleFields(effectiveConfig, role, isItalian).length ? (
                  <span className="route-label">
                    {getVisibleFields(effectiveConfig, role, isItalian).length}{" "}
                    {isItalian ? "campi visibili" : "visible fields"}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="questionnaire-field-list">
              {REGISTRATION_QUESTIONNAIRE_FIELDS.map((field) => {
                const mode = effectiveConfig[role][field.id];

                return (
                  <div className="questionnaire-field-row" key={`${role}-${field.id}`}>
                    <div className="questionnaire-field-copy">
                      <strong>{field.labels[isItalian ? "it" : "en"]}</strong>
                      <span>{field.detail[isItalian ? "it" : "en"]}</span>
                    </div>

                    <div className="questionnaire-mode-group" role="group">
                      {Object.values(REGISTRATION_QUESTIONNAIRE_MODE).map((candidateMode) => (
                        <button
                          className={`questionnaire-mode-chip ${
                            mode === candidateMode ? "questionnaire-mode-chip-active" : ""
                          }`}
                          key={`${role}-${field.id}-${candidateMode}`}
                          onClick={() => updateField(role, field.id, candidateMode)}
                          type="button"
                        >
                          {MODE_LABELS[candidateMode][isItalian ? "it" : "en"]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="questionnaire-preview-grid">
        {["lead", "participant"].map((role) => (
          <section className="questionnaire-preview-card" key={`preview-${role}`}>
            <span className="section-kicker">
              {role === "lead"
                ? isItalian
                  ? "Preview prenotante"
                  : "Lead preview"
                : isItalian
                  ? "Preview altri partecipanti"
                  : "Participant preview"}
            </span>
            <div className="questionnaire-preview-list">
              {getVisibleFields(effectiveConfig, role, isItalian).map((field) => (
                <div className="questionnaire-preview-item" key={`preview-${role}-${field.id}`}>
                  <strong>{field.label}</strong>
                  <ModeBadge isItalian={isItalian} mode={field.mode} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
