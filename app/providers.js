"use client";

import { Toaster } from "sonner";
import { InteractionFeedbackProvider } from "../components/interaction-feedback-provider.js";

export function AppProviders({ children }) {
  return (
    <InteractionFeedbackProvider>
      {children}
      <Toaster position="top-right" richColors />
    </InteractionFeedbackProvider>
  );
}
