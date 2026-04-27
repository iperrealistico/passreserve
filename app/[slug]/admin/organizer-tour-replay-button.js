"use client";

import { ORGANIZER_ADMIN_TOUR_EVENT } from "../../../lib/organizer-admin-tour.js";

export function OrganizerTourReplayButton({ label }) {
  return (
    <button
      className="button button-secondary"
      data-organizer-tour="dashboard-tour-replay"
      onClick={() => {
        window.dispatchEvent(new Event(ORGANIZER_ADMIN_TOUR_EVENT));
      }}
      type="button"
    >
      {label}
    </button>
  );
}
