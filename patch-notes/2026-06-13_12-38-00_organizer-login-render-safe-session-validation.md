# 2026-06-13 12:38 CEST — Organizer login render-safe session validation

## Summary

- fixed the remaining intermittent live failure on `https://passreserve.com/sillico/admin/login`
- confirmed from Vercel production runtime logs that the route was occasionally crashing with `Error: Cookies can only be ...`
- traced the problem to session validation helpers mutating cookies during normal GET rendering inside the shared organizer admin layout
- made the validation path read-only so stale sessions are still rejected, but the login page no longer tries to `save()` or `destroy()` cookies while rendering

## Root cause

After the Sillico production restore, the organizer login page itself existed and often returned `200`, but Vercel production logs still showed intermittent `500` failures on `GET /sillico/admin/login`.

The issue was not the organizer data. The issue was the render path:

- `app/[slug]/admin/layout.js` always asks for validated organizer/platform session context
- those validation helpers in `lib/passreserve-auth.js` were still trying to mutate the session cookie when they found an invalid or expired session
- on Vercel/Next, cookie mutation is not allowed during a normal server-component render, only inside Server Actions or Route Handlers

That meant a browser arriving with an old or invalid session cookie could crash the login page before the user even saw the form.

## Changes

- removed session-cookie mutation from render-time read helpers in [lib/passreserve-auth.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-auth.js):
  - `getValidatedStoredPlatformSessionUser()`
  - `getValidatedOrganizerAdminSessionUser()`
- removed render-time session invalidation from:
  - `requirePlatformAdminSession()`
  - `requireOrganizerAdminSession()`
- preserved the security behavior:
  - stale or invalid sessions are still rejected
  - protected pages still redirect to login
  - actual session writes remain inside sign-in, sign-out, reset, and other action-driven flows where cookie mutation is allowed

## Files changed

- [lib/passreserve-auth.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-auth.js)
- [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Validation

- checked live Vercel production runtime logs and confirmed the pre-fix error signature on `GET /sillico/admin/login`
- `npm run lint`
- `npm run test`
- `npm run build`

## Notes

- the exact domain is `passreserve.com`; `passlyreserve.com` does not currently resolve in DNS
- after deploy, the expected live behavior is:
  - `https://passreserve.com/sillico/admin/login` always renders
  - old/stale session cookies may still cause a redirect away from protected pages, but should no longer break the login form itself
