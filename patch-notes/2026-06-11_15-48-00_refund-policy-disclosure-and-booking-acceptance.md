# Refund policy disclosure and booking acceptance

- **Timestamp:** `2026-06-11 15:48 CEST`
- **Scope:** public booking disclosure, organizer event configuration, registration acceptance audit

## Summary

This rollout adds a structured organizer-controlled refund and cancellation policy layer to Passreserve.com without changing the underlying Stripe refund engine or the organizer account model.

Customers now see a clear public refund-policy summary on event pages, must explicitly accept the organizer refund/cancellation policy before creating a registration hold or completing a direct-confirm booking, and the accepted policy is snapshotted onto the registration record for later audit. Organizer admins can now classify each event as `Refundable`, `Non-refundable`, or `Refundable with conditions` while keeping the existing localized free-text policy editor for the detailed rules.

To keep legacy events stable, the migration and runtime normalization safely backfill existing events with non-empty cancellation-policy text to `REFUNDABLE_WITH_CONDITIONS`.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260611161000_add_event_refund_policy_acceptance/migration.sql`
- `lib/passreserve-refund-policy.js`
- `lib/passreserve-registration-core.js`
- `lib/passreserve-service.js`
- `lib/passreserve-state.js`
- `lib/passreserve-seed.js`
- `lib/passreserve-admin-service.js`
- `app/[slug]/admin/actions.js`
- `app/[slug]/admin/events/page.js`
- `app/[slug]/events/[eventSlug]/page.js`
- `app/[slug]/events/[eventSlug]/register/actions.js`
- `app/[slug]/events/[eventSlug]/register/registration-flow-experience.js`
- `app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js`
- `components/booking-legal-copy.js`
- `app/globals.css`
- `scripts/smoke-check.mjs`
- `test/passreserve-admin-events.test.js`
- `test/passreserve-registrations.test.js`
- `test/passreserve-refund-policy.test.js`
- `001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## What changed

1. **Data model**
   - Added `RefundPolicyType` enum to `EventType`.
   - Added `refundPolicyAcceptedAt` and `refundPolicySnapshot` to `Registration`.

2. **Organizer admin**
   - Added a structured refund-policy selector in the organizer event editor.
   - Reused the existing localized `cancellationPolicy` text as the detailed organizer policy.

3. **Public event and booking flow**
   - Exposed a localized refund-policy summary/detail block on public event detail pages.
   - Added a required refund-policy acceptance checkbox with expandable detail card in the booking flow.
   - Left the existing email-confirmation / direct-confirm registration architecture intact.

4. **Auditability**
   - Persist the accepted refund-policy snapshot directly on the registration so later organizer/admin views can reconstruct what the attendee accepted even if the event policy changes later.

5. **Legacy safety**
   - Added runtime normalization and migration backfill so historical events with an existing cancellation-policy text are classified conservatively as `REFUNDABLE_WITH_CONDITIONS`.

## Verification

Ran successfully:

- `npx eslint lib/passreserve-refund-policy.js lib/passreserve-registration-core.js lib/passreserve-service.js lib/passreserve-state.js lib/passreserve-seed.js lib/passreserve-admin-service.js app/[slug]/admin/actions.js app/[slug]/admin/events/page.js app/[slug]/events/[eventSlug]/page.js app/[slug]/events/[eventSlug]/register/actions.js app/[slug]/events/[eventSlug]/register/registration-flow-experience.js app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js components/booking-legal-copy.js test/passreserve-admin-events.test.js test/passreserve-registrations.test.js test/passreserve-refund-policy.test.js`
- `npx prisma generate`
- `npm run test -- test/passreserve-admin-events.test.js test/passreserve-registrations.test.js test/passreserve-refund-policy.test.js`
- `npm run verify`
- `npx prisma migrate deploy`
- `npx prisma migrate status`

Also verified against the canonical production schema that the live Sillico event:

- organizer slug: `sillico`
- event slug: `divini-sapori`
- now carries `refundPolicyType = REFUNDABLE_WITH_CONDITIONS`
- preserves the existing organizer-provided detailed cancellation/refund text in both English and Italian

## Caveats and follow-up

- This rollout does **not** change the actual organizer refund engine, Stripe reconciliation, or organizer-side refund actions; it only improves disclosure and acceptance.
- The existing local legal-recap UI changes around the general terms checkbox were intentionally preserved and integrated instead of reverted.
- The confirmation page still requires the existing site-terms and attendee-readiness checkboxes, while refund-policy acceptance is captured earlier at booking-submit time.

## Deployment

- Git commit and push: completed after this note was written
- Vercel production verification: completed in the final handoff after push

## Guidance for the next agent

- If future work needs organizer-facing display of the accepted refund policy inside registration detail pages or PDF exports, use `registration.refundPolicySnapshot` instead of re-reading the current event text.
- Keep any future refund-policy changes event-scoped unless the product explicitly needs an organizer-wide inheritance model.
