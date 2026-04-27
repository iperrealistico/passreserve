# Phase 13 Patch Note

## Phase

- Phase number: `Phase 13`
- Phase title: `Shared inbox, automatic organizer provisioning, and publication controls`

## Timestamp

- Completed implementation pass at: `2026-04-27 19:52:53 Europe/Rome`

## Summary

- Added a shared mailbox inside platform admin with persistent mailbox threads, messages, and inbound attachment metadata stored in the Passreserve state layer and Prisma schema.
- Added Resend inbound receiving support through `/api/resend/inbound`, platform-admin mailbox replies from the app, and authenticated attachment redirects that fetch fresh Resend download URLs on demand.
- Replaced manual-review-only organizer onboarding with automatic provisioning that creates the organizer and organizer-admin account immediately, sends access by email, records duplicate-email applications without creating duplicate accounts, and preserves resend access recovery for failed onboarding emails.
- Introduced separate public organizer identity and publication state by adding a private-by-default publication workflow, editable pre-publication public slugs, and published-only public route resolution while keeping organizer admin access on the internal organizer slug.
- Kept the existing Next.js App Router, iron-session auth, Prisma/file-store dual persistence, Resend abstraction, and platform UI conventions intact instead of rewriting the application architecture.

## Files changed

- [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
- [`.env.example`](/Users/leonardofiori/Documents/Antigravity/gatherpass/.env.example)
- [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
- [`FINAL_LAUNCH_HANDOFF.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
- [`prisma/schema.prisma`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/schema.prisma)
- [`prisma/migrations/20260427195500_add_shared_mailbox_and_publication_controls/migration.sql`](/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260427195500_add_shared_mailbox_and_publication_controls/migration.sql)
- [`lib/passreserve-state.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-state.js)
- [`lib/passreserve-seed.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-seed.js)
- [`lib/passreserve-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js)
- [`lib/passreserve-admin-service.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js)
- [`lib/passreserve-auth-security.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-auth-security.js)
- [`lib/passreserve-email.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-email.js)
- [`lib/passreserve-i18n.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-i18n.js)
- [`lib/passreserve-mailbox.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-mailbox.js)
- [`lib/passreserve-organizer-applications.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-organizer-applications.js)
- [`lib/passreserve-organizer-identity.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-organizer-identity.js)
- [`lib/passreserve-resend.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-resend.js)
- [`app/actions.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/actions.js)
- [`app/[slug]/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/page.js)
- [`app/[slug]/admin/actions.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js)
- [`app/[slug]/admin/settings/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/settings/page.js)
- [`app/admin/actions.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/actions.js)
- [`app/admin/(platform)/layout.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/layout.js)
- [`app/admin/(platform)/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/page.js)
- [`app/admin/(platform)/organizers/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/organizers/page.js)
- [`app/admin/(platform)/organizers/[slug]/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/organizers/[slug]/page.js)
- [`app/admin/(platform)/applications/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/applications/page.js)
- [`app/admin/(platform)/emails/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/emails/page.js)
- [`app/admin/emails/attachments/[attachmentId]/route.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/emails/attachments/[attachmentId]/route.js)
- [`app/api/resend/inbound/route.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/api/resend/inbound/route.js)
- [`test/passreserve-organizer-signup.test.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-organizer-signup.test.js)
- [`test/passreserve-mailbox.test.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-mailbox.test.js)

## Checks performed

- Ran `npm run verify`.
- Confirmed lint, the full Vitest suite, UI copy audit, Prisma client generation, production build, and smoke checks all completed successfully.
- Verified the updated suite now covers organizer auto-provisioning, CAPTCHA failures, duplicate-email handling, onboarding email failure recording, publication gating, inbound mailbox ingest, outbound mailbox replies, and authenticated attachment redirects.

## Vercel deployment status

- This patch note was prepared before the phase-close Git push. The resulting `main` deployment should be verified immediately after the final push for this phase.
- If this note exists in Git history without a matching Vercel-ready deployment for the same phase-close push, treat the rollout as incomplete.

## Problems and risks

- Inbound attachment binaries are intentionally not copied into Passreserve storage in v1. Availability depends on Resend retaining the message and returning a fresh attachment URL.
- Existing active organizers are backfilled to `PUBLISHED` with `publicSlug = slug` so current public URLs remain reachable after the migration. Future slug edits are intentionally locked after publication in v1.
- The shared mailbox depends on both the sending domain and receiving/webhook setup being correct in Resend. A missing `RESEND_WEBHOOK_SECRET` or misrouted inbox will leave outbound mail working while inbound mail remains empty.

## Commit and push status

- The feature work, migration, tests, and documentation are ready for the phase-close commit and push.
- If the repository history does not contain a corresponding phase-close commit after this note, treat the handoff as incomplete.

## Notes for the next AI agent

- Preserve the separation between organizer internal slug and public slug. Public routes should continue to resolve only published organizers, while organizer-admin routes continue to use the internal slug unless the architecture is explicitly changed.
- Reuse the shared mailbox tables and `lib/passreserve-mailbox.js` for future mailbox work instead of introducing a parallel inbox model.
- Keep using Resend for outbound and inbound email. If attachment storage is introduced later, layer it behind the existing authenticated redirect flow rather than exposing raw provider links publicly.
