# Patch Note — Registration language phase 4: attendee email localization

Date: `2026-06-11 10:46 CEST`
Product: `Passreserve.com`
Scope: `Registration language rollout / Phase 4`

## What changed

- Extended `EmailTemplate` with optional localized fields:
  - `subjectTranslations`
  - `previewTranslations`
  - `bodyHtmlTranslations`
- Added a shared resolver for locale-aware template selection with strong fallback order:
  - requested locale variant
  - English variant
  - legacy mono-lingua field
- Seeded Italian and English attendee-facing variants for:
  - `attendee_pending_confirmation`
  - `attendee_registration_confirmed`
  - `attendee_payment_requested`
  - `attendee_payment_received`
  - `attendee_occurrence_reminder`
  - `attendee_registration_cancelled`
  - `attendee_occurrence_cancelled`
- Localized dynamic attendee-email placeholders driven by runtime data:
  - registration source note
  - source/origin labels
  - refund-state messaging
  - event title
  - venue label
  - date label
  - time range
  - reminder fallback note
- Updated the platform email console so admins can edit:
  - default fallback content
  - Italian override content
  - English override content

## Safety / compatibility

- Legacy `subject`, `preview`, and `bodyHtml` fields remain intact and still work as the last fallback.
- Organizer-facing emails were left on the current default behavior in this phase; only attendee-facing localized sends were changed.
- Existing live templates were not overwritten blindly:
  - the migration preserves the current live English content by copying it into `en`
  - Italian variants are added alongside it
- File-backed state stays compatible through runtime reconciliation of missing translation fields.

## Database / migration

- Added Prisma migration:
  - `20260611110000_add_email_template_translations`
- Applied successfully against the canonical production `passreserve` schema.
- Verified post-apply status with:
  - `npx prisma migrate status`

## Verification

- `npx eslint lib/passreserve-email-delivery.js lib/passreserve-email-templates.js lib/passreserve-format.js lib/passreserve-service.js lib/passreserve-organizer-registrations.js lib/passreserve-admin-service.js app/admin/(platform)/emails/page.js app/admin/actions.js test/passreserve-email-delivery.test.js test/passreserve-admin-emails.test.js`
- `npm run test -- test/passreserve-email-delivery.test.js test/passreserve-admin-emails.test.js test/passreserve-registrations.test.js test/passreserve-password-reset.test.js`
- `npm run test -- test/passreserve-organizer-registrations.test.js test/passreserve-admin-registration-refunds.test.js test/passreserve-webhooks.test.js`
- `npx prisma generate`
- `npm run build`
- `npm run verify`

## Result

Passreserve now keeps the attendee booking language aligned with attendee transactional emails, while preserving safe fallback behavior and without changing the live booking/payment/refund mechanics.
