# Patch note — 2026-06-10 22:18 CEST

## Summary

Completed Phase 1 of the registration-language rollout by adding the organizer/event configuration model and shared rules for asking booking language without changing the live booking UX yet.

## Problem

Passreserve already persisted `registrationLocale`, but that value was still driven only by the current page language and not by a configurable organizer/event rule. There was no dedicated shared model for:

- deciding whether the public booking flow should explicitly ask for language
- constraining the supported booking languages to the live Passreserve set
- exposing a stable default/inherit rule that later phases can reuse in the public flow, admin UI, and email layer

## What changed

- Added `registrationLanguagePromptEnabled` to:
  - `Organizer` with default `true`
  - `EventType` as nullable override/inherit
- Added the shared helper [`lib/passreserve-registration-language.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registration-language.js) with:
  - `it/en` normalization
  - prompt-resolution logic
  - supported-language options
  - prompt metadata for later UI work
- Centralized registration-locale normalization in the new shared helper and re-exported it through [`lib/passreserve-registration-core.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registration-core.js)
- Exposed the resolved prompt state in admin/public read models so later phases can wire UI on top without another model pass
- Updated file-state normalization, seed data, organizer provisioning defaults, and the checked-in Prisma migration set

## Intentionally not changed yet

- No public booking UI was changed in this phase
- No organizer settings/event editor UI was changed in this phase
- No attendee email templates were localized in this phase
- No live organizer/event accounts were reset or re-authored

This was a foundation-only pass designed to keep the current site behavior stable.

## Verification

- `npx eslint lib/passreserve-registration-language.js lib/passreserve-registration-core.js lib/passreserve-service.js lib/passreserve-admin-service.js lib/passreserve-state.js lib/passreserve-seed.js lib/passreserve-organizer-applications.js test/passreserve-registration-language.test.js`
- `npm run test -- test/passreserve-registration-language.test.js test/passreserve-registration-confirmation.test.js test/passreserve-registration-core.test.js`
- `npx prisma generate`
- `npm run verify`
- `npx prisma migrate deploy` against the canonical production schema using the non-pooling Supabase connection
- `npx prisma migrate status` confirmed `Database schema is up to date!`

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/schema.prisma`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260610153000_add_registration_language_prompt_config/migration.sql`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registration-language.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registration-core.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-state.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-seed.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-organizer-applications.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-registration-language.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Risks and notes

- The email template system is still mono-lingua at the database level. Later phases must localize template rendering with a backward-compatible fallback path.
- The public flow still uses page language as runtime input because the explicit booking-language selector has not been added yet.
- This phase was intentionally low-risk and schema-first so the live Cibico flow and existing organizer accounts remain unchanged until the UI phases are wired.
