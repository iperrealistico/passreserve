# Phase 03 Patch Note

## Phase

- Phase number: `Phase 03`
- Phase title: `Brand, naming, and product vocabulary transformation`

## Timestamp

- Completed at: `2026-04-04 14:53:07 Europe/Rome`

## Summary

- Added [`09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md) as the Phase 03 source of truth for Passreserve.com vocabulary, email tone, subject-line strategy, and temporary legacy-term exceptions.
- Updated the onboarding docs so future AI agents must read the new language guide before implementation work.
- Refined the live root app so the public Passreserve.com landing page and metadata use registration-first event language instead of leftover booking phrasing.
- Expanded the live landing page with vocabulary, messaging, and roadmap sections that reflect the Passreserve.com direction without reintroducing legacy MTB Reserve terms into the public UI.

## Files changed

- [`000_START_HERE_AI.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/000_START_HERE_AI.md)
- [`001_PASSRESERVE_IMPLEMENTATION_PHASES.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)
- [`00_README_FIRST.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/00_README_FIRST.md)
- [`09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/09_PASSRESERVE_LANGUAGE_AND_MESSAGING.md)
- [`app/layout.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/layout.js)
- [`app/page.js`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/page.js)
- [`app/globals.css`](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css)
- [`patch-notes/2026-04-04_14-53-07_phase-03_vocabulary-and-messaging-baseline.md`](/Users/leonardofiori/Documents/Antigravity/gatherpass/patch-notes/2026-04-04_14-53-07_phase-03_vocabulary-and-messaging-baseline.md)

## Checks performed

- Ran `npm run build` in the active Passreserve.com workspace.
- Searched `app/` to confirm no public-facing legacy rental terms remain in the live root app.
- Did not run lint or test suites because this minimal root workspace currently defines only `dev`, `build`, and `start` scripts.

## Vercel deployment status

- Verified via the Vercel integration after pushing commit `50fab7681533478e0cffbe94120cdabf3e2b3359`.
- Deployment `dpl_FYTnJgP5SbSw1PTVsxJ6BwJjKTfq` for commit `50fab7681533478e0cffbe94120cdabf3e2b3359` reached `READY`.
- Observed production aliases included `passreserve.vercel.app` and `passreserve-git-main-iperrealisticos-projects.vercel.app`.

## Problems and risks

- The active root workspace is still intentionally minimal, so the new email language exists as a source-of-truth guide rather than a wired runtime email system.
- Historical legacy docs still contain MTB Reserve vocabulary by design because they describe the reference platform and migration context.

## Commit and push status

- Commit created successfully: `50fab7681533478e0cffbe94120cdabf3e2b3359`
- Push completed successfully: `origin/main`

## Notes for the next AI agent

- Read the new language guide after the transformation plan and before adding any new public UI, organizer UI, or email scenarios.
- Keep public copy on Passreserve.com registration-first; do not reintroduce booking, rider, shop, bike, inventory, or pickup wording into the live app.
- The next logical work begins in `Phase 04: Event domain and data model foundation`.
