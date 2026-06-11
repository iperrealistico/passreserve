# 2026-06-11 18:18 CEST — Cookie banner fixed viewport positioning

## Summary

Hotfix for the privacy/cookie banner positioning regression visible on public pages after the compliance rollout. The banner was rendering as if attached to the document flow, appearing only after scroll and partially outside the viewport instead of staying fixed on screen like a standard consent banner.

## Root cause

- The `.cookie-banner` rule in [app/globals.css](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css) applied both `fixed` and `relative`.
- The conflicting positioning classes caused the banner to lose true viewport anchoring.
- On narrower layouts the card could drift left and clip outside the visible area.

## Changes

- Removed the conflicting `relative` positioning from `.cookie-banner`.
- Kept the banner fixed to the viewport on all breakpoints.
- Added an explicit viewport-safe max width so the card cannot overflow the screen horizontally.
- Preserved the existing consent logic, copy, cookie preference behavior, and CTA wiring unchanged.

## Files changed

- [app/globals.css](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production redeploy on Vercel
- live smoke check on `passreserve.com`
