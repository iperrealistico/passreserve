# MTB Reserve Handoff Bundle

This bundle was created on April 4, 2026 as an external, non-destructive documentation snapshot for the repository at:

- Source repository path: `/Users/leonardofiori/Documents/Antigravity/mtb-reserve`
- Git remote: `https://github.com/iperrealistico/mtb-reserve.git`
- Branch at time of analysis: `main`
- Last commit analyzed: `9689bfd1bf6d0da931ef9556a5817129db6dc482`
- Last commit date: `2026-02-17 12:27:35 +0100`
- Last commit subject: `Fix TS error in booking action: explicit type for bikeType variable`

No files inside the source repository were edited for this handoff. This bundle lives outside the repo, and nothing here was pushed to the existing GitHub remote.

## Naming alignment for this transformation project

For the event-platform transformation described in this bundle, use the following naming convention consistently:

- public product name: `Passreserve.com`
- internal codename: `GATHERPASS`
- working folder / project workspace name: `gatherpass`

When the documentation refers to the new event product, the public-facing name should be understood as `Passreserve.com`.

## What this bundle contains

- `000_START_HERE_AI.md`
  - Mandatory operating protocol for future AI agents working on Passreserve.com.
- `001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
  - Ordered implementation phases, master to-do list, and per-phase activity tracking.
- `00_README_FIRST.md`
  - Orientation, provenance, reading order, and safety notes.
- `01_EXECUTIVE_SUMMARY.md`
  - High-level explanation of what the product is and what state it is in.
- `02_ARCHITECTURE_AND_RUNTIME.md`
  - The technical architecture, route structure, runtime model, and core flows.
- `03_FEATURE_WALKTHROUGH.md`
  - End-to-end walkthrough of rider, tenant-admin, and super-admin features.
- `04_DATA_MODEL_AND_BUSINESS_RULES.md`
  - Prisma schema, business rules, booking lifecycle, auth, email, logging, and settings.
- `05_FILE_AND_DIRECTORY_INVENTORY.md`
  - Human-readable directory-level inventory and interpretation of the tracked files.
- `06_OPERATIONS_TESTING_AND_RISKS.md`
  - Environment, deployment, scripts, testing, quality status, and implementation risks.
- `07_SHARING_AND_ARTIFACTS.md`
  - What is in the full archive, what is safe or unsafe to share, and how to use the manifests.
- `manifests/`
  - Machine-generated inventories:
    - `tracked-files.txt`
    - `tracked-files-line-counts.tsv`
    - `full-directory-files.txt`
    - `working-tree-status.txt`
    - `route-files.txt`
    - `about-assets.tsv`
    - `env-key-names.txt`
    - `directory-sizes.txt`
- `mtb-reserve-full-directory.zip`
  - Full zip archive of the repository directory contents, including ignored/generated/vendor material, created because that was explicitly requested.
- `patch-notes/`
  - Historical per-phase implementation logs and the template future AI agents must use for handoff.

## Recommended reading order

1. `000_START_HERE_AI.md`
2. `001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
3. `patch-notes/README.md`
4. all completed files inside `patch-notes/` in A-to-Z order
5. `01_EXECUTIVE_SUMMARY.md`
6. `02_ARCHITECTURE_AND_RUNTIME.md`
7. `03_FEATURE_WALKTHROUGH.md`
8. `04_DATA_MODEL_AND_BUSINESS_RULES.md`
9. `06_OPERATIONS_TESTING_AND_RISKS.md`
10. `05_FILE_AND_DIRECTORY_INVENTORY.md`
11. `07_SHARING_AND_ARTIFACTS.md`
12. `08_GATHERPASS_TRANSFORMATION_PLAN.md`
13. `manifests/` for exact inventories

## Scope of analysis

Two different scopes matter in this repository:

1. The logical application.
   - This is mostly the 174 git-tracked files under `app`, `components`, `lib`, `prisma`, `scripts`, `test`, `public`, and the root config/docs files.
   - That is the codebase a developer would normally review to understand how the system works.

2. The physical directory snapshot.
   - This repository directory currently contains 52,815 files because it also includes `.git`, `node_modules`, `.next`, `.vercel`, ignored env files, and macOS metadata.
   - Those files have been inventoried in `manifests/full-directory-files.txt`.
   - They were not reverse-engineered line by line like first-party source, because most of that material is generated or third-party rather than authored application logic.

## Safety note before sharing the zip

The requested full archive is intentionally broad. It may include:

- `.env` and `.env.local`
- `.git` history and metadata
- `node_modules`
- `.next` build/dev output
- `.vercel` output

That means the archive is useful as a "complete working snapshot", but it may also reveal secrets, history, and a large amount of irrelevant/generated data. Read `07_SHARING_AND_ARTIFACTS.md` before forwarding it.
