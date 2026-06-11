# 2026-06-11 18:49 CEST — Remove event occurrence highlight

## Summary

Removed the black-border highlight from the occurrence cards on the public event detail page so the interface no longer visually preselects a date for the guest.

## Change

- Stopped applying the `registration-choice-active` state to occurrence cards rendered in the `Available dates / Date disponibili` section of the public event detail page.
- Kept the rest of the event detail flow unchanged:
  - date cards still link directly to the correct registration flow
  - the selected-occurrence summary block remains intact
  - no booking or availability logic was changed

## Files changed

- [app/[slug]/events/[eventSlug]/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/page.js)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production redeploy on Vercel
