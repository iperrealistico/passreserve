"use client";

import { useMemo, useState } from "react";

import {
  getRegistrationConfirmationModeMeta,
  normalizeRegistrationConfirmationMode,
  REGISTRATION_CONFIRMATION_MODE
} from "../../../lib/passreserve-registration-confirmation.js";

const MODE_FLOW = {
  EMAIL_LINK_REQUIRED: {
    en: [
      "Guest submits the form",
      "Guest opens the confirmation email",
      "Payment or final confirmation continues after the email step"
    ],
    it: [
      "Il prenotante invia il form",
      "Apre la mail di conferma",
      "Pagamento o conferma finale proseguono dopo il passaggio email"
    ]
  },
  DIRECT_CONFIRM: {
    en: [
      "Guest submits the form",
      "The registration continues immediately",
      "Confirmation and recap emails still arrive as usual"
    ],
    it: [
      "Il prenotante invia il form",
      "La registrazione prosegue subito",
      "Le email di conferma e recap restano comunque attive"
    ]
  }
};

function getModeOptions(isItalian) {
  return [
    {
      value: REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED,
      title: isItalian ? "Richiedi il link email" : "Require email confirmation link",
      detail: isItalian
        ? "Consigliato quando vuoi che il prenotante verifichi davvero inbox e data scelta prima che la registrazione prosegua."
        : "Recommended when you want the lead guest to verify the inbox and chosen date before the registration continues.",
      badge: isItalian ? "Default consigliato" : "Recommended default"
    },
    {
      value: REGISTRATION_CONFIRMATION_MODE.DIRECT_CONFIRM,
      title: isItalian ? "Conferma immediata al submit" : "Confirm immediately on submit",
      detail: isItalian
        ? "Salta il click sul link email: il flusso passa subito a conferma o pagamento, ma le email recap restano attive."
        : "Skip the email-link click: the flow moves straight to confirmation or payment, while recap emails stay active."
    }
  ];
}

export function RegistrationConfirmationModeEditor({
  allowInherit = false,
  inheritedMode = REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED,
  initialMode = REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED,
  initialOverrideEnabled = true,
  inputName = "registrationConfirmationMode",
  isItalian = false
}) {
  const normalizedInheritedMode = useMemo(
    () =>
      normalizeRegistrationConfirmationMode(
        inheritedMode,
        REGISTRATION_CONFIRMATION_MODE.EMAIL_LINK_REQUIRED
      ),
    [inheritedMode]
  );
  const normalizedInitialMode = useMemo(
    () => normalizeRegistrationConfirmationMode(initialMode, normalizedInheritedMode),
    [initialMode, normalizedInheritedMode]
  );
  const [overrideEnabled, setOverrideEnabled] = useState(
    allowInherit ? Boolean(initialOverrideEnabled) : true
  );
  const [mode, setMode] = useState(normalizedInitialMode);

  const effectiveMode = overrideEnabled ? mode : normalizedInheritedMode;
  const serializedMode = overrideEnabled || !allowInherit ? effectiveMode : "";
  const modeMeta = getRegistrationConfirmationModeMeta(effectiveMode, isItalian ? "it" : "en");
  const flowSteps = MODE_FLOW[effectiveMode][isItalian ? "it" : "en"];
  const options = getModeOptions(isItalian);

  return (
    <div className="questionnaire-editor confirmation-mode-editor">
      <input name={inputName} type="hidden" value={serializedMode} />

      {allowInherit ? (
        <div className="questionnaire-scope-toggle">
          <button
            className={`questionnaire-toggle ${!overrideEnabled ? "questionnaire-toggle-active" : ""}`}
            onClick={() => setOverrideEnabled(false)}
            type="button"
          >
            {isItalian ? "Usa default organizer" : "Use organizer default"}
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
            ? "Questo evento eredita il flow organizer. Attiva la personalizzazione solo quando qui ti serve un percorso diverso."
            : "This event inherits the organizer flow as-is. Enable customization only when this event needs a different booking confirmation path."}
        </div>
      ) : null}

      <div className="confirmation-mode-grid">
        {options.map((option) => {
          const active = effectiveMode === option.value;

          return (
            <button
              className={`confirmation-mode-card ${active ? "confirmation-mode-card-active" : ""}`}
              key={option.value}
              onClick={() => {
                setMode(option.value);
                if (allowInherit) {
                  setOverrideEnabled(true);
                }
              }}
              type="button"
            >
              <div className="confirmation-mode-card-head">
                <div className="confirmation-mode-card-copy">
                  <strong>{option.title}</strong>
                  <span>{option.detail}</span>
                </div>
                {option.badge ? <span className="confirmation-mode-badge">{option.badge}</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="questionnaire-preset-note confirmation-mode-note">
        <span className="admin-filter-label">
          {isItalian ? "Cosa cambia davvero" : "What actually changes"}
        </span>
        <p>
          {isItalian
            ? "Questo toggle controlla solo il click di doppia conferma via email. Le email di conferma, riepilogo e pagamento restano comunque attive."
            : "This toggle only controls the extra email-link confirmation click. Confirmation, recap, and payment emails still stay active."}
        </p>
      </div>

      <section className="questionnaire-role-card confirmation-mode-preview">
        <div className="questionnaire-role-head">
          <div>
            <h4>{modeMeta.label}</h4>
            <p>{modeMeta.detail}</p>
          </div>
        </div>

        <div className="timeline">
          {flowSteps.map((step) => (
            <div className="timeline-step" key={step}>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
