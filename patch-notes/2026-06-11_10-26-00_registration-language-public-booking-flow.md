# Patch note — 2026-06-11 10:26 CEST

## Summary

Completed Phase 3 of the registration-language rollout by wiring the public booking flow to a real booking-language choice, with safe draft preservation across locale switches and no changes yet to attendee email template localization.

## Problem

After Phase 2, organizer admins could configure whether an event should ask for booking language, but the public registration flow still:

- always inherited the current page locale implicitly
- had no explicit guest-facing selector
- could not safely rerender the registration interface in another language without losing the in-progress draft
- did not carry the chosen locale through the immediate `pending` redirect

## What changed

- Extended [`lib/passreserve-i18n.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-i18n.js) so registration pages can request a preferred locale directly instead of only relying on the cookie/header locale
- Updated [`app/[slug]/events/[eventSlug]/register/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/page.js) to honor `?bookingLocale=it|en` for both translations and localized event content
- Added the guest-facing booking-language selector to step 1 of [`app/[slug]/events/[eventSlug]/register/registration-flow-experience.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js) whenever the resolved organizer/event config enables it
- Preserved the active registration draft across locale switches by snapshotting occurrence/cart/attendees/step state in session storage before the locale rerender
- Kept persisting the selected language through the existing `registrationLocale` field already attached to each registration
- Carried the chosen locale through the `pending` redirect by appending `bookingLocale` to the first post-submit handoff
- Made token-based registration surfaces derive locale from the stored registration language for shared shell content:
  - [`register/confirm/[holdToken]`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js)
  - [`register/confirmed/[confirmationToken]`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirmed/[confirmationToken]/page.js)
  - [`register/payment/preview/[paymentToken]`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js)
  - [`register/payment/cancel/[paymentToken]`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/page.js)

## Intentionally not changed yet

- No attendee email templates were translated in this phase
- No organizer email templates were translated in this phase
- No new languages beyond Italian and English were introduced
- The token pages still keep their existing copy structure; this phase focused on locale selection, persistence, and safe flow wiring

## Verification

- `npx eslint app/[slug]/events/[eventSlug]/register/page.js app/[slug]/events/[eventSlug]/register/registration-flow-experience.js app/[slug]/events/[eventSlug]/register/pending/page.js app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js app/[slug]/events/[eventSlug]/register/confirmed/[confirmationToken]/page.js app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/page.js lib/passreserve-i18n.js lib/passreserve-service.js test/passreserve-registrations.test.js`
- `npm run test -- test/passreserve-registrations.test.js test/passreserve-registration-language.test.js`
- `npm run verify`

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/pending/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirmed/[confirmationToken]/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-i18n.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-registrations.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Risks and notes

- The draft-preservation restore path is intentionally narrow: it exists to survive locale switches, not to act as a general autosave system.
- Pending/confirm/payment pages now resolve their shell locale from the registration when possible, but their deeper copy localization remains a later pass.
- Email template localization is still a separate later phase, so this rollout currently changes registration UI locale and persisted registration language, not yet outgoing attendee email language.
