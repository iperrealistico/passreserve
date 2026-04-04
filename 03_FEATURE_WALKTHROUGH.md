# Feature Walkthrough

This document explains the system as a product, from the point of view of the three actors it serves:

- riders,
- tenant rental-shop admins,
- super admins.

## 1. Landing page and first impression

The root landing page at `/` is not a conventional marketing homepage. It is a split-screen gateway:

- left side: rider intent
- right side: shop/partner intent

### Rider path on `/`

The rider-side journey is intentionally minimal:

- user enters a location keyword,
- the app maps that keyword to a known tenant slug,
- the router forwards the user to `/{slug}`.

Right now this search is intentionally simple and demo-like:

- hard-coded valid locations:
  - `sillico`
  - `castelnuovo`
- invalid input prompts a small corrective message.

So the landing page is currently acting more like a demo router than a real multi-location search engine.

### Partner/shop path on `/`

The shop side of the landing page supports two actions:

- jump to a tenant login by entering a shop id,
- open a partner application modal and submit a join request.

The join-request modal writes to `SignupRequest` and sends two emails:

- an acknowledgment to the applicant,
- a notification to the platform admin.

This is the platform's lightweight lead-capture and onboarding queue.

## 2. About page and marketing narrative

The `/about` page is a long-form, image-rich marketing page designed for search and partner education.

It is made of structured content sections:

- hero
- what is MTB Reserve
- how it works for riders
- confirmation flow
- how it works for shops
- settings/configurability
- competitor comparison
- why free
- setup guide
- availability explanation
- niche/location targeting
- FAQ
- final CTA

The interesting part is not only the page itself, but how it is managed:

- default content lives in `lib/about-content.ts`,
- editable content is stored in `AboutPageContent.content`,
- super admin can edit it from `/admin/about`,
- a rebuild hook can be triggered after save.

So the about page is effectively a small in-house CMS-driven landing page.

## 3. Public tenant storefront

The core public product surface is `/{slug}`.

When a tenant exists, the page shows:

- tenant name,
- public phone and email,
- optional tenant info box,
- booking wizard.

### What the rider sees

The booking wizard is intentionally linear and low-friction:

1. pick a date
2. pick a time slot
3. pick one or more bikes and quantities
4. enter personal details
5. submit booking request
6. confirm later from email

This is a strong product decision:

- no account creation,
- no checkout,
- no upfront payment,
- low form complexity,
- final verification deferred to email confirmation.

### Slot selection behavior

Available slots are derived from tenant settings.

Tenant-defined slots can be something like:

- morning
- afternoon
- any custom label and time window

If full-day is enabled, the app also synthesizes a "full-day" slot spanning the earliest slot start and latest slot end.

### Inventory behavior

The rider can select multiple bike types and quantities in a single booking request.

Availability is computed per slot per bike type:

- stock
- minus broken bikes
- minus overlapping confirmed bookings
- minus overlapping still-valid pending confirmations

That means the UI is not just showing catalog items. It is showing dynamically filtered inventory per slot.

### Submission behavior

Submitting the wizard does not confirm the booking. It creates a temporary hold:

- booking status becomes `PENDING_CONFIRM`,
- a token is generated,
- the booking expires in 30 minutes if unconfirmed,
- the confirmation email is sent immediately.

This is a classic anti-spam / anti-no-show compromise:

- customers do not need an account,
- the business still gets a validated confirmation step.

## 4. Booking confirmation experience

The confirmation page at `/{slug}/booking/confirm/{token}` is where the pending booking becomes real.

### What happens there

The page:

- loads the booking by token,
- shows date/time/equipment/customer summary,
- asks the user to accept terms,
- asks the user to confirm a responsibility declaration,
- on success issues a booking code.

### Responsibility declaration

The confirmation form requires an explicit acknowledgment that the rider will:

- arrive on time,
- pay on site,
- understand that no-shows may affect future bookings.

This is not just a legal checkbox. It reflects the operational business model:

- the app is optimized for pay-at-pickup booking,
- therefore it needs a no-show deterrent.

### After confirmation

If the confirmation succeeds:

- status becomes `CONFIRMED`,
- a unique booking code is generated,
- rider receives recap email,
- tenant admin receives notification email.

The booking code is the rider-facing reservation identifier.

## 5. Tenant admin experience

Tenant admins operate inside `/{slug}/admin/...`.

The experience is designed as a focused shop-operations console rather than a generic back office.

### Login

Tenant login is slug-specific and password-only.

That means:

- the route already identifies the tenant,
- the credential form asks only for the password.

This is simpler than email+password, but it assumes the slug itself is part of the identity context.

### Forgot/reset password

The forgot-password flow verifies the tenant's `registrationEmail` and sends a time-limited reset link.

The reset flow does not ask the user to choose a new password. Instead it:

- generates a new secure password on the server,
- stores the new hash,
- invalidates sessions by incrementing `tokenVersion`,
- emails the new password.

That is unusual by mainstream SaaS standards but operationally simple.

### Dashboard

The dashboard at `/{slug}/admin/dashboard` is meant to be the "today" screen.

It shows:

- today's guest count,
- pending-action count,
- total bookings,
- booking table with actions.

The booking table includes:

- date/time,
- booking code,
- customer information,
- quantity and bike type,
- price and paid amount,
- status,
- action menu.

### Dashboard booking actions

The action menu supports:

- confirm pending booking,
- mark as paid,
- mark completed,
- mark as no-show,
- cancel booking.

For cancellation and no-show, the UI also allows the admin to decide whether to notify the rider by email.

### Calendar

The calendar page gives a day-level operational view.

It includes:

- day picker,
- booking list for selected day,
- same booking actions menu as dashboard.

This is meant for daily shop operations, morning prep, and staff coordination rather than analytics.

### Inventory

The inventory page manages `BikeType` records.

Each bike type includes:

- name,
- description,
- total stock,
- broken count,
- hourly cost.

The UI lets the admin:

- add new bike types,
- update existing stock and price fields,
- delete bike types.

Operationally, broken count is important because it removes bikes from bookable inventory without deleting the bike type itself.

### Settings

Tenant settings are split into:

- general
- security

General settings include:

- contact email and phone,
- content customization,
- pickup location URL,
- slots,
- full-day option,
- blocked date ranges,
- minimum and maximum advance booking days.

Security settings include:

- current password check,
- new password rules,
- password strength meter,
- password change action.

### Slot overlap detection

One of the better UX details in the tenant settings page is client-side overlap detection for time slots.

If two slots overlap:

- the slot rows are highlighted,
- a warning panel appears,
- save is disabled.

This is a concrete business rule surfaced in the UI instead of left as silent bad data.

## 6. Super-admin experience

The super-admin surface is the platform operator console.

Unlike tenant admin, it is platform-wide.

### Login model

Super-admin login is even simpler than tenant login:

- there is effectively one super-admin identity,
- the UI asks only for a password,
- the server finds the first `SuperAdmin` row and verifies the hash.

That means the system is presently designed around a singleton super admin rather than a full role-based admin account directory.

### Tenant management

The main `/admin` page lists tenants with booking counts and allows the operator to:

- create new tenants,
- open tenant detail views,
- reset tenant passwords,
- manually email tenant admins,
- open tenant admin panels,
- delete tenants.

This is the platform's support and provisioning console.

### Global site settings

`/admin/settings` manages:

- SEO title/description/keywords,
- admin notification email,
- favicon upload,
- social preview image upload,
- super-admin password change.

Uploads are processed with `sharp` and stored in Vercel Blob.

### About page CMS

`/admin/about` is a structured editor for the long-form about page.

The editor is not WYSIWYG for the page as a whole. Instead it is a form that edits typed content sections.

This means:

- the content model is structured,
- the layout remains code-owned,
- the copy is DB-owned.

### Email console

The email console has three tabs:

- delivery logs
- inbox
- template editor

#### Delivery logs

Shows email-related entries from `EventLog`:

- sent
- failed
- mock-sent

#### Inbox

Shows partner/join requests from `SignupRequest`.

The operator can:

- open details,
- mark as replied,
- archive,
- delete.

#### Template editor

This is one of the most powerful admin features in the repo.

The operator can customize templates for:

- booking confirmation link
- booking recap
- admin new-booking alert
- onboarding
- password reset
- signup request user/admin
- booking cancelled
- booking no-show

The editor also supports:

- sender name
- sender email
- HTML body
- placeholder reference list

### Logs and health

The super-admin logs page is an in-app audit viewer over `EventLog`.

The health page gives:

- tenant counts,
- booking counts,
- confirmation conversion calculation,
- event-log count,
- DB size query,
- email failure count,
- login failure count.

This is lightweight observability, but it is enough to make the app operationally inspectable from inside itself.

## 7. Hidden but important supporting features

Some behaviors are not obvious from the UI alone but matter to the system:

- global click sound effects via `GlobalClickListener`
- IP-hashed event logging
- booking-code generation
- session invalidation via `tokenVersion`
- email mock mode when delivery is disabled
- Vercel deploy hook triggering for about-page content

These features make the app feel more productized even when they are not the headline features.

## 8. What is notably absent

Understanding the absences is as important as understanding the presence.

The repository does not currently implement:

- online payment processing,
- customer accounts,
- public search across arbitrary tenant locations,
- integration-test coverage,
- tracked E2E Playwright spec files,
- a normalized pricing/rate engine,
- subdomain-based tenant routing,
- full role-based admin management,
- API-first integrations.

This helps position the product correctly:

- it is a focused booking and shop-ops system,
- not yet a broad rental-commerce platform.
