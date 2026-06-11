# Patch note — 2026-06-11 10:07 CEST

## Summary

Completed Phase 2 of the registration-language rollout by adding organizer-facing controls for the booking-language prompt in both Settings and the event editor, while keeping the live public booking flow unchanged.

## Problem

Phase 1 introduced the organizer/event config model and shared resolver for asking booking language, but there was still no admin surface to manage that rule.

Before this phase:

- organizer admins could not change the default `registrationLanguagePromptEnabled` behavior
- event editors could not override or clear that rule per event
- the new model existed in schema/read-model code, but the UI and save actions did not expose it yet

## What changed

- Added the new client editor [`app/[slug]/admin/registration-language-prompt-editor.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registration-language-prompt-editor.js)
  - organizer-level default mode
  - event-level inherit/customize mode
  - explicit `ask for booking language` vs `use current page language`
  - current-scope preview limited to Italian and English
- Added the booking-language subsection to organizer Settings in [`app/[slug]/admin/settings/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/settings/page.js)
- Added the event override subsection to the event editor in [`app/[slug]/admin/events/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/events/page.js)
- Wired the new hidden input through organizer admin actions in [`app/[slug]/admin/actions.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js)
- Extended [`lib/passreserve-registration-language.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registration-language.js) with a shared input normalizer for safe form parsing
- Persisted organizer defaults and nullable event overrides in both database and file-state paths inside [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js)

## Intentionally not changed yet

- No public booking step or language selector was added in this phase
- No attendee email templates were localized in this phase
- No booking/runtime behavior changed for live public registrations
- No organizer accounts or live events were reset or rewritten

This pass was intentionally limited to admin controls and persistence only.

## Verification

- `npx eslint app/[slug]/admin/actions.js app/[slug]/admin/events/page.js app/[slug]/admin/settings/page.js app/[slug]/admin/registration-language-prompt-editor.js lib/passreserve-admin-service.js lib/passreserve-registration-language.js test/passreserve-admin-emails.test.js test/passreserve-admin-events.test.js`
- `npm run test -- test/passreserve-admin-emails.test.js test/passreserve-admin-events.test.js test/passreserve-registration-language.test.js`
- `npm run verify`

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/events/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/settings/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/registration-language-prompt-editor.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-registration-language.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-emails.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-events.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Risks and notes

- The live public booking flow still derives its runtime interface language from the page itself; Phase 3 will add the guest-facing selector on top of this new organizer/event config.
- Email localization is still pending and intentionally untouched until the later template phases.
- Because the event editor clears the override by posting an empty string, future callers of `saveOrganizerEvent()` should preserve that semantics instead of coercing empty values to booleans.
