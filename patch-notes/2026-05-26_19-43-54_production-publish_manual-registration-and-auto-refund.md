# Patch Note

- **Timestamp:** `2026-05-26 19:43 CEST`
- **Scope:** Production publish closeout for organizer manual registration and Stripe auto-refund rollout
- **Related plans:**
  - [10_ORGANIZER_MANUAL_REGISTRATION_PLAN.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/10_ORGANIZER_MANUAL_REGISTRATION_PLAN.md)
  - [11_STRIPE_AUTO_REFUND_ON_CANCELLATION_PLAN.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/11_STRIPE_AUTO_REFUND_ON_CANCELLATION_PLAN.md)
  - [12_STRIPE_AND_PAYMENTS_READINESS_PLAN.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/12_STRIPE_AND_PAYMENTS_READINESS_PLAN.md)

## What shipped

- Published commit `8d58160` (`feat: ship organizer registrations and auto refunds`) to `origin/main`.
- Verified Vercel production deployment `dpl_FdhQEjMtCBzWD81XopxChjfCHb1L` reached `READY` for:
  - `passreserve.com`
  - `passreserve.vercel.app`
  - `passreserve-iperrealisticos-projects.vercel.app`
  - `passreserve-git-main-iperrealisticos-projects.vercel.app`
- Confirmed live `200` responses for:
  - `/`
  - `/events`
  - `/organizer-access`
  - `/sillico/admin/login`
- Confirmed unauthenticated access to `/sillico/admin/registrations/new` redirects to the organizer login page as expected.

## Local verification before publish

- Rebased the rollout on top of already-live commits `4547a69` and `402ce0e`.
- Re-ran `npm run verify` successfully on the rebased tree.
- Final local gate included:
  - ESLint
  - `vitest` with `94` passing assertions
  - copy audit
  - Prisma client generation
  - production `next build`
  - smoke script

## Production config findings

- The canonical Vercel Production environment currently exposes `NEXT_PUBLIC_BASE_URL`.
- `DATABASE_URL` is configured as an empty string in Production.
- `STRIPE_SECRET_KEY` is not configured in Production.
- `STRIPE_WEBHOOK_SECRET` is not configured in Production.

## Outcome

- The organizer manual-registration code and auto-refund code are now live in production.
- Public and organizer access routes render correctly after deployment.
- Stripe Connect onboarding and automatic live refunds remain blocked by missing Vercel server-side secrets, not by the shipped application code.
