# 2026-06-11 18:31 CEST — Remove redundant ticket-mix hint

## Summary

Removed the helper sentence shown above the ticket selector in the public booking flow because it repeated something already obvious from the interface itself.

## Change

- Deleted the localized `quantityHint` copy from the booking flow labels.
- Removed the rendered helper paragraph from the ticket-composition step.
- Kept the ticket-step structure, validation, cart logic, and attendee assignment behavior unchanged.

## Files changed

- [app/[slug]/events/[eventSlug]/register/registration-flow-experience.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Verification

- `npm run build`
- production redeploy on Vercel
