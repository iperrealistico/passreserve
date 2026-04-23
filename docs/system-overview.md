# System Overview

- [Verified] `Passreserve.com` is a Next.js App Router monolith in this repository.
- [Verified] Runtime storage is dual-mode: PostgreSQL via Prisma when `DATABASE_URL` is present, or a file-backed store under `.runtime-data/passreserve-state.json` locally and `/tmp/passreserve-state.json` on Vercel previews.
- [Verified] Public routes cover discovery, organizer pages, event pages, registration, payment follow-up, and registration confirmation.
- [Verified] Private routes cover organizer admin and platform admin surfaces with `iron-session` cookies.
- [Verified] Stripe is used for organizer onboarding and direct-charge Checkout flows.
- [Verified] Email is delivered through Resend when configured and otherwise logged locally.
- [Verified] An hourly Vercel cron route exists at `/api/cron/reminders` and requires `CRON_SECRET`.
- [Verified] The repository also contains a full legacy MTB Reserve snapshot at `unpacked/mtb-reserve/`; it is reference-only.

## Local Control Plane

- [Verified] Ongoing AI operational memory is intentionally local-only.
- [Verified] Future agents should start from `START-HERE-AI.local.md`, not the older tracked AI workflow files.

## Known Doc Drift

- [Verified] The `manifests/` folder describes an older TypeScript/shadcn workspace and does not match the current JavaScript App Router tree.
- [Verified] Historical root docs and patch notes remain useful evidence, but they should be checked against live code and current evidence files before being trusted.
