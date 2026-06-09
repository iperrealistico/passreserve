# Patch note — 2026-06-09 14:58 CEST

## Summary

Hardened the public registration lifecycle in database mode so live attendee holds, confirmation links, and payment handoffs no longer depend on `mutatePersistentState()` full-state rewrites or file-store fallback.

## Problem

Production Sillico registrations could fail at the final booking step with:

- `That event occurrence is no longer available.`

The attendee could still receive the confirmation email, but clicking the link opened:

- `This hold is no longer available.`
- `This hold could not be found.`

Runtime logs on Vercel showed Prisma transaction error `P2028` (`Transaction not found`) while the public booking flow was still mutating the full serialized state inside `mutatePersistentState()`. When that failed, the runtime silently fell back to file state, so email side effects could happen without the canonical PostgreSQL registration row ever being committed.

## What changed

- Split the public registration hot paths away from `mutatePersistentState()` when `getStorageMode() === "database"`.
- Added direct Prisma persistence for:
  - `createRegistrationHold`
  - `confirmRegistrationHold`
  - `resumeRegistrationPayment`
  - `resolveSuccessfulRegistrationConfirmation`
- Kept the legacy file-state paths intact for non-database environments.
- Added reusable Prisma helpers for:
  - registration updates
  - payment ledger row creation
  - post-commit payment confirmation emails
- Moved attendee/organizer email delivery to after the database commit in the database-mode public flow.
- Kept payment handoff recovery truthful by falling back to the existing payment preview page if a live Stripe Checkout session cannot be created after confirmation.

## Verification

- `npx eslint lib/passreserve-service.js lib/passreserve-state.js test/passreserve-registrations.test.js`
- `npm run test -- test/passreserve-registrations.test.js`
- `npm run build`
- Controlled live DB smoke against the Sillico event using a disposable attendee email:
  - hold persisted successfully
  - confirmation succeeded
  - registration transitioned to `PENDING_PAYMENT`
  - no orphan/missing-hold behavior
  - test registration and related logs cleaned up immediately afterward

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-state.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
