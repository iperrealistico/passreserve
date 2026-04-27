"use client";

import {
  ORGANIZER_ADMIN_TOUR_EVENT,
  ORGANIZER_ADMIN_TOUR_MODES
} from "../../../lib/organizer-admin-tour.js";

function dispatchTourStart(mode) {
  window.dispatchEvent(
    new CustomEvent(ORGANIZER_ADMIN_TOUR_EVENT, {
      detail: {
        mode
      }
    })
  );
}

export function OrganizerTourControls({ showcaseLabel, setupLabel }) {
  return (
    <>
      <button
        className="button button-primary"
        data-organizer-tour="dashboard-setup-launcher"
        onClick={() => {
          dispatchTourStart(ORGANIZER_ADMIN_TOUR_MODES.SETUP);
        }}
        type="button"
      >
        {setupLabel}
      </button>
      <button
        className="button button-secondary"
        data-organizer-tour="dashboard-tour-replay"
        onClick={() => {
          dispatchTourStart(ORGANIZER_ADMIN_TOUR_MODES.SHOWCASE);
        }}
        type="button"
      >
        {showcaseLabel}
      </button>
    </>
  );
}
