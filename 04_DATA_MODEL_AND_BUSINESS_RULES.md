# Data Model And Business Rules

## Prisma models

The authoritative schema is `prisma/schema.prisma`.

## `Tenant`

Primary business entity.

Key fields:

- `slug`
  - primary key
  - route anchor for public and admin pages
- `name`
  - displayed publicly and operationally
- `adminPasswordHash`
  - tenant-admin credential storage
- `contactEmail`
  - public/customer-facing contact
- `registrationEmail`
  - admin/reset/onboarding email identity
- `contactPhone`
  - public/customer-facing phone
- `timezone`
  - IANA timezone string
- `settings`
  - JSON settings payload
- `tokenVersion`
  - session invalidation version
- `passwordResetToken`
  - single-use password-reset token
- `passwordResetExpires`
  - reset token expiry

Relationships:

- one tenant has many `BikeType`
- one tenant has many `Booking`

## `BikeType`

This is the bookable inventory unit, not an individual serial-numbered bike.

Key fields:

- `name`
- `totalStock`
- `brokenCount`
- `description`
- `notes`
- `costPerHour`

Interpretation:

- a `BikeType` represents a category of bikes available in quantity,
- not a specific physical bike asset register.

That is why the booking system can do stock arithmetic quickly.

## `Booking`

Reservation header record.

Key fields:

- `status`
- `bookingCode`
- `startTime`
- `endTime`
- `customerName`
- `customerEmail`
- `customerPhone`
- `quantity`
- `totalPrice`
- `paidAmount`
- `confirmationToken`
- `expiresAt`
- `tosAcceptedAt`

Important note:

`Booking` still contains legacy direct-bike fields:

- `bikeTypeId`
- `quantity`

That exists alongside `BookingItem[]`.

## `BookingItem`

Line items for multi-bike bookings.

Key fields:

- `bookingId`
- `bikeTypeId`
- `quantity`
- `price`

This is the more future-facing booking representation.

## `SuperAdmin`

Platform operator account table.

Important details:

- unique by `email`
- but the runtime login flow currently behaves like a singleton admin flow
- `tokenVersion` supports session invalidation

## `AdminLoginAttempt`

Apparently intended for login-attempt tracking, but in practice most runtime abuse tracking is handled through `RateLimit` and `EventLog`, not through broad operational use of this table.

## `RateLimit`

Minimal durable rate-limit store:

- `key`
- `count`
- `expiresAt`

The runtime rate limiter is a DB-backed counter window, not Redis/KV-based in the current checked-in implementation.

## `EventLog`

Persistent audit/ops log.

Key fields:

- `level`
- `tenantId`
- `actorType`
- `actorId`
- `eventType`
- `entityType`
- `entityId`
- `ipHash`
- `userAgent`
- `message`
- `metadata`

This is the backbone of the logs page and parts of the health page.

## `EmailTemplate`

Stores editable templates for transactional emails.

Key fields:

- `id`
- `subject`
- `senderName`
- `senderEmail`
- `html`

## `SystemSettings`

Singleton global platform settings row.

Holds:

- SEO metadata
- favicon/social image URLs
- admin notification email

## `SignupRequest`

Lead-capture record for prospective partners.

Holds:

- person name
- organization
- email
- phone
- address
- message
- status

## `AboutPageContent`

Singleton structured marketing/CMS content row for `/about`.

## Tenant settings JSON schema

Runtime helper type lives in `lib/tenants.ts`.

The JSON settings payload can contain:

- `slots`
- `fullDayEnabled`
- `blockedDates`
  - legacy single-date array
- `blockedDateRanges`
  - newer structured range model
- `minAdvanceHours`
  - legacy field
- `minAdvanceDays`
  - current field
- `maxAdvanceDays`
  - current field
- `content`
  - `bookingTitle`
  - `bookingSubtitle`
  - `emailSubjectConfirmation`
  - `emailSubjectRecap`
  - `infoBox`
- `pickupLocationUrl`

The JSON strategy makes the settings flexible, but there are two consequences:

1. backward-compatibility logic exists in the app code,
2. some fields can exist in storage before they are fully wired into the runtime UI.

## Booking lifecycle

The core lifecycle states are:

- `PENDING_CONFIRM`
- `CONFIRMED`
- `REJECTED`
- `CANCELLED`
- `COMPLETED`
- `PAID`
- `NO_SHOW`

### Typical lifecycle

1. rider submits request
2. booking created as `PENDING_CONFIRM`
3. pending hold lasts 30 minutes
4. rider confirms via email token
5. booking becomes `CONFIRMED`
6. shop may later mark as:
   - `PAID`
   - `COMPLETED`
   - `NO_SHOW`
   - `CANCELLED`

### Why pending bookings matter

Pending bookings are not passive records. They actively consume stock until:

- they expire,
- or they are confirmed,
- or they are cancelled/rejected.

This prevents race conditions where two people request the same bike during the confirmation window.

## Availability rules

The availability logic is one of the most important business-rule clusters in the repo.

## Rule 1: Stock is category-based

Available count is computed per `BikeType`.

There is no reservation against a specific serial-numbered bike.

## Rule 2: Broken bikes reduce stock

Available inventory is:

`totalStock - brokenCount - bookedQuantity`

## Rule 3: Overlap is interval-based

A booking overlaps if:

- booking start `<` requested end
- and booking end `>` requested start

This is the correct interval-overlap test, and it allows different slots on the same day to coexist without false conflicts.

## Rule 4: Pending-but-valid bookings count

When computing availability, the app counts:

- `CONFIRMED`
- `PENDING_CONFIRM` where `expiresAt > now`

Expired pending bookings are ignored.

## Rule 5: Blocked dates can be fixed or recurring

Blocked dates can come from:

- legacy `blockedDates` exact string list
- newer `blockedDateRanges`
  - fixed range
  - yearly recurring range

Recurring ranges can cross year boundaries, such as:

- December 20 to January 10

## Rule 6: Advance-notice window is enforced

The app checks both:

- minimum days before booking
- maximum days into the future

There is also a legacy `minAdvanceHours` path for older settings.

## Rule 7: Full-day slot is synthetic

If full-day mode is enabled:

- the app computes the earliest slot start,
- the latest slot end,
- creates a synthetic slot with id `full-day`.

This is generated in code rather than stored as primary configuration.

## Authentication and authorization rules

## Session model

Session data includes:

- `tenantSlug`
- `isLoggedIn`
- `isSuperAdmin`
- `superAdminId`
- `tokenVersion`

## Tenant authorization

Protected tenant actions require:

- active session,
- either matching `tenantSlug`,
- or super-admin privileges.

## Super-admin authorization

Protected super-admin actions require:

- active session
- `isSuperAdmin === true`

## Token-version invalidation

Both tenant and super-admin users have a `tokenVersion`.

On authenticated access the app checks whether the DB version matches the session version.

If not:

- session is destroyed,
- user must log in again.

This is how password changes invalidate old sessions.

## Password rules

### Tenant password generation

Generated passwords are memorable phrase-style values:

- Italian noun
- Italian adjective
- English noun
- 4-digit number

Example pattern:

- `Montagna-Grande-Trail-4821`

### Tenant password change

Manual password change requires:

- 8-32 characters
- uppercase
- number
- special character

### Reset flow

Reset does not let the user choose a password.

Instead:

- server generates a new one,
- stores its hash,
- emails the plaintext once.

## Email rules

## Email transport mode

Email sending has two operating modes:

1. real send via Resend
2. mock/log-only send if:
   - `EMAIL_DISABLED === "1"`
   - or no `RESEND_API_KEY` is present

In mock mode, the app still logs an email event.

## Template resolution

When sending an email:

1. default subject/html are prepared in code,
2. DB template with matching id is loaded if it exists,
3. placeholders are replaced,
4. send occurs with sender overrides if configured.

## Email categories implemented

- booking confirmation link
- booking recap
- tenant admin notification
- onboarding
- password reset
- signup request acknowledgment
- signup request admin alert
- booking cancelled
- booking no-show
- generic manual send

## Logging and observability rules

## Metadata sanitization

`lib/events.ts` redacts keys containing terms such as:

- password
- token
- secret
- key
- authorization
- cookie
- session
- creditcard
- cvv

## IP handling

The app does not persist raw IPs in the audit log metadata path by default.

Instead it stores:

- a salted, truncated HMAC hash

This allows correlation without preserving raw IP in the event table.

## Log fan-out

Each event is written to:

1. Postgres `EventLog`
2. structured JSON console output

That gives both in-app history and platform-log visibility.

## Rate-limit rules

Current rate-limited flows include:

- super-admin login
- tenant login
- booking requests
- booking confirmation
- forgot-password flow

The implementation is deliberately simple:

- find record by key
- create/reset/increment count
- enforce fixed threshold within expiry window

Operationally this is enough for a low-volume SaaS, but it is not a distributed high-scale limiter.

## Security-rule reality vs policy

The repo includes serious security intent:

- CSP
- HSTS
- SameSite/secure cookies
- session invalidation
- IP-hashed event logs
- rate limiting

At the same time, the actual implementation remains pragmatic:

- CSP still allows `'unsafe-inline'` and `'unsafe-eval'`
- Google domains remain in CSP even though reCAPTCHA has mostly been removed
- some security documentation appears more aspirational than strictly runtime-accurate

That does not make the app insecure by default, but it does mean the documented threat model and the checked-in implementation should be read together rather than assumed identical.

## Global UI/UX behavior rules

Some non-obvious UX rules are enforced globally:

- the app plays synthesized sounds on interactive clicks,
- booking step changes can trigger reset-confirmation dialogs,
- password strength is shown live,
- settings forms use client-side overlap detection before save.

These are not mere styling choices; they shape user behavior and data quality.
