"use client";

import { useActionState } from "react";

import { confirmRegistrationAction } from "../../actions";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

export default function ConfirmationForm({ eventSlug, holdToken, slug }) {
  const [actionState, formAction, isPending] = useActionState(
    confirmRegistrationAction,
    initialActionState
  );

  return (
    <form action={formAction} className="registration-confirm-form">
      <input name="slug" type="hidden" value={slug} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="holdToken" type="hidden" value={holdToken} />

      <div className="registration-checklist">
        <label className="registration-check-item">
          <input name="termsAccepted" type="checkbox" value="yes" />
          <span>
            I accept the organizer terms, venue guidance, and the published policy notes for
            this occurrence.
          </span>
        </label>

        <label className="registration-check-item">
          <input name="responsibilityAccepted" type="checkbox" value="yes" />
          <span>
            I confirm the attendee count, arrival readiness, and that the selected occurrence
            still matches the group I am registering.
          </span>
        </label>
      </div>

      {actionState.message ? (
        <div className="registration-message registration-message-error">
          <strong>Confirmation could not continue.</strong>
          <span>{actionState.message}</span>
        </div>
      ) : null}

      <div className="registration-error-list">
        {Object.entries(actionState.fieldErrors || {}).map(([field, message]) => (
          <div className="registration-error-item" key={field}>
            <strong>{field}</strong>
            <span>{message}</span>
          </div>
        ))}
      </div>

      <div className="hero-actions">
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? "Confirming registration..." : "Confirm registration"}
        </button>
      </div>
    </form>
  );
}
