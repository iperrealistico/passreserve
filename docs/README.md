# Tracked Docs Guide

Tracked docs in this repository are for repo-facing, reviewable documentation.

## Put tracked docs here when they are

- useful to any future contributor
- safe to commit
- product-facing or implementation-facing
- architecture or operations guidance that should survive pushes

## Do not put these in tracked docs

- local agent memory
- temporary scratch notes
- secret values
- machine-specific evidence snapshots
- unreviewed operational chatter

## Current convention

- `docs/system-overview.md` is the light repo summary.
- `docs/reference/` holds historical or relocated reference material.
- The local-only AI control plane lives in `START-HERE-AI.local.md` and `documents-local/`.
