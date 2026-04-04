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

**Status:** `IN PROGRESS`

**Patch note:** `TBD`

**Checklist**

- [ ] Define the final naming dictionary from legacy rental terms to event-platform terms
- [x] Replace public-facing references to MTB Reserve with Passreserve.com in the active codebase
- [ ] Replace rider, shop, bike, booking, inventory, and pickup wording where appropriate
- [x] Standardize organizer, event, occurrence, registration, attendee, and payment terminology
- [x] Update shared UI copy, headers, navigation labels, and empty states
- [ ] Update email copy and subject strategy for the new product language
- [x] Update metadata, titles, brand references, and SEO-facing naming
- [ ] Document any intentional temporary legacy names left in code for migration reasons

**Activity log**

- `2026-04-04 14:21 CEST` Started Phase 03 work focused on the first Passreserve.com brand and vocabulary transformation pass across the minimal root app's public-facing copy, metadata, and baseline empty states.
- `2026-04-04 14:25 CEST` Replaced the bootstrap placeholder page with a branded Passreserve.com landing experience, added event-first terminology, introduced a branded not-found state, and verified the root app with `npm run build`.
- `2026-04-04 14:25 CEST` Email-copy updates, deeper legacy-term replacement, and intentional temporary-name documentation remain open because the active root app does not yet include the full organizer, admin, or email runtime from the legacy platform.
- `2026-04-04 14:26 CEST` Committed the Phase 03 brand baseline as `80f029b650d9d8f9c7e717875895bc3d9dc1956c` with message `feat: establish passreserve brand baseline` and pushed `main` to `origin`.
- `2026-04-04 14:26 CEST` Verified through the Vercel integration that deployment `dpl_3uAUMkWfysE6ipytAr5d6FLY76zb` for commit `80f029b650d9d8f9c7e717875895bc3d9dc1956c` reached `READY`, including the production alias `passreserve.vercel.app`.

---

## Phase 04: Event domain and data model foundation

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Finalize the target event-platform domain model
- [ ] Decide which legacy models remain temporarily and which new models must be added immediately
- [ ] Design `Organizer`, `EventType`, `EventOccurrence`, `Registration`, and payment-related structures
- [ ] Define registration statuses and payment statuses
- [ ] Define event visibility, publication, and capacity rules
- [ ] Plan the Prisma schema changes and data migration approach
- [ ] Review compatibility with existing auth, logs, settings, and email infrastructure
- [ ] Document transitional constraints and anti-corruption rules between old and new domain concepts

**Activity log**

- `No activity recorded yet.`

---

## Phase 05: Public information architecture and discovery surfaces

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Redesign the root landing page for Passreserve.com
- [ ] Replace bike-rental discovery intent with event discovery intent
- [ ] Replace partner onboarding copy with organizer onboarding copy
- [ ] Decide the search and discovery behavior for organizers, cities, and event keywords
- [ ] Update signup/join request flow for organizers
- [ ] Define the new public navigation and top-level user journeys
- [ ] Ensure the root experience reflects the new brand and event platform value proposition

**Activity log**

- `No activity recorded yet.`

---

## Phase 06: Organizer public pages and event detail experience

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Transform the public organizer page from booking storefront into event hub
- [ ] Define organizer hero, description, venue info, and organizer contact presentation
- [ ] Build or adapt event list and featured event presentation
- [ ] Add event detail pages and route structure
- [ ] Surface yearly or upcoming occurrences on organizer and event pages
- [ ] Add attendee-facing policy, FAQ, and event-specific content blocks
- [ ] Ensure the public experience supports photos, descriptions, and event-specific calls to action

**Activity log**

- `No activity recorded yet.`

---

## Phase 07: Organizer admin event catalog and occurrence management

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Replace the inventory area with event catalog management
- [ ] Create event type create, update, and delete workflows
- [ ] Add occurrence management as a first-class admin capability
- [ ] Support one-off and recurring occurrence creation
- [ ] Support price, capacity, venue, and publication overrides per occurrence
- [ ] Add organizer-facing visibility controls and schedule conflict handling
- [ ] Preserve useful admin shell patterns from MTB Reserve while replacing the domain content

**Activity log**

- `No activity recorded yet.`

---

## Phase 08: Registration flow, capacity engine, and attendee lifecycle

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Transform the booking wizard into an event registration flow
- [ ] Replace slot logic with occurrence selection logic
- [ ] Replace bike availability logic with occurrence capacity logic
- [ ] Define registration holds, expiry rules, and confirmation behavior
- [ ] Support attendee details, quantity selection, and optional ticket-category structure
- [ ] Update confirmation pages and registration code generation
- [ ] Update related server actions, schemas, validations, and event logging
- [ ] Ensure overbooking protection and pending-hold behavior are correct

**Activity log**

- `No activity recorded yet.`

---

## Phase 09: Payments, Stripe Checkout, and payment reconciliation

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Add Stripe configuration and environment requirements
- [ ] Define 0 percent, deposit, and full-payment collection rules
- [ ] Create Stripe Checkout Session creation flow
- [ ] Add success and cancel return handling
- [ ] Add webhook handling as the final payment source of truth
- [ ] Store payment references and reconciliation metadata
- [ ] Support partial online payment versus amount due at event
- [ ] Add payment-state logging, failure handling, and idempotency safeguards

**Activity log**

- `No activity recorded yet.`

---

## Phase 10: Organizer operations dashboard, calendar, registrations, and payments UI

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Replace booking-centric dashboard metrics with registration and revenue metrics
- [ ] Adapt the calendar to show occurrences, attendee counts, and payment state summaries
- [ ] Build organizer views for registrations and attendee operations
- [ ] Add organizer workflows for confirmation, cancellation, no-show, and reconciliation
- [ ] Add organizer-facing payment visibility and amount-due tracking
- [ ] Preserve the practical operations-first admin UX of the legacy app
- [ ] Audit timezone behavior for organizer-local operations

**Activity log**

- `No activity recorded yet.`

---

## Phase 11: Super-admin adaptation, CMS, emails, and platform operations

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Rename and adapt tenant-management flows into organizer-management flows
- [ ] Update super-admin listings, detail pages, and support actions
- [ ] Update global settings, SEO, and platform branding references
- [ ] Adapt the about/CMS content to the event-platform story
- [ ] Update email template scenarios for registrations, payments, organizers, and operations
- [ ] Ensure signup requests, logs, and health pages remain useful in the new product
- [ ] Review admin auth copy and platform-wide operational terminology

**Activity log**

- `No activity recorded yet.`

---

## Phase 12: Legacy removal, data migration, QA, deployment, and launch readiness

**Status:** `NOT STARTED`

**Patch note:** `TBD`

**Checklist**

- [ ] Remove or isolate obsolete bike-rental UI and business logic
- [ ] Decide final migration or retirement path for legacy tables and fields
- [ ] Replace dangerous build and deployment behaviors with safer alternatives
- [ ] Restore a reliable testing baseline for unit, integration, and end-to-end verification
- [ ] Improve lint and type-safety health to a manageable baseline
- [ ] Verify auth, timezone, email, and payment correctness end to end
- [ ] Review Vercel deployment readiness and environment completeness
- [ ] Update root documentation to describe the finished Passreserve.com product
- [ ] Confirm release readiness and produce final handoff documentation

**Activity log**

- `No activity recorded yet.`
