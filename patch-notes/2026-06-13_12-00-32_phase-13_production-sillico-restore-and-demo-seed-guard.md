# 2026-06-13 12:00 CEST — Phase 13 production Sillico restore and demo-seed guard

## Summary

- recovered the live `sillico` organizer dataset after production had fallen back to demo seed state and public/event routes were serving the wrong data
- created a live backup schema of the corrupted canonical state before touching production data
- restored the missing core Passreserve rows required for the real Sillico organizer, admin login, public event, published dates, and site-level CMS/runtime tables
- hardened the production state layer so a protected Vercel production runtime now refuses to auto-seed demo data into a database-backed environment when the canonical database is incomplete
- fixed the nested Prisma write shape inside the full-state replacement path that could previously fail registration-item persistence and help trigger the dangerous fallback branch
- realigned the smoke test to the current homepage organizer headline so the local verification gate is green again

## Incident and root cause

The overnight incident was not caused by a new Vercel deployment. Production was still serving code from deployment `dpl_ADcjCwdJxvdxvFRA6G4kXS5CKcSc` on commit `28e13fa5dc5483a461f45d970c43725b6de1bec2`.

Live investigation showed that the canonical `passreserve` schema had been partially emptied and repopulated with demo organizers/events while serving the same production code. The strongest signals were:

- only demo organizers/events remained in the canonical live tables
- real recent attendee rows existed without corresponding registrations
- the foreign key `RegistrationAttendee_registrationId_fkey` was missing from production
- live `SiteSettings`, `AboutPageContent`, and `EmailTemplate` rows had been emptied, which made the runtime believe the state layer was effectively blank

That combination could send production into the database-backed `loadPersistentState()` / `mutatePersistentState()` auto-seed branch. In that branch, a full demo-state replacement could overwrite the canonical production rows. The risk was amplified by a bug in `replacePrismaState()` where nested `RegistrationItem` creates still passed `registrationId` during a nested create, making Prisma reject the write and increasing the chances of a broken rewrite/fallback cycle.

## Live recovery steps

- backed up the corrupted canonical schema into `recovery_backup_20260613_115143`
- restored the canonical live organizer/admin/event state for:
  - organizer slug `sillico`
  - organizer admin `leterredelmoro@gmail.com`
  - event slug `divini-sapori`
  - two published occurrences on `2026-07-03` and `2026-07-04`
  - one default adult ticket at `€50` with `40%` online prepay
- restored required CMS/runtime rows for:
  - `SiteSettings`
  - `AboutPageContent`
  - `EmailTemplate`
- restored the missing production FK:
  - `RegistrationAttendee_registrationId_fkey`

## Files changed

- [lib/passreserve-state.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-state.js)
- [scripts/smoke-check.mjs](/Users/leonardofiori/Documents/Antigravity/gatherpass/scripts/smoke-check.mjs)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Validation

- `npm run verify`
- production database inspection of organizer/event/ticket/occurrence counts after restore
- production constraint inspection confirming `RegistrationAttendee_registrationId_fkey` exists again
- live route checks returning `200` for:
  - `https://passreserve.com/sillico`
  - `https://passreserve.com/sillico/events/divini-sapori`
  - `https://passreserve.com/sillico/admin/login`
- direct organizer-auth verification through the production-backed service for:
  - slug `sillico`
  - email `leterredelmoro@gmail.com`

## Caveats and remaining risk

- the canonical production snapshot available at incident time no longer contained the real `Registration`, `RegistrationPayment`, or audit-history rows for the wiped data set, so this recovery restores the real organizer/admin/public-event surface but does not reconstruct historical registrations that were already missing from the damaged snapshot
- the backup schema `recovery_backup_20260613_115143` has been kept in production as a safety copy of the broken state taken before recovery
- the new production fail-closed guard intentionally prefers surfacing a production error over silently reseeding demo data into a database-backed runtime

## Next-step guidance

- keep the new production-state guard deployed so future partial DB incidents cannot silently repopulate demo data
- if any historical Sillico registrations must be recovered, investigate external evidence sources next: Stripe, Resend, and any manual exports or screenshots, because the canonical runtime tables no longer held those rows at incident time
- after every future production push that touches persistence logic, verify both the Vercel deployment and a real production DB-backed route, not just the public homepage
