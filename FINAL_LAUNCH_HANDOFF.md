# Final Launch Handoff

## What is complete

Passreserve.com now has a production-shaped application runtime in this repository:

- public discovery, organizer hubs, event pages, and registration routes
- real organizer and platform admin authentication
- durable registration, payment, settings, CMS, and audit data
- Prisma schema plus checked-in migration
- Stripe Connect onboarding, organizer-owned Checkout, and webhook persistence
- Resend-backed email integration path
- organizer join-request approval flow
- organizer event, occurrence, registration, and payment operations
- organizer public-profile settings, booking-window controls, and password change
- platform settings, about-page, email-template, organizer, log, and health operations

## Runtime modes

### Production target

- PostgreSQL via Prisma
- Vercel deployment
- Stripe Connect platform secrets
- Resend delivery
- real custom domain

### Development and preview fallback

- if `DATABASE_URL` is absent, the app stores state in a file
- local path: `.runtime-data/passreserve-state.json`
- Vercel preview path: `/tmp/passreserve-state.json`

This fallback mode is intentional and useful, but it is not the intended final production persistence path.

## Required environment variables

Use [`.env.example`](/Users/leonardofiori/Documents/Antigravity/gatherpass/.env.example) as the template.

Required for production:

- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY_DEFAULT`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `IP_SALT`
- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_PASSWORD`

Optional:

- `PLATFORM_ADMIN_NAME`
- `PASSRESERVE_STATE_FILE`

## Local bootstrap behavior

If you run the app locally without a configured database, it seeds itself automatically.

Default local credentials:

- platform admin: `admin@passreserve.local`
- organizer admin pattern: `admin@{slug}.passreserve.local`
- default password: `Passreserve123!`

These are development-only defaults and must never be kept for production use.

## Local commands

- `npm install`
- `npm run dev`
- `npm run verify`

Database-backed setup:

1. Set env vars.
2. Run `npm run db:migrate`.
3. Optionally run `npm run db:seed`.
4. Run `npm run dev` or `npm run start`.

## Recommended launch sequence

1. Provision the production Postgres database.
2. Add all required env vars in Vercel.
3. Run Prisma migrations against production with `npm run db:migrate`.
4. Set the bootstrap platform admin email and password env vars.
5. Deploy the app on Vercel.
6. Confirm the platform admin can sign in.
7. Confirm organizer join requests can be submitted and approved.
8. Confirm an approved organizer can connect Stripe and publish a paid occurrence.
9. Confirm a published paid occurrence can complete organizer-owned Stripe Checkout and webhook reconciliation.
10. Confirm attendee emails and password-reset emails send through Resend.
11. Attach the final custom domain and set `NEXT_PUBLIC_BASE_URL`.

## What you still need to do

These are the owner-side tasks that cannot be completed from code alone:

1. Buy or connect the final domain and point DNS to Vercel.
2. Provision the production PostgreSQL database and set `DATABASE_URL`.
3. Use the platform Stripe account for Connect, create the production webhook endpoint for connected-account events, and configure the Stripe secrets in Vercel.
4. Connect Resend, verify the sender domain, and set `RESEND_API_KEY` and `FROM_EMAIL`.
5. Set a strong `SESSION_SECRET` and `IP_SALT`.
6. Decide the real bootstrap platform admin credentials and set them in Vercel.

## Launch smoke checklist

After secrets and DNS are in place, verify these flows on the real domain:

1. Open `/` and `/about`.
2. Submit an organizer join request.
3. Sign in at `/admin/login`.
4. Approve the join request or create an organizer manually.
5. Sign in at `/{slug}/admin/login`.
6. Connect Stripe from `/{slug}/admin/billing`.
7. Create or edit an event and publish an occurrence.
8. Register as an attendee on a free occurrence.
9. Register as an attendee on a paid occurrence.
10. Confirm Stripe webhook delivery updated the registration payment ledger.
11. Confirm attendee confirmation and password-reset emails are delivered.

## Useful file references

- [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
- [`prisma/schema.prisma`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/schema.prisma)
- [`prisma/migrations/20260411104000_init_passreserve_schema/migration.sql`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260411104000_init_passreserve_schema/migration.sql)
- [`prisma/migrations/20260411143000_add_stripe_connect_self_serve/migration.sql`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260411143000_add_stripe_connect_self_serve/migration.sql)
- [`lib/passreserve-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js)
- [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js)
- [`lib/passreserve-auth.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-auth.js)
- [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
