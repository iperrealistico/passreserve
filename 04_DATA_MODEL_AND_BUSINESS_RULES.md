# Data Model And Business Rules

## Authoritative schema

The authoritative schema is [`prisma/schema.prisma`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/schema.prisma).

The initial checked-in migration is:

- [`prisma/migrations/20260411104000_init_passreserve_schema/migration.sql`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260411104000_init_passreserve_schema/migration.sql)

## Core models

### Organizer

Public host and organizer identity.

Important fields:

- `slug`
- `name`
- `status`
- `description`
- `city`
- `region`
- `timeZone`
- `publicEmail`
- `venueTitle`
- `faq`
- `policies`
- `imageUrl`

### OrganizerAdminUser

Organizer-scoped admin account.

Important fields:

- `organizerId`
- `email`
- `name`
- `passwordHash`
- `isPrimary`
- `isActive`
- `passwordResetToken`
- `passwordResetExpires`

### PlatformAdminUser

Platform-wide operator account.

Important fields:

- `email`
- `name`
- `passwordHash`
- `isActive`
- `passwordResetToken`
- `passwordResetExpires`

### OrganizerJoinRequest

Public inbound request from a prospective organizer.

Important fields:

- `status`
- `contactName`
- `contactEmail`
- `organizerName`
- `city`
- `launchWindow`
- `paymentModel`
- `eventFocus`
- `approvedById`
- `organizerId`

### EventType

Organizer-owned reusable event definition.

Important fields:

- `organizerId`
- `slug`
- `title`
- `category`
- `visibility`
- `summary`
- `description`
- `durationMinutes`
- `basePriceCents`
- `prepayPercentage`
- `cancellationPolicy`
- `imageUrl`

### TicketCategory

Single-line ticket option model for v1.

Important fields:

- `eventTypeId`
- `slug`
- `name`
- `unitPriceCents`
- `isDefault`
- `sortOrder`

### EventOccurrence

Specific scheduled instance of an event.

Important fields:

- `eventTypeId`
- `status`
- `startsAt`
- `endsAt`
- `capacity`
- `priceCents`
- `prepayPercentage`
- `venueTitle`
- `published`

### Registration

Durable attendee registration record.

Important fields:

- `organizerId`
- `eventTypeId`
- `occurrenceId`
- `ticketCategoryId`
- `status`
- `attendeeName`
- `attendeeEmail`
- `attendeePhone`
- `quantity`
- `subtotalCents`
- `onlineAmountCents`
- `dueAtEventCents`
- `onlineCollectedCents`
- `venueCollectedCents`
- `refundedCents`
- `holdToken`
- `paymentToken`
- `confirmationToken`
- `registrationCode`
- `expiresAt`

### RegistrationPayment

Payment ledger entry for a registration.

Important fields:

- `registrationId`
- `provider`
- `kind`
- `status`
- `amountCents`
- `externalEventId`
- `stripeSessionId`
- `stripePaymentIntentId`
- `occurredAt`

### Content and ops models

- `EmailTemplate`
- `SiteSettings`
- `AboutPageContent`
- `AuditLog`

## Lifecycle enums

### Registration status

- `PENDING_CONFIRM`
- `PENDING_PAYMENT`
- `CONFIRMED_UNPAID`
- `CONFIRMED_PARTIALLY_PAID`
- `CONFIRMED_PAID`
- `ATTENDED`
- `NO_SHOW`
- `CANCELLED`

### Join request status

- `PENDING`
- `APPROVED`
- `REJECTED`
- `ARCHIVED`

### Payment status

- `PENDING`
- `SUCCEEDED`
- `FAILED`
- `CANCELED`
- `REFUNDED`

### Payment provider

- `STRIPE`
- `VENUE`
- `MANUAL`

## Core business rules

### 1. Production launches fresh

Passreserve production is a fresh event-platform launch, not a live MTB Reserve data migration.

Legacy MTB Reserve artifacts remain reference-only and must not be treated as production runtime dependencies.

### 2. Holds are real records

Starting a registration creates a durable `Registration` row in `PENDING_CONFIRM`.

That hold:

- reserves capacity
- has an `expiresAt`
- becomes invalid after the hold window
- is excluded from availability once expired

### 3. Payments are platform-owned

Stripe Checkout is platform-owned in v1.

This means:

- no Stripe Connect in the current completion pass
- organizer payouts and venue reconciliations are modeled operationally, not as automated marketplace transfers
- Stripe payment state is mirrored into `RegistrationPayment`

### 4. Organizer onboarding is manual approval

The public join-request flow writes a durable request record.

Platform admins then:

- review the request
- approve it manually
- create the organizer and primary organizer admin
- trigger a password setup/reset path

### 5. Auth is email + password

Organizer admins sign in with organizer-scoped `email + password`.

Platform admins sign in with platform-wide `email + password`.

Both account types support password-reset tokens and session invalidation through server-side session handling.

### 6. Publication is explicit

Occurrences are not automatically public just because they exist.

Organizer operations must explicitly publish occurrences, and production publication should only be treated as launch-ready when the required Stripe and Resend configuration is present.

### 7. Seeds are bootstrap data, not production truth

The in-repo organizer/event dataset is now seed material for:

- local development
- smoke checks
- first-run empty environments

It is not meant to be the long-term production authority.

## Local bootstrap credentials

Development environments without custom bootstrap envs get default local credentials from [`lib/passreserve-config.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-config.js):

- platform admin email: `admin@passreserve.local`
- organizer admin email pattern: `admin@{slug}.passreserve.local`
- default password: `Passreserve123!`

These are for local work only and must be rotated or replaced in production.
