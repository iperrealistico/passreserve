"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { updateOrganizerRegistrationAction } from "../actions.js";

const MODAL_CLOSE_MS = 220;
const CANCEL_ONLY = "CANCEL_ONLY";
const CANCEL_AND_REFUND_ONLINE = "CANCEL_AND_REFUND_ONLINE";

function CancelSubmitButton({ isItalian, selectedMode }) {
  const { pending } = useFormStatus();
  const label = pending
    ? isItalian
      ? "Invio in corso..."
      : "Submitting..."
    : selectedMode === CANCEL_AND_REFUND_ONLINE
      ? isItalian
        ? "Cancella e richiedi il rimborso"
        : "Cancel and request refund"
      : isItalian
        ? "Cancella senza rimborso"
        : "Cancel without refund";

  return (
    <button className="button button-danger" disabled={pending} type="submit">
      {label}
    </button>
  );
}

function getDefaultCancelMode(refundSummary) {
  return refundSummary?.status === "READY" ? CANCEL_AND_REFUND_ONLINE : CANCEL_ONLY;
}

function getRefundSummaryRows(refundSummary, registration, isItalian) {
  return [
    {
      label: isItalian ? "Incassato online" : "Paid online",
      value: registration.onlineCollectedLabel
    },
    {
      label: isItalian ? "Gia rimborsato" : "Already refunded",
      value: registration.refundedLabel
    },
    {
      label: isItalian ? "Rimborsa ora" : "Refund now",
      value:
        refundSummary?.status === "READY"
          ? refundSummary.amountLabel
          : isItalian
            ? "Non disponibile"
            : "Not available"
    },
    {
      label: isItalian ? "Saldo sul posto" : "Due at venue",
      value: registration.dueAtEventOpenLabel
    }
  ];
}

function getRefundModeDescription({
  dueAtEventOpenCents,
  isItalian,
  refundSummary,
  selectedMode
}) {
  if (selectedMode === CANCEL_AND_REFUND_ONLINE && refundSummary?.status === "READY") {
    const venueCopy =
      dueAtEventOpenCents > 0
        ? isItalian
          ? " L'eventuale saldo sul posto resta escluso da questo rimborso."
          : " Any venue-only balance stays excluded from this refund."
        : "";

    return isItalian
      ? `${refundSummary.amountLabel} verranno richiesti a Stripe subito. La registrazione risultera cancellata ora e il ledger restera in attesa finche il webhook non confermera il rimborso.${venueCopy}`
      : `${refundSummary.amountLabel} will be requested from Stripe right away. The registration will be cancelled now and the ledger will stay pending until the webhook confirms the refund.${venueCopy}`;
  }

  return isItalian
    ? "La registrazione verra cancellata subito senza richiedere nessun rimborso automatico su Stripe. Eventuali incassi venue o manuali restano invariati."
    : "The registration will be cancelled immediately without requesting any automatic Stripe refund. Any venue or manual collections stay unchanged.";
}

export function OrganizerRegistrationCancelModal({
  isItalian,
  registration,
  returnTo,
  selectedEvent,
  selectedOccurrence,
  slug,
  triggerClassName = "button-secondary button-danger",
  triggerLabel = "Cancel"
}) {
  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [modalState, setModalState] = useState("closed");
  const [selectedMode, setSelectedMode] = useState(getDefaultCancelMode(registration.refundSummary));
  const refundSummary = registration.refundSummary;
  const refundRows = getRefundSummaryRows(refundSummary, registration, isItalian);
  const refundReady = refundSummary?.status === "READY";
  const refundBlockedMessage = refundReady ? null : refundSummary?.detailLabel || null;

  const finishClose = () => {
    const dialog = dialogRef.current;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (dialog?.open) {
      dialog.close();
    }

    setOpen(false);
    setModalState("closed");
  };

  const requestClose = () => {
    const dialog = dialogRef.current;

    if (!dialog?.open || modalState === "closing") {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setModalState("closing");
    closeTimerRef.current = window.setTimeout(() => {
      finishClose();
    }, MODAL_CLOSE_MS);
  };

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      setModalState("opening");
      dialog.showModal();
      animationFrameRef.current = requestAnimationFrame(() => {
        setModalState("open");
        animationFrameRef.current = null;
      });
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    const handleCancel = (event) => {
      event.preventDefault();
      requestClose();
    };
    const handleClose = () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      setOpen(false);
      setModalState("closed");
    };
    const handleBackdropClick = (event) => {
      if (event.target === dialog) {
        requestClose();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdropClick);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [modalState]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        className={`button ${triggerClassName}`.trim()}
        onClick={() => {
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }

          setSelectedMode(getDefaultCancelMode(refundSummary));
          setModalState("opening");
          setOpen(true);
        }}
        type="button"
      >
        {triggerLabel}
      </button>

      <dialog className="admin-modal" data-state={modalState} ref={dialogRef}>
        <div className="admin-modal-panel">
          <button
            aria-label={isItalian ? "Chiudi finestra di cancellazione" : "Close cancellation dialog"}
            className="admin-modal-close"
            onClick={requestClose}
            type="button"
          >
            {isItalian ? "Chiudi" : "Close"}
          </button>

          <div className="admin-modal-head">
            <span className="section-kicker">
              {isItalian ? "Cancella registrazione" : "Cancel registration"}
            </span>
            <h3>
              {registration.registrationCode} · {registration.attendeeName}
            </h3>
            <p>
              {isItalian
                ? `Controlla il riepilogo economico e scegli se annullare soltanto la registrazione oppure richiedere subito il rimborso online per ${registration.eventTitle}.`
                : `Review the payment summary and choose whether to cancel only the registration or also request the online refund for ${registration.eventTitle}.`}
            </p>
          </div>

          <div className="admin-modal-summary-grid">
            {refundRows.map((row) => (
              <div className="admin-modal-summary-card" key={row.label}>
                <span className="metric-label">{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <div className="admin-modal-note">
            <div className="admin-modal-note-head">
              <strong>{refundSummary.statusLabel}</strong>
              {refundSummary.amountLabel ? <span>{refundSummary.amountLabel}</span> : null}
            </div>
            <p>{refundSummary.detailLabel}</p>
          </div>

          <form action={updateOrganizerRegistrationAction} className="admin-modal-form">
            <input name="eventFilter" type="hidden" value={selectedEvent} />
            <input name="occurrenceFilter" type="hidden" value={selectedOccurrence} />
            <input name="slug" type="hidden" value={slug} />
            <input name="registrationId" type="hidden" value={registration.id} />
            <input name="action" type="hidden" value="cancel" />
            <input name="returnTo" type="hidden" value={returnTo} />
            <input name="cancelMode" type="hidden" value={selectedMode} />

            <div className="admin-choice-list">
              <label className="admin-choice-card">
                <input
                  checked={selectedMode === CANCEL_AND_REFUND_ONLINE}
                  className="admin-choice-radio"
                  disabled={!refundReady}
                  name="cancelModeChoice"
                  onChange={() => setSelectedMode(CANCEL_AND_REFUND_ONLINE)}
                  type="radio"
                  value={CANCEL_AND_REFUND_ONLINE}
                />
                <div className="admin-choice-copy">
                  <strong>
                    {isItalian
                      ? `Cancella e rimborsa ${refundSummary.amountLabel || registration.onlineCollectedLabel}`
                      : `Cancel and refund ${refundSummary.amountLabel || registration.onlineCollectedLabel}`}
                  </strong>
                  <p>
                    {refundReady
                      ? isItalian
                        ? "Scelta consigliata: richiede a Stripe il rimborso dell'importo incassato online."
                        : "Recommended: ask Stripe to refund the amount already collected online."
                      : refundBlockedMessage}
                  </p>
                </div>
              </label>

              <label className="admin-choice-card">
                <input
                  checked={selectedMode === CANCEL_ONLY}
                  className="admin-choice-radio"
                  name="cancelModeChoice"
                  onChange={() => setSelectedMode(CANCEL_ONLY)}
                  type="radio"
                  value={CANCEL_ONLY}
                />
                <div className="admin-choice-copy">
                  <strong>{isItalian ? "Cancella soltanto" : "Cancel only"}</strong>
                  <p>
                    {isItalian
                      ? "Annulla la registrazione senza avviare nessun rimborso automatico su Stripe."
                      : "Cancel the registration without starting any automatic Stripe refund."}
                  </p>
                </div>
              </label>
            </div>

            <div className="admin-modal-note admin-modal-note-muted">
              <div className="admin-modal-note-head">
                <strong>{isItalian ? "Esito previsto" : "Expected outcome"}</strong>
              </div>
              <p>
                {getRefundModeDescription({
                  dueAtEventOpenCents: registration.dueAtEventOpenCents,
                  isItalian,
                  refundSummary,
                  selectedMode
                })}
              </p>
            </div>

            <p className="admin-form-hint">
              {isItalian
                ? "Il rimborso automatico riguarda solo la quota online Stripe. Eventuali incassi sul posto o manuali non vengono toccati."
                : "Automatic refunds only affect the Stripe online amount. Venue or manual collections are not changed."}
            </p>

            <div className="hero-actions">
              <CancelSubmitButton isItalian={isItalian} selectedMode={selectedMode} />
              <button
                className="button button-secondary"
                onClick={requestClose}
                type="button"
              >
                {isItalian ? "Torna indietro" : "Go back"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
