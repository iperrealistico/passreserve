# Passreserve.com Implementation Phases and Master To-Do

This file is the mandatory live checklist for the project.

Every future AI agent must keep this document accurate. Every meaningful action taken on the project must be reflected here in the relevant phase section.

## Status legend

- `NOT STARTED`
- `IN PROGRESS`
- `BLOCKED`
- `DONE`

## Update rules

- Update timestamps in `Europe/Rome` time.
- Update the active phase before making edits.
- Mark checklist items as soon as they are completed.
- Append timestamped activity notes as work progresses.
- When a phase is complete, record the patch note filename in the phase section.
- When a phase is complete, create a Git commit and push it to the configured GitHub remote unless the user explicitly says not to push.
- After every push, verify the related Vercel deployment or build result.
- A local build check is useful but does not replace verification of the actual Vercel deployment.
- If the Vercel deployment fails, the responsible agent must investigate and fix it before closing the work, unless the user explicitly pauses or redirects.

## Phase order

1. Phase 01: Governance, onboarding, and handoff scaffolding
2. Phase 02: Repository bootstrap and Git workflow setup
3. Phase 03: Brand, naming, and product vocabulary transformation
4. Phase 04: Event domain and data model foundation
5. Phase 05: Public information architecture and discovery surfaces
6. Phase 06: Organizer public pages and event detail experience
7. Phase 07: Organizer admin event catalog and occurrence management
8. Phase 08: Registration flow, capacity engine, and attendee lifecycle
9. Phase 09: Payments, Stripe Checkout, and payment reconciliation
10. Phase 10: Organizer operations dashboard, calendar, registrations, and payments UI
11. Phase 11: Super-admin adaptation, CMS, emails, and platform operations
12. Phase 12: Legacy removal, data migration, QA, deployment, and launch readiness
13. Phase 13: Shared inbox, automatic organizer provisioning, and publication controls

---

## Phase 01: Governance, onboarding, and handoff scaffolding

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-04_12-38-55_phase-01_workflow-bootstrap.md`

**Checklist**

- [x] Create a mandatory root-level START HERE file for future AI agents
- [x] Create a root-level master phase and to-do tracker
- [x] Define a strict mandatory reading order for future agents
- [x] Define the official naming source of truth: `Passreserve.com` public, `GATHERPASS` internal
- [x] Create the `patch-notes` directory
- [x] Create a patch-notes README with read and write rules
- [x] Create a patch note template file
- [x] Update existing root orientation documentation so the new files are visible
- [x] Record the completion of this bootstrap phase in a real patch note

**Activity log**

- `2026-04-04 12:38 CEST` Created the documentation framework for multi-agent work: START HERE, master phase tracker, patch-notes directory, patch note template, and root orientation updates.
- `2026-04-04 12:38 CEST` Locked the naming convention to `Passreserve.com` for public use and `GATHERPASS` for internal references.

---

## Phase 02: Repository bootstrap and Git workflow setup

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-04_12-44-15_phase-02_git-bootstrap-and-remote.md`

**Checklist**

- [x] Decide the working repository strategy for the new Passreserve.com codebase
- [x] Initialize or re-initialize a clean local Git repository for the active workspace if needed
- [x] Add a project-level `.gitignore` suitable for the active workspace and future Next.js application files
- [x] Define branch naming, commit hygiene, and local repository conventions
- [x] Configure the GitHub remote `https://github.com/iperrealistico/passreserve.git` as `origin`
- [x] Verify the active branch and remote configuration are ready for future commits and pushes
- [x] Separate legacy MTB Reserve snapshot material from the new active implementation workspace
- [x] Confirm which files and directories are source-of-truth versus reference-only
- [x] Add or update ignore rules as needed for generated files, secrets, and build artifacts
- [x] Verify the active workspace can be safely modified without touching the legacy snapshot by accident

**Activity log**

- `2026-04-04 12:39 CEST` Started repository bootstrap work to initialize the local Git repository for the active Passreserve.com workspace and connect it to the GitHub remote `https://github.com/iperrealistico/passreserve.git`.
- `2026-04-04 12:40 CEST` Initialized the local Git repository on branch `main`, configured `origin` to `https://github.com/iperrealistico/passreserve.git`, and added a workspace-level `.gitignore` that excludes the legacy zip and extracted MTB Reserve snapshot from active version control.
- `2026-04-04 12:40 CEST` Documented the active workspace, source-of-truth rules, and the mandatory commit-and-push requirement for future agents at phase completion.
- `2026-04-04 12:44 CEST` Completed Phase 02 and recorded the Git bootstrap handoff in `patch-notes/2026-04-04_12-44-15_phase-02_git-bootstrap-and-remote.md`.
- `2026-04-04 12:45 CEST` Created commit `4c5dae277c37d6e831877c66777aa49499e2cfb7` and pushed `main` successfully to `origin`.
- `2026-04-04 12:46 CEST` Strengthened the AI operating protocol so every future push must be followed by a Vercel deployment check, using the Vercel MCP integration when available or the local CLI as fallback.
- `2026-04-04 12:49 CEST` Verified that the new documentation-only push caused a failing Vercel deployment because the repository root did not yet contain a buildable Next.js application.
- `2026-04-04 12:50 CEST` Added a minimal root-level Next.js bootstrap app for Passreserve.com and confirmed locally that `npm install` and `npm run build` succeed before re-pushing.
- `2026-04-04 12:51 CEST` Verified through the Vercel integration that deployment `dpl_61nfL2goubJhJWeEy8BULDf6q6Hg` for commit `7b1a825178e935f9604e6b32a54fcb368c21b500` completed successfully and is now `READY`, including the production alias `passreserve.vercel.app`.

---

## Phase 03: Brand, naming, and product vocabulary transformation

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-04_14-53-07_phase-03_vocabulary-and-messaging-baseline.md`

**Checklist**

- [x] Define the final naming dictionary from legacy rental terms to event-platform terms
- [x] Replace public-facing references to MTB Reserve with Passreserve.com in the active codebase
- [x] Replace rider, shop, bike, booking, inventory, and pickup wording where appropriate
- [x] Standardize organizer, event, occurrence, registration, attendee, and payment terminology
- [x] Update shared UI copy, headers, navigation labels, and empty states
- [x] Update email copy and subject strategy for the new product language
- [x] Update metadata, titles, brand references, and SEO-facing naming
- [x] Document any intentional temporary legacy names left in code for migration reasons

**Activity log**

- `2026-04-04 14:21 CEST` Started Phase 03 work focused on the first Passreserve.com brand and vocabulary transformation pass across the minimal root app's public-facing copy, metadata, and baseline empty states.
- `2026-04-04 14:25 CEST` Replaced the bootstrap placeholder page with a branded Passreserve.com landing experience, added event-first terminology, introduced a branded not-found state, and verified the root app with `npm run build`.
- `2026-04-04 14:25 CEST` Email-copy updates, deeper legacy-term replacement, and intentional temporary-name documentation remain open because the active root app does not yet include the full organizer, admin, or email runtime from the legacy platform.
- `2026-04-04 14:26 CEST` Committed the Phase 03 brand baseline as `80f029b650d9d8f9c7e717875895bc3d9dc1956c` with message `feat: establish passreserve brand baseline` and pushed `main` to `origin`.
- `2026-04-04 14:26 CEST` Verified through the Vercel integration that deployment `dpl_3uAUMkWfysE6ipytAr5d6FLY76zb` for commit `80f029b650d9d8f9c7e717875895bc3d9dc1956c` reached `READY`, including the production alias `passreserve.vercel.app`.
- `2026-04-04 14:46 CEST` Resumed Phase 03 after completing the mandatory onboarding read-through; this pass is focused on defining the naming dictionary, replacing remaining rental-language in the active Passreserve.com workspace, and documenting intentional temporary legacy terms that must remain during migration.
- `2026-04-04 14:52 CEST` Added `09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md` as the Phase 03 source of truth for vocabulary, email subjects, messaging tone, and temporary legacy-term exceptions; updated the onboarding docs so future agents read it before implementing new work.
- `2026-04-04 14:52 CEST` Updated the live root app so public copy and metadata now use registration-first Passreserve.com language, and verified that no legacy rental terms remain in `app/`.
- `2026-04-04 14:52 CEST` Verified the Phase 03 workspace changes with `npm run build`.
- `2026-04-04 14:55 CEST` Completed the Phase 03 implementation set, created commit `50fab7681533478e0cffbe94120cdabf3e2b3359`, and pushed `main` successfully to `origin`.
- `2026-04-04 14:55 CEST` Verified through the Vercel integration that deployment `dpl_FYTnJgP5SbSw1PTVsxJ6BwJjKTfq` for commit `50fab7681533478e0cffbe94120cdabf3e2b3359` reached `READY`, including the production aliases `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

---

## Phase 04: Event domain and data model foundation

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-04_15-06-07_phase-04_event-domain-foundation.md`

**Checklist**

- [x] Finalize the target event-platform domain model
- [x] Decide which legacy models remain temporarily and which new models must be added immediately
- [x] Design `Organizer`, `EventType`, `EventOccurrence`, `Registration`, and payment-related structures
- [x] Define registration statuses and payment statuses
- [x] Define event visibility, publication, and capacity rules
- [x] Plan the Prisma schema changes and data migration approach
- [x] Review compatibility with existing auth, logs, settings, and email infrastructure
- [x] Document transitional constraints and anti-corruption rules between old and new domain concepts

**Activity log**

- `2026-04-04 14:58 CEST` Resumed work from the last completed handoff and selected Phase 04 as the active implementation phase because the next documented Passreserve.com milestone is the event domain and data model foundation.
- `2026-04-04 14:58 CEST` Completed the mandatory onboarding read-through, including the transformation plan, patch-note history, and language guide, and am now inspecting the active root workspace to define the first safe Phase 04 implementation slice.
- `2026-04-04 15:03 CEST` Added `lib/passreserve-domain.js` as the shared source of truth for the Passreserve.com event entities, registration and payment statuses, visibility and capacity rules, deposit examples, compatibility notes, and anti-corruption constraints.
- `2026-04-04 15:03 CEST` Reworked the live root page and supporting styles so the active Passreserve.com app now presents Phase 04 as a coded event-domain foundation instead of a Phase 03 vocabulary-only status page.
- `2026-04-04 15:05 CEST` Verified the Phase 04 implementation with `npm run build`, plus local `npm run dev` HTTP checks for the root route with default and mobile user agents; screenshot-based browser verification was not available because the `agent-browser` CLI is not installed in this environment.
- `2026-04-04 15:06 CEST` Marked all Phase 04 checklist items complete and wrote patch note `patch-notes/2026-04-04_15-06-07_phase-04_event-domain-foundation.md`; Git commit, push, and final Vercel verification are the remaining close-out steps.
- `2026-04-04 15:08 CEST` Created commit `949da1515a7d7ce37632b170a05c3398a1636fce` with message `feat: codify passreserve event domain foundation` and pushed `main` successfully to `origin`.
- `2026-04-04 15:08 CEST` Verified through the Vercel integration that deployment `dpl_4wykf4rdVamTVFz6zFetYU9Ar74s` for commit `949da1515a7d7ce37632b170a05c3398a1636fce` reached `READY`, including the production aliases `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

---

## Phase 05: Public information architecture and discovery surfaces

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_00-00-29_phase-05_public-discovery-surfaces.md`

**Checklist**

- [x] Redesign the root landing page for Passreserve.com
- [x] Replace bike-rental discovery intent with event discovery intent
- [x] Replace partner onboarding copy with organizer onboarding copy
- [x] Decide the search and discovery behavior for organizers, cities, and event keywords
- [x] Update signup/join request flow for organizers
- [x] Define the new public navigation and top-level user journeys
- [x] Ensure the root experience reflects the new brand and event platform value proposition

**Activity log**

- `2026-04-04 23:52 CEST` Completed the mandatory onboarding read-through in the required order, including the master tracker, patch-note history, architecture bundle, transformation plan, and Passreserve.com language guide.
- `2026-04-04 23:52 CEST` Selected Phase 05 as the active implementation slice because the prior handoff completed Phase 04 and the next documented milestone is the public information architecture and discovery surface transformation.
- `2026-04-04 23:52 CEST` Beginning Phase 05 by inspecting the active root workspace to redesign the landing and discovery experience around organizers, cities, keywords, and Passreserve.com event journeys.
- `2026-04-05 00:00 CEST` Reworked the live root experience into a Phase 05 public discovery surface with organizer, city, and keyword search states, a featured discovery board, explicit public journey mapping, and a launch-oriented organizer request flow.
- `2026-04-05 00:00 CEST` Extended the shared Passreserve.com domain module with discovery datasets, ranking rules, organizer launch options, and route-shape guidance so the landing page behavior is backed by reusable product definitions instead of inline copy only.
- `2026-04-05 00:00 CEST` Verified the Phase 05 implementation locally with `npm run build`, plus `npm run dev` HTTP checks for `/` and a missing route to confirm the new landing content and updated empty-state copy render correctly.
- `2026-04-05 00:00 CEST` Wrote patch note `patch-notes/2026-04-05_00-00-29_phase-05_public-discovery-surfaces.md` to capture the completed public discovery, navigation, and organizer-launch work.
- `2026-04-05 00:03 CEST` Created commit `1cefc39222943c581fcec65e575f03b803c5e42b` with message `feat: build passreserve discovery landing` and pushed `main` successfully to `origin`.
- `2026-04-05 00:03 CEST` Verified through the Vercel integration that deployment `dpl_BAzCTGocWHWgXokpj13VTWiYyCDL` for commit `1cefc39222943c581fcec65e575f03b803c5e42b` reached `READY`, including the production aliases `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

---

## Phase 06: Organizer public pages and event detail experience

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_18-58-16_phase-06_organizer-public-pages-and-event-details.md`

**Checklist**

- [x] Transform the public organizer page from booking storefront into event hub
- [x] Define organizer hero, description, venue info, and organizer contact presentation
- [x] Build or adapt event list and featured event presentation
- [x] Add event detail pages and route structure
- [x] Surface yearly or upcoming occurrences on organizer and event pages
- [x] Add attendee-facing policy, FAQ, and event-specific content blocks
- [x] Ensure the public experience supports photos, descriptions, and event-specific calls to action

**Activity log**

- `2026-04-05 18:43 CEST` Completed the mandatory onboarding read-through in the required order, including the phase tracker, patch-note history, architecture bundle, data-model notes, transformation plan, and Passreserve.com language guide.
- `2026-04-05 18:43 CEST` Selected Phase 06 as the active implementation slice because the prior handoff completed Phase 05 and the next documented milestone is the organizer public-page and event-detail experience.
- `2026-04-05 18:43 CEST` Beginning Phase 06 by inspecting the active root workspace and shared Passreserve.com domain module to transform the public organizer route into an event hub and add dedicated event detail routes with occurrence-driven content.
- `2026-04-05 18:54 CEST` Added a shared `lib/passreserve-public.js` source of truth for organizer hubs, event detail content, dated occurrences, venue/contact data, attendee-facing FAQ and policy blocks, and event-specific CTA links.
- `2026-04-05 18:54 CEST` Built live organizer public pages at `/{slug}` and event detail routes at `/{slug}/events/[eventSlug]`, then rewired the Phase 05 homepage to open the new routes directly from discovery results.
- `2026-04-05 18:57 CEST` Extended the global styles for organizer heroes, event lineup cards, occurrence lists, venue/contact sections, FAQ/policy blocks, photo-story support, and phase-close CTA bands across desktop and mobile layouts.
- `2026-04-05 18:57 CEST` Verified the Phase 06 implementation locally with `npm run build`, plus `npm run dev` HTTP checks for `/`, `/alpine-trail-lab`, `/alpine-trail-lab/events/sunrise-ridge-session`, and a missing route that correctly returned `404`.
- `2026-04-05 18:58 CEST` Marked Phase 06 complete and recorded patch note `patch-notes/2026-04-05_18-58-16_phase-06_organizer-public-pages-and-event-details.md`; Git commit, push, and Vercel verification are being completed next in this session.

---

## Phase 07: Organizer admin event catalog and occurrence management

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_19-31-17_phase-07_organizer-admin-events-and-occurrences.md`

**Checklist**

- [x] Replace the inventory area with event catalog management
- [x] Create event type create, update, and delete workflows
- [x] Add occurrence management as a first-class admin capability
- [x] Support one-off and recurring occurrence creation
- [x] Support price, capacity, venue, and publication overrides per occurrence
- [x] Add organizer-facing visibility controls and schedule conflict handling
- [x] Preserve useful admin shell patterns from MTB Reserve while replacing the domain content

**Activity log**

- `2026-04-05 19:12 CEST` Completed the mandatory onboarding read-through in the required order, including the master tracker, patch-note history, architecture bundle, transformation plan, and Passreserve.com language guide.
- `2026-04-05 19:12 CEST` Selected Phase 07 as the active implementation slice because the prior handoff completed Phase 06 and the next documented milestone is organizer admin event catalog and occurrence management.
- `2026-04-05 19:12 CEST` Beginning Phase 07 by inspecting the active root workspace to transform the organizer admin inventory area into Passreserve.com event catalog and occurrence management flows while preserving the practical admin shell patterns from MTB Reserve.
- `2026-04-05 19:25 CEST` Added `lib/passreserve-admin.js` as the shared organizer-admin source of truth, then built new organizer-admin routes at `/{slug}/admin/events` and `/{slug}/admin/occurrences` with event catalog CRUD, recurring occurrence planning, per-date overrides, and venue-level conflict checks.
- `2026-04-05 19:29 CEST` Extended the global visual system for the new admin shell, sidebar, planner, catalog board, and occurrence editor, and updated `package.json` so the standard `npm run dev` path uses webpack after Turbopack hit a JSON.parse failure while generating static admin paths.
- `2026-04-05 19:31 CEST` Verified the Phase 07 implementation locally with `npm run build`, `npm run dev` HTTP checks for `/alpine-trail-lab/admin`, `/alpine-trail-lab/admin/events`, `/alpine-trail-lab/admin/occurrences?event=alpine-switchback-clinic`, and `/not-a-live-route`, plus `npm run start -- --port 3001` route checks to confirm the built app serves the new organizer-admin surfaces.
- `2026-04-05 19:31 CEST` Marked Phase 07 complete and recorded patch note `patch-notes/2026-04-05_19-31-17_phase-07_organizer-admin-events-and-occurrences.md`; Git commit, push, and final Vercel verification are being completed next in this session.
- `2026-04-05 19:32 CEST` Created commit `33f9e79177b8eb4ae3f234de8a7d45dbba3789ea` with message `feat: add organizer admin event planning` and pushed `main` successfully to `origin`.
- `2026-04-05 19:33 CEST` Verified through the Vercel integration that deployment `dpl_8rPXkJULTZgzarSn9qbdBSxTcPih` for commit `33f9e79177b8eb4ae3f234de8a7d45dbba3789ea` reached `READY`, including the production aliases `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

---

## Phase 08: Registration flow, capacity engine, and attendee lifecycle

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_21-16-41_phase-08_registration-flow-and-capacity-engine.md`

**Checklist**

- [x] Transform the booking wizard into an event registration flow
- [x] Replace slot logic with occurrence selection logic
- [x] Replace bike availability logic with occurrence capacity logic
- [x] Define registration holds, expiry rules, and confirmation behavior
- [x] Support attendee details, quantity selection, and optional ticket-category structure
- [x] Update confirmation pages and registration code generation
- [x] Update related server actions, schemas, validations, and event logging
- [x] Ensure overbooking protection and pending-hold behavior are correct

**Activity log**

- `2026-04-05 20:53 CEST` Completed the mandatory onboarding read-through in the required order, including the phase tracker, patch-note history, architecture bundle, transformation plan, and Passreserve.com language guide.
- `2026-04-05 20:53 CEST` Selected Phase 08 as the active implementation slice because the prior handoff completed Phase 07 and the next documented milestone is the registration flow, capacity engine, and attendee lifecycle.
- `2026-04-05 20:53 CEST` Beginning Phase 08 by inspecting the current public event routes, organizer-admin seeds, and shared Passreserve.com domain modules to replace slot-style booking with occurrence-based registration holds, attendee capture, and capacity-aware confirmation behavior.
- `2026-04-05 21:08 CEST` Added `lib/passreserve-registrations.js` as the shared Phase 08 source of truth for occurrence capacity math, ticket-category options, signed hold and confirmation tokens, validation rules, lifecycle statuses, and console-safe registration event logging.
- `2026-04-05 21:08 CEST` Added new attendee routes at `/{slug}/events/[eventSlug]/register`, `/{slug}/events/[eventSlug]/register/confirm/[holdToken]`, and `/{slug}/events/[eventSlug]/register/confirmed/[confirmationToken]`, then updated the homepage, organizer hubs, and event detail pages so public CTAs now open the live registration flow instead of phase-placeholder messaging.
- `2026-04-05 21:15 CEST` Verified Phase 08 locally with `npm run build`, built-server HTTP checks for `/`, `/alpine-trail-lab/events/sunrise-ridge-session`, and `/alpine-trail-lab/events/sunrise-ridge-session/register?occurrence=atl-sunrise-2026-04-18`, plus a Playwright browser flow that created a hold, reached the confirmation page, confirmed the registration, and landed on the final confirmed page with generated code `PR-04D64A5F94`.
- `2026-04-05 21:16 CEST` Recorded patch note `patch-notes/2026-04-05_21-16-41_phase-08_registration-flow-and-capacity-engine.md`; Git commit, push, and Vercel verification are being completed next in this session.
- `2026-04-05 21:17 CEST` Created commit `1351c26c94ba020b520217e0620c809b174e20c2` with message `feat: add passreserve registration flow` and pushed `main` successfully to `origin`.
- `2026-04-05 21:18 CEST` Verified through the Vercel integration that deployment `dpl_2kmGhB24QK6McDMR4PxXzFur2jVZ` for commit `1351c26c94ba020b520217e0620c809b174e20c2` reached `READY`, including the production aliases `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

---

## Phase 09: Payments, Stripe Checkout, and payment reconciliation

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_22-47-44_phase-09_payments-stripe-checkout-and-payment-reconciliation.md`

**Checklist**

- [x] Add Stripe configuration and environment requirements
- [x] Define 0 percent, deposit, and full-payment collection rules
- [x] Create Stripe Checkout Session creation flow
- [x] Add success and cancel return handling
- [x] Add webhook handling as the final payment source of truth
- [x] Store payment references and reconciliation metadata
- [x] Support partial online payment versus amount due at event
- [x] Add payment-state logging, failure handling, and idempotency safeguards

**Activity log**

- `2026-04-05 22:11 CEST` Completed the mandatory onboarding read-through in the required order, including the phase tracker, patch-note history, architecture bundle, business-rules notes, transformation plan, and Passreserve.com language guide.
- `2026-04-05 22:11 CEST` Selected Phase 09 as the active implementation slice because the prior handoff completed Phase 08 and the next documented milestone is payments, Stripe Checkout, and payment reconciliation.
- `2026-04-05 22:11 CEST` Beginning Phase 09 by inspecting the current registration flow, shared Passreserve.com payment math, and route structure to add Stripe-aware confirmation, return handling, and webhook-backed payment truth without skipping the existing hold-and-confirm lifecycle.
- `2026-04-05 22:47 CEST` Added the Phase 09 payment layer across the registration engine and attendee routes: Stripe environment requirements, live-versus-preview Checkout session creation, pending-payment payloads, success and cancel return routes, checkout resume handling, and finalized payment-state copy for zero-online, deposit, and fully online collection cases.
- `2026-04-05 22:47 CEST` Added the Stripe webhook verification endpoint plus structured Phase 09 payment logging, stored provider session and reconciliation metadata inside the signed registration lifecycle payloads, and threaded payment fingerprints through Checkout metadata as a lightweight idempotency safeguard for the current sample-data architecture.
- `2026-04-05 22:47 CEST` Verified Phase 09 locally with `npm run build`, `npm run start -- --port 3001`, headed browser checks of the paid and zero-online attendee flows, a webhook fallback POST to `/api/stripe/webhooks`, and a `/favicon.ico` redirect fix so browser verification no longer emits a false 404.
- `2026-04-05 22:50 CEST` Committed the initial Phase 09 implementation as `fed77ab00f694cc3ab626294b8cea0700d19d0db`, pushed `main`, and verified through the Vercel integration that deployment `dpl_5aZ7WJnWfThrC1iZN5akBjoKqb4z` reached `READY` on the production aliases including `passreserve.vercel.app`.
- `2026-04-05 22:52 CEST` Production verification surfaced a stale Phase 08 metric and footer string on the homepage, so a follow-up Phase 09 consistency fix is being shipped immediately to keep the public Passreserve.com landing page aligned with the live payment phase.

---

## Phase 10: Organizer operations dashboard, calendar, registrations, and payments UI

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_23-14-01_phase-10_organizer-operations-dashboard-and-payments-ui.md`

**Checklist**

- [x] Replace booking-centric dashboard metrics with registration and revenue metrics
- [x] Adapt the calendar to show occurrences, attendee counts, and payment state summaries
- [x] Build organizer views for registrations and attendee operations
- [x] Add organizer workflows for confirmation, cancellation, no-show, and reconciliation
- [x] Add organizer-facing payment visibility and amount-due tracking
- [x] Preserve the practical operations-first admin UX of the legacy app
- [x] Audit timezone behavior for organizer-local operations

**Activity log**

- `2026-04-05 22:58 CEST` Completed the mandatory onboarding read-through in the required order, including the master tracker, patch-note history, architecture bundle, transformation plan, and Passreserve.com language guide.
- `2026-04-05 22:58 CEST` Selected Phase 10 as the active implementation slice because the prior documented milestone is Phase 09 and the next pending work is the organizer operations dashboard, calendar, registrations, and payments UI.
- `2026-04-05 22:58 CEST` Beginning Phase 10 by inspecting the current Passreserve.com organizer routes, registration engine, and payment-state helpers to replace booking-centric operations views with registration, occurrence, and amount-due workflows.
- `2026-04-05 23:11 CEST` Added `lib/passreserve-operations.js` as the Phase 10 operations source of truth, then built new organizer-admin routes at `/{slug}/admin/dashboard`, `/{slug}/admin/calendar`, `/{slug}/admin/registrations`, and `/{slug}/admin/payments` with registration queues, payment ledgers, organizer-local calendar groupings, and client-side organizer action workflows.
- `2026-04-05 23:11 CEST` Reworked the shared organizer-admin shell so `/{slug}/admin` now redirects to the dashboard and the sidebar/topbar frame Phase 10 around active registrations, online collection, venue balances, and organizer-local timezone handling instead of Phase 07 planning-only metrics.
- `2026-04-05 23:13 CEST` Verified the Phase 10 implementation with `npm run build`, `npm run start -- --port 3101`, HTTP checks for `/alpine-trail-lab/admin`, `/alpine-trail-lab/admin/dashboard`, `/alpine-trail-lab/admin/calendar`, `/alpine-trail-lab/admin/registrations`, `/alpine-trail-lab/admin/payments`, and `/not-a-live-route`; port `3001` was already in use, so production-route verification moved to port `3101`.
- `2026-04-05 23:14 CEST` Recorded patch note `patch-notes/2026-04-05_23-14-01_phase-10_organizer-operations-dashboard-and-payments-ui.md`, created phase-close commit `82c1120`, and pushed `main` successfully to `origin`.
- `2026-04-05 23:16 CEST` Vercel MCP verification failed because the integration required auth, and the local `vercel` CLI fallback also lacked credentials, so deployment verification fell back to the public production alias.
- `2026-04-05 23:16 CEST` Verified `https://passreserve.vercel.app/alpine-trail-lab/admin/dashboard` and `https://passreserve.vercel.app/alpine-trail-lab/admin/payments` returned `200 OK` and served the new Phase 10 content, confirming the pushed production deployment is live on the public alias.

---

## Phase 11: Super-admin adaptation, CMS, emails, and platform operations

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-05_23-36-34_phase-11_platform-admin-cms-and-ops.md`

**Checklist**

- [x] Rename and adapt tenant-management flows into organizer-management flows
- [x] Update super-admin listings, detail pages, and support actions
- [x] Update global settings, SEO, and platform branding references
- [x] Adapt the about/CMS content to the event-platform story
- [x] Update email template scenarios for registrations, payments, organizers, and operations
- [x] Ensure signup requests, logs, and health pages remain useful in the new product
- [x] Review admin auth copy and platform-wide operational terminology

**Activity log**

- `2026-04-05 23:22 CEST` Completed the mandatory onboarding read-through in the required order, including the phase tracker, patch-note history, architecture bundle, transformation plan, and Passreserve.com language guide.
- `2026-04-05 23:22 CEST` Selected Phase 11 as the active implementation slice because the prior handoff completed Phase 10 and the next unfinished milestone is the super-admin adaptation, CMS, emails, and platform operations layer.
- `2026-04-05 23:22 CEST` Beginning Phase 11 by inspecting the current Passreserve.com `app/admin` surfaces, shared platform modules, and public CMS/email copy to replace remaining rental-era global-admin language with organizer, event, registration, and payment operations.
- `2026-04-05 23:31 CEST` Added `lib/passreserve-platform.js` as the shared Phase 11 source of truth, then built the missing platform-admin route map at `/admin`, `/admin/login`, `/admin/organizers`, `/admin/organizers/[slug]`, `/admin/settings`, `/admin/about`, `/admin/emails`, `/admin/logs`, `/admin/health`, plus a new public `/about` route for the Passreserve.com story.
- `2026-04-05 23:31 CEST` Updated the homepage, global metadata, discovery metrics, and not-found messaging so the live app now advertises organizer admin and platform-admin surfaces instead of stopping at the earlier payment-phase framing.
- `2026-04-05 23:35 CEST` Verified Phase 11 locally with `npm run build`, `npm run start -- --port 3201`, HTTP content checks for `/`, `/about`, `/admin/login`, `/admin`, `/admin/settings`, `/admin/about`, `/admin/emails`, `/admin/logs`, `/admin/health`, `/admin/organizers/alpine-trail-lab`, and `/not-a-live-route` returning `404`.
- `2026-04-05 23:36 CEST` Marked Phase 11 complete and recorded patch note `patch-notes/2026-04-05_23-36-34_phase-11_platform-admin-cms-and-ops.md`; Git commit, push, and Vercel verification are being completed next in this session.
- `2026-04-05 23:38 CEST` Created phase-close commit `d85b4745920624460ac990db1a1ac4c2aee7da32` with message `feat: add passreserve platform admin layer` and pushed `main` successfully to `origin`.
- `2026-04-05 23:38 CEST` Verified through the Vercel integration that deployment `dpl_ACZELkB3tjMr7cN2PdvvCCZzxrxA` for commit `d85b4745920624460ac990db1a1ac4c2aee7da32` reached `READY`, including the production aliases `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

---

## Phase 12: Legacy removal, data migration, QA, deployment, and launch readiness

**Status:** `DONE`

**Patch note:** `patch-notes/2026-04-11_10-48-31_phase-12_production-runtime-auth-and-launch-readiness.md`

**Checklist**

- [x] Remove or isolate obsolete bike-rental UI and business logic
- [x] Decide final migration or retirement path for legacy tables and fields
- [x] Replace dangerous build and deployment behaviors with safer alternatives
- [x] Restore a reliable testing baseline for unit, integration, and end-to-end verification
- [x] Improve lint and type-safety health to a manageable baseline
- [x] Verify auth, timezone, email, and payment correctness end to end
- [x] Review Vercel deployment readiness and environment completeness
- [x] Update root documentation to describe the finished Passreserve.com product
- [x] Confirm release readiness and produce final handoff documentation

**Activity log**

- `2026-04-05 23:45 CEST` Completed the mandatory onboarding read-through in the required order, including the phase tracker, full patch-note history, architecture bundle, transformation plan, and Passreserve.com language guide.
- `2026-04-05 23:45 CEST` Selected Phase 12 as the active implementation slice because Phases 01 through 11 are complete and the remaining project work now centers on cleanup, hardening, launch-readiness, and legacy removal.
- `2026-04-05 23:45 CEST` Beginning Phase 12 by auditing the active Passreserve.com workspace for the highest-priority safe-first tasks: build and deployment safety, verification baseline repair, remaining legacy artifacts, and release-readiness blockers.
- `2026-04-05 23:54 CEST` Completed the first Phase 12 hardening pass: audited the active workspace and confirmed the checked-in Passreserve.com build path is already non-destructive (`next build` only), while active public and admin routes no longer expose bike-rental UI or legacy operational language outside reference-only docs and sample content notes.
- `2026-04-05 23:54 CEST` Added a real root `README.md`, repo-native lint and test scripts, `eslint.config.mjs`, `vitest.config.mjs`, a built-app smoke verification script in `scripts/smoke-check.mjs`, and unit coverage for payment math, discovery ranking, registration flow, and organizer operations transitions.
- `2026-04-05 23:54 CEST` Verified the new local quality baseline with `npm run lint`, `npm run test`, and `npm run verify` (lint + unit tests + production build + built-route smoke checks), and confirmed the initial dev-tool install worked cleanly in the active Passreserve.com workspace.
- `2026-04-05 23:56 CEST` Followed up the npm audit advisory by upgrading `next` from `16.1.6` to `16.2.2`, reran `npm install` and `npm run verify`, and confirmed the workspace now reports `found 0 vulnerabilities` from npm audit.
- `2026-04-05 23:54 CEST` Phase 12 remains `IN PROGRESS`; auth/timezone/email/payment end-to-end validation, environment and Vercel readiness review, legacy table retirement decisions, and final release handoff are still open before a phase-close patch note, commit, push, and deployment verification can occur.
- `2026-04-06 00:15 CEST` Started the frontend regrounding pass requested by the user: reworking the public and admin-facing UI away from phase-demo messaging and toward a warmer, community-oriented event product with clearer attendee and organizer journeys.
- `2026-04-11 10:47 CEST` Resumed Phase 12 closeout work to finish the production runtime pass, verify the repo state, and replace the remaining stale documentation with final Passreserve.com architecture, operations, and launch guidance.
- `2026-04-11 10:47 CEST` Added the clean Passreserve Prisma migration history under `prisma/migrations`, keeping the production path on checked-in migrations instead of schema push behavior, and locked the fresh-launch retirement decision for legacy MTB Reserve tables and fields.
- `2026-04-11 10:47 CEST` Replaced the stale root runtime docs with final Passreserve.com documentation in `README.md`, `000_START_HERE_AI.md`, `00_README_FIRST.md`, `02_ARCHITECTURE_AND_RUNTIME.md`, `04_DATA_MODEL_AND_BUSINESS_RULES.md`, and `06_OPERATIONS_TESTING_AND_RISKS.md`, and added `FINAL_LAUNCH_HANDOFF.md` with the exact owner-side domain, database, Stripe, Resend, and Vercel launch steps.
- `2026-04-11 10:47 CEST` The repo now has a manageable quality baseline for the completed JavaScript runtime: lint is green, tests are green, verification is codified in `npm run verify`, and runtime validation now relies on Prisma schema constraints plus `zod` and auth/session guards rather than the earlier incomplete TypeScript-era notes in the handoff bundle.
- `2026-04-11 10:48 CEST` Wrote the Phase 12 patch note at `patch-notes/2026-04-11_10-48-31_phase-12_production-runtime-auth-and-launch-readiness.md`; the final Git push and Vercel deployment verification are being completed next in this same session before the phase is marked `DONE`.
- `2026-04-11 10:51 CEST` Re-ran the full completion gate with `npm run verify` and confirmed lint, tests, UI copy audit, Prisma generation, production build, and smoke checks all pass after the runtime, migration, and documentation changes.
- `2026-04-11 10:51 CEST` Created phase-close commit `1e94d8d873fc2efe06964b2a7808ad7c4ce020b8` with message `feat: finalize passreserve production runtime` and pushed `main` successfully to `origin`.
- `2026-04-11 10:51 CEST` Verified through the Vercel integration that deployment `dpl_3Z1e6LYT1c1y7MgEY9JPcDb5cu6b` for commit `1e94d8d873fc2efe06964b2a7808ad7c4ce020b8` reached `READY`, including aliases `passreserve.vercel.app`, `passreserve-iperrealisticos-projects.vercel.app`, and `passreserve-git-main-iperrealisticos-projects.vercel.app`.
- `2026-04-24 10:54 CEST` Resumed a Phase 12 hardening follow-up focused on admin authentication after comparing MTB Reserve and Passreserve: adding login throttling plus token-version session invalidation without regressing Passreserve's multi-admin model.
- `2026-04-24 11:05 CEST` Added admin `tokenVersion` fields, a durable `AuthRateLimit` persistence layer, organizer/platform login throttling, session validation guards, and regression tests; verified the full workspace with `npm run verify`.
- `2026-04-24 12:58 CEST` Added mixed event-level ticket catalogs with bilingual ticket content, multi-ticket registration line items, attendee-to-ticket assignment, organizer occurrence-filtered participant views, server-side PDF exports, and platform CTA cleanup; verified the workspace again with `npm run verify`.
- `2026-04-24 14:26 CEST` Tightened the post-ticket UI pass from visual QA: added breathing room under the organizer top nav, improved admin card heading/body rhythm, rebuilt the real-image gallery editor layout, fixed the organizer reminder checkbox row, and reworked public ticket cards so price and quantity controls are clearer; verifying again with `npm run verify`.
- `2026-04-24 14:42 CEST` Added an event-level dietary toggle so organizers can switch allergy and food-restriction questions on or off per event; when disabled the public registration flow hides that section and the backend discards any dietary payload for that event before saving.
- `2026-04-24 14:49 CEST` Added a contextual active item to the public top navigation on organizer and event detail pages so the current public page is explicitly represented in the menu bar instead of leaving the user between global nav states.
- `2026-04-24 14:50 CEST` Replaced the About-page AI visuals with a fresh minimal image set generated in built-in image tool mode, using calm neutral UI mockups with placeholder bars/boxes instead of textual GUI copy; copied the final PNG assets into `public/images/about` and updated the page references from SVG to PNG.
- `2026-04-24 14:54 CEST` Fixed the final About CTA cards so their headings explicitly render in white on the dark navy and green backgrounds instead of inheriting the global heading color and disappearing into the cards.
- `2026-04-24 15:08 CEST` Started the organizer-backoffice simplification pass: reduced the primary organizer navigation to Overview, Schedule, Events, Registrations, and Settings; moved billing out of the primary nav; and began consolidating the old Dates route into a Schedule-first flow centered on the calendar route.
- `2026-04-24 15:39 CEST` Continued the organizer UX optimization pass: regrouped Schedule by day instead of a flat date list, added summary counters, gave Events direct links into schedule and participant work, and collapsed verbose participant/payment details in Registrations so the live queue is much faster to scan.
- `2026-04-24 15:48 CEST` Added a dedicated root checklist at `ORGANIZER_BACKOFFICE_UX_TODO.md` so the remaining organizer-backoffice simplification work is tracked as an explicit Markdown todo instead of staying implicit in chat analysis.
- `2026-04-24 15:56 CEST` Advanced the organizer optimization pass again: upgraded Schedule with real `Month / Week / List` navigation plus day-focus links, added compact and focus modes to Registrations, refreshed event-to-operations shortcuts, updated the dedicated UX todo, and re-ran `npm run verify` successfully.
- `2026-04-24 16:14 CEST` Continued the organizer-backoffice simplification pass with two higher-structure UX changes: turned Schedule into a real workbench by placing day focus next to the edit form in non-list modes, and rebuilt Events into a master-detail workspace with a persistent event list plus focused `Overview / Basics / Tickets / Publish` panels; the root organizer UX todo was updated again and `npm run verify` remained green.
- `2026-04-24 16:24 CEST` Kept pushing the organizer simplification pass: rebuilt Overview into a more task-first dashboard with direct action cards for schedule, payments, and participant restrictions, and restructured Settings into clearer `Organization / Notifications / Account / Billing / Security` blocks while preserving the single safe save flow; updated the organizer UX todo again and re-ran full verification successfully.
- `2026-04-24 16:37 CEST` Completed the next organizer-operations slice by adding a true event-day/check-in mode to Registrations for a single selected date, including quick live-arrival handling, venue payment capture, open-vs-closed registration grouping, and event-day summary counters; updated the organizer UX todo and re-ran `npm run verify` successfully again.
- `2026-04-24 16:48 CEST` Started the cleanup-oriented organizer UX pass aimed at the last major friction points: a lighter shared organizer shell, a shorter-feeling event form, moving long registration details into a side panel, and deleting legacy organizer experience components that no longer participate in the active UI.
- `2026-04-24 16:48 CEST` Lightened the shared organizer shell again by removing the old intro-summary card grid in favor of compact pills and stats, then tightened the visual weight of the shell header so every organizer page starts closer to an operational control bar than a landing-page hero.
- `2026-04-24 16:48 CEST` Shortened the Events editing experience by keeping the top-level accordion structure and then splitting the bilingual content block into per-language disclosures with completion hints, so organizers can focus on one locale at a time instead of scrolling through one long bilingual form.
- `2026-04-24 16:48 CEST` Finished moving heavy registration detail out of the main queue cards into the dedicated side-panel detail workspace, leaving compact cards focused on status, ticket, amounts, restrictions, and the primary action to open the full detail.
- `2026-04-24 16:48 CEST` Deleted the unused legacy organizer experience files under dashboard, calendar, occurrences, events, payments, and registrations so the codebase matches the new active organizer IA instead of keeping duplicate dead-end implementations around.
- `2026-04-27 17:42 CEST` Hardened the public organizer onboarding flow by switching the default launch inbox to `contact@leonardofiori.it`, adding ALTCHA open-source verification with dedicated challenge and replay checks, enforcing organizer-request submit throttling by IP, and layering a honeypot plus timing gate onto the homepage request form.
- `2026-04-27 17:54 CEST` Rebalanced the homepage organizer CTAs so `Request access` is now the dominant primary action with a larger high-contrast button, while `Open organizer access` remains available as a smaller low-emphasis secondary link; re-ran `npm run verify` successfully before publication.
- `2026-04-27 18:01 CEST` Tightened the follow-up homepage CTA balance pass from visual review: moved the organizer actions into a dark inset panel that matches the attendee card rhythm more closely, normalized the request button back to a standard-height pill inside that panel, and kept organizer access available as a quieter secondary action while preserving the dark theme; re-ran `npm run verify` successfully again.
- `2026-04-27 18:11 CEST` Reworked the homepage organizer CTA zone into a single split giant control that mirrors the attendee search module proportions more closely: the left half is now a bright `Request access` action, the right half is a darker embedded `Open organizer access`, and both halves share one rounded squircle shell; re-ran `npm run verify` successfully before publishing the follow-up.
- `2026-04-27 18:13 CEST` Matched the organizer CTA block to the attendee search module dimensions more literally by restoring the same `search-lab` padding and label rhythm, then sizing the split control to the combined input-plus-actions height so the right card now lands at the same overall block dimensions while preserving the dark theme; re-ran `npm run verify` successfully before publishing again.
- `2026-04-27 18:32 CEST` Rolled back the mistaken organizer-module rebalancing pass and corrected the intended issue directly by tightening the organizer summary spacing and desktop text scale, which lifts the `Organizer access` module to sit closer to the `Search events` label height without introducing extra interface rows; re-ran `npm run verify` successfully before republishing.
- `2026-04-24 17:05 CEST` Completed the last major organizer UX pass still on the todo: Schedule now surfaces strong operational states for draft, published, low-capacity, and payments-blocked dates across month, week, list, and focused-day views instead of leaving those statuses buried in the edit form.
- `2026-04-24 17:05 CEST` Decided in favor of adding a true table mode to Registrations, so organizers now have `compact / table / detail / event day` depending on whether they need scan speed, dense queue review, full side-panel inspection, or live event handling.
- `2026-04-24 17:05 CEST` Simplified bilingual editing further in both Events and Settings by defaulting to a single active locale and introducing explicit `Add/Edit Italian` and `Add/Edit English` controls, while preserving the existing single-language fallback behavior on the public frontend.
- `2026-04-24 17:05 CEST` Finished the organizer copy sweep from the old `Dates` module wording to `Schedule` wherever the UI was still referring to the route or navigation concept rather than to literal event dates.
- `2026-04-24 17:25 CEST` Completed the final organizer responsive pass for mobile and tablet by tightening the shared shell/header breakpoints, making action groups expand more gracefully on narrow screens, turning the month schedule into a horizontal-scrolling calendar surface instead of a cramped seven-column squeeze, relaxing the week grid into staged tablet breakpoints, and forcing dense registration tables into explicit horizontal scroll rather than layout breakage.
- `2026-04-24 17:25 CEST` Re-ran the full completion gate with `npm run verify` after the responsive organizer CSS and schedule-viewport changes; lint, tests, copy audit, Prisma generation, production build, and smoke checks all passed successfully again.
- `2026-04-24 17:26 CEST` Created organizer UX closeout commit `a216f83` with message `feat: streamline organizer backoffice ux` and pushed `main` successfully to `origin`.
- `2026-04-24 17:26 CEST` Verified through the Vercel CLI that production deployment `dpl_2gCTd7qi5nBdh5TfFreuTkqgjmmg` for Passreserve reached `READY` and is aliased to `passreserve.com`, `passreserve.vercel.app`, `passreserve-iperrealisticos-projects.vercel.app`, and `passreserve-git-main-iperrealisticos-projects.vercel.app`; live HTTP checks for `/`, `/sillico`, and `/sillico/admin/login` all returned `200`.
- `2026-05-25 11:18 CEST` Investigated the live organizer admin events crash reported on `passreserve.com/sillico/admin/events`, reproduced the same `TypeError: Cannot read properties of null (reading 'toLowerCase')` locally with a legacy-style event record that had `visibility = null`, then hardened the organizer-events admin payload and UI fallbacks so malformed visibility/gallery data degrades safely instead of returning `500`; verified the fix with a targeted Vitest regression plus a browser reload against the corrupted local state.
- `2026-05-25 14:18 CEST` Re-opened the live `sillico` organizer incident after a failed login plus a fresh production `ERROR 3896147205` on `/sillico/admin/events`; confirmed via production DB inspection that the organizer admin email was active but the stored password no longer matched the requested credentials, reset that password safely through the platform recovery path with audit logging, then reproduced the events crash on Vercel and traced it to `selectedEvent?.id === focusedEvent?.id` evaluating true when both were null for organizers with zero events. Fixed the route by making the detail edit-id computation null-safe, added a regression for the empty-events case, and also hardened organizer settings so email/name edits stay bound to the active organizer admin account instead of a stale inactive primary record; verified with targeted Vitest coverage and a successful local production build.
- `2026-05-26 13:03 CEST` Started the organizer manual-registration rollout by converting `10_ORGANIZER_MANUAL_REGISTRATION_PLAN.md` into an explicit 10-phase delivery checklist, extracting a new shared `lib/passreserve-registration-core.js` module for attendee/item/totals/registration payload construction, rewiring the public hold flow to consume that shared builder, and adding deterministic regression coverage for both the core builder and the date-sensitive public registration tests; verified with targeted Vitest suites plus `npm run build`.
- `2026-05-26 13:17 CEST` Completed Phase 2 of the organizer manual-registration backend by extracting the shared registration-build validations into `lib/passreserve-registration-core.js`, adding the new `lib/passreserve-organizer-registrations.js` service for organizer-created holds, unpaid confirmations, payment-link flows, offline deposits, and fully paid entries across both file-state and Prisma runtimes, then covering the new lifecycle with dedicated Vitest regressions and a fresh production build.
- `2026-05-26 13:25 CEST` Completed Phase 3 of the organizer manual-registration rollout by wiring `createOrganizerRegistrationAction()` into `app/[slug]/admin/actions.js`, adding the new admin route shell at `/{slug}/admin/registrations/new`, and preloading that workspace with real organizer event/date context, mode selection, and Phase-3 readiness messaging; verified again with the registration regression suites plus a production build showing the new route.
- `2026-05-26 13:38 CEST` Completed Phase 4 of the organizer manual-registration rollout by replacing the placeholder route shell with a real Context step at `/{slug}/admin/registrations/new`, adding live event/date/language/origin selection with deep-link synchronization, surfacing the selected-context summary for capacity and ticket readiness, and exposing prefilled `New registration` plus `Add walk-in` entry points from the existing organizer registrations queue; verified with ESLint, the existing registration regression suites, and a fresh production build.
- `2026-05-26 13:46 CEST` Completed Phase 5 of the organizer manual-registration rollout by turning the admin route into a two-step wizard, adding the live ticket-mix builder with capacity-aware quantity controls, dynamically pooling attendee cards from the selected ticket quantities, hiding or showing dietary inputs from the event settings, and keeping the queue and event-day deep links aligned with the new `step=tickets` state; verified with ESLint, the existing registration regression suites, and a fresh production build.
- `2026-05-26 13:55 CEST` Completed Phase 6 of the organizer manual-registration rollout by extending the wizard with the `Payment and confirmation` step, wiring all five organizer confirmation modes into the UI with live status and financial outcome previews, syncing `step=payment` plus selected mode back into the deep link, and surfacing a persistent aside summary for totals, expected status, attendee path, and internal note context; verified with ESLint, the existing registration regression suites, and a fresh production build.
- `2026-05-26 14:14 CEST` Completed Phase 7 of the organizer manual-registration rollout by adding persisted `Registration.source/origin` metadata across Prisma and file-state, wiring organizer-manual audit events plus attendee/organizer email delivery for pending confirmation, payment-requested, and confirmed manual flows, updating email copy/templates so staff-created registrations are labeled truthfully, and extending the regression suite plus Prisma generation/build validation to cover the new metadata, audit, and email hooks.
- `2026-05-26 14:22 CEST` Completed Phase 8 of the organizer manual-registration rollout by extending the organizer registrations admin payload with localized `source/origin` labels and tones, adding queue-level source/origin filters plus badges across compact/table/detail/event-day views, surfacing manual-entry notes in the detail panel, and making operational/full participant PDF exports respect the same source/origin filters while printing registration provenance in the document; verified with ESLint, a new organizer-admin registrations regression, the existing registration suites, and a fresh production build.
- `2026-05-26 14:29 CEST` Completed Phase 9 of the organizer manual-registration rollout by tightening the client-side guardrails around ended or out-of-window occurrences, surfacing duplicate lead-email warnings from the live organizer queue, adding a lead-contact shortcut plus attendee completeness feedback inside the ticket builder, and introducing a compact mobile summary while keeping the desktop aside intact; verified with ESLint, extended registration regressions including dietary payload coverage, and a fresh production build.
- `2026-05-26 14:40 CEST` Completed Phase 10 of the organizer manual-registration rollout by turning the placeholder fourth step into a real review workspace, wiring the wizard to `createOrganizerRegistrationAction()` with end-to-end submit payloads, surfacing organizer-facing success state plus next-action links after creation, and closing the related plan/docs handoff so the feature now creates real registrations from inside the backoffice without a parallel flow; verified with ESLint, the targeted registration regression suites, and a fresh production build.
- `2026-05-26 14:52 CEST` Finished the post-closeout hardening pass on manual registration by making the wizard prefer the first still-usable occurrence instead of defaulting to historical dates, aligning the smoke suite with the current `/events` discovery copy plus non-visible-script filtering, stabilizing smoke data dates in the temp state file, and completing authenticated organizer browser smoke on both desktop and mobile alongside a full green `npm run verify`.
- `2026-05-26 14:53 CEST` Closed the remaining organizer-manual parity gap after Phase 10 by adding dedicated regressions for `cancel`, `mark paid`, `mark attended`, `mark no-show`, and venue reconciliation on `ORGANIZER_MANUAL` registrations, then fixing the file-state `mark_paid` path so an already reconciled venue balance now ends in `CONFIRMED_PAID` instead of the stale partial-paid state; verified with ESLint, the targeted Vitest suites, and a fresh production build.
- `2026-05-26 15:21 CEST` Completed Phase 1 of the Stripe auto-refund rollout by splitting the refund plan into 10 implementation phases, introducing a shared refund-intelligence helper for eligibility, pending refund state, and reusable Stripe payment references, surfacing that summary inside the organizer admin payload, and making cancellation email copy future-ready for `refund initiated` once pending refund ledger entries start being written; verified with targeted ESLint, new refund/admin regression coverage, and a full green `npm run verify`.
- `2026-05-26 15:33 CEST` Completed Phase 2 of the Stripe auto-refund rollout by turning the refund summary into a localized organizer read model with explicit `available / pending / completed / manual review / no online refund` states, surfacing those states across registrations compact/detail/table/event-day surfaces plus the payments-focused queue summary, widening the payments focus filter to include refund-active registrations, and validating the UI with targeted regressions, a full green `npm run verify`, and an authenticated browser check against a local pending-refund fixture.
- `2026-05-26 15:40 CEST` Completed Phase 3 of the Stripe auto-refund rollout by adding the Stripe refund primitive in `lib/passreserve-payments.js`, including a request builder for Refunds API calls, stable Passreserve idempotency-key generation, connected-account request options for direct charges, preview-mode fallback output, and normalized refund summaries for later ledger orchestration; verified with dedicated payment/refund unit coverage, a fresh production build, and a full green `npm run verify`.
- `2026-05-26 15:56 CEST` Completed Phase 4 of the Stripe auto-refund rollout by adding the new `cancelOrganizerRegistration()` orchestrator for single-registration `cancel only` versus `cancel + refund`, delegating organizer cancel actions through that service, persisting the first local `RegistrationPayment(kind=REFUND,status=PENDING)` ledger entries with Stripe refund metadata, and covering the happy-path plus eligibility guards with dedicated organizer refund regressions; verified with targeted ESLint, expanded admin/manual/refund test coverage, and a full green `npm run verify`.
- `2026-05-26 16:00 CEST` Completed Phase 5 of the Stripe auto-refund rollout by extending Stripe webhook reconciliation so `charge.refunded` now closes a matching local `REFUND/PENDING` ledger row into `REFUNDED`, preserves the webhook as the source of truth for `refundedCents`, keeps the legacy fallback path for external refunds without a local request, and covers both reconciliation branches with dedicated webhook regressions plus a full green `npm run verify`.
- `2026-05-26 16:06 CEST` Completed Phase 6 of the Stripe auto-refund rollout by replacing the bare organizer `Cancel` action with a dedicated cancel/refund modal in both detail mode and event-day mode, surfacing online/refund summary amounts plus explicit `cancel only` vs `cancel + refund` choices, preserving the current registrations workspace through a new `returnTo` redirect path, and wiring success/error banners for `cancelled` versus `refund requested`; verified with targeted ESLint, a fresh production build, and a full green `npm run verify`.
- `2026-05-26 19:39 CEST` Rebased the full organizer manual-registration plus Stripe auto-refund rollout on top of the already-live `main` fixes (`4547a69`, `402ce0e`), resolved the overlapping master-log and regression-test conflicts without dropping coverage, then re-ran `npm run verify` successfully on the rebased tree with lint, 94 Vitest assertions, copy audit, Prisma generate, production build, and smoke checks all green.
- `2026-05-26 19:43 CEST` Pushed commit `8d58160` (`feat: ship organizer registrations and auto refunds`) to `origin/main`, verified Vercel production deployment `dpl_FdhQEjMtCBzWD81XopxChjfCHb1L` reached `READY` for `passreserve.com`, and confirmed live `200` responses for `/`, `/events`, `/organizer-access`, and `/sillico/admin/login` while the protected manual-registration route redirects unauthenticated organizers back to login as expected. During the same publish pass, audited the canonical Vercel Production env and confirmed `NEXT_PUBLIC_BASE_URL` is present but `DATABASE_URL` is configured as an empty string while `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are absent, so Stripe Connect onboarding and automatic refunds remain live-blocked by runtime configuration rather than code.
- `2026-06-08 10:29 CEST` Investigated a repeated `/sillico` organizer-login incident reported against `leterredelmoro@gmail.com` even though the credentials were still valid. Production database inspection confirmed the organizer admin was active, the bcrypt hash still matched `sylvico020226`, and the live auth failure pattern was `rate-limited` rather than `invalid`. The underlying production issue was schema drift: commit `8d58160` had been deployed while the canonical database still lacked migrations `20260526143000_add_registration_source_and_origin` and `20260526143500_add_manual_registration_email_templates`, leaving `Registration.source` and `Registration.origin` absent in Postgres. That mismatch could push the runtime into file-store fallback after Prisma schema errors, which in turn made organizer auth and throttling behave against stale runtime state instead of PostgreSQL. Recovery steps: applied the pending Prisma migrations to production, re-issued the requested organizer password idempotently from the platform service, redeployed production as `dpl_75x4FHsTFGu8pHBHpEc7THiLdgwr`, and re-verified a successful live login to `https://passreserve.com/sillico/admin/dashboard`. Documented the incident and permanent prevention rules in `patch-notes/2026-06-08_10-29-00_production-auth-incident_schema-drift-recovery.md`, `000_START_HERE_AI.md`, `06_OPERATIONS_TESTING_AND_RISKS.md`, and `FINAL_LAUNCH_HANDOFF.md`.
- `2026-06-08 10:50 CEST` Fixed a visual regression in the organizer admin checkbox rows where reminder toggles were inheriting the shared `.field input` text-input shell, which wrapped the native checkbox in a tall rectangular box. Restricted the generic field-input selector to exclude `checkbox` and `radio`, added a defensive checkbox reset for padding/shadow/min-height, verified the CSS change with a fresh production build, and prepared a production publish so reminder/settings checkboxes render as a clean native square again. Documented in `patch-notes/2026-06-08_10-50-00_checkbox-field-shell-fix.md`.
- `2026-06-08 10:57 CEST` Fixed the organizer guided-setup `Skip tour / Salta tour` action after reproducing a live failure where `Next` advanced correctly but `Skip` never dismissed the popover, including on the Stripe step. Root cause: the custom skip button was wired with its own DOM `click` listener inside `onPopoverRender`, but `driver.js` captures and stops popover clicks in the document capture phase, so custom button handlers never fired. Rewired skip through `driver.js` itself by routing the button through the library close-click path and mapping `onCloseClick` to `finishTour(TOUR_SKIPPED_STATUS)`, which makes skip work consistently across all tour steps. Verified with a fresh production build and prepared a production deploy plus live browser check. Documented in `patch-notes/2026-06-08_10-57-00_tour-skip-driverjs-fix.md`.
- `2026-06-08 11:30 CEST` Implemented the interaction-feedback rollout across Passreserve: added a global provider for delegated button press animations plus subtle click audio, route-level progress/overlay feedback for organizer-admin and auth-like transitions, dedicated App Router loading shells for organizer admin and login/signup/reset surfaces, and wiring for programmatic route changes such as locale switching and organizer guided-tour navigation. Adjusted the smoke verifier for Next.js redirect shells introduced by `loading.js`, then revalidated with a full `npm run verify` pass and local in-app browser smoke on both organizer auth and organizer admin flows. Documented in `patch-notes/2026-06-08_11-30-00_interaction-feedback-and-route-preload.md`.
- `2026-06-08 11:34 CEST` Published commit `f862818` (`feat: add global interaction feedback`) to `origin/main`, then deployed it live on Vercel as production deployment `dpl_8iaQkTjhVoKSssEnwPUnDU8wTjNp` aliased to `passreserve.com`. Confirmed live `200` responses for `/organizer-access` and `/sillico/admin/login`, verified the organizer-access copy now uses `example`, and confirmed protected organizer dashboard requests still expose the expected login/dashboard redirect metadata on production.
- `2026-06-08 12:12 CEST` Refined the newly introduced shared preloader after live visual review showed the route-loading state as an awkward tall white pill. Rebuilt both the route overlay and the App Router loading shells into a true fullscreen experience with quicker reveal timing, animated concentric rings, moving load bars, and full-viewport backdrop treatment so organizer-admin and auth transitions feel faster and more intentional. Re-verified with `npm run verify` and an in-app browser smoke on the organizer dashboard route transition. Documented in `patch-notes/2026-06-08_12-12-00_fullscreen-preloader-refresh.md`.
- `2026-06-09 09:20 CEST` Investigated why `/sillico` still showed `Connection: Not connected / Charges: Blocked / Payouts: Blocked` even after the organizer completed Stripe Connect and clicked `Refresh status`. Canonical production Postgres review confirmed the organizer row still had `stripeAccountId = null`, `stripeConnectionStatus = NOT_CONNECTED`, no Stripe sync timestamps, and no `organizer_stripe_*` audit trail, which matched the live billing snapshot and proved the connection was never being persisted to the system of record. Root cause analysis: the old Stripe connect/refresh flow ran inside `mutatePersistentState()`, so any production database write failure or transaction fallback could silently rerun the Stripe mutation against the file store, allowing onboarding links and success redirects to work while leaving PostgreSQL unchanged. Replaced those organizer billing mutations with direct Prisma updates plus audit logging, expanded the billing read model into a real diagnostic surface with explicit blocker details/progress/next-step guidance, made refresh-status messaging truthful for `missing`, `pending`, `restricted`, and `ready` states, and revalidated with `test/passreserve-billing.test.js` plus a fresh production build. Documented in `patch-notes/2026-06-09_09-20-00_stripe-billing-diagnostics-and-persistence-fix.md`.
- `2026-06-09 10:51 CEST` Investigated the live Sillico public registration blocker on `/sillico/events/divini-sapori/register`, where the organizer had already opened registrations from today on the event dates but the frontend still showed `Registrations only open within 1 day of the event date.` Production data review confirmed the organizer-level fallback rule `maxAdvanceDays = 1` was still being enforced even when the event or occurrence already had an explicit sales-window opening set for today. Fixed the precedence in `lib/passreserve-booking-window.js` so explicit event/date sales windows override organizer fallback booking rules instead of stacking with them, added dedicated regression coverage for explicit-window precedence, and tightened the public four-step registration wizard so users can no longer jump into later steps when no valid date/ticket/attendee state exists. Also clarified the organizer admin copy in Settings, Events, and Schedule so future organizers understand that explicit sales windows on events/dates override the fallback organizer booking rules. Verified with targeted Vitest suites, targeted ESLint, and a successful production build. Documented in `patch-notes/2026-06-09_10-51-35_registration-window-precedence-and-stepper-coherence.md`.
- `2026-06-09 11:02 CEST` Refined the Sillico public event-detail experience after the registration-window fix revealed that `/sillico/events/divini-sapori` was still showing a redundant ticket section and a second date section that repeated the same nights in two different shapes. Reworked the organizer-to-event handoff so `Apri evento` preserves the clicked occurrence in the query string, rebuilt the event detail page around a selected-date hero summary plus a collapsed `format / what's included` section that merges date-scoped duplicate tickets into one useful public card, and kept the actual published dates in one clear CTA-driven occurrence section instead of repeating them twice. Also introduced cleaner divider-based spacing for price/collection/venue metadata so the public event page reads more intentionally. Verified with targeted ESLint and a successful production build before live publication. Documented in `patch-notes/2026-06-09_11-02-03_event-detail-dedup-and-spacing-polish.md`.
- `2026-06-09 11:06 CEST` Applied a focused footer alignment polish so the public footer navigation row (`Home / Eventi / Chi siamo / Accesso organizer`) now sits on the same visual baseline band as the first line of the footer summary copy instead of floating too high beside the brand block. Implemented as a desktop-only top padding adjustment on `.site-footer-nav`, then revalidated with a successful production build before publication. Documented in `patch-notes/2026-06-09_11-06-17_footer-nav-baseline-alignment.md`.
- `2026-06-09 11:55 CEST` Tightened the public registration date-card typography so the occurrence date and time no longer collapse into `03 Jul 202620:30 to 23:59` on the frontend booking flow. Added a dedicated stacked copy block for the occurrence label/time in `registration-flow-experience.js`, paired with explicit typography spacing in `app/globals.css`, then revalidated with targeted ESLint and a successful production build before publishing. Documented in `patch-notes/2026-06-09_11-55-50_registration-date-time-spacing.md`.
- `2026-06-09 12:29 CEST` Implemented configurable registration-questionnaire fields with a clean organizer-default plus per-event-override model that distinguishes the lead booking participant from the rest of the group. Added a shared questionnaire resolver/validator layer, new JSON config columns on `Organizer` and `EventType`, and updated both the public booking flow and the organizer manual-registration flow so `required / optional / hidden` field modes now drive rendering and validation consistently for `first name`, `last name`, `address`, `phone`, `email`, and dietary fields. Added a dedicated organizer settings editor plus event override UI with presets, previews, and inheritance controls, then expanded regression coverage around the shared questionnaire resolver, public hold creation, shared registration builder, and organizer manual registrations. Revalidated with targeted ESLint, `npx prisma generate`, `npm run test -- test/passreserve-registration-questionnaire.test.js test/passreserve-registration-core.test.js test/passreserve-registrations.test.js test/passreserve-organizer-registrations.test.js`, `npm run build`, `npm run test:smoke`, and a final green `npm run verify`. Documented in `patch-notes/2026-06-09_12-29-00_registration-questionnaire-configurator.md`.
- `2026-06-09 14:58 CEST` Fixed the public registration persistence incident behind the live Sillico checkout failure where step 4 showed `That event occurrence is no longer available.` and the email confirmation link later opened `This hold could not be found.` Root cause analysis from production runtime logs showed Prisma transaction error `P2028` inside `mutatePersistentState()` while the public hold/confirm/payment-success paths were still doing full state rewrites and side effects in the same transaction, after which the runtime silently fell back to file state. Reworked the live public registration hot paths in `lib/passreserve-service.js` so database mode now uses direct Prisma persistence for `createRegistrationHold`, `confirmRegistrationHold`, `resumeRegistrationPayment`, and `resolveSuccessfulRegistrationConfirmation`, sends attendee/organizer emails only after the database commit, and writes payment/audit records with targeted Prisma creates instead of rewriting the full registration state snapshot. Revalidated with targeted ESLint, `npm run test -- test/passreserve-registrations.test.js`, `npm run build`, and a controlled live DB smoke using a disposable Sillico registration that proved the hold persisted, the confirmation token resolved into `PENDING_PAYMENT`, and then was removed to avoid polluting organizer data. Documented in `patch-notes/2026-06-09_14-58-00_public-registration-db-persistence-hardening.md`.
- `2026-06-09 19:01 CEST` Implemented organizer-configurable booking confirmation mode with organizer defaults plus per-event overrides, so each public event can now either keep the existing `email confirmation link required` flow or switch to `confirm immediately on submit` without disabling the downstream confirmation/recap emails. Added the Prisma enum + migration, a shared `passreserve-registration-confirmation` resolver, a new admin editor for Settings and Events with inheritance-aware UI, and public runtime branching in `lib/passreserve-service.js` so direct-confirm events now validate the legal checkboxes in step 4, skip the pending-email hold page, and go straight to either `CONFIRMED_UNPAID` or `PENDING_PAYMENT` while still sending the right attendee/organizer emails. Revalidated with `npx prisma generate`, targeted ESLint, `npm run test -- test/passreserve-registration-confirmation.test.js test/passreserve-registrations.test.js`, `npm run build`, and a final green `npm run verify`. Documented in `patch-notes/2026-06-09_19-01-48_optional-email-link-confirmation.md`.
- `2026-06-10 13:09 CEST` Fixed the organizer/platform revenue read-model drift that kept showing refunded Stripe captures as still collected in dashboard and overview metrics. Centralized refund-aware financial totals in `lib/passreserve-admin-service.js` so organizer and platform summaries now treat `onlineCollectedCents - refundedCents` as the live online revenue number while excluding cancelled/no-show/expired pending registrations from outstanding `due at venue` totals. Also hardened the operational participant PDF export so `variant=operational` no longer includes cancelled/no-show/expired pending registrations while `variant=full` still preserves the audit view. Added dedicated regressions for organizer/platform net totals and operational-vs-full export filtering, then revalidated with targeted ESLint, focused Vitest suites, and a full green `npm run verify`. Documented in `patch-notes/2026-06-10_13-09-00_admin-net-revenue-and-operational-export-fix.md`.
- `2026-06-10 13:18 CEST` Investigated the missing participant-export feature and confirmed it was not removed: Passreserve still ships server-side occurrence PDF exports at `/{slug}/admin/registrations/export` with `operational` and `full` variants, but the UI entrypoint had become too buried inside the selected-date summary block of the registrations queue. There is no CSV runtime today, and there is no whole-event multi-date export yet; the live feature is date/occurrence-scoped PDF export only. Re-surfaced the existing operational/full PDF buttons directly into the registrations page header actions whenever a date is selected, kept the backend route unchanged, and revalidated with targeted ESLint plus a fresh production build. Documented in `patch-notes/2026-06-10_13-18-00_registration-export-cta-restore.md`.
- `2026-06-10 14:45 CEST` Implemented the first full Passreserve EU privacy/cookie compliance foundation without changing booking or organizer-dashboard business logic: added lawyer-style `/privacy`, `/cookie-policy`, and `/terms` pages with explicit operator identity (`Leonardo Fiori`, `P.IVA IT02639600465`), introduced a first-party cookie consent system with `accept all / reject non-essential / customize` controls plus persistent footer access to reopen preferences, wired legal navigation into the public and admin shells, and upgraded organizer-request plus attendee booking flows to require explicit terms/privacy acknowledgement while keeping transactional emails, booking confirmation modes, and payment flows intact. Revalidated with targeted ESLint, focused legal/signup/registration Vitest suites, and a full green `npm run verify`; browser-plugin smoke against `localhost` was attempted but the in-app browser could not reach the local dev server in this environment, so final UI verification relied on production checks after deployment. Documented in `patch-notes/2026-06-10_14-45-00_privacy-cookie-compliance-foundation.md`.

---

## Phase 13: Shared inbox, automatic organizer provisioning, and publication controls

**Status:** `DONE`

**Patch note:** [`2026-04-27_19-52-53_phase-13_shared-mailbox-and-publication-controls.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes/2026-04-27_19-52-53_phase-13_shared-mailbox-and-publication-controls.md)

**Checklist**

- [x] Add organizer publication controls with immutable internal slug plus editable pre-publication public slug
- [x] Split organizer applications/provisioning audit from the email mailbox UI
- [x] Replace manual organizer approval with automatic provisioning and duplicate-aware application handling
- [x] Add resend-access tooling for failed onboarding emails
- [x] Add shared mailbox persistence for threads, messages, and attachment metadata
- [x] Ingest inbound mailbox traffic from Resend webhooks and support authenticated attachment redirects
- [x] Support platform-admin replies from inside the app with threading headers preserved
- [x] Keep ALTCHA verification and extend signup abuse controls with email-based rate limiting
- [x] Document new env vars and Vercel/Resend setup for shared inbox receiving
- [x] Add regression coverage for signup, publication, mailbox, attachments, and existing email flows

**Activity log**

- `2026-04-27 19:03 CEST` Started Phase 13 to add a real shared mailbox, automatic organizer provisioning, organizer publication controls, and a separate applications audit surface without rewriting the existing Next.js/Prisma/file-store architecture.
- `2026-04-27 19:52 CEST` Completed the organizer/application model update with private-by-default publication state, immutable internal slugs plus editable pre-publication public slugs, automatic organizer provisioning, duplicate-aware application auditing, resend-access recovery, and the separate `/admin/applications` surface.
- `2026-04-27 19:52 CEST` Added the shared mailbox data model, Resend inbound webhook route, authenticated attachment redirect route, and platform-admin reply workflow while preserving the existing Next.js, iron-session, Prisma, and file-store conventions.
- `2026-04-27 19:52 CEST` Added the Phase 13 Prisma migration, updated the launch/env documentation for Resend receiving on Vercel, expanded regression coverage for signup/publication/mailbox flows, and re-ran `npm run verify` successfully with lint, 45 tests, copy audit, Prisma generation, production build, and smoke checks all passing.
- `2026-04-27 19:58 CEST` Applied a final live-production polish pass on `/events` by removing the old discovery helper paragraph, renaming the page heading to `Events`, increasing the gap below the public top navigation, and re-running a successful production build before pushing the update.
- `2026-05-26 16:19 CEST` Completed Phase 7 of the Stripe auto-refund rollout by extending organizer occurrence cancellation with a bulk `cancel only` versus `cancel + refund eligible online payments` choice, persisting local occurrence/registration cancellation state before any Stripe calls, requesting refunds only for eligible registrations in a controlled second phase, surfacing aggregated `cancelled / refund requested / skipped / failed` feedback in the organizer calendar UI, and adding file-state/DB-safe helpers plus regression coverage for mixed eligibility occurrence cancellation before a full green `npm run verify`.
- `2026-05-26 16:32 CEST` Completed Phase 8 of the Stripe auto-refund rollout by upgrading attendee cancellation copy to explicit `Refund initiated`, `Refund completed`, and `Manual follow-up` states, adding dedicated organizer audit events for single-refund requests, bulk occurrence refund batches, refund-request failures, and Stripe refund confirmations, enriching organizer payment-history entries with localized refund lifecycle badges/details/references, and extending the regression suite plus full `npm run verify` coverage around email copy, ledger visibility, and audit traces.
- `2026-05-26 16:50 CEST` Completed Phase 9 of the Stripe auto-refund rollout by persisting explicit `REFUND/FAILED` ledger rows whenever Stripe refund requests fail, surfacing localized failed-refund status plus retry actions across organizer registrations and schedule views, adding safe single-registration and bulk-occurrence retry flows that reuse the stored idempotency key to avoid duplicate refunds, and extending refund/admin/occurrence regressions before another full green `npm run verify`.
- `2026-05-26 19:29 CEST` Advanced Phase 10 of the Stripe auto-refund rollout with an isolated organizer smoke environment on `127.0.0.1:3310`, then verified the real backoffice detail flow (`Refund failed -> Retry refund -> Refund pending`), the cancelled-occurrence bulk retry flow plus aggregated retry summary, and the event-day payments surface in the in-app browser; updated the rollout checklist to reflect completed organizer UI smoke coverage while intentionally leaving Vercel publish/production validation for a later explicit deployment pass.
