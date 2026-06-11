# 2026-06-11 18:44 CEST — Results location spacing and template-organizer cleanup

## Summary

Fixed the missing visual separator between city and region in public `/events` result cards, and removed the stock template organizers from the canonical production database while preserving the real Sillico organizer and its events.

## Changes

- Added an explicit separator between `city` and `region` in [app/events/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/events/page.js).
- Added dedicated inline spacing styles for the public result-card location cluster in [app/globals.css](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css).
- Removed the following seed/template organizers from the canonical production database:
  - `alpine-trail-lab`
  - `lago-studio-pass`
  - `officina-gravel-house`
  - `atelier-del-gusto`
  - `comune-aperto`
  - `studio-movimento-sud`
- Confirmed that the deletion left the real `sillico` organizer intact, with its events still present:
  - `divini-sapori`
  - `prova`

## Files changed

- [app/events/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/events/page.js)
- [app/globals.css](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production database check before/after delete
- production redeploy on Vercel
- live `/events` check after deploy
