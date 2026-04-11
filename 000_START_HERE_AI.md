# START HERE - Mandatory AI Working Protocol for Passreserve.com

If you are a future AI agent opening this project without chat context, stop here first.

Do not write code, do not edit files, do not run migrations against a real database, and do not start implementation work until you have read the mandatory files in the exact order listed below.

## Project identity

- Public product name: `Passreserve.com`
- Internal codename: `GATHERPASS`
- Workspace folder name: `gatherpass`
- GitHub remote repository: `https://github.com/iperrealistico/passreserve.git`
- Deployment platform: `Vercel.app`
- Vercel team id: `team_HkXanAKxflViaTU8bv2zg4Cf`
- Vercel project name: `passreserve`
- Vercel project id: `prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn`
- Legacy source product being transformed: `MTB Reserve`
- Legacy source snapshot location: [`unpacked/mtb-reserve`](/Users/leonardofiori/Documents/Antigravity/gatherpass/unpacked/mtb-reserve)

Use `Passreserve.com` for public-facing naming in code, UI copy, documentation, and future implementation unless you are intentionally referring to the legacy MTB Reserve system.

## Current source-of-truth rule

The repository contains both live Passreserve runtime docs and older transformation-era analysis docs.

When documents disagree, trust them in this order:

1. [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
2. [`FINAL_LAUNCH_HANDOFF.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
3. [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
4. the latest Phase 12 patch note
5. [`02_ARCHITECTURE_AND_RUNTIME.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/02_ARCHITECTURE_AND_RUNTIME.md)
6. [`04_DATA_MODEL_AND_BUSINESS_RULES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/04_DATA_MODEL_AND_BUSINESS_RULES.md)
7. [`06_OPERATIONS_TESTING_AND_RISKS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)

Treat older MTB Reserve analysis docs as historical context only when they conflict with the completed Passreserve runtime docs above.

## Mandatory reading order

Read these files before doing anything else:

1. [`000_START_HERE_AI.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/000_START_HERE_AI.md)
2. [`README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
3. [`FINAL_LAUNCH_HANDOFF.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
4. [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
5. [`patch-notes/README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes/README.md)
6. Every existing patch note in [`patch-notes`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes), in A-to-Z filename order, excluding the template unless you need to write a new one
7. [`02_ARCHITECTURE_AND_RUNTIME.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/02_ARCHITECTURE_AND_RUNTIME.md)
8. [`04_DATA_MODEL_AND_BUSINESS_RULES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/04_DATA_MODEL_AND_BUSINESS_RULES.md)
9. [`06_OPERATIONS_TESTING_AND_RISKS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)
10. [`09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md)
11. [`00_README_FIRST.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/00_README_FIRST.md)
12. [`01_EXECUTIVE_SUMMARY.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/01_EXECUTIVE_SUMMARY.md)
13. [`03_FEATURE_WALKTHROUGH.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/03_FEATURE_WALKTHROUGH.md)
14. [`05_FILE_AND_DIRECTORY_INVENTORY.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/05_FILE_AND_DIRECTORY_INVENTORY.md)
15. [`07_SHARING_AND_ARTIFACTS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/07_SHARING_AND_ARTIFACTS.md)
16. [`08_GATHERPASS_TRANSFORMATION_PLAN.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/08_GATHERPASS_TRANSFORMATION_PLAN.md)

Only after all of the above has been read may you inspect code and start implementation work.

## Active workspace and Git source of truth

- The active Git workspace is the project root: [`gatherpass`](/Users/leonardofiori/Documents/Antigravity/gatherpass)
- The configured GitHub remote is `origin -> https://github.com/iperrealistico/passreserve.git`
- The default base branch is `main`
- The legacy MTB Reserve materials are reference-only:
  - [`mtb-reserve-full-directory.zip`](/Users/leonardofiori/Documents/Antigravity/gatherpass/mtb-reserve-full-directory.zip)
  - [`unpacked/mtb-reserve`](/Users/leonardofiori/Documents/Antigravity/gatherpass/unpacked/mtb-reserve)
- Do not treat the legacy snapshot as the active application workspace unless the user explicitly instructs you to work there.

## Git workflow conventions

- Keep `main` as the shared base branch unless the user requests otherwise.
- Unless the user asks for a different strategy, future AI agents may either continue on the current working branch or create a focused branch with prefix `codex/`.
- Every completed phase must end with:
  - updated master checklist
  - patch note written
  - Git commit created
  - push to the configured GitHub remote
- If push fails, document the failure clearly and do not pretend the handoff is complete.

## Vercel deployment rules

- The canonical deployment target for this project is `Vercel.app`.
- This repository is expected to be connected to Vercel so that every push to GitHub triggers a Vercel deployment build.
- Treat every push as incomplete until the corresponding Vercel build has been checked.
- Prefer the Vercel MCP integration available in this environment to inspect deployments, build logs, and runtime status.
- If the Vercel MCP integration is unavailable or insufficient, use the Vercel CLI available on the OS as fallback.
- If a Vercel deployment fails, investigate it before closing the work unless the user explicitly pauses or redirects.

## Non-negotiable rules

- Do not start coding before reading the mandatory files above.
- Use [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md) as the live master checklist and execution ledger.
- Every meaningful action taken on the project must be reflected in the relevant phase section of the master checklist.
- When you begin work on a phase, update that phase status to `IN PROGRESS` and append a timestamped activity note.
- When you complete a checklist item, mark it in the master checklist immediately.
- When you complete an entire phase, write a new timestamped patch note inside [`patch-notes`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes) before ending your turn.
- If Git is initialized in the active workspace, create an intentional commit after a phase is complete.
- After the phase commit, push the current branch to the configured GitHub remote unless the user explicitly tells you not to push.
- Do not silently skip tests, migrations, or risky decisions. Record what you ran and what you did not run.
- Do not run destructive commands such as schema pushes, resets, or data-loss migrations.

## Final instruction

Do not treat this file as optional guidance. Treat it as the required operating protocol for all future AI work on this repository.
