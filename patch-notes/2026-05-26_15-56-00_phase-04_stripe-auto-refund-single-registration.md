# Stripe Auto Refund Phase 4 Patch Note

## Phase

- Phase number: `Phase 4`
- Phase title: `Single registration cancellation orchestration`

## Timestamp

- Completed implementation pass at: `2026-05-26 15:56:00 Europe/Rome`

## Summary

- Added the new single-registration cancellation orchestrator in [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js), introducing:
  - `ORGANIZER_REGISTRATION_CANCEL_MODE`
  - `cancelOrganizerRegistration()`
  - shared helpers for organizer refund eligibility, Stripe refund request metadata, pending-refund ledger rows, and cancel audit metadata
- Wired existing organizer cancel actions to delegate through the new orchestrator, so the current backend now supports both `cancel only` and `cancel + refund online amount` without splitting into parallel code paths.
- Persisted the first local pending-refund representation with `RegistrationPayment(kind=REFUND,status=PENDING)` and structured metadata including `stripeRefundId`, idempotency key, actor, timestamp, and Stripe mode/status.
- Kept cancellation emails flowing through the existing organizer/admin delivery pipeline after the pending refund row is written, so the later email-copy phases can already distinguish `refund initiated` truthfully.
- Future-proofed [`app/[slug]/admin/actions.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js) with optional `cancelMode` passthrough, while leaving the current UI behavior unchanged until the explicit cancel/refund modal phase.
- Added dedicated organizer refund regression coverage in [`test/passreserve-admin-registration-refunds.test.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-registration-refunds.test.js) for:
  - successful `cancel + refund`
  - legacy `cancel only`
  - no-online-payment guardrail
  - duplicate-pending-refund guardrail

## Files changed

- [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
- [`11_STRIPE_AUTO_REFUND_ON_CANCELLATION_PLAN.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/11_STRIPE_AUTO_REFUND_ON_CANCELLATION_PLAN.md)
- [`app/[slug]/admin/actions.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js)
- [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js)
- [`lib/passreserve-registrations.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registrations.js)
- [`test/passreserve-admin-registration-refunds.test.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-registration-refunds.test.js)

## Checks performed

- Ran `npx eslint lib/passreserve-admin-service.js lib/passreserve-registrations.js app/[slug]/admin/actions.js test/passreserve-admin-registration-refunds.test.js`.
- Ran `npm run test -- test/passreserve-admin-registration-refunds.test.js test/passreserve-admin-manual-registration-actions.test.js test/passreserve-organizer-registrations.test.js test/passreserve-registrations.test.js test/passreserve-admin-emails.test.js test/passreserve-auth-security.test.js test/passreserve-organizer-signup.test.js`.
- Ran `npm run build`.
- Ran `npm run verify`.

## Vercel deployment status

- No Git push or Vercel deployment was performed in this pass.
- Treat this as a local service-layer phase only until the later UI/webhook phases are committed, pushed, and explicitly deployed.

## Problems and risks

- Phase 4 still performs the outbound Stripe refund request before persisting the local cancellation transaction, which keeps `cancel + refund` behavior user-safe but still leaves a narrow window where Stripe could accept a refund before the local ledger row is written; the next webhook reconciliation phase remains the backstop for that edge case.
- Refund completion is not considered final yet. The local ledger intentionally stops at `PENDING`, and `refundedCents` still waits for the Stripe webhook source of truth in the next phase.
- The organizer UI does not yet expose the `cancelMode` choice directly, so this capability is currently backend-ready rather than operator-ready.

## Commit and push status

- No commit or push was created in this pass.

## Notes for the next AI agent

- Reuse [`cancelOrganizerRegistration()`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js) for the next phases instead of duplicating refund orchestration inside UI actions or occurrence bulk flows.
- The next natural step is Phase 5: extend the Stripe webhook reconciliation so a locally requested `REFUND/PENDING` row can be matched and closed into `REFUNDED` when `charge.refunded` arrives.
