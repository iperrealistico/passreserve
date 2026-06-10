# Patch note — 2026-06-10 15:07 CEST

## Summary

Corrected another organizer-side statistics drift so cancelled and refunded registrations no longer keep polluting the current-state summaries shown to organizers in the registrations area and related admin read-model surfaces.

## Problem

The earlier refund-aware financial fix had corrected organizer/platform revenue totals, but some organizer-facing queue summaries were still drifting because they were not reading from the same shared current-state logic.

Two concrete issues remained:

- the registrations page summary could still count cancelled registrations toward:
  - `Participants`
  - `Still due / Da incassare`
- a registration could still display `Refund pending / Rimborso in attesa` even after the authoritative `refundedCents` value had already reached the fully refunded state, if a stale pending refund row still existed in the ledger

This created exactly the kind of mismatch the organizer reported: live operational stats still looked open even though the organizer had already cancelled the booking and the refund had already completed.

## What changed

- Added shared helpers in `lib/passreserve-admin-service.js` for:
  - registration participant counting
  - outstanding venue-balance calculation
  - organizer registration-list summary reduction
- Made outstanding `due at venue` balance resolve to `0` for non-operational registrations such as:
  - `CANCELLED`
  - `NO_SHOW`
  - expired pending states
- Reordered organizer refund-summary presentation so a fully refunded registration now surfaces as:
  - `Refund completed`
  - `Rimborso completato`
  before any stale pending refund row can keep the UI stuck in `pending`
- Rewired the organizer registrations page summary to use the shared summary helper instead of its own divergent local reducer
- Kept refund work visible in the queue while excluding cancelled registrations from current participant and current outstanding-balance counts
- Updated other admin read-model surfaces that were still formatting `dueAtEventOpen*` using raw arithmetic instead of the shared operational-balance helper

## Verification

- `npm run test -- test/passreserve-admin-financial-summary.test.js test/passreserve-admin-registrations.test.js test/passreserve-admin-registration-refunds.test.js`
- `npx eslint lib/passreserve-admin-service.js app/[slug]/admin/registrations/page.js test/passreserve-admin-financial-summary.test.js test/passreserve-admin-registrations.test.js`
- `npm run verify`

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registrations/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-financial-summary.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-registrations.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Risks and notes

- This fix is intentionally read-model focused: it does not rewrite booking/refund persistence and does not alter Stripe/refund business rules.
- The current queue summary now reflects “current operational state” by default, which is the behavior organizers were expecting after cancellations.
- Historical views still retain refund visibility; only current-state participant and outstanding-balance totals are suppressed for closed registrations.

## Commit, push, and deployment status

- Commit created: pending
- Push to GitHub: pending
- Vercel production deployment: pending
