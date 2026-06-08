# Patch Note

- **Timestamp:** `2026-06-08 10:50 CEST`
- **Scope:** Organizer admin checkbox-shell regression fix

## What changed

- Fixed the organizer admin checkbox rows so native checkboxes no longer inherit the shared `.field input` text-input shell.
- Restricted the generic field-input selector to target text-like inputs only.
- Added a defensive reset on `.checkbox-row input[type="checkbox"]` so padding, min-height, background, and shadow stay checkbox-safe even if nearby field styles evolve again.

## Why this was needed

- The reminder toggle in organizer settings was rendering inside a tall rectangular shell above and below the actual checkmark square.
- The root cause was CSS inheritance: `.field input` was styling `input[type="checkbox"]` like a normal rounded text field.

## Verification

- Ran `npm run build` successfully after the CSS change.

## Outcome

- Reminder and similar admin checkboxes render as a normal square control again instead of a vertically stretched field shell.
