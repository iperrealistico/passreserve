## Phase

- Phase number: `Phase 09 follow-up`
- Phase title: `Security hardening: operational audit trail and housekeeping`

## Timestamp

- Completed at: `2026-06-13 20:14:28 Europe/Rome`

## Summary

- `Added targeted operational audit coverage for the payment-handoff lifecycle so public registrations now record when a checkout handoff is opened and, in the Prisma-backed paths that already had a fallback branch, when opening Stripe Checkout fails and the flow falls back to the local payment preview. This closes one of the biggest remaining observability gaps between “registration created” and “webhook/payment completed.”`
- `Added explicit successful-login audit entries for both organizer admins and platform admins through markAdminLogin(), so the platform can now reconstruct who actually accessed an admin area without relying only on lastLoginAt timestamps.`
- `Introduced safe periodic housekeeping: expired auth-rate-limit keys are now pruned through a shared helper, technical/high-volume audit events have a bounded retention window, and the existing /api/cron/reminders route now runs reminders plus housekeeping together and returns both summaries.`

## Files changed

- `lib/passreserve-config.js`
- `lib/passreserve-auth-security.js`
- `lib/passreserve-admin-service.js`
- `lib/passreserve-service.js`
- `app/api/cron/reminders/route.js`
- `test/passreserve-auth-security.test.js`
- `test/passreserve-config.test.js`
- `test/passreserve-registrations.test.js`
- `test/passreserve-operational-housekeeping.test.js`
- `test/passreserve-admin-login-audit.test.js`

## Checks performed

- `npx eslint lib/passreserve-config.js lib/passreserve-auth-security.js lib/passreserve-admin-service.js lib/passreserve-service.js app/api/cron/reminders/route.js test/passreserve-auth-security.test.js test/passreserve-config.test.js test/passreserve-operational-housekeeping.test.js test/passreserve-admin-login-audit.test.js test/passreserve-registrations.test.js`
- `npx vitest run test/passreserve-auth-security.test.js test/passreserve-config.test.js test/passreserve-operational-housekeeping.test.js test/passreserve-admin-login-audit.test.js test/passreserve-registrations.test.js`
- `npm run build`

## Vercel deployment status

- `Not deployed in this phase. Commit/push/Vercel verification are still pending because the user asked to continue the security rollout locally phase by phase first.`

## Problems and risks

- `The new audit-retention cleanup intentionally targets only technical/high-volume event types so business and support history stay intact. If the platform later wants a stricter or longer retention window, adjust PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS rather than broadening the delete filter blindly.`
- `Organizer manual “send payment link” flows still use their own service module and were not expanded with the new payment-handoff audit helper in this phase; the public attendee path and admin login path were prioritized first because they are the most exposed surfaces.`

## Notes for the next AI agent

- `Read 000_START_HERE_AI.md plus the three June 13 security hardening patch notes before continuing.`
- `Phases 1, 2, and 3 of this hardening rollout are still local-only and unshipped. Preserve them together when preparing the eventual push/deploy so trusted boundaries, Stripe reconciliation, and the new audit/housekeeping layer land as one coherent release.`
