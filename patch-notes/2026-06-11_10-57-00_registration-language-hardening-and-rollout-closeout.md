# Patch Note — Registration language phase 5: hardening and rollout closeout

Date: `2026-06-11 10:57 CEST`
Product: `Passreserve.com`
Scope: `Registration language rollout / Phase 5`

## What changed

- Tightened regression coverage around locale-aware attendee email delivery in the live registration lifecycle.
- Added explicit locale assertions for:
  - public `attendee_pending_confirmation`
  - public direct-confirm `attendee_registration_confirmed`
  - organizer manual `attendee_pending_confirmation`
  - organizer manual `attendee_registration_confirmed`
  - organizer manual `attendee_payment_requested`
  - `attendee_occurrence_reminder`
  - organizer-triggered `attendee_registration_cancelled`
  - organizer-triggered `attendee_occurrence_cancelled`

## Why this phase mattered

- Phases 1 through 4 added real production behavior:
  - organizer/event language prompt configuration
  - public booking-language selection
  - persisted `registrationLocale`
  - localized attendee email templates
- This final phase closes the rollout by proving that the same locale survives across the booking branches that matter operationally, not just the happy path.

## Runtime impact

- No new product behavior was introduced in this pass.
- No booking logic, payment logic, refund logic, or dashboard logic changed.
- This was a hardening-only release focused on regression coverage and rollout confidence.

## Verification

- `npm run test -- test/passreserve-registrations.test.js test/passreserve-organizer-registrations.test.js test/passreserve-admin-emails.test.js`
- `npm run verify`

## Result

The registration-language rollout is now closed with end-to-end regression coverage across the active attendee lifecycle: pending confirmation, direct confirmation, manual organizer registration, reminders, and organizer-side cancellations all preserve and use the attendee booking language safely.
