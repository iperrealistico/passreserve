# 2026-06-11 18:27 CEST — Confirmation-mode badge compact rework

## Summary

Visual polish for the `Current choice / Scelta attuale` badge used in the booking-language and confirmation-mode cards. The previous implementation reused the generic card-copy span styling, which made the badge too tall, allowed line wrapping, and produced an awkward pill shape inside the selector cards.

## Changes

- Split the card copy and badge into distinct styling hooks.
- Added a dedicated `.confirmation-mode-badge` treatment with:
  - single-line layout
  - tighter vertical padding
  - compact aspect ratio
  - uppercase micro-label styling
- Updated the public booking-language selector and the matching admin selector cards to use the dedicated badge class.

## Files changed

- [app/[slug]/events/[eventSlug]/register/registration-flow-experience.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js)
- [app/[slug]/admin/registration-language-prompt-editor.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registration-language-prompt-editor.js)
- [app/[slug]/admin/registration-confirmation-mode-editor.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registration-confirmation-mode-editor.js)
- [app/globals.css](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production redeploy on Vercel
