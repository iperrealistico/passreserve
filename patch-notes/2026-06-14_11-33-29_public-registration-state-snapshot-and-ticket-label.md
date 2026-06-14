# Patch Note

## Phase

- Phase number: `Hotfix`
- Phase title: `Public registration state snapshot and assigned-ticket label rework`

## Timestamp

- Completed at: `2026-06-14 11:33:29 Europe/Rome`

## Summary

- `Fixed the live Sillico booking regression where the public registration flow could still fail before opening Stripe with "We couldn't create the registration hold right now." even though the earlier checkout-handoff hardening had shipped successfully. The public database path now reads only the event- or registration-scoped Prisma state needed for create/confirm/resume booking flows instead of hydrating the entire platform snapshot inside the critical transaction, and it includes organizer admin metadata so attendee/organizer notification context can still be resolved safely. Also reworked the participant-step assigned-ticket reminder into a clearly static assigned-value block so guests no longer confuse it for an editable input.`

## Files changed

- `lib/passreserve-service.js`
- `app/[slug]/events/[eventSlug]/register/registration-flow-experience.js`
- `app/[slug]/admin/registrations/new/organizer-manual-registration-context-step.js`
- `app/globals.css`
- `001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
- `patch-notes/2026-06-14_11-33-29_public-registration-state-snapshot-and-ticket-label.md`

## Checks performed

- `npx eslint lib/passreserve-service.js app/[slug]/events/[eventSlug]/register/registration-flow-experience.js app/[slug]/admin/registrations/new/organizer-manual-registration-context-step.js`
- `npx vitest run test/passreserve-registrations.test.js test/passreserve-payments.test.js test/passreserve-payment-preview-database.test.js`
- `npm run build`
- `npm run verify`
- `Live disposable production-DB registration replay using codex.*@example.com addresses, followed by immediate cleanup of the created registrations and linked audit/email logs.`

## Vercel deployment status

- `Production push/deploy is performed after this patch-note update. Final deployment verification is recorded in the Git/Vercel history and user handoff for this hotfix.`

## Problems and risks

- `The public event-scoped snapshot still reads registrations for the selected event type so capacity and duplicate state remain correct; if a single event grows very large, that path should be profiled further, but it is already much narrower and safer than the previous full-platform snapshot.`
- `This hotfix intentionally avoids changing organizer/event/account data models, Stripe Connect settings, or existing Sillico production content.`

## Notes for the next AI agent

- `If booking failures return on the public flow, inspect lib/passreserve-service.js first and confirm that public create/confirm/resume paths are still using the narrow Prisma snapshot helpers instead of readPrismaState/loadPersistentState in database mode.`
- `Do not leave disposable codex/example.com registrations in the production database after live verification.`
