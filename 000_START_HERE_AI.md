# START HERE - Mandatory AI Working Protocol for Passreserve.com

If you are a future AI agent opening this project without chat context, stop here first.

Do not write code, do not edit files, do not run migrations, do not run destructive commands, and do not start implementation work until you have read the mandatory files in the exact order listed below.

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

## Mandatory reading order

Read these files before doing anything else:

1. [`000_START_HERE_AI.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/000_START_HERE_AI.md)
2. [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
3. [`patch-notes/README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes/README.md)
4. Every existing patch note in [`patch-notes`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes), in A-to-Z filename order, excluding the template unless you need to write a new one
5. [`00_README_FIRST.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/00_README_FIRST.md)
6. [`01_EXECUTIVE_SUMMARY.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/01_EXECUTIVE_SUMMARY.md)
7. [`02_ARCHITECTURE_AND_RUNTIME.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/02_ARCHITECTURE_AND_RUNTIME.md)
8. [`03_FEATURE_WALKTHROUGH.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/03_FEATURE_WALKTHROUGH.md)
9. [`04_DATA_MODEL_AND_BUSINESS_RULES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/04_DATA_MODEL_AND_BUSINESS_RULES.md)
10. [`06_OPERATIONS_TESTING_AND_RISKS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)
11. [`05_FILE_AND_DIRECTORY_INVENTORY.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/05_FILE_AND_DIRECTORY_INVENTORY.md)
12. [`07_SHARING_AND_ARTIFACTS.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/07_SHARING_AND_ARTIFACTS.md)
13. [`08_GATHERPASS_TRANSFORMATION_PLAN.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/08_GATHERPASS_TRANSFORMATION_PLAN.md)
14. [`09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md)

Only after all of the above has been read may you inspect code and start implementation work.

## Active workspace and Git source of truth

- The active Git workspace is the project root: [`gatherpass`](/Users/leonardofiori/Documents/Antigravity/gatherpass)
- The configured GitHub remote is `origin -> https://github.com/iperrealistico/passreserve.git`
- The default base branch is `main`
- The legacy MTB Reserve materials are reference-only:
  - [`mtb-reserve-full-directory.zip`](/Users/leonardofiori/Documents/Antigravity/gatherpass/mtb-reserve-full-directory.zip)
  - [`unpacked/mtb-reserve`](/Users/leonardofiori/Documents/Antigravity/gatherpass/unpacked/mtb-reserve)
- Do not treat the legacy snapshot as the active application workspace unless the user explicitly instructs you to work there.
- Do not commit the zip archive or the extracted legacy snapshot into the active Passreserve.com Git history unless the user explicitly asks for that.

## Git workflow conventions

- Keep `main` as the shared base branch.
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
- If you run a local build before pushing, that does not replace the Vercel check. You must still verify the actual Vercel deployment after the push.
- If the Vercel build fails, you must investigate the logs, fix the issue, push the fix, and confirm the new Vercel deployment succeeds before closing the work.
- Do not claim a phase or task is complete while the related Vercel deployment is failing or unverified.

## Non-negotiable rules

- Do not start coding before reading the mandatory files above.
- Work in phases only. Do not improvise a brand-new execution order unless the user explicitly changes it.
- Use [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md) as the live master checklist and execution ledger.
- Every meaningful action taken on the project must be reflected in the current phase section of the master checklist.
- When you begin work on a phase, update that phase status to `IN PROGRESS` and append a timestamped activity note.
- When you complete a checklist item, mark it in the master checklist immediately.
- When you complete an entire phase, write a new timestamped patch note inside [`patch-notes`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes) before ending your turn.
- When you complete a phase, update the corresponding phase section in the master checklist with:
  - final status
  - completed checklist state
  - timestamped summary note
  - the patch note filename
- If Git is initialized in the active workspace, create an intentional commit after a phase is complete.
- After the phase commit, push the current branch to the configured GitHub remote unless the user explicitly tells you not to push.
- If a required commit or push cannot be performed, state that explicitly in the phase activity log, the patch note, and the final handoff.
- After every push, verify the triggered Vercel deployment status using the Vercel MCP integration when possible, or the Vercel CLI as fallback.
- If the Vercel deployment fails, fix it before ending the task or clearly state that the work is blocked by a failing deployment.
- Do not silently skip tests, migrations, or risky decisions. Record what you ran and what you did not run.
- Do not run destructive commands such as schema pushes, resets, or production-like build steps without understanding the documented risks first.

## Required workflow for every future AI agent

1. Read the mandatory files in the required order.
2. Inspect the current status of the relevant phase in the master checklist.
3. Read all historical patch notes in filename order to reconstruct prior work and decisions.
4. Choose exactly one active phase, or an explicit subset of tasks within that phase, unless the user instructs otherwise.
5. Update the chosen phase in the master checklist before making changes.
6. Perform the implementation work.
7. Update the master checklist during the work so progress remains accurate.
8. Run relevant verification checks when possible.
9. Finish by updating the master checklist again.
10. If the phase is complete, write a timestamped patch note.
11. Commit the phase work.
12. Push the branch to the configured GitHub remote.
13. Check the triggered Vercel deployment until it succeeds or until you have enough information to fix the failure.
14. If the deployment fails, fix it, push again, and re-check Vercel before final handoff.

## What the master checklist must contain

The file [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md) is the single source of truth for:

- the ordered implementation phases
- the current status of each phase
- the checklist items inside each phase
- the activity log inside each phase
- links or filenames for completed patch notes

If you change the project and do not update the master checklist, you have left the handoff incomplete.

## What patch notes must contain

Each completed phase must produce one patch note file in [`patch-notes`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes) with a timestamped filename.

Each patch note must describe:

- which phase was completed
- what was implemented
- which files were changed
- which checks or tests were run
- whether the Vercel deployment triggered by the final push succeeded
- what problems or risks were encountered
- what the next AI agent should pay attention to

Use [`patch-notes/000_TEMPLATE.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes/000_TEMPLATE.md) as the template.

## Recovery checklist for a no-context AI

If you have no memory of previous chat turns, do this:

1. Read this file.
2. Read the master checklist.
3. Read the patch-notes README.
4. Read every patch note in filename order.
5. Read the core project documentation.
6. Inspect the current files and active workspace state.
7. Only then start implementation.

## Naming source of truth

If you encounter inconsistent naming from older documents or legacy code, normalize your understanding using this rule:

- `Passreserve.com` is the official public product name.
- `GATHERPASS` is the internal codename only.
- `MTB Reserve` is the legacy platform being transformed.

## Final instruction

Do not treat this file as optional guidance. Treat it as the required operating protocol for all future AI work on this repository.
