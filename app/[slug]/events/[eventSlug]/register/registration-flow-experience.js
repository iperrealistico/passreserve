"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { calculatePaymentBreakdown } from "../../../../../lib/passreserve-domain.js";
import { createRegistrationHoldAction } from "./actions.js";

const initialActionState = {
  message: "",
  fieldErrors: {}
};

function createBlankAttendee(ticketCategoryId = "") {
  return {
    ticketCategoryId,
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

function buildDefaultCart(occurrence) {
  if (!occurrence?.registrationAvailable) {
    return [];
  }

  const defaultCategory =
    occurrence?.ticketCategories.find((category) => category.isDefault) ??
    occurrence?.ticketCategories[0] ??
    null;

  return defaultCategory
    ? [
        {
          ticketCategoryId: defaultCategory.id,
          quantity: 1
        }
      ]
    : [];
}

function getMaxCartQuantity(occurrence) {
  return Math.min(Math.max(1, occurrence?.capacity?.remaining ?? 1), 8);
}

function sumCartQuantity(cartItems) {
  return cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function expandCartTicketIds(occurrence, cartItems) {
  const order = new Map(
    (occurrence?.ticketCategories || []).map((category, index) => [category.id, index])
  );

  return [...cartItems]
    .sort(
      (left, right) =>
        (order.get(left.ticketCategoryId) ?? 999) - (order.get(right.ticketCategoryId) ?? 999)
    )
    .flatMap((item) =>
      Array.from(
        {
          length: Number(item.quantity || 0)
        },
        () => item.ticketCategoryId
      )
    );
}

function getCartItemsWithViewData(occurrence, cartItems) {
  return cartItems
    .map((item) => {
      const category = occurrence?.ticketCategories.find(
        (entry) => entry.id === item.ticketCategoryId
      );

      if (!category || item.quantity <= 0) {
        return null;
      }

      const payment = calculatePaymentBreakdown({
        unitPrice: category.unitPrice,
        quantity: item.quantity,
        prepayPercentage: occurrence.prepayPercentage
      });

      return {
        ...item,
        label: category.label,
        summary: category.summary,
        included: category.included || [],
        unitPriceLabel: category.unitPriceLabel,
        subtotalLabel: payment.subtotalLabel,
        onlineAmountLabel: payment.onlineAmountLabel,
        dueAtEventLabel: payment.dueAtEventLabel
      };
    })
    .filter(Boolean);
}

function buildCartQuote(occurrence, cartItems) {
  return getCartItemsWithViewData(occurrence, cartItems).reduce(
    (quote, item) => {
      const category = occurrence.ticketCategories.find((entry) => entry.id === item.ticketCategoryId);
      const payment = calculatePaymentBreakdown({
        unitPrice: category.unitPrice,
        quantity: item.quantity,
        prepayPercentage: occurrence.prepayPercentage
      });

      return {
        subtotal: quote.subtotal + payment.subtotal,
        onlineAmount: quote.onlineAmount + payment.onlineAmount,
        dueAtEvent: quote.dueAtEvent + payment.dueAtEvent
      };
    },
    {
      subtotal: 0,
      onlineAmount: 0,
      dueAtEvent: 0
    }
  );
}

function isAttendeeComplete(attendee) {
  return Boolean(
    attendee.ticketCategoryId &&
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
  const [cartItems, setCartItems] = useState(
    buildDefaultCart(getOccurrenceById(event, initialOccurrenceId ?? event.occurrences[0]?.id ?? ""))
  );
  const [attendees, setAttendees] = useState(
    buildDefaultCart(getOccurrenceById(event, initialOccurrenceId ?? event.occurrences[0]?.id ?? ""))
      .flatMap((item) =>
        Array.from({ length: item.quantity }, () => createBlankAttendee(item.ticketCategoryId))
      )
  );

  const selectedOccurrence = getOccurrenceById(event, occurrenceId);
  const maxCartQuantity = getMaxCartQuantity(selectedOccurrence);
  const totalQuantity = sumCartQuantity(cartItems);
  const cartDetails = useMemo(
    () => getCartItemsWithViewData(selectedOccurrence, cartItems),
    [cartItems, selectedOccurrence]
  );
  const quote = useMemo(
    () => (selectedOccurrence ? buildCartQuote(selectedOccurrence, cartItems) : null),
    [cartItems, selectedOccurrence]
  );
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-US", {
        style: "currency",
        currency: "EUR"
      }),
    [locale]
  );
  const labels = useMemo(
    () => ({
      selectTickets: locale === "it" ? "Componi i ticket" : "Build your ticket mix",
      included: locale === "it" ? "Include" : "Includes",
      noTickets: locale === "it" ? "Seleziona almeno un ticket." : "Select at least one ticket.",
      quantityHint:
        locale === "it"
          ? "Puoi combinare piu ticket nello stesso acquisto."
          : "You can mix different tickets in the same purchase.",
      ticketAssigned:
        locale === "it" ? "Ticket assegnato a questo partecipante" : "Ticket assigned to this participant",
      ticketMix: locale === "it" ? "Mix ticket" : "Ticket mix",
      subtotal: locale === "it" ? "Totale ticket" : "Ticket total",
      online: locale === "it" ? "Online" : "Online",
      dueAtEvent: locale === "it" ? "Saldo sul posto" : "Due at event",
      pending: locale === "it" ? "In attesa" : "Pending",
      missingTickets:
        locale === "it"
          ? "Scegli almeno un ticket prima di continuare."
          : "Choose at least one ticket before continuing."
    }),
    [locale]
  );

  useEffect(() => {
    if (actionState.message) {
      toast.error(actionState.message);
    }
  }, [actionState.message]);

  useEffect(() => {
    const requiredTicketIds = expandCartTicketIds(selectedOccurrence, cartItems);

    setAttendees((current) => {
      const pools = new Map();

      for (const attendee of current) {
        const key = attendee.ticketCategoryId || "";

        if (!pools.has(key)) {
          pools.set(key, []);
        }

        pools.get(key).push(attendee);
      }

      return requiredTicketIds.map((ticketCategoryId, index) => {
        const pool = pools.get(ticketCategoryId) || [];
        const nextAttendee = pool.shift() || createBlankAttendee(ticketCategoryId);

        return {
          ...nextAttendee,
          ticketCategoryId,
          sortOrder: index
        };
      });
    });
  }, [cartItems, selectedOccurrence]);

  function handleOccurrenceChange(nextOccurrenceId) {
    const nextOccurrence = getOccurrenceById(event, nextOccurrenceId);

    setOccurrenceId(nextOccurrenceId);
    setCartItems(buildDefaultCart(nextOccurrence));
    setActiveStep(0);
  }

  function updateCartQuantity(ticketCategoryId, nextQuantity) {
    const sanitizedQuantity = Math.max(0, Number(nextQuantity || 0));

    setCartItems((current) => {
      const currentWithoutTicket = current.filter(
        (item) => item.ticketCategoryId !== ticketCategoryId
      );
      const otherQuantity = sumCartQuantity(currentWithoutTicket);
      const cappedQuantity = Math.min(
        sanitizedQuantity,
        Math.max(0, maxCartQuantity - otherQuantity)
      );
      const next =
        cappedQuantity > 0
          ? [...currentWithoutTicket, { ticketCategoryId, quantity: cappedQuantity }]
          : currentWithoutTicket;

      return next.sort((left, right) => {
        const leftIndex =
          selectedOccurrence?.ticketCategories.findIndex(
            (category) => category.id === left.ticketCategoryId
          ) ?? 0;
        const rightIndex =
          selectedOccurrence?.ticketCategories.findIndex(
            (category) => category.id === right.ticketCategoryId
          ) ?? 0;

        return leftIndex - rightIndex;
      });
    });
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
        email: attendee.email,
        ticketLabel:
          selectedOccurrence?.ticketCategories.find(
            (category) => category.id === attendee.ticketCategoryId
          )?.label || "Ticket"
      })),
    [attendees, selectedOccurrence]
  );
  const serializedAttendees = JSON.stringify(attendees);
  const serializedItems = JSON.stringify(cartItems);

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
              <button
                className="button button-primary"
                disabled={!selectedOccurrence?.registrationAvailable}
                onClick={() => setActiveStep(1)}
                type="button"
              >
                {dictionary.registration.continue}
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="registration-panel-stack">
            <h3>{labels.selectTickets}</h3>
            <p className="admin-page-tip">{labels.quantityHint}</p>
            <div className="registration-choice-grid">
              {selectedOccurrence?.ticketCategories.map((category) => {
                const item = cartItems.find((entry) => entry.ticketCategoryId === category.id);
                const quantity = item?.quantity || 0;
                const remainingForThisTicket = maxCartQuantity - (totalQuantity - quantity);

                return (
                  <article className="registration-choice registration-choice-active" key={category.id}>
                    <div className="registration-choice-head">
                      <div>
                        <strong>{category.label}</strong>
                        <span>{category.unitPriceLabel}</span>
                      </div>
                      <span className="route-label">{category.payment.onlineAmountLabel} online</span>
                    </div>
                    <p>{category.summary}</p>
                    {category.included?.length ? (
                      <div className="timeline mt-4">
                        {category.included.map((itemLabel) => (
                          <div className="timeline-step" key={`${category.id}-${itemLabel}`}>
                            <strong>{labels.included}</strong>
                            <span>{itemLabel}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="hero-actions mt-4">
                      <button
                        className="button button-secondary"
                        onClick={() => updateCartQuantity(category.id, quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <span className="pill">{quantity}</span>
                      <button
                        className="button button-secondary"
                        disabled={remainingForThisTicket <= 0}
                        onClick={() => updateCartQuantity(category.id, quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalQuantity <= 0 ? (
              <div className="registration-message-error">{labels.missingTickets}</div>
            ) : null}

            <div className="hero-actions">
              <button className="button button-secondary" onClick={() => setActiveStep(0)} type="button">
                {dictionary.registration.back}
              </button>
              <button
                className="button button-primary"
                disabled={totalQuantity <= 0}
                onClick={() => setActiveStep(2)}
                type="button"
              >
                {dictionary.registration.continue}
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="registration-panel-stack">
            <h3>{dictionary.registration.steps.attendees}</h3>
            <div className="registration-choice-grid">
              {attendees.map((attendee, index) => {
                const ticketLabel =
                  selectedOccurrence?.ticketCategories.find(
                    (category) => category.id === attendee.ticketCategoryId
                  )?.label || "Ticket";

                return (
                  <article className="registration-choice registration-choice-active" key={`attendee-${index}`}>
                    <div className="registration-choice-head">
                      <div>
                        <strong>
                          {dictionary.registration.participant} {index + 1}
                        </strong>
                        <span>
                          {index === 0 ? dictionary.registration.leadAttendee : ticketLabel}
                        </span>
                      </div>
                      <span className="route-label">{ticketLabel}</span>
                    </div>

                    <div className="registration-field-grid mt-4">
                      <label className="field field-span">
                        <span>{labels.ticketAssigned}</span>
                        <input readOnly type="text" value={ticketLabel} />
                      </label>
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
                          onChange={(event) =>
                            updateAttendee(index, { dietaryOther: event.target.value })
                          }
                          placeholder={dictionary.registration.dietaryPlaceholder}
                          rows="2"
                          value={attendee.dietaryOther}
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
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
            <input name="itemsJson" type="hidden" value={serializedItems} />
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
                  <strong>{labels.ticketMix}</strong>
                  <span>{totalQuantity}</span>
                </div>
                {cartDetails.map((item) => (
                  <span key={`review-${item.ticketCategoryId}`}>
                    {item.label} x{item.quantity} · {item.subtotalLabel}
                  </span>
                ))}
              </div>
              <div className="registration-choice registration-choice-active">
                <div className="registration-choice-head">
                  <strong>{dictionary.registration.steps.attendees}</strong>
                  <span>{attendees.length}</span>
                </div>
                {attendeeSummary.map((attendee, index) => (
                  <span key={`${attendee.email}-${index}`}>
                    {attendee.name || `${dictionary.registration.participant} ${index + 1}`} ·{" "}
                    {attendee.ticketLabel}
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
          {cartDetails.length ? (
            cartDetails.map((item) => (
              <div className="timeline-step" key={`aside-${item.ticketCategoryId}`}>
                <strong>
                  {item.label} x{item.quantity}
                </strong>
                <span>{item.subtotalLabel}</span>
              </div>
            ))
          ) : (
            <div className="timeline-step">
              <strong>{labels.noTickets}</strong>
              <span>{labels.pending}</span>
            </div>
          )}
          <div className="timeline-step">
            <strong>{labels.subtotal}</strong>
            <span>{quote ? priceFormatter.format(quote.subtotal) : labels.pending}</span>
          </div>
          <div className="timeline-step">
            <strong>{labels.online}</strong>
            <span>{quote ? priceFormatter.format(quote.onlineAmount) : labels.pending}</span>
          </div>
          <div className="timeline-step">
            <strong>{labels.dueAtEvent}</strong>
            <span>{quote ? priceFormatter.format(quote.dueAtEvent) : labels.pending}</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
