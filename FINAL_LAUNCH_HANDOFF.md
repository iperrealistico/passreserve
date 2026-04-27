# Final Launch Handoff

## What is complete

Passreserve.com now has a production-shaped application runtime in this repository:

- public discovery, organizer hubs, event pages, and registration routes
- real organizer and platform admin authentication
- durable registration, payment, settings, CMS, and audit data
- Prisma schema plus checked-in migration
- Stripe Connect onboarding, organizer-owned Checkout, and webhook persistence
- Resend-backed outbound email, inbound shared mailbox receiving, and attachment redirects
- automatic organizer application provisioning with duplicate-aware audit status and resend-access recovery
- organizer publication controls with private-by-default launch state and separate public slugs
- ALTCHA-protected organizer signup with server-side IP and email throttling
- organizer event, occurrence, registration, and payment operations
- organizer public-profile settings, booking-window controls, and password change
- platform settings, about-page, email-template, organizer, applications, mailbox, log, and health operations

## Runtime modes

### Production target

- PostgreSQL via Prisma
- Vercel deployment
- Stripe Connect platform secrets
- Resend delivery and receiving
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
- `RESEND_WEBHOOK_SECRET`
- `IP_SALT`
- `ALTCHA_HMAC_KEY`
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
   Use a `DATABASE_URL` that points Prisma at the `passreserve` schema on the shared Supabase/Postgres project.
2. Run `npm run db:migrate`.
3. Optionally run `npm run db:seed`.
4. Run `npm run dev` or `npm run start`.

## Recommended launch sequence

1. Provision the production Postgres database.
2. Add all required env vars in Vercel.
3. Run Prisma migrations against production with `npm run db:migrate`.
4. Set the bootstrap platform admin email and password env vars.
5. Connect Resend sending and receiving, point the shared `contact@` alias at Resend, set `FROM_EMAIL` to that alias, set `RESEND_WEBHOOK_SECRET`, and register `/api/resend/inbound` as the inbound webhook endpoint.
6. Deploy the app on Vercel.
7. Confirm the platform admin can sign in.
8. Confirm organizer join requests auto-provision a private organizer, send the organizer access email, and appear in `/admin/applications`.
9. Confirm platform admins can reply from `/admin/emails?tab=mailbox` and that inbound replies land in the shared mailbox.
10. Confirm a provisioned organizer can sign in, connect Stripe, choose a public slug, and publish a paid occurrence.
11. Confirm a published paid occurrence can complete organizer-owned Stripe Checkout and webhook reconciliation.
12. Confirm attendee emails, organizer access emails, and shared-mailbox replies send through Resend.
13. Attach the final custom domain and set `NEXT_PUBLIC_BASE_URL`.

## What you still need to do

These are the owner-side tasks that cannot be completed from code alone:

1. Buy or connect the final domain and point DNS to Vercel.
2. Provision the production PostgreSQL database and set `DATABASE_URL`.
3. Use the platform Stripe account for Connect, create the production webhook endpoint for connected-account events, and configure the Stripe secrets in Vercel.
4. Connect Resend, verify the sender and receiving domain setup, set `RESEND_API_KEY`, `FROM_EMAIL`, and `RESEND_WEBHOOK_SECRET`, and route the live `contact@` inbox to Resend receiving.
5. Set a strong `SESSION_SECRET`, `IP_SALT`, and `ALTCHA_HMAC_KEY`.
6. Decide the real bootstrap platform admin credentials and set them in Vercel.

## Launch smoke checklist

After secrets and DNS are in place, verify these flows on the real domain:

1. Open `/` and `/about`.
2. Submit an organizer join request and confirm the generic success response appears only after ALTCHA verification succeeds.
3. Confirm the organizer receives the first-access email and platform admin receives the application alert.
4. Sign in at `/admin/login`.
5. Open `/admin/applications` and confirm the new application is marked provisioned or email-failed appropriately.
6. Send a test message to the live `contact@` inbox and confirm the thread appears at `/admin/emails?tab=mailbox`.
7. Open an inbound attachment from the shared mailbox and confirm the authenticated redirect downloads from Resend.
8. Sign in at `/{internalSlug}/admin/login`.
9. Set the organizer public slug, publish the organizer, and confirm `/{publicSlug}` resolves only after publication.
10. Connect Stripe from `/{internalSlug}/admin/billing`.
11. Create or edit an event and publish an occurrence.
12. Register as an attendee on a free occurrence.
13. Register as an attendee on a paid occurrence.
14. Confirm Stripe webhook delivery updated the registration payment ledger.
15. Confirm attendee confirmation, organizer access, and mailbox reply emails are delivered.

## Useful file references

- [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
- [`prisma/schema.prisma`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/schema.prisma)
- [`prisma/migrations/20260411104000_init_passreserve_schema/migration.sql`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260411104000_init_passreserve_schema/migration.sql)
- [`prisma/migrations/20260411143000_add_stripe_connect_self_serve/migration.sql`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260411143000_add_stripe_connect_self_serve/migration.sql)
- [`lib/passreserve-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js)
- [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js)
- [`lib/passreserve-auth.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-auth.js)
- [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
