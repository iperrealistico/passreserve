"use client";

import { useActionState } from "react";

import { resumeRegistrationPaymentAction } from "../../../actions.js";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

export default function ResumePaymentForm({
  buttonLabel = "Reopen Checkout",
  eventSlug,
  paymentToken,
  pendingLabel = "Reopening Checkout...",
  slug
}) {
  const [actionState, formAction, isPending] = useActionState(
    resumeRegistrationPaymentAction,
    initialActionState
  );

  return (
    <form action={formAction} className="registration-confirm-form">
      <input name="slug" type="hidden" value={slug} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="paymentToken" type="hidden" value={paymentToken} />

      {actionState.message ? (
        <div className="registration-message registration-message-error">
          <strong>Checkout could not reopen.</strong>
          <span>{actionState.message}</span>
        </div>
      ) : null}

      <div className="hero-actions">
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? pendingLabel : buttonLabel}
        </button>
      </div>
    </form>
  );
}
