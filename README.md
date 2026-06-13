# Passreserve.com

Passreserve.com is the active event-platform application in this repository. The public product name is `Passreserve.com`; `GATHERPASS` remains the internal codename only.

As of April 11, 2026, the repo is no longer just a sample-data shell. The public routes, organizer admin, platform admin, registration lifecycle, auth, payment records, CMS content, and launch docs all run through the completed Passreserve runtime.

Compared with the original MTB Reserve tenant tooling, Passreserve now also includes organizer self-service settings, booking-window controls, platform-triggered organizer reset links, Stripe Connect billing setup adapted for events, automatic organizer provisioning from the public request form, publication controls with separate public slugs, and platform-side direct organizer outreach tools inside admin.

## Current platform shape

- public discovery at `/`
- public about page at `/about`
- published organizer hubs at `/{publicSlug}`
- event pages at `/{publicSlug}/events/[eventSlug]`
- attendee registration and payment return routes under `/{publicSlug}/events/[eventSlug]/register/...`
- organizer admin at `/{internalSlug}/admin/...`
- platform admin at `/admin/...`, with applications at `/admin/applications`, delivery logs at `/admin/emails?tab=delivery`, and direct organizer email forms on each organizer detail page

## Runtime architecture

- Next.js App Router monolith
- Prisma + PostgreSQL when `DATABASE_URL` is configured
- durable runtime file store fallback for local work and Vercel previews when `DATABASE_URL` is absent
- `iron-session` cookie auth for organizer and platform admins
- `bcryptjs` password hashing and `zod` validation
- ALTCHA plus server-side IP and email rate limiting for organizer signup
- Stripe Connect Standard onboarding plus organizer-owned Checkout and durable webhook records
- Resend-backed transactional email, platform direct organizer outreach, and log-only fallback in local/test environments

The checked-in Prisma schema and initial migration now live under [`prisma/`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma).

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run test:copy`
- `npm run test:smoke`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:migrate:dev`
- `npm run db:seed`
- `npm run ops:backup`
- `npm run ops:backup:weekly`
- `npm run ops:restore`
- `npm run verify`

`npm run verify` is the main local quality gate. It runs linting, tests, UI copy checks, Prisma client generation, a production build, and the built-app smoke suite.

## Environment profiles

### Local development without Postgres

- `npm install`
- `npm run dev`
- the app seeds itself automatically into `.runtime-data/passreserve-state.json`
- this mode is durable on your machine and is suitable for development, smoke checks, and design work

### Database-backed development or production

1. Set `DATABASE_URL` and the other required env vars from [`.env.example`](/Users/leonardofiori/Documents/Antigravity/gatherpass/.env.example). For the shared Supabase project, `DATABASE_URL` must target the `passreserve` schema rather than the legacy `public` schema.
2. Run `npm run db:migrate`.
3. Optionally run `npm run db:seed` for a preloaded local database.
4. Run `npm run dev` or `npm run start`.

### Local backup operations

- `npm run ops:backup` creates a compressed Passreserve snapshot in [`.ops/backups/passreserve`](/Users/leonardofiori/Documents/Antigravity/gatherpass/.ops/backups/passreserve)
- `npm run ops:backup:weekly` applies the default retention policy:
  - newest `12` weekly backups
  - one older backup per month for `12` months
- backups are logical Passreserve state snapshots read through Prisma rather than raw `pg_dump` archives
- restore is intentionally guarded:
  - `npm run ops:restore -- --file=archives/<backup>.json.gz --yes`
  - by default it refuses to write back into the same `DATABASE_URL`
  - use `PASSRESERVE_RESTORE_DATABASE_URL` or `RESTORE_DATABASE_URL` for a separate restore target

## Organizer provisioning and reminder operations

- The public organizer request form on `/` is protected with ALTCHA, a honeypot, submit-timing checks, IP throttling, and email throttling.
- Valid requests are provisioned immediately into a private organizer plus organizer-admin account, and access is sent through Resend.
- Platform admins review provisioning status directly in `/admin/applications`.
- Organizer reminder deliveries run through the daily Vercel cron at `/api/cron/reminders` and require `CRON_SECRET` plus platform and organizer reminder enablement.
- Inbound email is handled outside Passreserve through Cloudflare Workers, so `/api/resend/inbound` is intentionally retired.
- Platform admins can send custom organizer emails from each organizer detail page using a sender on the configured Resend domain, defaulting to `direct@<sender-domain>`.
- Organizer public pages only resolve after explicit publication. The public slug can be edited before publish and is locked after publish in v1.

## Required production env vars

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY_DEFAULT`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `CRON_SECRET`
- `IP_SALT`
- `ALTCHA_HMAC_KEY`
- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_PASSWORD`

Production should be treated as incomplete without PostgreSQL, Stripe, and Resend configured.

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` now belong to the Passreserve platform Stripe account for Connect orchestration. Organizers never paste their own Stripe keys into the app.

`FROM_EMAIL` should stay on the verified Resend sender domain. Passreserve derives the default platform direct sender from it as `direct@<sender-domain>`.

## Important docs

- [`FINAL_LAUNCH_HANDOFF.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
- [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
- [`02_ARCHITECTURE_AND_RUNTIME.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/02_ARCHITECTURE_AND_RUNTIME.md)
- [`04_DATA_MODEL_AND_BUSINESS_RULES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/04_DATA_MODEL_AND_BUSINESS_RULES.md)
- [`06_OPERATIONS_TESTING_AND_RISKS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)

## Deployment rule

Vercel is the canonical deployment target. Local success does not replace deployment verification: after every meaningful push, verify the triggered Vercel deployment before closing the work.

Production storage is now intended to be fail-closed. If the live database is unavailable or schema-incompatible, the runtime must error explicitly instead of silently falling back to the file store.
