# 2026-06-13 13:48 CEST — Storage fail-closed and local backup automation

## Summary

- hardened Passreserve production storage so Vercel production now fails closed instead of silently falling back to the file store when the configured database is unavailable or schema-incompatible
- added a dedicated storage-policy layer to distinguish safe local/preview fallback from production-only fail-closed behavior
- wrapped non-mutator full-state Prisma rewrites in their own advisory-lock transaction and added snapshot-integrity assertions before database-wide rewrites or restores
- added workspace-local backup and restore tooling:
  - `npm run ops:backup`
  - `npm run ops:backup:weekly`
  - `npm run ops:restore`
- created and validated the first local backup snapshot in `.ops/backups/passreserve`
- created the weekly local Codex automation `passreserve-weekly-local-backup`

## Root cause addressed

The June 13 production incident showed that Passreserve was still architecturally vulnerable even after the Sillico data restore:

- production code paths still contained multiple silent `falling back to file state` branches
- storage mode could degrade to `file` after schema incompatibility detection
- some full-state database rewrites could still be triggered outside an explicit transaction wrapper
- there was no recurring local backup routine on the operator machine

That meant a future database issue could still turn into split-brain state or hidden production drift. This patch closes that class of problem more aggressively.

## Changes

### Production storage hardening

- added [lib/passreserve-storage-policy.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-storage-policy.js) as the shared storage-mode policy source of truth
- updated [lib/passreserve-config.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-config.js) so production storage reports as database-backed and fail-closed rather than silently flipping to file mode
- updated [lib/passreserve-prisma.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-prisma.js) so database fallback attempts in Vercel production now throw `ProductionDatabaseFallbackError` instead of proceeding to the file store
- updated [lib/passreserve-state.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-state.js) to:
  - expose snapshot summaries for backup metadata
  - assert snapshot integrity before wide rewrites
  - run non-mutator rewrite paths through a dedicated transaction + advisory lock wrapper
  - provide a guarded restore helper for workspace-local recoveries
- updated [lib/passreserve-admin-service.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js) so platform health persistence tone follows storage health rather than simply checking `mode === database`

### Local backup workflow

- added [scripts/passreserve-backup-utils.mjs](/Users/leonardofiori/Documents/Antigravity/gatherpass/scripts/passreserve-backup-utils.mjs) for env loading, retention, gzip snapshot IO, checksum generation, and pruning
- added [scripts/db-backup.mjs](/Users/leonardofiori/Documents/Antigravity/gatherpass/scripts/db-backup.mjs)
- added [scripts/db-restore.mjs](/Users/leonardofiori/Documents/Antigravity/gatherpass/scripts/db-restore.mjs)
- updated [package.json](/Users/leonardofiori/Documents/Antigravity/gatherpass/package.json) with `ops:*` commands
- updated [`.gitignore`](/Users/leonardofiori/Documents/Antigravity/gatherpass/.gitignore) so `.ops/backups/` stays local-only
- added [`.ops/README.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/.ops/README.md)

### Documentation

- updated [README.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/README.md)
- updated [06_OPERATIONS_TESTING_AND_RISKS.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/06_OPERATIONS_TESTING_AND_RISKS.md)
- updated [FINAL_LAUNCH_HANDOFF.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/FINAL_LAUNCH_HANDOFF.md)
- updated [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Backup automation

- created local cron automation: `passreserve-weekly-local-backup`
- schedule: weekly on Sunday at `03:30` Europe/Rome
- execution environment: local
- workspace: `/Users/leonardofiori/Documents/Antigravity/gatherpass`
- task: run `npm run ops:backup:weekly`, verify archive + metadata creation, and report backup summary

## Validation

- `node scripts/db-backup.mjs --help`
- `node scripts/db-restore.mjs --help`
- `npx vitest run test/passreserve-storage-policy.test.js test/passreserve-backup-utils.test.js`
- `npm run ops:backup:weekly`
- `node scripts/db-restore.mjs --file=archives/passreserve-state-2026-06-13T11-42-22-864Z.json.gz --yes`
  - expected safe refusal because target matched the primary `DATABASE_URL`
- `npm run verify`
- verified Vercel production deployment `dpl_3XPoWoSgvF9vGDBDLvKbGvhjbDUe` reached `READY`
- live route checks after deploy:
  - `https://passreserve.com/` → `200`
  - `https://passreserve.com/sillico` → `200`
  - `https://passreserve.com/sillico/admin/login` → `200`
  - `https://passreserve.com/admin/health` → `307` redirect to `/admin/login`
- checked runtime logs for the new deployment and found no fresh `error` or `fatal` entries

## Caveats

- the new backup flow is an application-level Passreserve snapshot, not a raw PostgreSQL physical backup
- the restore command is intentionally conservative and still needs a separate staging restore target to complete a full restore-drill
- production still uses the existing wide snapshot-rewrite architecture for many mutations; this patch reduces the fallback danger and adds integrity guards, but it does not yet replace the whole persistence model with row-level CRUD writes

## Next guidance

- keep the weekly local automation active and periodically inspect that new snapshots continue to appear under `.ops/backups/passreserve`
- add a separate restore target and perform scheduled restore drills, not just backup creation
- consider a future second backup copy off this machine for disaster recovery beyond local-machine failure

## Commit and push status

- commit: `3ca2556` (`fix: harden production storage and add local backups`)
- push: completed to `origin/main`
- Vercel production verification: completed (`dpl_3XPoWoSgvF9vGDBDLvKbGvhjbDUe`, `READY`)
