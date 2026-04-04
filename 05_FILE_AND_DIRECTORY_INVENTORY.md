# File And Directory Inventory

This document is the human-readable interpretation of the repository layout.

Two machine-generated manifests are the definitive exhaustive lists:

- `manifests/tracked-files.txt`
- `manifests/tracked-files-line-counts.tsv`

If you need the exact all-files directory snapshot, use:

- `manifests/full-directory-files.txt`

## Repository shape at a glance

Tracked files by top-level path:

- `app`: 80
- `components`: 22
- `public`: 18
- `lib`: 14
- `scripts`: 11
- `test`: 6
- `prisma`: 3
- root-level docs/config/files: remaining tracked files

## Root documentation and metadata files

### `.gitignore`

Defines the expected ignored categories:

- env files
- node modules
- build output
- Vercel output
- TypeScript build info
- `next-env.d.ts`

This is important because the physical directory currently contains many ignored files that are still present on disk.

### `README.md`

Outdated default create-next-app README. It does not describe the real product and should not be used as the primary explanation of the repository.

### `SETUP.md`

Useful environment and onboarding guide:

- env vars
- super-admin setup
- tenant onboarding
- deployment notes

### `TESTING.md`

Intent document for:

- unit tests
- integration tests
- E2E tests

Important caveat:

- the file describes more testing surface than the tracked test suite actually contains today.

### `SECURITY_HARDENING.md`

Security policy/intention document:

- threat model
- rate-limit goals
- access control ideas
- logging expectations

Useful, but partially ahead of or slightly divergent from current implementation details.

### `OBSERVABILITY.md`

Describes the intended logging model and matches the spirit of `lib/events.ts` closely.

### `DESIGN_SYSTEM.md`

High-level visual/interaction intent:

- typography
- colors
- motion
- sound UX
- protected-action flow

Important caveat:

- the actual app partially follows this, but not perfectly.

### `OPERATIONS_HUB.md`

Implementation note / feature milestone summary. Useful for change-history context, not a full operating manual.

### `calendar_plan.md`

Planning note for the tenant admin calendar feature. Helpful as design intent, not a live source of truth.

### `lint-results.json`

Tracked lint output artifact. This is a snapshot artifact, not runtime code. It is useful as evidence that the repo has carried lint debt across iterations.

### Config files

- `package.json`
  - scripts, dependencies, dev dependencies
- `package-lock.json`
  - exact npm dependency lock
- `next.config.ts`
  - Next runtime configuration and remote image rules
- `middleware.ts`
  - security headers and CSP
- `tsconfig.json`
  - TS compiler configuration
- `vitest.config.ts`
  - unit/integration test runner config
- `eslint.config.mjs`
  - ESLint setup
- `postcss.config.mjs`
  - Tailwind/PostCSS integration
- `prisma.config.ts`
  - Prisma datasource URL resolution
- `components.json`
  - shadcn-style component registry metadata

## `app/` directory

This is the primary route tree.

## Root app files

- `app/layout.tsx`
  - root HTML shell, fonts, dynamic metadata, toaster, click-sound listener
- `app/page.tsx`
  - split landing page for riders and partner shops
- `app/actions.ts`
  - join-request submission action
- `app/icon.tsx`
  - dynamic favicon endpoint backed by DB/blob settings
- `app/apple-icon.tsx`
  - Apple icon endpoint backed by DB/blob settings
- `app/globals.css`
  - global styles and Tailwind layer file
- `app/favicon.ico`
  - static favicon asset
- `app/playground/page.tsx`
  - internal UI playground / visual verification screen

## Public tenant booking area: `app/[slug]/`

- `app/[slug]/page.tsx`
  - public booking storefront
- `app/[slug]/actions.ts`
  - public availability and booking request server actions
- `app/[slug]/booking/confirm/actions.ts`
  - booking confirmation server action
- `app/[slug]/booking/confirm/[token]/page.tsx`
  - confirmation page
- `app/[slug]/booking/confirm/[token]/confirmation-form.tsx`
  - confirmation client form

## Tenant admin area: `app/[slug]/admin/`

### Login and auth flow

- `app/[slug]/admin/page.tsx`
  - redirector to login or dashboard
- `app/[slug]/admin/login/page.tsx`
  - login page
- `app/[slug]/admin/login/actions.ts`
  - tenant login and logout actions
- `app/[slug]/admin/login/login-form.tsx`
  - tenant login client form

### Password recovery

- `app/[slug]/admin/forgot-password/page.tsx`
  - forgot-password entry page
- `app/[slug]/admin/forgot-password/actions.ts`
  - forgot-password request action
- `app/[slug]/admin/forgot-password/forgot-password-form.tsx`
  - forgot-password form UI
- `app/[slug]/admin/forgot-password/sent/page.tsx`
  - generic success page
- `app/[slug]/admin/reset-password/page.tsx`
  - reset-password page
- `app/[slug]/admin/reset-password/actions.ts`
  - reset-password mutation
- `app/[slug]/admin/reset-password/reset-form.tsx`
  - reset UI
- `app/[slug]/admin/reset-password/placeholder.tsx`
  - leftover/orphaned development placeholder component

### Protected tenant admin shell

- `app/[slug]/admin/(protected)/layout.tsx`
  - auth gate and layout
- `app/[slug]/admin/(protected)/nav.tsx`
  - tenant admin navigation bar

### Dashboard

- `app/[slug]/admin/(protected)/dashboard/page.tsx`
  - dashboard data load and stats cards
- `app/[slug]/admin/(protected)/dashboard/actions.ts`
  - booking status mutation actions
- `app/[slug]/admin/(protected)/dashboard/booking-list.tsx`
  - booking table UI

### Calendar

- `app/[slug]/admin/(protected)/calendar/page.tsx`
  - day-view route
- `app/[slug]/admin/(protected)/calendar/actions.ts`
  - daily booking fetch action
- `app/[slug]/admin/(protected)/calendar/calendar-view.tsx`
  - day-picker and booking list UI

### Inventory

- `app/[slug]/admin/(protected)/inventory/page.tsx`
  - bike-type inventory UI
- `app/[slug]/admin/(protected)/inventory/actions.ts`
  - create/update/delete bike type actions
- `app/[slug]/admin/(protected)/inventory/delete-bike-form.tsx`
  - deletion form with confirmation

### Settings and security

- `app/[slug]/admin/(protected)/settings/page.tsx`
  - tabbed general/security settings page
- `app/[slug]/admin/(protected)/settings/actions.ts`
  - tenant settings update and password change actions
- `app/[slug]/admin/(protected)/settings/settings-form.tsx`
  - general settings UI
- `app/[slug]/admin/(protected)/settings/password-change-form.tsx`
  - password change UI
- `app/[slug]/admin/(protected)/settings/password-strength-meter.tsx`
  - reusable live password-strength UI

## Marketing/about area: `app/about/`

- `app/about/page.tsx`
  - about-page assembly and metadata
- `app/about/components/HeroSection.tsx`
  - top hero
- `app/about/components/WhatIsSection.tsx`
  - explanatory content
- `app/about/components/HowItWorksRiders.tsx`
  - rider process and confirmation explanation
- `app/about/components/HowItWorksShops.tsx`
  - shop/admin features and settings
- `app/about/components/ComparisonTable.tsx`
  - competitor comparison and problems section
- `app/about/components/WhyFreeSection.tsx`
  - monetization and no-payments argument
- `app/about/components/SetupGuideSection.tsx`
  - onboarding and availability explanation
- `app/about/components/NicheAndLocationsSection.tsx`
  - specialization and location content
- `app/about/components/FAQSection.tsx`
  - rider and shop FAQ split
- `app/about/components/CTASection.tsx`
  - final conversion CTA
- `app/about/components/PhotoPlaceholder.tsx`
  - fallback placeholder component for missing images

## Super-admin area: `app/admin/`

### Shell and login

- `app/admin/layout.tsx`
  - super-admin layout shell
- `app/admin/login/page.tsx`
  - super-admin login page
- `app/admin/login/actions.ts`
  - super-admin login action

### Protected super-admin shell

- `app/admin/(authenticated)/layout.tsx`
  - super-admin auth gate and layout
- `app/admin/(authenticated)/nav.tsx`
  - super-admin navigation
- `app/admin/(authenticated)/page.tsx`
  - tenant list dashboard
- `app/admin/(authenticated)/actions.ts`
  - tenant creation, update, email, reset, delete support actions

### Tenant-management pages

- `app/admin/(authenticated)/tenants/new/page.tsx`
  - create tenant form
- `app/admin/(authenticated)/tenants/[slug]/page.tsx`
  - tenant detail page
- `app/admin/(authenticated)/tenants/[slug]/detail-form.tsx`
  - edit tenant basic details
- `app/admin/(authenticated)/tenants/[slug]/emailer.tsx`
  - manual email form to tenant admin
- `app/admin/(authenticated)/tenants/[slug]/password-reset.tsx`
  - forced tenant password reset UI

### Global settings

- `app/admin/(authenticated)/settings/page.tsx`
  - global settings page
- `app/admin/(authenticated)/settings/actions.ts`
  - global settings upload/save actions and super-admin password change
- `app/admin/(authenticated)/settings/settings-form.tsx`
  - global settings UI

### About CMS

- `app/admin/(authenticated)/about/page.tsx`
  - about CMS entry page
- `app/admin/(authenticated)/about/actions.ts`
  - save and rebuild action
- `app/admin/(authenticated)/about/about-form.tsx`
  - structured about-page editor

### Email console

- `app/admin/(authenticated)/emails/page.tsx`
  - email console route
- `app/admin/(authenticated)/emails/actions.ts`
  - template read/write actions
- `app/admin/(authenticated)/emails/inbox-actions.ts`
  - signup-request inbox actions
- `app/admin/(authenticated)/emails/inbox-client.tsx`
  - inbox UI
- `app/admin/(authenticated)/emails/template-manager.tsx`
  - email-template editor UI
- `app/admin/(authenticated)/emails/rich-text-editor.tsx`
  - TipTap editor

### Logs and health

- `app/admin/(authenticated)/logs/page.tsx`
  - event-log list and filters
- `app/admin/(authenticated)/logs/logs-table.tsx`
  - log table and modal details view
- `app/admin/(authenticated)/health/page.tsx`
  - health dashboard / ops summary

## `components/` directory

## Booking feature components

- `components/booking/booking-wizard.tsx`
  - multi-step public booking flow
- `components/booking/booking-stepper.tsx`
  - booking progress indicator
- `components/booking/summary-card.tsx`
  - booking summary sidebar

## Admin feature components

- `components/admin/booking-actions.tsx`
  - reusable booking action dropdown/dialogs

## Global utility component

- `components/GlobalClickListener.tsx`
  - global synthesized click-sound listener

## UI primitives in `components/ui/`

These are mostly reusable wrappers around Radix/shadcn patterns:

- `alert-dialog.tsx`
- `badge.tsx`
- `button.tsx`
- `calendar.tsx`
- `card.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `form.tsx`
- `input.tsx`
- `label.tsx`
- `popover.tsx`
- `select.tsx`
- `sheet.tsx`
- `skeleton.tsx`
- `sonner.tsx`
- `table.tsx`
- `textarea.tsx`

These files are not the domain logic, but they shape the visual and interaction consistency across the product.

## `lib/` directory

This directory contains the true business and infrastructure core.

- `lib/db.ts`
  - Prisma and PostgreSQL bootstrap
- `lib/auth.ts`
  - sessions, password hashing, secure password generation, auth guards
- `lib/availability.ts`
  - stock and overlap logic
- `lib/blocked-dates.ts`
  - blocked-date and booking-window logic
- `lib/tenants.ts`
  - tenant fetch and settings helpers
- `lib/site-settings.ts`
  - global settings and booking-code generation
- `lib/events.ts`
  - event logging and metadata sanitization
- `lib/email.ts`
  - transactional email system
- `lib/time.ts`
  - timezone-aware wall-clock-to-UTC conversion
- `lib/schemas.ts`
  - booking Zod schema
- `lib/utils.ts`
  - utility class merging
- `lib/sound.ts`
  - Web Audio click/success/error/pop synthesis
- `lib/about-content.ts`
  - about-page types, defaults, persistence, rebuild hook

## `prisma/` directory

- `prisma/schema.prisma`
  - full DB model
- `prisma/seed.ts`
  - richer seed including tenant and super admin
- `prisma/seed-simple.ts`
  - simpler seed path

Important architectural note:

- there is no tracked Prisma migrations folder,
- the repo is using schema + push style rather than migrations-in-repo as the main checked-in story.

## `public/` directory

### Generic assets

- `public/favicon.ico`
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`

Some of these are clearly inherited/default starter assets rather than central product assets.

### About-page image assets

The about-page experience depends heavily on `public/images/about/`.

Tracked image set:

- `mtb-reserve-bike-renting-system-1.jpeg`
- `mtb-reserve-bike-renting-system-2.jpeg`
- `mtb-reserve-bike-renting-system-3.jpeg`
- `mtb-reserve-bike-renting-system-4.jpeg`
- `mtb-reserve-bike-renting-system-5.jpeg`
- `mtb-reserve-bike-renting-system-6.jpeg`
- `ui-confirmed.png`
- `ui-dashboard.png`
- `ui-find-a-ride.png`
- `ui-inventory.png`
- `ui-overlap-efficiency.png`
- `ui-steps.png`

Detailed file sizes and dimensions are in:

- `manifests/about-assets.tsv`

## `scripts/` directory

These are operational support scripts, not runtime web routes.

- `create-super-admin.ts`
  - create or update super admin manually from CLI
- `reset-admin-password.ts`
  - reset super-admin password and print it
- `reset-admin-direct.js`
  - direct-SQL version of admin reset
- `seed-sql.ts`
  - SQL seeding alternative
- `diagnose-db.ts`
  - DB connectivity and super-admin diagnostic
- `debug-inventory.ts`
  - targeted inventory debug script
- `verify-availability.ts`
  - live availability verification script
- `verify-calendar.ts`
  - calendar-action verification script
- `verify-settings.ts`
  - settings-action verification script
- `verify-slots.ts`
  - slot-computation verification script
- `verify-timezone.ts`
  - timezone conversion verification script

These scripts show a hands-on debugging culture. The team has used scripts extensively to prove individual behaviors.

## `test/` directory

- `test/setup.ts`
  - global test mocks
- `test/unit/admin-actions.test.ts`
  - auth guard on inventory action
- `test/unit/availability.test.ts`
  - availability edge case
- `test/unit/confirm.test.ts`
  - booking confirmation expiration behavior
- `test/unit/password.test.ts`
  - secure password generation
- `test/unit/slots.test.ts`
  - computed slot behavior

Important absence:

- `test/integration/` exists as a directory but has no tracked test files.

## Ignored-but-present classes of files

These are not tracked source, but they are physically present in the directory snapshot:

- `.env`
- `.env.local`
- `.next/`
- `.vercel/`
- `node_modules/`
- `.git/`
- `.DS_Store` files
- `next-env.d.ts`
- `tsconfig.tsbuildinfo`

Those are cataloged in:

- `manifests/full-directory-files.txt`
- `manifests/working-tree-status.txt`
- `manifests/env-key-names.txt`
- `manifests/directory-sizes.txt`

## Best way to use this inventory

If you are trying to understand the product quickly:

1. read `lib/`
2. read public booking routes
3. read tenant admin routes
4. read super-admin routes
5. use the manifests for exact file lookup

If you are trying to audit what physically exists on disk:

1. read `07_SHARING_AND_ARTIFACTS.md`
2. open `manifests/full-directory-files.txt`
3. inspect the zip archive contents directly
