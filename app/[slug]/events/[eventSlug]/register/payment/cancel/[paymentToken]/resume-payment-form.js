"use client";

import { useActionState } from "react";

import { resumeRegistrationPaymentAction } from "../../../actions";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

export default function ResumePaymentForm({ eventSlug, paymentToken, slug }) {
  const [actionState, formAction, isPending] = useActionState(
    resumeRegistrationPaymentAction,
    initialActionState
  );
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <form action={formAction} className="registration-confirm-form">
      <input name="slug" type="hidden" value={slug} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="paymentToken" type="hidden" value={paymentToken} />
      <input name="baseUrl" type="hidden" value={baseUrl} />

      {actionState.message ? (
        <div className="registration-message registration-message-error">
          <strong>Checkout could not reopen.</strong>
          <span>{actionState.message}</span>
        </div>
      ) : null}

      <div className="hero-actions">
        <button className="button button-primary" disabled={isPending} type="submit">
          {isPending ? "Reopening Checkout..." : "Reopen Checkout"}
        </button>
      </div>
    </form>
  );
}
