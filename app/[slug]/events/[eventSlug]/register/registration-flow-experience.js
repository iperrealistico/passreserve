"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { calculatePaymentBreakdown } from "../../../../../lib/passreserve-domain";
import {
  getRegistrationQuantityOptions,
  registrationLifecycleSignals
} from "../../../../../lib/passreserve-registrations";
import { createRegistrationHoldAction } from "./actions";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

const steps = [
  {
    id: "occurrence",
    title: "Occurrence",
    detail: "Pick the live date and time window."
  },
  {
    id: "ticket",
    title: "Ticket",
    detail: "Choose the admission format and quantity."
  },
  {
    id: "attendee",
    title: "Attendee",
    detail: "Capture the contact details used for the registration."
  },
  {
    id: "review",
    title: "Review",
    detail: "Create the 30-minute confirmation hold."
  }
];

function getOccurrenceById(event, occurrenceId) {
  return (
    event.occurrences.find((occurrence) => occurrence.id === occurrenceId) ??
    event.occurrences[0] ??
    null
  );
}

function getTicketCategory(occurrence, ticketCategoryId) {
  return (
    occurrence?.ticketCategories.find((category) => category.id === ticketCategoryId) ??
    occurrence?.ticketCategories[0] ??
    null
  );
}

export default function RegistrationFlowExperience({
  organizer,
  event,
  initialOccurrenceId,
  initialTicketCategoryId,
  fieldRules
}) {
  const [actionState, formAction, isPending] = useActionState(
    createRegistrationHoldAction,
    initialActionState
  );
  const [activeStep, setActiveStep] = useState(0);
  const [occurrenceId, setOccurrenceId] = useState(
    initialOccurrenceId ?? event.occurrences[0]?.id ?? ""
  );
  const [ticketCategoryId, setTicketCategoryId] = useState(initialTicketCategoryId ?? "");
  const [quantity, setQuantity] = useState("1");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");

  const selectedOccurrence = getOccurrenceById(event, occurrenceId);
  const selectedTicketCategory = getTicketCategory(selectedOccurrence, ticketCategoryId);
  const quantityOptions = selectedOccurrence
    ? getRegistrationQuantityOptions(selectedOccurrence)
    : [];
  const quote =
    selectedOccurrence && selectedTicketCategory
      ? calculatePaymentBreakdown({
          unitPrice: selectedTicketCategory.unitPrice,
          quantity: Number(quantity || 1),
          prepayPercentage: event.prepayPercentage
        })
      : null;
  const canMoveToAttendee =
    Boolean(selectedOccurrence) && Boolean(selectedTicketCategory);
  const attendeeComplete =
    attendeeName.trim() && attendeeEmail.trim() && attendeePhone.trim();

  useEffect(() => {
    if (!selectedOccurrence) {
      return;
    }

    const nextTicketCategory = getTicketCategory(selectedOccurrence, ticketCategoryId);

    if (!nextTicketCategory) {
      setTicketCategoryId(selectedOccurrence.ticketCategories[0]?.id ?? "");
    } else if (nextTicketCategory.id !== ticketCategoryId) {
      setTicketCategoryId(nextTicketCategory.id);
    }

    if (quantityOptions.length) {
      const quantityValue = Number(quantity || 0);

      if (!quantityOptions.includes(quantityValue)) {
        setQuantity(String(quantityOptions[quantityOptions.length - 1]));
      }
    }
  }, [quantity, quantityOptions, selectedOccurrence, ticketCategoryId]);

  function handleOccurrenceChange(nextOccurrenceId) {
    const nextOccurrence = getOccurrenceById(event, nextOccurrenceId);

    setOccurrenceId(nextOccurrenceId);
    setTicketCategoryId(nextOccurrence?.ticketCategories[0]?.id ?? "");
    setQuantity("1");
  }

  return (
    <section className="registration-grid">
      <article className="panel section-card registration-flow-card">
        <div className="section-kicker">Registration flow</div>
        <h2>Move from occurrence selection into a signed attendee hold.</h2>
        <p>
          This Phase 09 flow keeps the occurrence-first hold intact, then hands payment-required
          registrations into hosted Checkout after the attendee confirms on the next page.
        </p>

        <div className="registration-stepper">
          {steps.map((step, index) => (
            <button
              className={`registration-step${index === activeStep ? " registration-step-active" : ""}`}
              key={step.id}
              onClick={() => setActiveStep(index)}
              type="button"
            >
              <span className="registration-step-index">{index + 1}</span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
            </button>
          ))}
        </div>

        {activeStep === 0 ? (
          <div className="registration-panel-stack">
            <div className="section-kicker">Step 1</div>
            <h3>Choose an occurrence</h3>
            <p>
              Each occurrence owns its own capacity state, hold pressure, and event-day timing.
            </p>
            <div className="registration-choice-grid">
              {event.occurrences.map((occurrence) => {
                const isActive = occurrence.id === selectedOccurrence?.id;

                return (
                  <button
                    className={`registration-choice${isActive ? " registration-choice-active" : ""}`}
                    key={occurrence.id}
                    onClick={() => handleOccurrenceChange(occurrence.id)}
                    type="button"
                  >
                    <div className="registration-choice-head">
                      <div>
                        <strong>{occurrence.label}</strong>
                        <span>{occurrence.time}</span>
                      </div>
                      <span className="route-label">{occurrence.capacityLabel}</span>
                    </div>
                    <p>{occurrence.note}</p>
                    <div className="registration-choice-meta">
                      <span>{occurrence.capacity.statusLabel}</span>
                      <span>{occurrence.registrationStatusLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="hero-actions">
              <button
                className="button button-primary"
                onClick={() => setActiveStep(1)}
                type="button"
              >
                Continue to ticket options
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="registration-panel-stack">
            <div className="section-kicker">Step 2</div>
            <h3>Select the ticket category and quantity</h3>
            <p>
              Ticket categories stay optional at the model level, but this flow supports them
              now so the same occurrence can price admission variants cleanly.
            </p>
            <div className="registration-choice-grid">
              {selectedOccurrence?.ticketCategories.map((category) => {
                const isActive = category.id === selectedTicketCategory?.id;

                return (
                  <button
                    className={`registration-choice${isActive ? " registration-choice-active" : ""}`}
                    key={category.id}
                    onClick={() => setTicketCategoryId(category.id)}
                    type="button"
                  >
                    <div className="registration-choice-head">
                      <div>
                        <strong>{category.label}</strong>
                        <span>{category.unitPriceLabel}</span>
                      </div>
                      <span className="route-label">
                        {category.payment.onlineAmountLabel} online
                      </span>
                    </div>
                    <p>{category.summary}</p>
                    <div className="registration-choice-meta">
                      <span>{category.payment.onlineAmountLabel} online</span>
                      <span>{category.payment.dueAtEventLabel} due at event</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="field registration-quantity-field">
              <span>Quantity</span>
              <select
                name="quantity"
                onChange={(changeEvent) => setQuantity(changeEvent.target.value)}
                value={quantity}
              >
                {quantityOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "attendee" : "attendees"}
                  </option>
                ))}
              </select>
            </label>

            <div className="hero-actions">
              <button
                className="button button-secondary"
                onClick={() => setActiveStep(0)}
                type="button"
              >
                Back to occurrences
              </button>
              <button
                className="button button-primary"
                disabled={!canMoveToAttendee}
                onClick={() => setActiveStep(2)}
                type="button"
              >
                Continue to attendee details
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="registration-panel-stack">
            <div className="section-kicker">Step 3</div>
            <h3>Capture the attendee contact details</h3>
            <p>
              The attendee details become the registration identity used for confirmation,
              organizer communication, and later payment messaging.
            </p>
            <div className="registration-field-grid">
              <label className="field">
                <span>Attendee name</span>
                <input
                  name="attendeeName"
                  onChange={(changeEvent) => setAttendeeName(changeEvent.target.value)}
                  placeholder="Giulia Bernardi"
                  type="text"
                  value={attendeeName}
                />
              </label>

              <label className="field">
                <span>Attendee email</span>
                <input
                  name="attendeeEmail"
                  onChange={(changeEvent) => setAttendeeEmail(changeEvent.target.value)}
                  placeholder="giulia@example.com"
                  type="email"
                  value={attendeeEmail}
                />
              </label>

              <label className="field">
                <span>Attendee phone</span>
                <input
                  name="attendeePhone"
                  onChange={(changeEvent) => setAttendeePhone(changeEvent.target.value)}
                  placeholder="+39 348 555 1122"
                  type="tel"
                  value={attendeePhone}
                />
              </label>
            </div>

            <div className="hero-actions">
              <button
                className="button button-secondary"
                onClick={() => setActiveStep(1)}
                type="button"
              >
                Back to ticket options
              </button>
              <button
                className="button button-primary"
                disabled={!attendeeComplete}
                onClick={() => setActiveStep(3)}
                type="button"
              >
                Review hold summary
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 3 ? (
          <div className="registration-panel-stack">
            <div className="section-kicker">Step 4</div>
            <h3>Review the hold before creating it</h3>
            <p>
              Submitting here does not finish the attendee lifecycle yet. It creates a signed
              30-minute hold and sends the attendee into the confirmation screen.
            </p>

            <div className="registration-review-grid">
              <div className="registration-review-card">
                <span className="spotlight-label">Occurrence</span>
                <strong>{selectedOccurrence?.label}</strong>
                <span>{selectedOccurrence?.time}</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Ticket</span>
                <strong>{selectedTicketCategory?.label}</strong>
                <span>{quantity} attendees</span>
              </div>
              <div className="registration-review-card">
                <span className="spotlight-label">Attendee</span>
                <strong>{attendeeName || "Pending"}</strong>
                <span>{attendeeEmail || "Pending"}</span>
              </div>
            </div>

            {actionState.message ? (
              <div className="registration-message registration-message-error">
                <strong>Registration hold could not be created.</strong>
                <span>{actionState.message}</span>
              </div>
            ) : null}

            <form action={formAction} className="registration-submit-form">
              <input name="slug" type="hidden" value={organizer.slug} />
              <input name="eventSlug" type="hidden" value={event.slug} />
              <input name="occurrenceId" type="hidden" value={selectedOccurrence?.id ?? ""} />
              <input
                name="ticketCategoryId"
                type="hidden"
                value={selectedTicketCategory?.id ?? ""}
              />
              <input name="quantity" type="hidden" value={quantity} />
              <input name="attendeeName" type="hidden" value={attendeeName} />
              <input name="attendeeEmail" type="hidden" value={attendeeEmail} />
              <input name="attendeePhone" type="hidden" value={attendeePhone} />

              <div className="registration-error-list">
                {Object.entries(actionState.fieldErrors || {}).map(([field, message]) => (
                  <div className="registration-error-item" key={field}>
                    <strong>{field}</strong>
                    <span>{message}</span>
                  </div>
                ))}
              </div>

              <div className="hero-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setActiveStep(2)}
                  type="button"
                >
                  Back to attendee details
                </button>
                <button
                  className="button button-primary"
                  disabled={isPending || !quote}
                  type="submit"
                >
                  {isPending ? "Creating hold..." : "Create 30-minute hold"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </article>

      <aside className="panel section-card registration-aside">
        <div className="section-kicker">Selected summary</div>
        <h3>{event.title}</h3>
        <p>{event.registrationModeLabel}</p>

        <div className="registration-summary-list">
          <div className="registration-summary-card">
            <span className="spotlight-label">Organizer</span>
            <strong>{organizer.name}</strong>
            <span>
              {organizer.city}, {organizer.region}
            </span>
          </div>
          <div className="registration-summary-card">
            <span className="spotlight-label">Occurrence</span>
            <strong>{selectedOccurrence?.label}</strong>
            <span>{selectedOccurrence?.capacityLabel}</span>
          </div>
          <div className="registration-summary-card">
            <span className="spotlight-label">Ticket and quantity</span>
            <strong>{selectedTicketCategory?.label ?? "Select a ticket"}</strong>
            <span>{quantity} attendees</span>
          </div>
        </div>

        {quote ? (
          <div className="payment-card registration-payment-card">
            <div className="payment-heading">
              <strong>Payment breakdown</strong>
              <span>
                {selectedTicketCategory?.unitPriceLabel} each, {event.collectionLabel}
              </span>
            </div>
            <div className="payment-amounts">
              <div className="payment-amount">
                <span className="payment-label">Ticket total</span>
                <span className="payment-value">{quote.subtotalLabel}</span>
              </div>
              <div className="payment-amount">
                <span className="payment-label">Paid online</span>
                <span className="payment-value">{quote.onlineAmountLabel}</span>
              </div>
              <div className="payment-amount">
                <span className="payment-label">Due at event</span>
                <span className="payment-value">{quote.dueAtEventLabel}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="section-kicker">Validation rules</div>
        <div className="registration-rule-list">
          {fieldRules.map((rule) => (
            <div className="registration-rule-item" key={rule.field}>
              <strong>{rule.label}</strong>
              <span>{rule.detail}</span>
            </div>
          ))}
        </div>

        <div className="section-kicker">Lifecycle cues</div>
        <div className="registration-rule-list">
          {registrationLifecycleSignals.map((signal) => (
            <div className="registration-rule-item" key={signal.title}>
              <strong>{signal.title}</strong>
              <span>{signal.detail}</span>
            </div>
          ))}
        </div>

        <div className="hero-actions">
          <Link className="button button-secondary" href={event.detailHref}>
            Back to event page
          </Link>
        </div>
      </aside>
    </section>
  );
}
