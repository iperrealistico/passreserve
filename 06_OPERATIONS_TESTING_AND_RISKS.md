# Operations, Testing, And Risks

## Runtime env vars

The current runtime expects these environment variables:

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY_DEFAULT`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `IP_SALT`
- `ALTCHA_HMAC_KEY`
- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_PASSWORD`
- optional `PLATFORM_ADMIN_NAME`
- optional `PASSRESERVE_STATE_FILE`

## Storage and deployment modes

### Local development

- if `DATABASE_URL` is missing, the app uses `.runtime-data/passreserve-state.json`
- this mode is durable on the current machine and is suitable for local development and smoke testing

### Preview deployments

- if `DATABASE_URL` is missing on Vercel, the app uses `/tmp/passreserve-state.json`
- this is useful for previews but remains ephemeral and should not be treated as production persistence

### Production

Production is expected to use:

- PostgreSQL through Prisma
- `npm run db:migrate` against the checked-in migration history
- real Stripe secrets
- real Resend credentials
- a real `NEXT_PUBLIC_BASE_URL`

## Build and migration safety

The current build path is intentionally non-destructive:

- `npm run build` runs `next build`
- Prisma generation runs separately via `npm run db:generate`
- schema migrations run separately via `npm run db:migrate`

There is no checked-in `prisma db push --accept-data-loss` path in the active build pipeline anymore.

## Verification baseline

The current verification stack is:

- `npm run lint`
- `npm run test`
- `npm run test:copy`
- `npm run db:generate`
- `npm run build`
- `npm run test:smoke`
- `npm run verify`

`npm run verify` is the repo-standard gate and currently combines the checks above into one end-to-end local validation flow.

## What the smoke suite proves

The smoke suite validates the built app against key production-shaped routes and behaviors, including:

- homepage and about page rendering
- organizer hub rendering
- event route rendering
- registration flow primitives
- organizer-admin auth redirect behavior
- platform-admin login route
- organizer join-request persistence

## Current operational strengths

- Auth is now real for organizer and platform admin routes.
- Registrations, payments, email activity, settings, and CMS content are durable runtime records.
- The Prisma schema and initial migration are checked in.
- The local developer experience works with or without PostgreSQL.
- The repo has a real top-level launch handoff and production env checklist.

## Remaining owner-controlled launch tasks

These are not code gaps. They are external provisioning tasks:

1. Buy or attach the production domain and point it to Vercel.
2. Provision the production PostgreSQL database and set `DATABASE_URL`.
3. Connect live Stripe secrets and configure the production webhook.
4. Connect Resend, verify the sender domain, and set `RESEND_API_KEY` and `FROM_EMAIL`.
5. Set `NEXT_PUBLIC_BASE_URL` to the final public domain.
6. Replace bootstrap admin credentials with real production credentials.

## Live risks to keep in mind

### 1. Preview storage is not production storage

Vercel previews can function without Postgres, but `/tmp/passreserve-state.json` is ephemeral. Preview success does not mean persistence is production-ready.

### 2. Local bootstrap credentials are intentionally weak

The fallback local admin passwords are there to accelerate development. They are not safe for production and must be rotated.

### 3. Stripe and Resend are still environment-dependent

The code paths are implemented, but production behavior is only fully real once those services are connected with valid secrets and verified sender/webhook configuration.

### 4. Historical docs still exist

Some earlier repository docs preserve the MTB Reserve analysis and transformation journey. They remain useful context, but they are no longer the runtime source of truth.
