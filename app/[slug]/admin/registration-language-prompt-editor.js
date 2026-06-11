"use client";

import { useMemo, useState } from "react";

import {
  getRegistrationLanguagePromptMeta,
  normalizeRegistrationLanguagePromptEnabledInput
} from "../../../lib/passreserve-registration-language.js";

function getPromptOptions(isItalian) {
  return [
    {
      value: true,
      title: isItalian
        ? "Chiedi la lingua della registrazione"
        : "Ask for the booking language",
      detail: isItalian
        ? "Il prenotante sceglie tra italiano e inglese prima di proseguire. Questa scelta resta collegata alla registrazione."
        : "The lead guest chooses between Italian and English before continuing. That choice stays attached to the registration.",
      badge: isItalian ? "Default consigliato" : "Recommended default"
    },
    {
      value: false,
      title: isItalian
        ? "Usa la lingua corrente della pagina"
        : "Use the current page language",
      detail: isItalian
        ? "Il flow non chiede una scelta esplicita e continua con la lingua della pagina già aperta."
        : "The flow skips the explicit selector and keeps using the language of the page already open."
    }
  ];
}

export function RegistrationLanguagePromptEditor({
  allowInherit = false,
  inheritedEnabled = true,
  initialEnabled = true,
  initialOverrideEnabled = true,
  inputName = "registrationLanguagePromptEnabled",
  isItalian = false
}) {
  const normalizedInheritedEnabled = useMemo(
    () => normalizeRegistrationLanguagePromptEnabledInput(inheritedEnabled, true),
    [inheritedEnabled]
  );
  const normalizedInitialEnabled = useMemo(
    () =>
      normalizeRegistrationLanguagePromptEnabledInput(
        initialEnabled,
        normalizedInheritedEnabled
      ),
    [initialEnabled, normalizedInheritedEnabled]
  );
  const [overrideEnabled, setOverrideEnabled] = useState(
    allowInherit ? Boolean(initialOverrideEnabled) : true
  );
  const [enabled, setEnabled] = useState(normalizedInitialEnabled);

  const effectiveEnabled = overrideEnabled ? enabled : normalizedInheritedEnabled;
  const serializedValue =
    overrideEnabled || !allowInherit ? String(effectiveEnabled) : "";
  const meta = getRegistrationLanguagePromptMeta(
    effectiveEnabled,
    isItalian ? "it" : "en"
  );
  const options = getPromptOptions(isItalian);

  return (
    <div className="questionnaire-editor confirmation-mode-editor">
      <input name={inputName} type="hidden" value={serializedValue} />

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
            ? "Questo evento eredita la regola organizer sulla lingua booking. Personalizza solo se qui ti serve un comportamento diverso."
            : "This event inherits the organizer booking-language rule as-is. Customize only when this event needs different behavior."}
        </div>
      ) : null}

      <div className="confirmation-mode-grid">
        {options.map((option) => {
          const active = effectiveEnabled === option.value;

          return (
            <button
              className={`confirmation-mode-card ${active ? "confirmation-mode-card-active" : ""}`}
              key={String(option.value)}
              onClick={() => {
                setEnabled(option.value);
                if (allowInherit) {
                  setOverrideEnabled(true);
                }
              }}
              type="button"
            >
              <div className="confirmation-mode-card-head">
                <div>
                  <strong>{option.title}</strong>
                  <span>{option.detail}</span>
                </div>
                {option.badge ? <span className="route-label">{option.badge}</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="questionnaire-preset-note confirmation-mode-note">
        <span className="admin-filter-label">
          {isItalian ? "Perimetro attuale" : "Current scope"}
        </span>
        <p>
          {isItalian
            ? "Per ora il perimetro supportato resta limitato a italiano e inglese. La stessa scelta guiderà il booking flow e i messaggi collegati."
            : "The supported scope is intentionally limited to Italian and English for now. The same choice will guide the booking flow and related messaging."}
        </p>
      </div>

      <section className="questionnaire-role-card confirmation-mode-preview">
        <div className="questionnaire-role-head">
          <div>
            <h4>{meta.label}</h4>
            <p>{meta.detail}</p>
          </div>
        </div>

        <div className="timeline">
          <div className="timeline-step">
            <strong>{isItalian ? "Lingue supportate: Italiano, English" : "Supported languages: Italian, English"}</strong>
          </div>
          <div className="timeline-step">
            <strong>
              {effectiveEnabled
                ? isItalian
                  ? "Il prenotante vede una scelta esplicita nel flow pubblico."
                  : "The lead guest sees an explicit language choice in the public flow."
                : isItalian
                  ? "Il flow continua direttamente con la lingua della pagina aperta."
                  : "The flow continues directly with the language of the page already open."}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}
