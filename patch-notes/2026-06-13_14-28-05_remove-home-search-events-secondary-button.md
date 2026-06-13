# 2026-06-13 14:28 CEST — Remove homepage Search events secondary button

## Summary

- removed the redundant secondary `Events` button from the homepage `Search events` card
- kept the primary `Browse events / Esplora eventi` action and the underlying `/events` search form unchanged
- confirmed this was a presentation-only homepage cleanup with no database, auth, registration, or organizer-runtime impact

## Changes

- updated [app/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/page.js) to remove the secondary `/events` link rendered beside the primary search submit button inside the attendee card

## Validation

- `npm run lint`
- `npm run build`

## Risk note

- no data model, persistence, Stripe, email, or admin runtime code changed in this patch
- the homepage search form still submits to `/events` exactly as before; only the extra duplicate CTA was removed

