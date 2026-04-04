# Executive Summary

## One-sentence description

MTB Reserve is a multi-tenant bike-rental reservation platform built with Next.js, Prisma, PostgreSQL, and server actions, with three user surfaces: public riders, tenant rental shops, and a global super-admin console.

## What the product is trying to do

At a product level, the repository implements a lightweight SaaS-style booking system for mountain-bike and e-bike rental businesses. The key idea is:

- riders can reserve bikes online without upfront payment,
- shops can manage inventory, schedules, blocked dates, and bookings,
- a super admin can create tenants, customize global content and email templates, and inspect operational logs.

The system is opinionated toward the MTB rental use case rather than generic equipment rental:

- slot-based booking instead of arbitrary datetime pickers,
- multi-bike quantity booking,
- broken-bike stock deduction,
- pending booking confirmation with expiry,
- pay-at-pickup instead of online payment processing,
- shop-specific public storefronts under `/{slug}`,
- shop-specific admin panels under `/{slug}/admin/...`.

## What state the codebase is in

This is not a toy demo anymore, but it is also not a fully hardened, fully cleaned production platform. The best description is:

- functionally substantial,
- visibly iterative,
- operationally plausible,
- quality-wise uneven.

Why that assessment is fair:

- The product has real end-to-end flows:
  - tenant onboarding,
  - booking request,
  - email confirmation,
  - booking confirmation,
  - tenant inventory/settings/admin screens,
  - super-admin CMS/email/log/health views.
- The domain model is coherent:
  - `Tenant`, `BikeType`, `Booking`, `BookingItem`, `SuperAdmin`, `EventLog`, `EmailTemplate`, `SystemSettings`, `SignupRequest`, `AboutPageContent`.
- The codebase uses proper server-side persistence and auth:
  - Prisma + PostgreSQL,
  - iron-session cookies,
  - rate limiting,
  - event logging,
  - token-version invalidation.
- But it also has visible maintenance debt:
  - default Next.js README is still in place and no longer describes the actual system,
  - lint currently fails heavily,
  - one unit test currently fails,
  - some docs describe older or partially superseded behavior,
  - some feature settings are stored but not actually consumed everywhere at runtime.

## What the user-facing product currently includes

### Public surface

- A dual-purpose landing page at `/`
  - rider search side
  - shop/partner join-request side
- A long-form marketing/about page at `/about`
  - image-heavy SEO page
  - editable via super admin
- Public tenant storefront at `/{slug}`
  - tenant name and contact info
  - info box from tenant settings
  - booking wizard
- Booking confirmation page at `/{slug}/booking/confirm/{token}`
  - pending booking confirmation
  - final booking code issuance

### Tenant admin surface

- Login and password reset
- Dashboard with bookings overview
- Calendar day view
- Inventory management
- Settings:
  - contact info,
  - booking slots,
  - blocked date ranges,
  - advance notice,
  - booking page content fields,
  - pickup location,
  - account password change

### Super admin surface

- Single-password super-admin login
- Tenant creation and management
- Tenant password reset and manual email
- Global site SEO/settings and asset uploads
- About-page CMS editor
- Email template management
- Signup request inbox
- Event logs
- Health/ops view

## What makes the implementation distinctive

The most important architectural choice is that this app does not rely on classic REST API routes for most application behavior. Instead it uses:

- App Router pages,
- server components,
- server actions for mutations and fetch helpers,
- direct Prisma usage in action handlers and server components.

This gives the codebase a "Next.js full-stack app" feel rather than a split frontend/backend architecture.

The second major design choice is multi-tenancy by URL slug rather than by organization selector or subdomain:

- public shop page: `/{slug}`
- tenant admin page: `/{slug}/admin/...`

That makes the repo easy to understand: almost every business operation is anchored to a `slug`.

## Overall maturity judgment

If someone asked "can this run a real small bike-rental operation?", the answer is yes, with caveats.

If someone asked "is this a cleanly finished SaaS codebase ready for long-term team scaling without refactor?", the answer is no, not yet.

The right mental model is:

- real product,
- early operational maturity,
- still carrying MVP-era shortcuts and documentation drift.

That combination is important for any handoff. The repo is worth taking seriously, but it should be taken over with the expectation of cleanup, typed hardening, and runtime consistency work.
