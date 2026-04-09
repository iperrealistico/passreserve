# Passreserve.com

Passreserve.com is the active event-platform workspace for the `gatherpass` repository. The public product name is `Passreserve.com`; `GATHERPASS` remains the internal codename only.

This app is a Next.js App Router monolith that currently ships a sample-data but end-to-end Passreserve experience:

- public discovery at `/`
- organizer hubs at `/{slug}`
- event detail and registration routes at `/{slug}/events/[eventSlug]`
- organizer admin routes at `/{slug}/admin/...`
- platform-admin routes at `/admin/...`
- Stripe-aware registration preview flows and webhook handling

The legacy MTB Reserve snapshot under [`unpacked/mtb-reserve`](/Users/leonardofiori/Documents/Antigravity/gatherpass/unpacked/mtb-reserve) is reference-only and must not be treated as the active Git workspace.

## Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run verify`

`npm run verify` is the local Phase 12 baseline. It runs linting, unit tests, a production build, and a built-app smoke check across key public and admin routes.

## Local verification

The smoke suite starts the built app on an ephemeral local port and verifies:

- the Passreserve homepage and about page
- a live organizer hub
- a live event detail route
- the attendee registration entry route
- organizer-admin redirect and dashboard routes
- the platform-admin login route
- the Stripe webhook route behavior for the current local env

## Environment notes

The app can run in preview mode without live Stripe credentials. To enable live Checkout and trusted webhook verification, provide:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY_DEFAULT`
- `NEXT_PUBLIC_BASE_URL`

Without those values, the registration flow stays honest and uses Passreserve preview payment routes instead of live provider handoff.

## Deployment rule

Vercel is the canonical deployment target. A successful local build does not replace deployment verification: every push must still be checked on Vercel before work is considered complete.

## Project protocol

Future AI agents must begin with:

1. [`000_START_HERE_AI.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/000_START_HERE_AI.md)
2. [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
3. [`patch-notes/README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes/README.md)

Then they must read the remaining required docs in the mandated order before making implementation changes.
