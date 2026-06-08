# Patch Note

- Added a global interaction-feedback layer through `InteractionFeedbackProvider`, giving buttons and button-like links across the platform a shared press animation, subtle click sound, and route-transition feedback without rewriting each page into client-side wrappers.
- Added organizer-admin and auth loading shells through new App Router `loading.js` entries so organizer dashboard, organizer login/reset, platform login/reset, and organizer-access screens show a real preloader during page switches.
- Wired programmatic navigation paths that previously bypassed link-click detection, specifically locale switching and organizer guided-tour route changes, into the same route-feedback system.
- Updated the smoke script to accept Next.js redirect shells on protected organizer routes now that `loading.js` can turn redirects into `200` HTML responses with embedded redirect metadata during server rendering.
- Added `data-scroll-behavior="smooth"` on the root HTML element so the route-feedback rollout stays aligned with Next.js transition expectations.

## Verification

- `npm run verify`
- Local in-app browser smoke:
  - organizer auth flow: `/sillico/admin/login` -> `Public page`, with route overlay observed
  - organizer admin flow: `/sillico/admin/dashboard` -> `Events`, with route overlay observed
- Production deploy:
  - commit `f862818`
  - Vercel deployment `dpl_8iaQkTjhVoKSssEnwPUnDU8wTjNp`
  - live checks: `/organizer-access`, `/sillico/admin/login`, and protected `/sillico/admin/dashboard`
