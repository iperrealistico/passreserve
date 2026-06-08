# Patch Note

- **Timestamp:** `2026-06-08 10:29 CEST`
- **Scope:** Production organizer-auth incident investigation and schema-drift recovery for `/sillico`

## What happened

- The organizer reported that `leterredelmoro@gmail.com` could no longer sign in to `https://passreserve.com/sillico/admin/login` with password `sylvico020226`.
- This matched an earlier incident pattern where the same organizer account looked "broken" after unrelated site changes.
- Live login attempts were failing with `?error=rate-limited`, not `invalid`, even though the organizer believed the credentials were unchanged.

## Evidence gathered

- Production database inspection confirmed the `/sillico` organizer admin still existed, was active, and still matched the requested password hash.
- A local server-side auth check against the production env succeeded for `authenticateOrganizerAdmin("sillico", "leterredelmoro@gmail.com", "sylvico020226")`.
- The canonical production database was behind the code that had already been deployed on May 26, 2026:
  - pending migration `20260526143000_add_registration_source_and_origin`
  - pending migration `20260526143500_add_manual_registration_email_templates`
- Direct production inspection confirmed `Registration.source` and `Registration.origin` were missing from Postgres before recovery.

## Root cause

- Production code from the organizer manual-registration and Stripe auto-refund rollout had already been deployed.
- The matching Prisma migrations had not been applied to the live database.
- When Passreserve hit Prisma schema errors against the outdated database, the runtime could mark the schema as incompatible and fall back to the runtime file store.
- Once that happened, organizer auth and login throttling could stop reading the canonical PostgreSQL state and instead behave against stale runtime file data, which made a valid organizer account look intermittently broken.

## Recovery performed

- Applied the pending Prisma migrations to the canonical production database with `prisma migrate deploy`.
- Re-issued the organizer password idempotently from the platform service so the requested credentials were guaranteed to be the live canonical ones.
- Triggered a fresh production redeploy on Vercel:
  - `dpl_75x4FHsTFGu8pHBHpEc7THiLdgwr`
  - aliases confirmed on `passreserve.com` and `passreserve.vercel.app`
- Re-verified the live login path in a browser and confirmed successful navigation to:
  - `https://passreserve.com/sillico/admin/dashboard`

## Prevention going forward

- A `READY` Vercel deploy is not enough when the shipped diff includes checked-in Prisma migrations.
- Every production publish that introduces new migration files must also include:
  - `prisma migrate deploy` against the live database
  - a clean pending-migrations check before sign-off
  - a quick organizer-login smoke check against a real organizer account
- The project protocol has been updated in:
  - `000_START_HERE_AI.md`
  - `06_OPERATIONS_TESTING_AND_RISKS.md`
  - `FINAL_LAUNCH_HANDOFF.md`

## Outcome

- Organizer access for `/sillico` was restored for:
  - email `leterredelmoro@gmail.com`
  - password `sylvico020226`
- The recurring failure pattern was traced back to production schema drift, not to an organizer-record deletion or an intentional password invalidation.
