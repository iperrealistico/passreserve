# Passreserve Repository Orientation

This repository started as a documentation-heavy transformation project around the legacy MTB Reserve product. It is now the active Passreserve.com application workspace.

## What this repo is now

- Active workspace path: `/Users/leonardofiori/Documents/Antigravity/gatherpass`
- Active product: `Passreserve.com`
- Legacy reference product: `MTB Reserve`
- Canonical deployment target: `Vercel.app`
- Canonical runtime target: Next.js monolith with Postgres, Stripe, and Resend in production

## What changed by Phase 12 completion

- the public platform is event-first, not rental-first
- organizer admin and platform admin are authenticated
- registrations, payments, CMS content, settings, and logs are durable runtime records
- Prisma schema and initial migration are checked in
- local and preview work can run without Postgres through a persistent fallback state file
- the repo now has a final launch handoff and explicit production env checklist

## Live docs vs historical docs

The most trustworthy current docs are:

1. [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
2. [`FINAL_LAUNCH_HANDOFF.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
3. [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
4. [`02_ARCHITECTURE_AND_RUNTIME.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/02_ARCHITECTURE_AND_RUNTIME.md)
5. [`04_DATA_MODEL_AND_BUSINESS_RULES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/04_DATA_MODEL_AND_BUSINESS_RULES.md)
6. [`06_OPERATIONS_TESTING_AND_RISKS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)

The following docs remain useful as historical context, but they describe earlier analysis and transformation stages rather than the final runtime:

- [`01_EXECUTIVE_SUMMARY.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/01_EXECUTIVE_SUMMARY.md)
- [`03_FEATURE_WALKTHROUGH.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/03_FEATURE_WALKTHROUGH.md)
- [`05_FILE_AND_DIRECTORY_INVENTORY.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/05_FILE_AND_DIRECTORY_INVENTORY.md)
- [`07_SHARING_AND_ARTIFACTS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/07_SHARING_AND_ARTIFACTS.md)
- [`08_GATHERPASS_TRANSFORMATION_PLAN.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/08_GATHERPASS_TRANSFORMATION_PLAN.md)

## Read this before launch work

- Production requires PostgreSQL, Stripe, Resend, and real environment variables.
- Local development does not require PostgreSQL; the app falls back to `.runtime-data/passreserve-state.json`.
- Preview deployments without `DATABASE_URL` use `/tmp/passreserve-state.json` and should be treated as temporary.
- Local default credentials exist for development only and must never be kept in production.

## Recommended next reads

1. [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
2. [`FINAL_LAUNCH_HANDOFF.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
3. [`02_ARCHITECTURE_AND_RUNTIME.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/02_ARCHITECTURE_AND_RUNTIME.md)
4. [`04_DATA_MODEL_AND_BUSINESS_RULES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/04_DATA_MODEL_AND_BUSINESS_RULES.md)
5. [`06_OPERATIONS_TESTING_AND_RISKS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)
