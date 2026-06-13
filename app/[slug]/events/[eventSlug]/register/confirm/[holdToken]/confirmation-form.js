"use client";

import { useActionState, useState } from "react";

import {
  BookingLegalRecap,
  BookingResponsibilityLabel,
  BookingTermsLabel
} from "../../../../../../../components/booking-legal-copy.js";
import { confirmRegistrationAction } from "../../actions.js";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

export default function ConfirmationForm({
  eventSlug,
  holdToken,
  locale = "en",
  slug,
  labels = {
    submit: "Confirm registration",
    submitting: "Confirming registration..."
  }
}) {
  const [actionState, formAction, isPending] = useActionState(
    confirmRegistrationAction,
    initialActionState
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <form action={formAction} className="registration-confirm-form">
      <input name="slug" type="hidden" value={slug} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="holdToken" type="hidden" value={holdToken} />

      <div className="registration-checklist flex flex-col gap-3">
        <div className="registration-check-card">
          <label className="registration-check-item flex gap-3 rounded-[1.25rem] border border-border bg-muted/40 p-4">
            <input
              checked={termsAccepted}
              name="termsAccepted"
              onChange={(event) => setTermsAccepted(event.target.checked)}
              required
              type="checkbox"
              value="yes"
            />
            <BookingTermsLabel locale={locale} />
          </label>
          <BookingLegalRecap active={termsAccepted} locale={locale} />
        </div>

        <label className="registration-check-item flex gap-3 rounded-[1.25rem] border border-border bg-muted/40 p-4">
          <input name="responsibilityAccepted" required type="checkbox" value="yes" />
          <BookingResponsibilityLabel locale={locale} />
        </label>
      </div>

      {actionState.message ? (
        <div className="registration-message-error mt-4">{actionState.message}</div>
      ) : null}

      <div className="hero-actions mt-4">
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? labels.submitting : labels.submit}
        </button>
      </div>
    </form>
  );
}
