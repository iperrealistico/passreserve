## Phase

- Phase number: `Phase 09 follow-up`
- Phase title: `Security hardening: direct database Stripe webhook reconciliation`

## Timestamp

- Completed at: `2026-06-13 19:49:29 Europe/Rome`

## Summary

- `Replaced the remaining database-mode Stripe webhook hot path that still depended on full-state snapshot mutation. Account updates, checkout completion, async payment failures, disputes, and unhandled Stripe events now reconcile through direct Prisma transactions and targeted audit writes instead of passing through mutatePersistentState().`
- `Hardened checkout completion reconciliation so late webhooks can attach their Stripe event id onto an already-recorded CAPTURE row without duplicating the payment, while first-arrival paid webhooks still create the CAPTURE row, mark the registration paid, and trigger the existing payment emails.`
- `Added a safety guard so checkout-completed webhooks in database mode only finalize online payment when Stripe reports payment_status=paid; pending async sessions are now only audited instead of being prematurely marked as paid.`

## Files changed

- `lib/passreserve-service.js`
- `test/passreserve-webhooks-database.test.js`

## Checks performed

- `npx eslint lib/passreserve-service.js test/passreserve-webhooks-database.test.js`
- `npx vitest run test/passreserve-webhooks-database.test.js`
- `npx vitest run test/passreserve-webhooks.test.js test/passreserve-webhooks-database.test.js test/passreserve-config.test.js test/passreserve-password-reset.test.js test/passreserve-registrations.test.js`
- `npm run build`

## Vercel deployment status

- `Not deployed in this phase. Commit/push/Vercel verification are still pending because the user asked to start Phase 2 locally first.`

## Problems and risks

- `This patch intentionally leaves the file-state webhook path unchanged so existing local/demo behavior remains stable while production database mode gets the safer reconciliation path.`
- `The new checkout-completion guard relies on Stripe's webhook payload including payment_status, which is standard for Checkout Session events; if Stripe changes that payload contract, the completion branch would need a follow-up review.`

## Notes for the next AI agent

- `Read 000_START_HERE_AI.md, FINAL_LAUNCH_HANDOFF.md, 04_DATA_MODEL_AND_BUSINESS_RULES.md, 06_OPERATIONS_TESTING_AND_RISKS.md, and the two June 13 security patch notes before continuing the rollout.`
- `Phase 1 and Phase 2 hardening are currently local-only and unshipped. Preserve both together when you prepare the eventual push/deploy so the trusted success-path guard and the new database webhook reconciliation land in the same release.`
