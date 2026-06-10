"use client";

import { useCookieConsent } from "./cookie-consent-provider.js";

export function CookiePreferencesButton({ className = "site-legal-link-button", children }) {
  const { openPreferences } = useCookieConsent();

  return (
    <button
      className={className}
      onClick={openPreferences}
      type="button"
    >
      {children}
    </button>
  );
}
