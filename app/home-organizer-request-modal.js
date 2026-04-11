"use client";

import { useEffect, useRef, useState } from "react";

import { submitOrganizerRequestRedirectAction } from "./actions.js";

export function HomeOrganizerRequestModal({ launchWindows, paymentModels }) {
  const dialogRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    const handleCancel = (event) => {
      event.preventDefault();
      setOpen(false);
    };
    const handleClose = () => {
      setOpen(false);
    };
    const handleBackdropClick = (event) => {
      if (event.target === dialog) {
        setOpen(false);
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

  return (
    <>
      <button
        className="button button-primary button-compact button-small"
        onClick={() => setOpen(true)}
        type="button"
      >
        Request access
      </button>

      <dialog className="home-modal" ref={dialogRef}>
        <div className="home-modal-panel">
          <button
            aria-label="Close request form"
            className="home-modal-close"
            onClick={() => setOpen(false)}
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
            <label className="field field-span">
              <span>What do you host?</span>
              <textarea
                name="eventFocus"
                placeholder="Workshops, tastings, recurring classes, local experiences..."
                required
                rows="2"
              />
            </label>
            <label className="field field-span">
              <span>Notes</span>
              <textarea
                name="note"
                placeholder="Share timing, audience, venue details, or anything helpful."
                rows="2"
              />
            </label>

            <div className="home-modal-actions">
              <button className="button button-primary button-compact button-small" type="submit">
                Send request
              </button>
              <button
                className="button button-secondary button-compact button-small"
                onClick={() => setOpen(false)}
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
