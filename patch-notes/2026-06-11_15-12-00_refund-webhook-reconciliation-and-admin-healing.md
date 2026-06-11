# Refund webhook reconciliation and organizer auto-heal

## Summary

Organizer dashboards and cancelled-registration rows could remain stuck on `Refund pending / Rimborso in attesa` even after Stripe had already completed the refund and returned the money to the attendee. The issue was not the organizer read-model math itself; it was the final refund reconciliation path.

## Root cause

- The organizer refund UI already prefers `refundedCents > 0` over stale pending ledger rows.
- However, the final `charge.refunded` confirmation in database mode still depended on the older full-state `mutatePersistentState()` webhook path.
- If that full-state reconciliation did not complete cleanly, Passreserve could retain:
  - `registration.refundedCents = 0`
  - a `RegistrationPayment(kind=REFUND,status=PENDING)` row
- In that state, Stripe had already refunded the attendee, but Passreserve still believed the refund was waiting for webhook confirmation.

## Changes

1. Added a direct Prisma-based `charge.refunded` database-mode path in `lib/passreserve-service.js`.
   - Refund confirmations no longer rely on full-state replacement for the critical refund lifecycle.
   - The webhook now updates `registration.refundedCents`, closes matching pending refund ledger rows, and records the audit event directly in PostgreSQL.

2. Added organizer-admin refund auto-healing in `lib/passreserve-admin-service.js`.
   - Before building organizer dashboard and registrations payloads in database mode, Passreserve now checks pending Stripe refund ids against the connected-account refund state.
   - If Stripe already reports the refund as succeeded, Passreserve upgrades the local ledger from `PENDING` to `REFUNDED`, updates `refundedCents`, and records a reconciliation audit entry.
   - If Stripe reports the refund as failed or canceled, the local ledger is moved to `FAILED` so the organizer sees the correct follow-up state.

3. Added a reusable Stripe helper in `lib/passreserve-payments.js`.
   - `retrieveStripeRefund()` now reads refund state directly from Stripe connected accounts for reconciliation flows.

## Verification

- `npx eslint lib/passreserve-payments.js lib/passreserve-admin-service.js lib/passreserve-service.js test/passreserve-admin-refund-reconciliation.test.js`
- `npm run test -- test/passreserve-admin-refund-reconciliation.test.js test/passreserve-webhooks.test.js test/passreserve-admin-registration-refunds.test.js test/passreserve-admin-registrations.test.js`
- `npm run verify`

## Expected user-facing result

- Newly completed Stripe refunds should move to `Refund completed / Rimborso completato` without getting stuck.
- Existing stale `Refund pending` rows can now self-heal the next time the organizer opens the admin dashboard or registrations area.
