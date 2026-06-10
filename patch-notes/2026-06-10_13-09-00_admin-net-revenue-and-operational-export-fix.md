# Patch note — 2026-06-10 13:09 CEST

## Summary

Corrected organizer and platform financial read-models so refunded Stripe captures no longer remain counted as live online revenue in dashboard/overview metrics, and hardened the operational participant export so cancelled registrations no longer leak into the working PDF by default.

## Problem

After a successful live payment followed by a successful automatic refund, the organizer dashboard could still show the original online revenue amount as if the organizer still held that money.

Root cause:

- the refund pipeline was already updating `Registration.refundedCents` correctly from Stripe webhooks
- but organizer/platform summary helpers were still aggregating raw `onlineCollectedCents`
- outstanding `due at venue` totals were also summing cancelled rows instead of only operationally active registrations

This created read-model drift:

- Stripe and the payment ledger were correct
- the admin dashboards were not

There was a second operational mismatch:

- the occurrence participant PDF export route already supported `variant=operational|full`
- but `operational` still included cancelled/no-show/non-operational rows because the route did not filter on runtime registration activity

## What changed

- Added a shared operational-activity helper in `lib/passreserve-admin-service.js` so organizer/platform summaries and export filtering now use the same definition of an operational registration.
- Reworked shared financial aggregation so summaries now calculate:
  - gross online collected
  - refunded online
  - net online collected (`onlineCollectedCents - refundedCents`)
  - venue balance still outstanding only for operationally active registrations
- Updated organizer summary read models to use the new refund-aware totals.
- Updated platform overview, platform organizer list, and platform organizer detail to use the same refund-aware totals in both Prisma and file-state paths.
- Added `operationallyActive` and `onlineNetCollectedLabel` to organizer registration admin records for downstream admin/export use.
- Updated the registrations export route so:
  - `variant=operational` excludes cancelled, no-show, and expired pending rows
  - `variant=full` still preserves the full audit-oriented export

## Verification

- `npx eslint lib/passreserve-admin-service.js app/[slug]/admin/registrations/export/route.js test/passreserve-admin-financial-summary.test.js test/passreserve-registration-export-route.test.js`
- `npm run test -- test/passreserve-admin-financial-summary.test.js test/passreserve-registration-export-route.test.js test/passreserve-admin-registrations.test.js`
- `npm run build`
- `npm run verify`

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registrations/export/route.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-financial-summary.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-registration-export-route.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
