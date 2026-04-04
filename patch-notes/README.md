# Patch Notes Protocol

This directory contains the historical handoff logs for work completed on Passreserve.com.

Every future AI agent must read this directory before starting implementation work.

## Reading rule

Read files in filename order from A to Z.

Recommended sequence:

1. Read this file first
2. Read every completed patch note file in A-to-Z order
3. Ignore the template until you need to write a new note

## Why this directory exists

Future AI agents may arrive without any chat context.

This directory preserves:

- what previous agents actually implemented
- what files they changed
- what checks they ran
- what problems they hit
- what the next agent must keep in mind

## When to write a patch note

Write one patch note when an entire phase from the master checklist is completed.

Before closing a completed phase:

1. Update the relevant phase in [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
2. Write the patch note here
3. Add the patch note filename back into the phase section of the master checklist
4. Create a Git commit for the completed phase
5. Push the branch to `https://github.com/iperrealistico/passreserve.git` unless the user explicitly says not to push
6. Verify that the push-triggered Vercel deployment for this project succeeded
7. If the Vercel deployment failed, fix it and do not close the handoff until a succeeding deployment has been verified

## Filename convention

Use this format:

`YYYY-MM-DD_HH-MM-SS_phase-XX_short-title.md`

Example:

`2026-04-04_12-38-55_phase-01_workflow-bootstrap.md`

Use `Europe/Rome` time.

## Required contents of every patch note

Each patch note must include:

- phase number and phase title
- timestamp
- summary of completed work
- files added, changed, or removed
- tests, checks, or verifications performed
- Vercel deployment verification status after the final push
- blockers, caveats, and unresolved risks
- explicit guidance for the next phase or next agent
- whether commit and push were completed successfully

## Relationship to the master checklist

The master checklist is the live current-state tracker.

Patch notes are the durable historical log.

Both must stay accurate.

## Important rule

If you finish a phase but do not write the patch note, the handoff is incomplete.
