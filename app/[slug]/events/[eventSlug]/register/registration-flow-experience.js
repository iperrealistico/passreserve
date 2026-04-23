"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { calculatePaymentBreakdown } from "../../../../../lib/passreserve-domain.js";
import { createRegistrationHoldAction } from "./actions.js";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

function createBlankAttendee() {
  return {
    firstName: "",
    lastName: "",
    address: "",
    phone: "",
    email: "",
    dietaryFlags: [],
    dietaryOther: ""
  };
}

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

function getRegistrationQuantityOptions(occurrence) {
  const remaining = Math.max(1, occurrence?.capacity?.remaining ?? 1);
  const max = Math.min(remaining, 8);

  return Array.from({ length: max }, (_entry, index) => index + 1);
}

function isAttendeeComplete(attendee) {
  return Boolean(
    attendee.firstName.trim() &&
      attendee.lastName.trim() &&
      attendee.address.trim() &&
      attendee.phone.trim() &&
      attendee.email.trim()
  );
}

export default function RegistrationFlowExperience({
  event,
  initialOccurrenceId,
  initialTicketCategoryId,
  locale,
  dictionary,
  dietaryOptions
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
  const [attendees, setAttendees] = useState([createBlankAttendee()]);

  const selectedOccurrence = getOccurrenceById(event, occurrenceId);
  const selectedTicketCategory = getTicketCategory(selectedOccurrence, ticketCategoryId);
  const quantityOptions = selectedOccurrence ? getRegistrationQuantityOptions(selectedOccurrence) : [];
  const quote =
    selectedOccurrence && selectedTicketCategory
      ? calculatePaymentBreakdown({
          unitPrice: selectedTicketCategory.unitPrice,
          quantity: Number(quantity || 1),
          prepayPercentage: selectedOccurrence.prepayPercentage ?? event.prepayPercentage
        })
      : null;

  useEffect(() => {
    if (actionState.message) {
      toast.error(actionState.message);
    }
  }, [actionState.message]);

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

  useEffect(() => {
    const nextQuantity = Number(quantity || 1);

    setAttendees((current) => {
      const next = current.slice(0, nextQuantity);

      while (next.length < nextQuantity) {
        next.push(createBlankAttendee());
      }

      return next;
    });
  }, [quantity]);

  function handleOccurrenceChange(nextOccurrenceId) {
    const nextOccurrence = getOccurrenceById(event, nextOccurrenceId);

    setOccurrenceId(nextOccurrenceId);
    setTicketCategoryId(nextOccurrence?.ticketCategories[0]?.id ?? "");
    setQuantity("1");
  }

  function updateAttendee(index, patch) {
    setAttendees((current) =>
      current.map((attendee, attendeeIndex) =>
        attendeeIndex === index ? { ...attendee, ...patch } : attendee
      )
    );
  }

  function toggleDietaryFlag(index, flagId) {
    setAttendees((current) =>
      current.map((attendee, attendeeIndex) => {
        if (attendeeIndex !== index) {
          return attendee;
        }

        const flags = new Set(attendee.dietaryFlags);

        if (flags.has(flagId)) {
          flags.delete(flagId);
        } else {
          flags.add(flagId);
        }

        return {
          ...attendee,
          dietaryFlags: Array.from(flags)
        };
      })
    );
  }

  const attendeesComplete = attendees.every(isAttendeeComplete);
  const attendeeSummary = useMemo(
    () =>
      attendees.map((attendee) => ({
        name: [attendee.firstName, attendee.lastName].filter(Boolean).join(" "),
        email: attendee.email
      })),
    [attendees]
  );
  const serializedAttendees = JSON.stringify(attendees);

  return (
    <section className="registration-grid">
      <article className="panel section-card registration-flow-card">
        <div className="section-kicker">{dictionary.registration.eyebrow}</div>
        <h2>{dictionary.registration.title}</h2>
        <p>{dictionary.registration.summary}</p>

        <div className="registration-stepper">
          {Object.entries(dictionary.registration.steps).map(([id, label], index) => (
            <button
              className={`registration-step${index === activeStep ? " registration-step-active" : ""}`}
              key={id}
              onClick={() => setActiveStep(index)}
              type="button"
            >
              <span className="registration-step-index">{index + 1}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>

        {activeStep === 0 ? (
          <div className="registration-panel-stack">
            <h3>{dictionary.event.dates}</h3>
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
                    {!occurrence.registrationAvailable ? (
                      <div className="rounded-[1.25rem] bg-muted px-4 py-3 text-sm text-muted-foreground">
                        {occurrence.registrationGate?.reason || dictionary.registration.blocked}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => setActiveStep(1)} type="button">
                {dictionary.registration.continue}
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="registration-panel-stack">
            <h3>{dictionary.registration.steps.ticket}</h3>
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
                      <span className="route-label">{category.payment.onlineAmountLabel} online</span>
                    </div>
                    <p>{category.summary}</p>
                  </button>
                );
              })}
            </div>

            <label className="field">
              <span>{dictionary.registration.quantity}</span>
              <select
                name="quantity"
                onChange={(changeEvent) => setQuantity(changeEvent.target.value)}
                value={quantity}
              >
                {quantityOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="hero-actions">
              <button className="button button-secondary" onClick={() => setActiveStep(0)} type="button">
                {dictionary.registration.back}
              </button>
              <button className="button button-primary" onClick={() => setActiveStep(2)} type="button">
                {dictionary.registration.continue}
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="registration-panel-stack">
            <h3>{dictionary.registration.steps.attendees}</h3>
            <div className="registration-choice-grid">
              {attendees.map((attendee, index) => (
                <article className="registration-choice registration-choice-active" key={`attendee-${index}`}>
                  <div className="registration-choice-head">
                    <div>
                      <strong>
                        {dictionary.registration.participant} {index + 1}
                      </strong>
                      <span>
                        {index === 0 ? dictionary.registration.leadAttendee : dictionary.registration.participant}
                      </span>
                    </div>
                  </div>

                  <div className="registration-field-grid mt-4">
                    <label className="field">
                      <span>{dictionary.registration.firstName}</span>
                      <input
                        onChange={(event) => updateAttendee(index, { firstName: event.target.value })}
                        type="text"
                        value={attendee.firstName}
                      />
                    </label>
                    <label className="field">
                      <span>{dictionary.registration.lastName}</span>
                      <input
                        onChange={(event) => updateAttendee(index, { lastName: event.target.value })}
                        type="text"
                        value={attendee.lastName}
                      />
                    </label>
                    <label className="field field-span">
                      <span>{dictionary.registration.address}</span>
                      <input
                        onChange={(event) => updateAttendee(index, { address: event.target.value })}
                        type="text"
                        value={attendee.address}
                      />
                    </label>
                    <label className="field">
                      <span>{dictionary.registration.phone}</span>
                      <input
                        onChange={(event) => updateAttendee(index, { phone: event.target.value })}
                        type="text"
                        value={attendee.phone}
                      />
                    </label>
                    <label className="field">
                      <span>{dictionary.registration.email}</span>
                      <input
                        onChange={(event) => updateAttendee(index, { email: event.target.value })}
                        type="email"
                        value={attendee.email}
                      />
                    </label>
                    <div className="field field-span">
                      <span>{dictionary.registration.dietary}</span>
                      <div className="flex flex-wrap gap-2">
                        {dietaryOptions.map((option) => {
                          const selected = attendee.dietaryFlags.includes(option.id);

                          return (
                            <button
                              className={`filter-pill ${selected ? "filter-pill-active" : ""}`}
                              key={option.id}
                              onClick={() => toggleDietaryFlag(index, option.id)}
                              type="button"
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <label className="field field-span">
                      <span>{dictionary.registration.dietaryOther}</span>
                      <textarea
                        onChange={(event) => updateAttendee(index, { dietaryOther: event.target.value })}
                        placeholder={dictionary.registration.dietaryPlaceholder}
                        rows="2"
                        value={attendee.dietaryOther}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            {!attendeesComplete ? (
              <div className="registration-message-error">{dictionary.registration.missingParticipants}</div>
            ) : null}

            <div className="hero-actions">
              <button className="button button-secondary" onClick={() => setActiveStep(1)} type="button">
                {dictionary.registration.back}
              </button>
              <button
                className="button button-primary"
                disabled={!attendeesComplete}
                onClick={() => setActiveStep(3)}
                type="button"
              >
                {dictionary.registration.continue}
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 3 ? (
          <form action={formAction} className="registration-panel-stack">
            <input name="slug" type="hidden" value={event.organizerSlug} />
            <input name="eventSlug" type="hidden" value={event.slug} />
            <input name="occurrenceId" type="hidden" value={selectedOccurrence?.id || ""} />
            <input name="ticketCategoryId" type="hidden" value={selectedTicketCategory?.id || ""} />
            <input name="quantity" type="hidden" value={quantity} />
            <input name="registrationLocale" type="hidden" value={locale} />
            <input name="attendeesJson" type="hidden" value={serializedAttendees} />

            <h3>{dictionary.registration.summaryCard}</h3>
            <div className="registration-choice-grid">
              <div className="registration-choice registration-choice-active">
                <div className="registration-choice-head">
                  <strong>{dictionary.registration.steps.occurrence}</strong>
                  <span>{selectedOccurrence?.capacityLabel}</span>
                </div>
                <span>{selectedOccurrence?.label}</span>
                <span>{selectedOccurrence?.time}</span>
              </div>
              <div className="registration-choice registration-choice-active">
                <div className="registration-choice-head">
                  <strong>{dictionary.registration.steps.ticket}</strong>
                  <span>{quantity}</span>
                </div>
                <span>{selectedTicketCategory?.label}</span>
                <span>{selectedTicketCategory?.unitPriceLabel}</span>
              </div>
              <div className="registration-choice registration-choice-active">
                <div className="registration-choice-head">
                  <strong>{dictionary.registration.steps.attendees}</strong>
                  <span>{attendees.length}</span>
                </div>
                {attendeeSummary.map((attendee, index) => (
                  <span key={`${attendee.email}-${index}`}>
                    {attendee.name || `${dictionary.registration.participant} ${index + 1}`} · {attendee.email || "Pending"}
                  </span>
                ))}
              </div>
            </div>

            {actionState.message ? (
              <div className="registration-message-error">{actionState.message}</div>
            ) : null}

            <div className="hero-actions">
              <button className="button button-secondary" onClick={() => setActiveStep(2)} type="button">
                {dictionary.registration.back}
              </button>
              <button className="button button-primary" disabled={isPending} type="submit">
                {dictionary.registration.createHold}
              </button>
            </div>
          </form>
        ) : null}
      </article>

      <aside className="panel section-card registration-summary-card">
        <div className="section-kicker">{dictionary.registration.summaryCard}</div>
        <h3>{selectedOccurrence?.label || dictionary.event.noDates}</h3>
        <div className="timeline mt-6">
          <div className="timeline-step">
            <strong>{selectedTicketCategory?.label || "Ticket"}</strong>
            <span>{quantity}</span>
          </div>
          <div className="timeline-step">
            <strong>Total</strong>
            <span>{quote?.subtotalLabel || "Pending"}</span>
          </div>
          <div className="timeline-step">
            <strong>Online</strong>
            <span>{quote?.onlineAmountLabel || "Pending"}</span>
          </div>
          <div className="timeline-step">
            <strong>Due at event</strong>
            <span>{quote?.dueAtEventLabel || "Pending"}</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
