"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  COOKIE_CATEGORIES,
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_VERSION,
  buildClientCookieString,
  buildDefaultCookieConsent,
  normalizeCookieConsent,
  parseCookieConsentValue,
  serializeCookieConsentValue
} from "../lib/passreserve-legal.js";

const CookieConsentContext = createContext({
  consent: buildDefaultCookieConsent(),
  hasStoredConsent: false,
  isCategoryEnabled: () => false,
  openPreferences: () => {}
});

function getCookieValue(name) {
  if (typeof document === "undefined") {
    return "";
  }

  const prefix = `${name}=`;
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const match = parts.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

function buildUiCopy(locale = "en") {
  if (locale === "it") {
    return {
      bannerTitle: "Cookie e tecnologie essenziali",
      bannerSummary:
        "Passreserve usa cookie necessari per login admin, continuità del booking, lingua e sicurezza. Tecnologie opzionali restano spente finché non le abiliti tu.",
      policyPrefix: "Leggi",
      privacyLabel: "Privacy",
      cookiesLabel: "Cookie Policy",
      termsLabel: "Termini",
      acceptAll: "Accetta tutto",
      rejectOptional: "Solo necessari",
      customize: "Personalizza",
      close: "Chiudi",
      modalTitle: "Preferenze cookie",
      modalSummary:
        "Puoi scegliere se autorizzare categorie non essenziali. I cookie necessari restano sempre attivi perché servono al funzionamento e alla sicurezza della piattaforma.",
      save: "Salva preferenze",
      categories: {
        necessary: {
          label: "Necessari",
          detail:
            "Autenticazione admin, continuità della prenotazione, lingua selezionata e salvataggio delle tue preferenze cookie."
        },
        preferences: {
          label: "Preferenze",
          detail:
            "Personalizzazioni non essenziali e funzioni di comodità, se e quando verranno abilitate in futuro."
        },
        analytics: {
          label: "Analytics",
          detail:
            "Misurazione traffico o strumenti di miglioramento prodotto non strettamente necessari."
        },
        marketing: {
          label: "Marketing",
          detail:
            "Pubblicità, remarketing o tecnologie equivalenti di tracciamento."
        }
      },
      currentlyInactive: "Categoria attualmente non attiva nel runtime corrente.",
      alwaysOn: "Sempre attivi"
    };
  }

  return {
    bannerTitle: "Cookies and essential technologies",
    bannerSummary:
      "Passreserve uses necessary cookies for secure admin sign-in, booking continuity, language, and security. Optional technologies stay off until you enable them.",
    policyPrefix: "Read",
    privacyLabel: "Privacy",
    cookiesLabel: "Cookie Policy",
    termsLabel: "Terms",
    acceptAll: "Accept all",
    rejectOptional: "Necessary only",
    customize: "Customize",
    close: "Close",
    modalTitle: "Cookie preferences",
    modalSummary:
      "You can choose whether to allow non-essential categories. Necessary cookies remain active because they are required to operate and secure the platform.",
    save: "Save preferences",
    categories: {
      necessary: {
        label: "Necessary",
        detail:
          "Admin authentication, booking continuity, selected language, and storage of your cookie choices."
      },
      preferences: {
        label: "Preferences",
        detail:
          "Non-essential personalization and convenience features, if and when they are enabled in the future."
      },
      analytics: {
        label: "Analytics",
        detail:
          "Traffic measurement or product-improvement tools that are not strictly necessary."
      },
      marketing: {
        label: "Marketing",
        detail:
          "Advertising, remarketing, or equivalent tracking technologies."
      }
    },
    currentlyInactive: "This category is currently inactive in the live runtime.",
    alwaysOn: "Always on"
  };
}

function CookiePreferencesModal({
  copy,
  draft,
  setDraft,
  onClose,
  onSave
}) {
  return (
    <div className="cookie-modal-backdrop" role="presentation">
      <div
        aria-labelledby="cookie-preferences-title"
        aria-modal="true"
        className="cookie-modal"
        role="dialog"
      >
        <div className="cookie-modal-head">
          <div>
            <div className="section-kicker">Privacy</div>
            <h2 id="cookie-preferences-title">{copy.modalTitle}</h2>
          </div>
          <button
            aria-label={copy.close}
            className="button button-secondary button-small"
            onClick={onClose}
            type="button"
          >
            {copy.close}
          </button>
        </div>
        <p className="cookie-modal-summary">{copy.modalSummary}</p>
        <div className="cookie-category-stack">
          {COOKIE_CATEGORIES.map((category) => {
            const details = copy.categories[category];
            const checked = category === "necessary" ? true : draft[category] === true;
            const disabled = category === "necessary";

            return (
              <div className="cookie-category-card" key={category}>
                <div className="cookie-category-copy">
                  <strong>{details.label}</strong>
                  <p>{details.detail}</p>
                  {category !== "necessary" ? (
                    <span className="muted-text">{copy.currentlyInactive}</span>
                  ) : null}
                </div>
                <label className="cookie-toggle">
                  <input
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [category]: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{disabled ? copy.alwaysOn : checked ? "On" : "Off"}</span>
                </label>
              </div>
            );
          })}
        </div>
        <div className="hero-actions mt-6">
          <button className="button button-secondary" onClick={onClose} type="button">
            {copy.close}
          </button>
          <button
            className="button button-primary"
            onClick={() => onSave(draft)}
            type="button"
          >
            {copy.save}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}

export function CookieConsentProvider({ children, locale = "en" }) {
  const [consent, setConsent] = useState(buildDefaultCookieConsent());
  const [draft, setDraft] = useState(buildDefaultCookieConsent());
  const [hasStoredConsent, setHasStoredConsent] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const copy = useMemo(() => buildUiCopy(locale === "it" ? "it" : "en"), [locale]);

  const persistConsent = useCallback((nextConsent) => {
    const normalized = normalizeCookieConsent({
      ...nextConsent,
      version: COOKIE_CONSENT_VERSION,
      updatedAt: new Date().toISOString()
    });

    document.cookie = buildClientCookieString(
      COOKIE_CONSENT_COOKIE,
      serializeCookieConsentValue(normalized)
    );
    setConsent(normalized);
    setDraft(normalized);
    setHasStoredConsent(true);
    setBannerOpen(false);
    setPreferencesOpen(false);
  }, []);

  useEffect(() => {
    const stored = parseCookieConsentValue(getCookieValue(COOKIE_CONSENT_COOKIE));

    if (stored && stored.version === COOKIE_CONSENT_VERSION) {
      setConsent(stored);
      setDraft(stored);
      setHasStoredConsent(true);
      setBannerOpen(false);
      return;
    }

    const defaults = buildDefaultCookieConsent();
    setConsent(defaults);
    setDraft(defaults);
    setHasStoredConsent(false);
    setBannerOpen(true);
  }, []);

  useEffect(() => {
    function handleOpenPreferences() {
      setDraft(consent);
      setPreferencesOpen(true);
      setBannerOpen(false);
    }

    window.addEventListener("passreserve:open-cookie-preferences", handleOpenPreferences);
    return () => {
      window.removeEventListener("passreserve:open-cookie-preferences", handleOpenPreferences);
    };
  }, [consent]);

  const openPreferences = useCallback(() => {
    setDraft(consent);
    setPreferencesOpen(true);
    setBannerOpen(false);
  }, [consent]);

  const contextValue = useMemo(
    () => ({
      consent,
      hasStoredConsent,
      isCategoryEnabled: (category) => {
        if (category === "necessary") {
          return true;
        }

        return consent?.[category] === true;
      },
      openPreferences
    }),
    [consent, hasStoredConsent, openPreferences]
  );

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}

      {bannerOpen ? (
        <div className="cookie-banner" role="dialog" aria-live="polite">
          <button
            aria-label={copy.close}
            className="cookie-banner-close"
            onClick={() => persistConsent(buildDefaultCookieConsent())}
            type="button"
          >
            ×
          </button>
          <div className="cookie-banner-copy">
            <div className="section-kicker">Privacy</div>
            <strong>{copy.bannerTitle}</strong>
            <p>{copy.bannerSummary}</p>
            <p className="cookie-banner-links">
              {copy.policyPrefix}{" "}
              <a href="/privacy">{copy.privacyLabel}</a>{" "}
              ·{" "}
              <a href="/cookie-policy">{copy.cookiesLabel}</a>{" "}
              ·{" "}
              <a href="/terms">{copy.termsLabel}</a>
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button
              className="button button-secondary"
              onClick={() => persistConsent(buildDefaultCookieConsent())}
              type="button"
            >
              {copy.rejectOptional}
            </button>
            <button className="button button-secondary" onClick={openPreferences} type="button">
              {copy.customize}
            </button>
            <button
              className="button button-primary"
              onClick={() =>
                persistConsent({
                  necessary: true,
                  preferences: true,
                  analytics: true,
                  marketing: true
                })
              }
              type="button"
            >
              {copy.acceptAll}
            </button>
          </div>
        </div>
      ) : null}

      {preferencesOpen ? (
        <CookiePreferencesModal
          copy={copy}
          draft={draft}
          onClose={() => {
            setPreferencesOpen(false);
            if (!hasStoredConsent) {
              setBannerOpen(true);
            }
          }}
          onSave={persistConsent}
          setDraft={setDraft}
        />
      ) : null}
    </CookieConsentContext.Provider>
  );
}
