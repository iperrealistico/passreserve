# Passreserve.com Transformation Plan

## Purpose of this document

This document explains how to transform the current MTB Reserve platform into a multi-tenant event-management and event-registration platform that feels like "Eventbrite in the MTB Reserve way":

- same overall architecture,
- same monolithic Next.js structure,
- same multi-tenant slug model,
- same super-admin and organizer-admin split,
- same lightweight server-action approach,
- same "simple, practical operations tool" philosophy,
- but reoriented around events instead of bike rentals.

This is intentionally a planning document only. It does not propose implementing anything yet.

## Proposed new product name

## Public name: Passreserve.com

## Internal codename: GATHERPASS

Naming convention for this project:

- public brand: `Passreserve.com`
- internal codename: `GATHERPASS`
- workspace / folder name: `gatherpass`

Suggested positioning:

- Product name: `Passreserve.com`
- Tagline: `Simple event booking, deposits, and organizer operations`

Suggested naming model inside the product:

- platform owner: `Passreserve.com`
- tenant: `Organizer`
- public tenant site: `Organizer page`
- bike type replacement: `Event type`
- booking replacement: `Registration`
- booking item replacement: `Registration item`

## Product vision

Passreserve.com should be a multi-tenant event platform for organizers, venues, activity providers, and local businesses that run recurring or seasonal events.

The product should support:

- multiple organizers,
- multiple event types per organizer,
- multiple scheduled occurrences per event type across the year,
- public event discovery on each organizer page,
- event detail pages with presentation, photos, and full descriptions,
- attendee registration,
- optional online pre-payment from 0 percent to 100 percent,
- remainder due in person when relevant,
- organizer admin operations,
- super-admin management for the whole platform.

The goal is not to clone every Eventbrite feature. The goal is to build a cleaner, narrower, more operator-friendly platform using the strong parts of MTB Reserve:

- practical workflows,
- low-friction forms,
- tenant scoping by slug,
- simple back offices,
- durable server-side behavior,
- database-backed content and operations,
- no unnecessary microservice complexity.

## Core strategic recommendation

The best path is not a rewrite.

The best path is a staged domain transformation that preserves the infrastructure and replaces the bike-rental concepts with event concepts in layers.

That means:

1. keep the core app shell, stack, auth, tenanting, settings, admin surfaces, email system, logs, rate limiting, and design system;
2. replace the domain model gradually;
3. keep route topology familiar;
4. adapt the booking flow into a registration and payment flow;
5. add Stripe at the confirmation/payment stage;
6. remove bike-specific concepts only after the new event concepts are functioning.

This maximizes reuse and minimizes risk.

## What should remain almost unchanged

These are the strongest reusable assets in the current repository.

## 1. Overall tech stack

Keep:

- Next.js App Router
- React
- TypeScript
- Prisma
- PostgreSQL
- iron-session
- server actions
- Radix/shadcn-style UI layer
- Tailwind-based styling
- event logging
- rate limiting
- email infrastructure
- Vercel-friendly deployment model

This stack already matches the new product very well.

## 2. Multi-tenant architecture

Keep the slug-based model:

- public organizer site: `/{slug}`
- organizer admin: `/{slug}/admin/...`
- global platform admin: `/admin/...`

This is one of the cleanest parts of MTB Reserve and maps naturally to event organizers.

## 3. Authentication and sessions

Keep the existing auth/session pattern:

- organizer admin login
- super-admin login
- token-version session invalidation
- password reset patterns
- route-protected layouts

This can be mostly rebranded and lightly adapted.

## 4. Super-admin system

Keep the super-admin console concept almost intact:

- organizer creation
- organizer editing
- organizer password reset
- global settings
- email templates
- signup requests
- logs
- health view

Only the wording and the managed data need to change.

## 5. Observability and abuse controls

Keep:

- `EventLog`
- console JSON logs
- rate limiting
- audit-style metadata capture

An event platform needs this just as much as the bike platform does.

## 6. CMS-like content areas

Keep the DB-backed content strategy:

- global site settings
- about page content
- email templates

This is already useful for a rebranded event product.

## 7. Admin UX patterns

Keep the overall admin style:

- dashboard
- calendar view
- CRUD forms
- action menus
- settings tabs
- protected shell layouts

The structure is already right. The domain content needs to change.

## What should be transformed, not discarded

## 1. Tenant becomes Organizer

`Tenant` should become `Organizer` conceptually.

In an initial migration phase, it may still remain the `Tenant` table physically to reduce churn, but all user-facing language should move toward:

- organizer
- host
- venue partner

Eventually the schema should be renamed for clarity, but that does not have to happen on day one.

## 2. Booking becomes Registration

`Booking` maps very naturally to `Registration`.

Many existing fields remain useful:

- customer name
- customer email
- customer phone
- total price
- paid amount
- status
- confirmation token
- expiry timestamp
- timestamps

This is one of the biggest reuse opportunities in the whole system.

## 3. Booking items become registration items

`BookingItem` can become `RegistrationItem`.

Instead of representing multiple bike types in one booking, it can represent:

- ticket categories,
- attendee quantities,
- optional paid add-ons,
- bundled admission components.

Even if the first version only supports a single registration quantity, keeping the item model is future-friendly.

## 4. Inventory becomes event catalog and capacity management

The current inventory area should not be deleted outright. It should be transformed into the event-catalog management area.

What changes:

- `BikeType` no longer represents bookable equipment categories
- the screen becomes a place to create and manage `EventType` records

What remains conceptually similar:

- CRUD workflows
- stock-like arithmetic
- price editing
- availability concepts

In events, the equivalent of stock is capacity.

## 5. Availability engine becomes capacity engine

`lib/availability.ts` and related booking logic should evolve into event-capacity logic.

The core idea remains:

- count what is available,
- subtract what is already reserved or sold,
- avoid overbooking,
- respect expiry windows,
- support time-based inventory.

The difference is that capacity is attached to event occurrences, not bike categories and slots.

## What should be removed

These pieces are bike-rental-specific and should not survive into the final event product except as transitional implementation details.

- bike inventory semantics
- broken bike count
- pickup location URL as a bike-pickup concept
- slot overlap warnings as the primary scheduling model
- synthetic full-day slot logic
- hourly rental pricing as the primary pricing model
- booking copy that assumes physical bike handoff
- rider/shop language

Some of these can be replaced by equivalent event concepts:

- pickup location URL becomes venue map link
- hourly cost becomes ticket price or event price
- slot overlap UI becomes occurrence scheduling conflict detection

## New domain model

The best long-term event product needs a clearer domain than the bike-rental schema. The simplest high-quality model is:

## Organizer

Equivalent to today's tenant.

Suggested responsibilities:

- brand identity
- public organizer page
- organizer contact info
- timezone
- organizer settings
- admin login identity

Likely fields:

- slug
- name
- description
- logo or hero image
- public email
- public phone
- registration email
- timezone
- address
- social links
- settings JSON
- token version

## EventType

This is the core reusable event template.

Each organizer can have many event types.

Each event type should have its own:

- name
- short summary
- full description
- cover photo
- optional gallery
- category
- venue/location text
- map link
- duration defaults
- capacity defaults
- pricing defaults
- prepay percentage default
- visibility status
- organizer instructions
- attendee instructions
- cancellation policy

This is the biggest conceptual replacement for `BikeType`.

## EventOccurrence

This is a scheduled instance of an event type.

It should exist as a first-class table rather than trying to force all scheduling into tenant settings JSON.

Each occurrence should have:

- event type id
- organizer slug or organizer id
- start datetime
- end datetime
- status
- capacity override
- price override
- prepay percentage override
- published/unpublished flag
- sold out flag
- custom description override
- custom hero image override if needed

This table is essential because the user explicitly wants event types to have yearly calendar dates and times.

## Registration

Replacement for `Booking`.

Suggested fields:

- organizer id
- event occurrence id
- status
- registration code
- attendee name
- attendee email
- attendee phone
- quantity
- subtotal
- amount due online
- amount due at event
- paid amount
- currency
- confirmation token
- expires at
- confirmed at
- terms accepted at
- payment status
- Stripe session id
- Stripe payment intent id

## RegistrationItem

Optional but recommended from the beginning.

It allows:

- multiple ticket types,
- add-ons,
- quantity breakdown,
- future expansion.

Suggested fields:

- registration id
- ticket type label
- quantity
- unit price
- line total

## OrganizerSettings

This can still live in JSON in a transitional phase, but the contents should change.

Suggested organizer settings:

- organizer intro text
- organizer CTA text
- default confirmation email subject
- default reminder email subject
- organizer policy snippets
- refund policy text
- check-in instructions
- branding preferences
- default venue/map info
- Stripe configuration flags

## PaymentRecord

This can be its own table or be handled through richer fields on `Registration`.

A separate table is better long term if the system may later support:

- multiple payment attempts,
- refunds,
- manual reconciliation,
- partial captures,
- invoices,
- offline payments plus online payments.

## TicketCategory

Optional for phase 1, but recommended in the plan.

If you want each event occurrence to support multiple admission types, add:

- General admission
- VIP
- Child
- Early bird
- Member pricing

If phase 1 should stay lean, you can postpone this and use only one price per occurrence.

## Public product experience

The public side should keep the simplicity of MTB Reserve while becoming clearly event-driven.

## 1. Landing page

Keep the current split-journey philosophy, but rebrand it.

Left side:

- discover events
- search by organizer, city, or event keyword

Right side:

- organizers join the platform
- organizers log in

The current join-request modal can be reused with event-oriented copy.

## 2. Organizer public page: `/{slug}`

This route should become the organizer's public event hub.

Recommended content:

- organizer hero
- organizer description
- featured events
- yearly calendar or upcoming event calendar
- event-type cards
- organizer contact details
- venue/map info
- FAQ or policy section

This route already exists and should be repurposed, not removed.

## 3. Event type detail page

Add a dedicated event detail route, for example:

- `/{slug}/events/[eventSlug]`

This page should present:

- event cover image
- event summary
- full description
- who it is for
- venue information
- pricing model
- deposit model
- upcoming dates
- CTA to register

This is where the platform starts to feel like an event product rather than a reservation tool.

## 4. Event occurrence registration flow

The closest MTB Reserve equivalent is the booking wizard plus confirmation page.

Recommended event flow:

1. attendee visits organizer page or event page
2. attendee selects a specific occurrence
3. attendee chooses quantity and optionally ticket type
4. attendee enters contact information
5. system creates a pending registration hold
6. attendee confirms registration
7. if online payment is required, attendee is redirected to Stripe Checkout
8. registration is finalized after payment success or confirmation success depending on payment rules
9. attendee receives confirmation email and registration code

## 5. Yearly calendar behavior

Because the user explicitly wants event times throughout the year, the public UX needs a true event calendar, not just ad hoc dates.

Recommended calendar behavior:

- each organizer page shows a monthly or agenda view of published occurrences
- each event type card links to its own presentation page
- each event type detail page lists all upcoming occurrences
- clicking a date opens the occurrence detail or registration CTA

This is a better fit than trying to preserve the bike slot model.

## Organizer admin experience

The organizer admin should remain structurally similar to the tenant admin.

## Recommended organizer admin route map

- `/{slug}/admin/login`
- `/{slug}/admin/dashboard`
- `/{slug}/admin/calendar`
- `/{slug}/admin/events`
- `/{slug}/admin/events/new`
- `/{slug}/admin/events/[eventId]`
- `/{slug}/admin/occurrences`
- `/{slug}/admin/registrations`
- `/{slug}/admin/settings`
- `/{slug}/admin/payments`

You do not need every route on day one, but this is the correct direction.

## Dashboard

Reuse the current dashboard structure, but change the metrics.

Suggested metrics:

- registrations today
- upcoming occurrences
- unpaid balances
- pending confirmations
- recent payments
- sold-out events

The current bookings table becomes a registrations table.

## Calendar

The current calendar page is highly reusable, but the data source must change.

Instead of showing bookings for a day, it should show:

- occurrences on that day
- attendee counts
- payment state summary
- quick links into each occurrence

This is one of the highest-reuse areas in the app.

## Inventory page replacement: Events

The current inventory page should become the event-types management screen.

Each event type row or card should expose:

- name
- category
- visibility
- cover image
- default capacity
- default price
- default prepay percentage
- next occurrence

Create/edit form should support:

- title
- short summary
- full description
- cover image
- venue text
- map link
- base price
- capacity
- prepay percentage
- event instructions
- organizer notes
- cancellation policy

## Occurrence management

This is a new area that the bike app does not currently have in proper event terms.

Recommended capabilities:

- add a single occurrence
- bulk-create recurring occurrences
- edit occurrence-specific price/capacity
- cancel an occurrence
- hide/unpublish an occurrence
- duplicate an occurrence

Recurring creation options should support:

- one-off events
- weekly recurrence
- monthly recurrence
- custom selected dates

Even if recurring rules are not stored as RRULEs long term, the admin should be able to generate occurrences in bulk.

## Registrations management

The current booking list actions already suggest the right pattern.

Organizer actions should include:

- mark attended
- mark no-show
- cancel registration
- resend confirmation
- record offline payment
- refund or note refund state

The table should show:

- attendee
- event
- date and time
- quantity
- total
- paid online
- due at event
- payment status
- registration status

## Settings

The settings page should remain tabbed, but its fields should become event-relevant.

Suggested settings sections:

- organizer profile
- public contact info
- venue defaults
- registration policies
- payment defaults
- email wording
- security

## Super-admin experience

The super-admin console can be kept very close to its current structure.

Changes needed:

- "tenants" becomes "organizers"
- tenant creation becomes organizer onboarding
- admin emails become organizer-operation emails
- health/logs stay largely the same
- global site settings are rebranded

The super-admin should also gain visibility into:

- Stripe connectivity status
- organizer payment configuration health
- failed payment webhooks
- event volume
- registration volume

## Stripe integration strategy

This is the most important new capability.

The right implementation should fit the current app style and minimize unnecessary complexity.

## Core payment rule

Each event occurrence should support a required online pre-payment percentage from `0` to `100`.

Interpretation:

- `0`
  - no online payment required
  - attendee pays everything in person
- `1` to `99`
  - attendee pays a deposit online
  - remainder is due in person
- `100`
  - attendee pays everything online

This percentage should exist:

- as a default on `EventType`
- with override support on `EventOccurrence`

That gives organizers both convenience and flexibility.

## Recommended payment architecture

Use Stripe Checkout first, not a custom Elements-heavy payment form.

Why Checkout is the best first implementation:

- faster to implement correctly,
- less PCI surface area,
- simpler redirects,
- fewer edge cases to build manually,
- fits the current server-action architecture,
- easy to reconcile with webhooks.

## Recommended payment flow

The cleanest MTB Reserve-compatible flow is:

1. attendee selects occurrence and submits registration form
2. server creates `PENDING_CONFIRM` registration with expiry
3. attendee lands on confirmation page
4. attendee accepts terms and confirms
5. system checks the occurrence's required prepay percentage
6. if prepay percentage is `0`, registration becomes confirmed without Stripe
7. if prepay percentage is greater than `0`, system creates Stripe Checkout session for the online amount
8. attendee completes payment on Stripe
9. Stripe webhook finalizes payment state and registration state
10. confirmation email is sent with clear online-paid and in-person-due amounts

This preserves the spirit of MTB Reserve:

- lightweight initial form,
- explicit confirmation step,
- server-owned registration state,
- no overly complex client payment orchestration.

## Payment calculations

For each occurrence:

- `totalAmount = unitPrice * quantity`
- `onlineAmount = round(totalAmount * prepayPercentage / 100)`
- `inPersonAmount = totalAmount - onlineAmount`

Examples:

- total `100`, prepay `0`
  - online `0`
  - in person `100`
- total `100`, prepay `30`
  - online `30`
  - in person `70`
- total `100`, prepay `100`
  - online `100`
  - in person `0`

The attendee should see this breakdown clearly before confirming.

## Recommended payment states

Suggested fields and statuses:

- registration status
  - `PENDING_CONFIRM`
  - `PENDING_PAYMENT`
  - `CONFIRMED_UNPAID`
  - `CONFIRMED_PARTIALLY_PAID`
  - `CONFIRMED_PAID`
  - `CANCELLED`
  - `ATTENDED`
  - `NO_SHOW`
- payment status
  - `NONE`
  - `PENDING`
  - `PARTIALLY_PAID`
  - `PAID`
  - `FAILED`
  - `REFUNDED`

This is more expressive than the current booking statuses and better for events.

## Stripe-specific components needed

Without implementing them yet, the future plan should include:

- Stripe env variables
- Checkout Session creation
- success/cancel return handling
- webhook endpoint for final truth
- payment metadata including organizer, occurrence, and registration IDs
- idempotent webhook processing
- organizer-facing payment status display

Suggested environment variables:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY_DEFAULT`

If connected accounts are desired later, that can be phase 2 or phase 3. For a first version, platform-owned payments with organizer-side accounting is much simpler.

## Data migration and reuse strategy

The best reuse-first plan is a staged model transition.

## Phase 0: Rebrand and planning

Before touching domain logic:

- rename public copy to Passreserve.com
- define organizer vocabulary
- define event vocabulary
- define Stripe/payment vocabulary
- freeze the event domain model

This prevents churn later.

## Phase 1: Keep infrastructure, add event models

Do not immediately destroy the bike models.

Instead:

- keep `Tenant` in place temporarily
- add `EventType`
- add `EventOccurrence`
- add `Registration` or adapt `Booking`
- add richer payment fields

This allows the repo to evolve without breaking every screen at once.

## Phase 2: Reuse shells and replace domain screens

Transform screen by screen:

- public organizer page
- event detail page
- organizer dashboard
- organizer calendar
- events CRUD
- occurrences CRUD
- registrations list
- settings

The current admin layouts and navigation patterns should be reused heavily.

## Phase 3: Add Stripe deposit flow

Once registrations and occurrences work:

- add deposit calculation
- add Stripe Checkout session creation
- add webhook reconciliation
- add payment state displays
- add deposit breakdown to emails and admin screens

Stripe should not be the first build step. It should come after the event model is stable.

## Phase 4: Remove bike-specific remnants

Only after the event platform is functionally complete:

- remove bike inventory logic
- remove slot-specific settings
- remove bike-specific copy and tests
- remove obsolete scripts
- remove transitional legacy fields if no longer needed

This is how you maximize reuse without keeping permanent conceptual debt.

## File-by-file reuse map

This section explains how the current repository can be reused at a practical codebase level.

## Reuse mostly as-is

- `lib/db.ts`
- `lib/auth.ts`
- `lib/rate-limit.ts`
- `lib/events.ts`
- `lib/email.ts`
- `lib/site-settings.ts`
- `middleware.ts`
- `app/admin/layout.tsx`
- `app/admin/login/*`
- `app/admin/(authenticated)/layout.tsx`
- `app/admin/(authenticated)/settings/*`
- `app/admin/(authenticated)/emails/*`
- `app/admin/(authenticated)/logs/*`
- `app/admin/(authenticated)/health/*`
- `components/ui/*`
- `test/setup.ts`

These are infrastructure-grade pieces, not bike-specific business logic.

## Reuse with moderate adaptation

- `app/page.tsx`
- `app/actions.ts`
- `app/about/*`
- `app/layout.tsx`
- `app/icon.tsx`
- `app/apple-icon.tsx`
- `app/[slug]/admin/login/*`
- `app/[slug]/admin/forgot-password/*`
- `app/[slug]/admin/reset-password/*`
- `app/[slug]/admin/(protected)/layout.tsx`
- `app/[slug]/admin/(protected)/nav.tsx`
- `app/[slug]/admin/(protected)/dashboard/*`
- `app/[slug]/admin/(protected)/calendar/*`
- `app/[slug]/admin/(protected)/settings/*`

These are structurally correct but need new labels, queries, and actions.

## Replace heavily

- `app/[slug]/page.tsx`
- `app/[slug]/actions.ts`
- `app/[slug]/booking/confirm/*`
- `components/booking/*`
- `app/[slug]/admin/(protected)/inventory/*`
- `lib/availability.ts`
- `lib/tenants.ts`
- `lib/schemas.ts` or current schema files tied to booking forms
- bike-related tests
- bike-specific verification scripts

These are closest to the core domain and will need the most refactoring.

## Best product-model decision for event scheduling

Do not model events as "slots in settings".

That would seem convenient because MTB Reserve already has slots, but it is the wrong abstraction for events.

The correct event abstraction is:

- `EventType` defines what the event is
- `EventOccurrence` defines when it happens

Why this is better:

- events need rich descriptions and presentation pages
- events recur on different dates across the year
- occurrences need their own capacity and pricing overrides
- event calendars need explicit scheduled objects
- organizer admin needs to manage actual dated instances

Trying to keep everything inside a settings JSON slot model would save some short-term effort but create long-term product pain.

## Best product-model decision for presentation

Each event type should have its own full presentation page.

That page should include:

- title
- summary
- cover image
- long description
- logistics
- policies
- pricing
- deposit requirement
- occurrence list

This is important because the user specifically wants each event type to have its own description, photo, yearly times, and presentation.

## Best product-model decision for capacity

Capacity should be enforced per occurrence, not per generic event type only.

Why:

- the same event type may have different room sizes or staffing constraints on different dates
- special holiday sessions may have different pricing or caps
- sold-out state is occurrence-specific

The event type can still carry defaults, but the occurrence must be authoritative.

## Best product-model decision for payments

Prepayment percentage should be configurable per event type with optional per-occurrence override.

That is the most flexible model with the least admin friction.

Examples:

- cooking workshop defaults to `50` percent online
- special VIP edition overrides to `100` percent online
- free community meetup stays at `0` percent

## Best product-model decision for confirmation

Keep the MTB Reserve confirmation-page concept, but extend it for payment.

That means:

- do not jump straight from public form to Stripe
- keep a server-owned pending record first
- let the attendee review the event and payment terms
- then either confirm directly or continue to payment

This keeps the product calm, auditable, and operator-friendly.

## Suggested email model

The existing email system is highly reusable.

New email types should include:

- organizer join-request acknowledgment
- organizer join-request notification
- attendee registration confirmation
- attendee payment confirmation
- attendee registration reminder
- organizer new registration notification
- organizer payment received notification
- organizer occurrence cancellation notification

The current template-management area can evolve to support these cases.

## Suggested reporting and admin metrics

The event version of the platform will benefit from better metrics than the current rental version.

Suggested dashboard/reporting items:

- registrations by day
- revenue by day
- deposits outstanding
- amount due in person
- sold-out occurrences
- no-show rate
- top event types
- upcoming capacity pressure

These can be added incrementally after the core workflows work.

## Recommended phased implementation plan

This is the best sequence if the goal is maximum reuse with controlled risk.

## Phase 1: Branding and vocabulary

Deliverables:

- choose Passreserve.com as public brand
- keep GATHERPASS as the internal codename and working-folder reference
- update naming dictionary
- define event-specific UI copy
- define event-specific email scenarios
- define data model terminology

Why first:

- everything else depends on consistent vocabulary

## Phase 2: Schema and domain foundation

Deliverables:

- add event entities
- add occurrence entities
- add registration/payment fields
- define event and registration statuses
- design migration path from booking vocabulary

Why second:

- without a clean domain, screen refactors become chaotic

## Phase 3: Public organizer and event browsing

Deliverables:

- organizer public page
- event type detail page
- organizer calendar
- event cards and event presentation components

Why third:

- this establishes the customer-facing product shape early

## Phase 4: Organizer admin event operations

Deliverables:

- organizer dashboard
- event type CRUD
- occurrence CRUD
- registrations list
- settings rework

Why fourth:

- organizers need the ability to operate the platform before payment complexity is added

## Phase 5: Stripe deposits and payment states

Deliverables:

- payment calculation logic
- Stripe Checkout session flow
- webhook processing
- payment-aware confirmation flow
- organizer payment views

Why fifth:

- it builds on a stable registration model and avoids mixing domain redesign with payment edge cases too early

## Phase 6: Cleanup and de-rentalization

Deliverables:

- remove bike-specific code
- delete obsolete scripts and tests
- update docs
- normalize naming fully
- tighten lint and tests

Why last:

- transitional scaffolding is useful during the build

## Risks and cautions

## 1. Do not over-reuse the slot model

This is the biggest architectural temptation and the wrong move for events.

Reuse the calendar UI patterns, not the underlying slot abstraction.

## 2. Do not start with Stripe Connect unless absolutely necessary

If the first goal is a working multi-tenant event platform, platform-owned Stripe flows are simpler than marketplace payouts.

Stripe Connect can come later if organizer-level payout automation becomes essential.

## 3. Do not delete booking models too early

The old booking structures are useful reference material during the transformation.

Delete them only after the replacement event flows are stable.

## 4. Do not let JSON settings swallow real event entities

Settings JSON is fine for organizer preferences.

It is not the right place for:

- event descriptions,
- occurrence schedules,
- pricing history,
- payment logic,
- capacity control.

Those deserve first-class tables.

## 5. Rework tests alongside the domain shift

The current repo already has test drift. The event transformation will amplify that if tests are postponed too long.

The plan should include:

- model-level tests
- registration and payment state tests
- capacity tests
- webhook idempotency tests
- organizer auth tests

## Recommended final product shape

If done well, Passreserve.com should feel like this:

- each organizer gets a branded public page
- each event type gets its own polished detail page
- each event has clearly scheduled yearly occurrences
- attendees can register quickly
- organizers can choose whether to collect `0` percent, a deposit, or full payment online
- Stripe handles the online money flow
- the organizer admin remains simple and practical
- the super-admin console remains strong and familiar
- the platform still feels lightweight and operational, not bloated

## Final recommendation in one sentence

Transform MTB Reserve into Passreserve.com by preserving the monolith, the tenancy model, the admin shells, the email/logging/auth infrastructure, and the server-action workflow, while replacing the bike domain with a proper `Organizer -> EventType -> EventOccurrence -> Registration -> Payment` model and adding Stripe Checkout at the confirmation stage for configurable 0-to-100-percent online prepayment.
