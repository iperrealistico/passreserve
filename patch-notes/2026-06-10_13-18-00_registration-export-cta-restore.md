# Patch note — 2026-06-10 13:18 CEST

## Summary

Restored the discoverability of the existing organizer participant-export feature by moving the operational/full PDF actions into the main registrations page header whenever an occurrence is selected.

## Problem

The export backend was still alive, but the UI entrypoint had become easy to miss.

Current runtime reality before this fix:

- PDF export existed at `/{slug}/admin/registrations/export`
- it supported `variant=operational` and `variant=full`
- it required a selected occurrence/date
- but the buttons only appeared deep inside the selected-date summary block of the registrations queue

That made it feel like the feature had been removed, even though the route and PDF generator were still present.

## What changed

- Kept the existing export backend unchanged.
- Confirmed there is still no CSV export runtime today.
- Confirmed the current export model is per occurrence/date, not whole-event multi-date export.
- Moved the existing:
  - `Export operational PDF`
  - `Export full PDF`
  buttons into the main `OrganizerAdminPageHeader` actions for the registrations page whenever a selected occurrence is present.
- Removed the duplicated buttons from the lower selected-date summary block so the CTA now lives in one clearer place.

## Verification

- `npx eslint app/[slug]/admin/registrations/page.js`
- `npm run build`

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registrations/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
