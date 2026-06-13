## Phase

- Phase number: `Phase 09 follow-up`
- Phase title: `Security hardening: proxy headers and sensitive-route cache controls`

## Timestamp

- Completed at: `2026-06-13 20:29:38 Europe/Rome`

## Summary

- Added a root Next.js proxy boundary in `proxy.js`, backed by shared `lib/passreserve-http-security.js` helpers, so Passreserve now emits a consistent baseline of browser security headers on dynamic responses instead of relying on ad-hoc per-route behavior.
- Sensitive surfaces now return stronger privacy/caching semantics by default: organizer admin, platform admin, API routes, and public registration-flow routes all receive `Cache-Control: no-store`, `Pragma: no-cache`, `Expires: 0`, and `X-Robots-Tag: noindex, nofollow`.
- The baseline browser-security policy now includes `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and HSTS plus `upgrade-insecure-requests` only on HTTPS or protected-production requests so local HTTP development is not broken.

## Files changed

- `proxy.js`
- `lib/passreserve-http-security.js`
- `test/passreserve-http-security.test.js`
- `001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Checks performed

- `npx eslint proxy.js lib/passreserve-http-security.js test/passreserve-http-security.test.js`
- `npx vitest run test/passreserve-http-security.test.js`
- `npm run build`
- `npm run start -- --hostname 127.0.0.1 --port 3050`
- `curl -I -s http://127.0.0.1:3050/events`
- `curl -I -s http://127.0.0.1:3050/sillico/admin/login`
- `curl -I -s http://127.0.0.1:3050/sillico/events/divini-sapori/register/payment/preview/test-token`

## Vercel deployment status

- Not deployed in this phase. Commit/push/Vercel verification are still pending because the user asked to progress phase by phase locally before the release pass.

## Problems and risks

- This pass intentionally avoids a full allowlist CSP (`default-src ...`) because the current Next.js runtime uses framework-managed scripts/styles that would need a broader nonce/hash rollout. The chosen directives still harden framing, object embedding, form targets, and transport upgrade without risking a frontend break.
- The new no-store policy now covers all `/api/*` and `/register/*` responses via the proxy boundary. That is desirable for privacy and token safety, but any future API endpoint that legitimately wants cacheability will need an explicit design review rather than silently inheriting cacheable behavior.

## Notes for the next AI agent

- Read `000_START_HERE_AI.md` plus the four June 13 security-hardening patch notes before preparing the ship/publish phase.
- Phase 5 should preserve all four local-only hardening slices together: trusted payment/reset boundaries, direct database Stripe reconciliation, operational audit trail/housekeeping, and the new proxy-level header/cache protections.
- When the eventual push happens, verify on live Vercel that admin/login and tokenized registration routes actually return the expected `no-store` and `X-Robots-Tag` headers, not just the local built app.
