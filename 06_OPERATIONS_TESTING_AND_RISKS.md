# Operations, Testing, And Risks

## Environment and runtime inputs

Observed env key names in ignored env files:

- `.env`
  - `DATABASE_URL`
- `.env.local`
  - `DATABASE_URL`
  - `PRISMA_CLIENT_ENGINE_TYPE`

Documented runtime env vars from code and docs include:

- `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `SUPABASE_DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `EMAIL_DISABLED`
- `IP_SALT`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_INITIAL_PASSWORD`
- `VERCEL_DEPLOY_HOOK_URL`

## Deployment model

The intended deployment target is Vercel with PostgreSQL and optional Vercel Blob.

Operational characteristics visible in code:

- Next.js server-side rendering / server actions
- Prisma with pg adapter
- structured console logs intended for Vercel logging
- Blob storage for admin-uploaded image assets
- optional deploy hook for rebuild-style content publishing

## Critical operational caveat: build script is destructive

`package.json` defines:

- `build`: `npx prisma generate && npx prisma db push --accept-data-loss && next build`

This is the single most important operational warning in the repository.

Why it matters:

- `npm run build` is not just a compile/build step,
- it performs schema push against the configured database,
- it explicitly uses `--accept-data-loss`.

Because the request for this handoff explicitly said not to alter the repo or its live operational state, this command was not run during analysis.

Any future maintainer should treat this as a major risk until it is redesigned.

## Quality verification performed for this bundle

The following non-destructive checks were executed on April 4, 2026:

### 1. `npm run typecheck`

Result:

- passed

Meaning:

- the repository currently satisfies TypeScript compilation under `tsc --noEmit`

### 2. `npm run test:unit`

Result:

- failed

Observed summary:

- 5 test files executed
- 4 passed
- 1 failed

Failing file:

- `test/unit/confirm.test.ts`

Why it fails:

- the test expects the old confirmation-action contract,
- the runtime action now requires a `responsibility` checkbox,
- the test still sends a legacy `recaptchaToken`,
- the test setup also does not fully mock the rate-limit dependency path.

Interpretation:

- the product behavior evolved faster than the test suite,
- and the unit suite is currently partially stale.

### 3. `npm run lint`

Result:

- failed

Observed summary:

- 174 total problems
- 99 errors
- 75 warnings

Dominant categories:

- many `no-explicit-any` errors
- unused imports/variables
- some React purity/effect warnings
- some raw `<a>` navigation lint violations
- some `react/no-unescaped-entities`
- image-optimization warnings for `<img>`

Interpretation:

- lint is not a green gate right now,
- type safety is acceptable at compile time but not stylistically or strictly enforced in code quality.

## Test suite reality vs documented intent

`TESTING.md` presents a broader testing strategy:

- unit
- integration
- E2E

What is actually tracked:

- unit tests only
- no tracked integration test files
- no tracked Playwright spec files or Playwright config file

That means the current repository should be understood as:

- unit-tested in a limited way,
- not truly integration-tested from tracked source,
- not truly E2E-tested from tracked source.

## Operational scripts and what they imply

The `scripts/` directory tells a lot about the development process.

The repository has separate scripts for:

- diagnosing DB access
- verifying slot logic
- verifying timezone math
- verifying settings persistence
- verifying availability behavior
- verifying calendar behavior
- resetting admin credentials

This implies:

- individual behaviors have been manually proven in isolation,
- but those proofs live as ad hoc scripts rather than a fully institutionalized automated suite.

That is common in fast-moving product work, but it also means:

- team knowledge may be embedded in scripts,
- not all confidence is encoded in tests.

## Main implementation risks and inconsistencies

## 1. Build/deploy risk

The build script can mutate or damage the target database.

This is the highest operational risk in the repo.

## 2. Runtime customization fields are only partially wired

Tenant settings collect:

- `bookingTitle`
- `bookingSubtitle`
- `emailSubjectConfirmation`
- `emailSubjectRecap`

But in the checked-in runtime:

- `infoBox` is clearly rendered publicly,
- `pickupLocationUrl` is clearly used in confirmation email,
- `bookingTitle` and `bookingSubtitle` are not clearly consumed by the public booking page,
- the email-subject customization fields are stored but not wired into the live email send path.

This means parts of the settings UI are ahead of the runtime usage.

## 3. Password-reset destination inconsistency

The forgot-password flow verifies against:

- `Tenant.registrationEmail`

But the reset-password completion email is sent to:

- `tenant.contactEmail`

That is a real conceptual mismatch:

- the admin identity email and the public contact email are not necessarily the same.

## 4. Timezone consistency is uneven

The codebase clearly cares about tenant timezones:

- `createZonedDate`
- tenant `timezone`
- timezone verification script
- calendar action uses zoned day boundaries

But not every feature is equally careful:

- dashboard "today" calculations use `startOfDay/endOfDay(today)` from server-local time,
- which may diverge from tenant-local "today".

This is a meaningful business-risk area for non-local deployments or multi-timezone tenants.

## 5. Security docs and runtime are not perfectly aligned

The repo has solid security intent, but current implementation includes pragmatic exceptions:

- CSP still allows unsafe inline/eval,
- Google CSP allowances remain although reCAPTCHA is mostly removed,
- docs mention some controls more strongly than the code currently enforces.

This is not necessarily a crisis, but it is drift.

## 6. Sound UX implementation is ahead of policy compliance

The design system says sound should respect mute/reduced-motion style user preferences.

The actual sound implementation:

- initializes `AudioContext`,
- plays sounds on interactive clicks,
- does not visibly enforce user preference handling.

So the feature exists, but not with the full policy sophistication described in docs.

## 7. Stale and orphaned code/doc artifacts exist

Examples:

- default `README.md`
- `app/[slug]/admin/reset-password/placeholder.tsx`
- comments referencing removed reCAPTCHA flow
- `lint-results.json` as tracked artifact

These do not break the app by themselves, but they signal incomplete cleanup after feature evolution.

## 8. Singleton super-admin assumption

The super-admin login flow effectively works as:

- fetch first super admin
- validate password

That is simpler than full operator account management, but it also limits future multi-operator governance.

## 9. Heavy use of `any`

Lint output shows many uses of `any` in:

- server actions
- admin pages
- email handling
- scripts
- tests

This increases maintenance cost because:

- business logic becomes harder to refactor safely,
- implicit data shape drift is more likely,
- tests do less to enforce contract stability.

## 10. Source docs are not equally trustworthy

Practical trust ranking from highest to lowest:

1. source code and Prisma schema
2. runtime-oriented helper modules in `lib/`
3. `SETUP.md` and `OBSERVABILITY.md`
4. `TESTING.md` and `SECURITY_HARDENING.md`
5. default root `README.md`

## Suggested immediate maintenance priorities for a new owner

If someone is taking over this repo seriously, the first wave of work should probably be:

1. Replace the build script so build is non-destructive.
2. Repair and expand the automated test suite.
3. Bring lint to a manageable baseline.
4. Reconcile tenant settings UI with actual runtime usage.
5. Fix email/contact/registration-email inconsistencies.
6. Audit timezone correctness on dashboard and daily views.
7. Refresh the root README and operational docs.
8. Decide whether to normalize some JSON settings or keep the JSON model intentionally.

## What was intentionally not run during this analysis

To stay non-destructive, the following were intentionally avoided:

- `npm run build`
  - because it runs `prisma db push --accept-data-loss`
- any script that would write to the production-configured database
- any git push or remote update

That is important context for the person receiving this bundle:

- this handoff describes the repository deeply,
- but it does not claim every DB-writing script was executed in this environment.
