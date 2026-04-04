# Sharing And Artifacts

## Why this document exists

The requested archive is not a source-only export. It is a full directory snapshot. That makes it powerful for handoff, but potentially risky for sharing.

This document explains what is in the archive and how to reason about it.

## What the full zip contains

Because the request explicitly asked for "every file in this repo", the generated zip includes the full repository directory contents as found on disk at snapshot time, not just tracked source files.

That means the archive can include:

- tracked source code
- tracked docs
- tracked images
- ignored env files
- `node_modules`
- `.next`
- `.vercel`
- `.git`
- macOS `.DS_Store`
- local dev metadata

## Why that is both useful and dangerous

## Useful because

- the recipient can inspect the exact working directory shape,
- the recipient has the installed dependency tree,
- the recipient has build output and local artifacts,
- the recipient has the Git metadata/history snapshot,
- the recipient has a near-forensic copy of the local checkout.

## Dangerous because

- `.env` or `.env.local` may expose secrets,
- `.git` exposes history, branches, refs, commit messages, and potentially old sensitive blobs,
- `node_modules` and `.next` massively bloat the archive,
- generated output can distract from the real authored application,
- it may be inappropriate for external third parties.

## Physical size profile

At snapshot time:

- repo directory: `1.3G`
- `node_modules`: `891M`
- `.next`: `389M`
- `.git`: `17M`
- app source directories are much smaller by comparison

See:

- `manifests/directory-sizes.txt`

## What a developer should read first after unpacking

If the recipient wants to understand the system quickly, they should not start with the zip contents blindly.

Recommended sequence:

1. Read `00_README_FIRST.md`
2. Read `01_EXECUTIVE_SUMMARY.md`
3. Read `02_ARCHITECTURE_AND_RUNTIME.md`
4. Read `03_FEATURE_WALKTHROUGH.md`
5. Use `manifests/tracked-files.txt`
6. Only then browse the repo itself

## What "every file" means in this bundle

There are two inventories:

- authored/tracked application files
  - `manifests/tracked-files.txt`
- full physical directory snapshot
  - `manifests/full-directory-files.txt`

If the recipient only needs to understand how the app works, the tracked-file manifest is the important one.

If the recipient needs a forensic/local-environment snapshot, the full-directory manifest matters.

## Sensitive-share guidance

If this bundle is being sent outside a trusted circle, you should strongly consider creating a sanitized derivative archive later that excludes:

- `.env`
- `.env.local`
- `.git`
- `.next`
- `.vercel`
- `node_modules`
- `.DS_Store`

This bundle does not do that because the original request explicitly asked for the full directory.

## What was not pushed

The docs in this handoff bundle were created outside the repository.

Nothing in this bundle was:

- committed to the source repo
- pushed to `origin`

This matters because the repo remote remains untouched while still allowing a deep offline handoff.

## The manifests folder

The `manifests/` folder is the bridge between prose documentation and exact on-disk reality.

### `tracked-files.txt`

Use this when you want the definitive list of version-controlled project files.

### `tracked-files-line-counts.tsv`

Use this when you want scale and density information by file.

### `full-directory-files.txt`

Use this when you want the exact file inventory for the entire directory snapshot.

### `working-tree-status.txt`

Shows ignored and untracked status classes present at capture time.

### `route-files.txt`

Lists route/page/layout/action files under `app/` for quick route discovery.

### `about-assets.tsv`

Lists marketing/about-page image assets with file size and dimensions.

### `env-key-names.txt`

Lists env key names found in ignored env files without exposing their values.

### `directory-sizes.txt`

Quick size profile of major folders.

## Final recommendation

Treat this bundle as two deliverables packaged together:

1. a developer-oriented explanatory package
2. a complete filesystem snapshot

That is more comprehensive than most handoffs, but it also demands more care from whoever shares it next.
