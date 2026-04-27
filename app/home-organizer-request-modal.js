"use client";

import { useEffect, useRef, useState } from "react";

import { submitOrganizerRequestRedirectAction } from "./actions.js";

const MODAL_CLOSE_MS = 220;

export function HomeOrganizerRequestModal({
  launchWindows,
  paymentModels,
  triggerClassName = "",
  triggerLabel = "Request access"
}) {
  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [modalState, setModalState] = useState("closed");
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [formStartedAt, setFormStartedAt] = useState(() => String(Date.now()));

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
    import("altcha");
  }, []);

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
      return;
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
  }, []);

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
        className={`button button-primary ${triggerClassName}`.trim()}
        onClick={() => {
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }

          setFormStartedAt(String(Date.now()));
          setFormInstanceKey((current) => current + 1);
          setModalState("opening");
          setOpen(true);
        }}
        type="button"
      >
        {triggerLabel}
      </button>

      <dialog className="home-modal" data-state={modalState} ref={dialogRef}>
        <div className="home-modal-panel">
          <button
            aria-label="Close request form"
            className="home-modal-close"
            onClick={requestClose}
            type="button"
          >
            Close
          </button>

          <div className="home-modal-head">
            <span className="section-kicker">Host an event</span>
            <h3>Request access</h3>
            <p>
              Tell us what you host and how you like to take payment. We&apos;ll use it to set up
              the right starting point for your page.
            </p>
          </div>

          <form action={submitOrganizerRequestRedirectAction} className="registration-field-grid home-modal-form">
            <input name="formStartedAt" readOnly type="hidden" value={formStartedAt} />
            <div
              aria-hidden="true"
              style={{
                height: 0,
                left: "-9999px",
                opacity: 0,
                overflow: "hidden",
                pointerEvents: "none",
                position: "absolute",
                width: 0
              }}
            >
              <label>
                <span>Leave this field empty</span>
                <input autoComplete="off" name="companyWebsite" tabIndex={-1} type="text" />
              </label>
            </div>
            <label className="field">
              <span>Contact name</span>
              <input name="contactName" required type="text" />
            </label>
            <label className="field">
              <span>Contact email</span>
              <input name="contactEmail" required type="email" />
            </label>
            <label className="field">
              <span>Contact phone</span>
              <input name="contactPhone" type="text" />
            </label>
            <label className="field">
              <span>Organizer name</span>
              <input name="organizerName" required type="text" />
            </label>
            <label className="field">
              <span>City</span>
              <input name="city" required type="text" />
            </label>
            <label className="field">
              <span>Launch window</span>
              <select defaultValue={launchWindows[1]?.id} name="launchWindow">
                {launchWindows.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Payment model</span>
              <select defaultValue={paymentModels[1]?.id} name="paymentModel">
                {paymentModels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-span" style={{ gridColumn: "1 / -1" }}>
              <span>What do you host?</span>
              <textarea
                name="eventFocus"
                placeholder="Workshops, tastings, recurring classes, local experiences..."
                required
                rows="2"
              />
            </label>
            <label className="field field-span" style={{ gridColumn: "1 / -1" }}>
              <span>Notes</span>
              <textarea
                name="note"
                placeholder="Share timing, audience, venue details, or anything helpful."
                rows="2"
              />
            </label>
            <div className="field field-span" style={{ gridColumn: "1 / -1" }}>
              <span>Human verification</span>
              <altcha-widget
                auto="onload"
                challenge="/api/altcha/organizer-request"
                key={`organizer-request-${formInstanceKey}`}
                name="altcha"
                type="checkbox"
              ></altcha-widget>
            </div>

            <div className="home-modal-actions" style={{ gridColumn: "1 / -1" }}>
              <button className="button button-primary button-compact button-small home-modal-submit" type="submit">
                Send request
              </button>
              <button
                className="button button-secondary button-compact button-small home-modal-cancel"
                onClick={requestClose}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
