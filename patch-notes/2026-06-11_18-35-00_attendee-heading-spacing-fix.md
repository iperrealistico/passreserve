# 2026-06-11 18:35 CEST — Attendee heading spacing fix

## Summary

Fixed the spacing issue in the attendee cards of the public registration flow where `Partecipante 1` and `Partecipante principale` were collapsing onto the same line.

## Change

- Reused the existing `registration-choice-copy` stack wrapper for the attendee card heading.
- This restores the same title/subtitle vertical rhythm already used by other registration cards.
- No booking, questionnaire, or attendee-assignment logic was changed.

## Files changed

- [app/[slug]/events/[eventSlug]/register/registration-flow-experience.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production redeploy on Vercel
