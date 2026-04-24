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
