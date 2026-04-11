# Architecture And Runtime

## High-level shape

Passreserve.com is a Next.js App Router monolith. Public routes, admin routes, persistence orchestration, auth, payments, email, and operational logging all live in one repo and one deployment unit.

The major layers are:

- `app/`
  - routes, layouts, pages, and server actions
- `lib/`
  - runtime services, auth, config, persistence orchestration, formatting, email, and seed state
- `prisma/`
  - authoritative schema, initial migration, and database seed script
- `scripts/`
  - smoke checks and repo verification scripts
- `test/`
  - Vitest coverage for core runtime behaviors

## Stack

- Next.js `16.2.2`
- React `19.2.3`
- Prisma `6.19.3`
- PostgreSQL in production
- `iron-session` for cookie sessions
- `bcryptjs` for password hashing
- `zod` for request validation
- Stripe Checkout for online prepayment
- Resend for transactional email

## Storage modes

### 1. Database mode

If `DATABASE_URL` is configured, the app uses PostgreSQL through Prisma as the system of record.

The current database-backed runtime is coordinated through [`lib/passreserve-state.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-state.js), which:

- loads normalized platform state from Prisma tables
- serializes writes under a Postgres advisory lock
- persists the full state snapshot back into the Passreserve schema
- seeds the database automatically when empty

### 2. File-store mode

If `DATABASE_URL` is absent, the app falls back to a durable state file:

- local development: `.runtime-data/passreserve-state.json`
- Vercel preview: `/tmp/passreserve-state.json`

This mode is intentional for development, smoke tests, and previews. It is not the intended production system of record.

## Runtime service layer

The main runtime modules are:

- [`lib/passreserve-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js)
  - public discovery, organizer/event views, registration flow, payment flow, webhook handling, organizer request submission, password reset support
- [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js)
  - organizer dashboard operations, event and occurrence mutations, registration actions, venue payment recording, platform CMS/settings/organizer approval flows
- [`lib/passreserve-auth.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-auth.js)
  - platform and organizer sessions, route guards, login/logout/reset helpers
- [`lib/passreserve-email.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-email.js)
  - Resend sending plus audit-style logging fallback
- [`lib/passreserve-seed.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-seed.js)
  - local/sample bootstrap state used when storage starts empty

## Route topology

### Public routes

- `/`
  - discovery, featured organizers, join-request entry
- `/about`
  - Passreserve story and platform positioning
- `/{slug}`
  - organizer hub
- `/{slug}/events/[eventSlug]`
  - event details and occurrence listing
- `/{slug}/events/[eventSlug]/register`
  - attendee registration start
- `/{slug}/events/[eventSlug]/register/confirm/[holdToken]`
  - hold confirmation
- `/{slug}/events/[eventSlug]/register/confirmed/[confirmationToken]`
  - confirmed registration receipt
- `/{slug}/events/[eventSlug]/register/payment/preview/[paymentToken]`
  - preview or Stripe handoff state
- `/{slug}/events/[eventSlug]/register/payment/cancel/[paymentToken]`
  - canceled payment recovery
- `/{slug}/events/[eventSlug]/register/payment/success/[paymentToken]`
  - successful payment resolution

### Organizer admin routes

- `/{slug}/admin/login`
- `/{slug}/admin/login/reset/[token]`
- `/{slug}/admin`
- `/{slug}/admin/dashboard`
- `/{slug}/admin/calendar`
- `/{slug}/admin/events`
- `/{slug}/admin/occurrences`
- `/{slug}/admin/registrations`
- `/{slug}/admin/payments`

All organizer admin pages require a valid organizer-scoped session.

### Platform admin routes

- `/admin/login`
- `/admin/login/reset/[token]`
- `/admin`
- `/admin/organizers`
- `/admin/organizers/[slug]`
- `/admin/settings`
- `/admin/about`
- `/admin/emails`
- `/admin/logs`
- `/admin/health`

All platform admin pages require a valid platform session.

## Core public flow

1. A visitor discovers an organizer or event.
2. The registration form creates a durable `PENDING_CONFIRM` registration hold.
3. The attendee confirms terms and responsibility.
4. The runtime decides between:
   - no online payment required: registration becomes confirmed immediately
   - online amount required: registration moves into payment flow
5. Stripe Checkout or preview payment completes.
6. Webhook or success-page resolution updates the payment ledger and registration status.
7. Confirmation emails and audit entries are recorded.

Default timing rules live in [`lib/passreserve-config.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-config.js):

- hold duration: `30` minutes
- payment window: `12` hours

## Organizer operations flow

Organizer admins can:

- sign in with `email + password`
- request password resets
- create and edit event types
- create, publish, update, and cancel occurrences
- review registrations
- mark attendee outcomes
- record venue-side payments and balances

## Platform operations flow

Platform admins can:

- sign in with `email + password`
- request password resets
- review and approve organizer join requests
- create organizers manually
- edit site settings
- edit about-page content
- edit email templates
- inspect logs and environment health summaries

## Deployment model

The canonical deployment target is Vercel.

Production expectations:

- PostgreSQL enabled through `DATABASE_URL`
- checked-in Prisma migration applied with `npm run db:migrate`
- Stripe secrets and webhook configured
- Resend configured with a verified sender domain
- `NEXT_PUBLIC_BASE_URL` set to the real public domain

Preview expectations:

- the app can render and function without `DATABASE_URL`, but preview state is ephemeral on Vercel
- previews are useful for UI and route validation, not as durable production instances
