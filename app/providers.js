"use client";

import { Toaster } from "sonner";
import { CookieConsentProvider } from "../components/cookie-consent-provider.js";
import { InteractionFeedbackProvider } from "../components/interaction-feedback-provider.js";

export function AppProviders({ children, locale = "en" }) {
  return (
    <InteractionFeedbackProvider>
      <CookieConsentProvider locale={locale}>
        {children}
        <Toaster position="top-right" richColors />
      </CookieConsentProvider>
    </InteractionFeedbackProvider>
  );
}
