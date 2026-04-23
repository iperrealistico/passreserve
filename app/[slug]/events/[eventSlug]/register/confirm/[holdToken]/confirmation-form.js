"use client";

import { useActionState } from "react";

import { confirmRegistrationAction } from "../../actions.js";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

export default function ConfirmationForm({
  eventSlug,
  holdToken,
  slug,
  labels = {
    terms:
      "I accept the organizer terms, venue guidance, and published policy notes for this occurrence.",
    responsibility:
      "I confirm the attendee count, arrival readiness, and that the selected occurrence still matches the group I am registering.",
    submit: "Confirm registration",
    submitting: "Confirming registration..."
  }
}) {
  const [actionState, formAction, isPending] = useActionState(
    confirmRegistrationAction,
    initialActionState
  );
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <form action={formAction} className="registration-confirm-form">
      <input name="slug" type="hidden" value={slug} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="holdToken" type="hidden" value={holdToken} />
      <input name="baseUrl" type="hidden" value={baseUrl} />

      <div className="registration-checklist flex flex-col gap-3">
        <label className="registration-check-item flex gap-3 rounded-[1.25rem] border border-border bg-muted/40 p-4">
          <input name="termsAccepted" type="checkbox" value="yes" />
          <span>{labels.terms}</span>
        </label>

        <label className="registration-check-item flex gap-3 rounded-[1.25rem] border border-border bg-muted/40 p-4">
          <input name="responsibilityAccepted" type="checkbox" value="yes" />
          <span>{labels.responsibility}</span>
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
