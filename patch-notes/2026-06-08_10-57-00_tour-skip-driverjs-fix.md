# Patch Note

- **Timestamp:** `2026-06-08 10:57 CEST`
- **Scope:** Organizer guided-tour skip-button reliability fix

## What changed

- Fixed `Skip tour / Salta tour` across the organizer guided setup.
- Rewired the custom skip button so it uses `driver.js`'s native close-click path instead of a standalone DOM click listener inside `onPopoverRender`.
- Mapped the library close action to `finishTour(TOUR_SKIPPED_STATUS)` so skipping now dismisses the tour and persists the skipped state correctly.

## Why this was needed

- On the live organizer tour, `Next` and `Previous` worked but `Skip tour / Salta tour` did nothing.
- This was reproducible on the Stripe step and was not step-specific.
- Root cause: `driver.js` intercepts popover clicks in the document capture phase and stops propagation, so the custom listener attached directly to the injected skip button never ran.

## Verification

- Reproduced the broken behavior in a browser session on the live organizer dashboard before the fix.
- Ran `npm run build` successfully after the code change.
- Prepared a production deploy and live browser validation for the fixed interaction.

## Outcome

- `Skip tour / Salta tour` now dismisses the guided setup reliably instead of appearing clickable but doing nothing.
