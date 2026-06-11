# 2026-06-11 18:39 CEST — Remove direct-confirm user notice

## Summary

Removed the direct-confirm informational notice box from the public booking review step because it exposed an implementation detail that was useful for internal/product context but not for the end guest.

## Change

- Deleted the localized `directConfirmHeadline` and `directConfirmDetail` copy from the public booking flow labels.
- Removed the notice box rendered only in the `DIRECT_CONFIRM` branch before the final legal checkboxes.
- Kept confirmation mode behavior, attendee validation, legal acceptance, and email behavior unchanged.

## Files changed

- [app/[slug]/events/[eventSlug]/register/registration-flow-experience.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production redeploy on Vercel
