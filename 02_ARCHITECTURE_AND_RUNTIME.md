# Architecture And Runtime

## High-level shape

This is a Next.js App Router monolith. The frontend, backend, persistence access, email sending, and most operational logic live in one repository and one deployment unit.

The major layers are:

- `app/`
  - routes, layouts, pages, and server actions
- `components/`
  - reusable UI and feature components
- `lib/`
  - infrastructure helpers and business logic
- `prisma/`
  - schema and seeds
- `scripts/`
  - operational and debugging scripts
- `test/`
  - unit-test scaffolding

## Technology stack

### Core runtime

- Next.js `16.1.6`
- React `19.2.3`
- TypeScript `5`
- App Router with server components and server actions

### Persistence

- Prisma `7.3.0`
- PostgreSQL
- Prisma pg adapter: `@prisma/adapter-pg`
- Raw `pg` pool under the Prisma adapter

### Auth and session

- `iron-session`
- bcrypt password hashing
- session cookie named `mtbr_session`

### UI

- Tailwind CSS v4
- shadcn/Radix-style component wrappers in `components/ui`
- Lucide icons
- TipTap rich-text editor for email templates
- Sonner toast notifications
- React Day Picker calendar

### External services

- Resend for transactional email
- Vercel Blob for uploaded favicon and social images
- Optional Vercel deploy hook for about-page rebuilds

### Observability and rate limiting

- Event logs stored in Postgres (`EventLog`)
- structured JSON logging to stdout/stderr
- rate limiting stored in Postgres (`RateLimit`)

## Architectural decisions that matter

## 1. No traditional API-first split

Most mutations and "backend endpoints" are implemented as server actions rather than REST or RPC endpoints.

Examples:

- `app/[slug]/actions.ts`
- `app/[slug]/booking/confirm/actions.ts`
- `app/[slug]/admin/(protected)/inventory/actions.ts`
- `app/admin/(authenticated)/actions.ts`
- `app/admin/(authenticated)/settings/actions.ts`

Practical consequence:

- the app is easy to trace from UI to mutation,
- but server-action sprawl is part of the architecture,
- and testing/mocking is more coupled to framework conventions.

## 2. Multi-tenancy is slug-based

The tenant is a first-class concept with `slug` as primary key.

That slug drives:

- public route resolution,
- tenant admin access scoping,
- data filtering,
- tenant settings lookup,
- email tags and event log tenancy metadata.

This is simple and effective, but it also means:

- there is no abstraction for cross-tenant admin isolation beyond slug checks,
- route correctness is essential to security and data isolation.

## 3. Tenant settings are JSON, not normalized tables

Operational shop settings live inside `Tenant.settings` JSON.

That JSON currently includes or has included:

- slots,
- full-day behavior,
- blocked dates and blocked ranges,
- advance booking rules,
- public content text,
- pickup location URL.

This is flexible and fast to evolve, but it shifts validation burden into application code.

## 4. Booking model is partially legacy-compatible

The database supports both:

- legacy single-bike booking fields on `Booking`
  - `bikeTypeId`
  - `quantity`
- newer multi-item booking through `BookingItem[]`

This dual model shows a refactor in progress:

- the system now supports mixed multi-bike requests,
- but legacy fields are still preserved and still referenced in several places.

## 5. Content and operational CMS lives in the database

Several "content" domains are persisted in tables rather than files:

- `SystemSettings`
- `EmailTemplate`
- `AboutPageContent`

This makes the application partly CMS-driven even though it is not using an external CMS.

## Route topology

## Public routes

- `/`
  - landing page and partner join request modal
- `/about`
  - SEO-heavy marketing page
- `/{slug}`
  - tenant booking storefront
- `/{slug}/booking/confirm/{token}`
  - pending booking confirmation flow

## Tenant-admin routes

- `/{slug}/admin`
  - redirector
- `/{slug}/admin/login`
  - tenant login
- `/{slug}/admin/forgot-password`
  - request reset link
- `/{slug}/admin/forgot-password/sent`
  - generic success page
- `/{slug}/admin/reset-password?token=...`
  - generate new password from token
- `/{slug}/admin/dashboard`
  - booking dashboard
- `/{slug}/admin/calendar`
  - per-day booking view
- `/{slug}/admin/inventory`
  - bike type and stock management
- `/{slug}/admin/settings`
  - general settings and security

## Super-admin routes

- `/admin/login`
  - super-admin login
- `/admin`
  - tenant list dashboard
- `/admin/tenants/new`
  - create tenant
- `/admin/tenants/{slug}`
  - tenant detail / support actions
- `/admin/settings`
  - global SEO and asset settings
- `/admin/about`
  - about-page editor
- `/admin/emails`
  - delivery logs, inbox, template editor
- `/admin/logs`
  - event log viewer
- `/admin/health`
  - health/ops page

## Request and mutation flows

## Public booking request flow

1. Rider opens `/{slug}`.
2. Server component loads tenant via `getTenantBySlug`.
3. Client `BookingWizard` asks `getAvailabilityAction(slug, date)`.
4. Action computes slot list and availability using:
   - `getComputedSlots`
   - `getTenantSettings`
   - `getBikeAvailability`
5. Rider submits details.
6. `submitBookingAction`:
   - rate-limits by IP,
   - validates form data with Zod,
   - resolves slot start/end in tenant timezone,
   - checks stock inside a transaction,
   - creates a `PENDING_CONFIRM` booking and related `BookingItem`s,
   - creates a 30-minute confirmation token,
   - sends confirmation email,
   - logs `BOOKING_REQUESTED`.

## Booking confirmation flow

1. User clicks email link to `/{slug}/booking/confirm/{token}`.
2. Page loads booking by `confirmationToken`.
3. User accepts terms and responsibility declaration.
4. `confirmBookingAction`:
   - rate-limits by IP,
   - verifies token and booking state,
   - rejects expired pending bookings,
   - rechecks stock inside a transaction,
   - generates unique `bookingCode`,
   - marks booking `CONFIRMED`,
   - logs `BOOKING_CONFIRMED`,
   - sends recap email to rider,
   - sends notification email to tenant admin.

## Tenant login flow

1. User opens `/{slug}/admin/login`.
2. Login form sends `slug` + `password`.
3. `loginAction`:
   - rate-limits by IP,
   - fetches tenant by slug,
   - bcrypt-compares password,
   - creates iron-session with `tenantSlug`, `isLoggedIn`, `tokenVersion`,
   - redirects to `/{slug}/admin/dashboard`.

Notable design detail:

- login is slug + password only,
- not email + password.

## Tenant password reset flow

1. User enters email on `/{slug}/admin/forgot-password`.
2. Action checks that email matches `Tenant.registrationEmail`.
3. A `passwordResetToken` and expiry are written to the tenant row.
4. Email link is sent.
5. Visiting `/{slug}/admin/reset-password?token=...` shows a single button.
6. Submitting it generates a brand-new secure password server-side, stores its hash, invalidates sessions via `tokenVersion`, and emails the new password.

This flow is intentionally password-generation based, not user-entered password reset.

## Super-admin tenant creation flow

1. Super admin creates tenant in `/admin/tenants/new`.
2. `createTenantAction`:
   - validates required fields,
   - ensures slug uniqueness,
   - generates a memorable password,
   - hashes it,
   - creates tenant with default settings,
   - emails credentials to the contact email,
   - redirects to tenant detail page.

## About-page CMS flow

1. Super admin edits `/admin/about`.
2. Edited JSON structure is saved to `AboutPageContent`.
3. `triggerRebuild()` optionally fires a Vercel deploy hook.
4. `/about` is revalidated locally.

This is necessary because `/about` is treated as a static page from the runtime's perspective and depends on rebuild-style refresh behavior.

## Email-template flow

1. Super admin selects a template scenario in `/admin/emails?tab=templates`.
2. Subject/body/sender settings are stored in `EmailTemplate`.
3. `lib/email.ts` loads the template by id when sending.
4. Placeholder replacement is done at send time.

## Shared infrastructure modules

## `lib/db.ts`

Central DB bootstrap:

- builds connection string from several env fallbacks,
- strips `sslmode` from URL so explicit SSL config wins,
- uses a single global `pg` pool and global Prisma client,
- caps pool size at `max: 1` to protect Neon-like serverless limits.

## `lib/auth.ts`

Central auth/session layer:

- session typing,
- iron-session config,
- password hashing/verification,
- memorable password generation,
- authenticated access guard with tenant/super-admin token-version checks.

## `lib/availability.ts`

Central booking math:

- blocked-date enforcement,
- booking-window enforcement,
- overlap detection through `BookingItem.aggregate`,
- stock minus broken minus booked calculation,
- detailed availability result helpers.

## `lib/tenants.ts`

Tenant settings and slot helpers:

- typed interfaces for `TenantSettings`, `TenantSlot`, and blocked ranges,
- default slot definitions,
- computed full-day slot generation,
- cached tenant fetch.

## `lib/email.ts`

Mail transport abstraction:

- template loading from DB,
- placeholder interpolation,
- mock mode if email is disabled or no API key exists,
- wrappers for booking confirmation, recap, admin notifications, signup requests, and status changes,
- every send attempt logged through `logEvent`.

## `lib/events.ts`

Audit and observability layer:

- metadata sanitization,
- IP hashing,
- DB persistence in `EventLog`,
- JSON console emission for platform log drains.

## `lib/site-settings.ts`

Global platform settings:

- SEO title/description/keywords,
- favicon/social image URLs,
- admin-notification email,
- booking-code generation helpers.

## `lib/about-content.ts`

Structured long-form marketing content:

- TypeScript interfaces for each about-page section,
- a large default content object,
- DB persistence helpers,
- rebuild-trigger integration.

## Security and runtime middleware

`middleware.ts` applies:

- CSP,
- frame denial,
- content-type protection,
- referrer policy,
- permissions policy,
- HSTS,
- per-request nonce header.

Important nuance:

- a nonce is generated and added to headers,
- but the CSP still allows `'unsafe-inline'` and `'unsafe-eval'`,
- so the nonce is not currently the central CSP enforcement mechanism.

## Caching and invalidation

The app uses a mix of:

- React request-scope caching (`cache(async ...)`),
- server component fetch-time rendering,
- `revalidatePath(...)` after server mutations,
- explicit rebuild triggering for the static about page.

This is workable, but it means some content consistency depends on the caller remembering to invalidate the right path.

## Physical directory vs logical application

This is worth stating explicitly:

- the application logic is relatively compact,
- the working directory is very large because it includes install/build/runtime artifacts.

Directory sizes at snapshot time:

- whole directory: `1.3G`
- `.git`: `17M`
- `.next`: `389M`
- `node_modules`: `891M`
- `public`: `9.4M`
- `app`: `548K`
- `components`: `144K`
- `lib`: `104K`

That asymmetry matters for handoff:

- understanding the repo means understanding the tracked app,
- archiving the repo means carrying a lot more than just the app.
