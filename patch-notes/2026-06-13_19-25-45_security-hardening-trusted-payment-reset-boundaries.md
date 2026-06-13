# 2026-06-13 19:25:45 CEST — Security hardening for trusted payment and reset boundaries

## Phase

- Phase number: `Custom security rollout - Phase 1`
- Phase title: `Trusted payment completion and trusted reset-link boundaries`

## Timestamp

- Completed at: `2026-06-13 19:25:45 Europe/Rome`

## Summary

- closed the public registration payment-preview bypass so `?preview=1` completion is now allowed only in local non-Vercel preview mode
- made payment-success resolution fail closed when Stripe confirmation data is missing, instead of falling through into a false-positive confirmation path
- switched public checkout reopen flows and admin password-reset links back to trusted server-side base URL resolution rather than browser-controlled `baseUrl` inputs
- made `SESSION_SECRET` fail closed in protected Vercel production runtimes so the app cannot boot there with the insecure local fallback secret
- added focused regression coverage for payment completion rules, reset-link host trust, and session-secret policy

## Files changed

- updated [lib/passreserve-config.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-config.js)
- updated [lib/passreserve-payments.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-payments.js)
- updated [lib/passreserve-service.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js)
- updated [app/[slug]/events/[eventSlug]/register/actions.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/actions.js)
- updated [app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/confirmation-form.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/confirmation-form.js)
- updated [app/[slug]/events/[eventSlug]/register/registration-flow-experience.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js)
- updated [app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/resume-payment-form.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/resume-payment-form.js)
- updated [app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js)
- updated [app/[slug]/admin/actions.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js)
- updated [app/[slug]/admin/login/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/login/page.js)
- updated [app/admin/actions.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/actions.js)
- updated [app/admin/login/page.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/login/page.js)
- updated [test/passreserve-password-reset.test.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-password-reset.test.js)
- updated [test/passreserve-registrations.test.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-registrations.test.js)
- added [test/passreserve-config.test.js](/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-config.test.js)
- updated [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md)

## Checks performed

- `npx vitest run test/passreserve-config.test.js test/passreserve-password-reset.test.js test/passreserve-registrations.test.js`
- `npx eslint lib/passreserve-config.js lib/passreserve-payments.js lib/passreserve-service.js app/[slug]/events/[eventSlug]/register/actions.js app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/confirmation-form.js app/[slug]/events/[eventSlug]/register/registration-flow-experience.js app/[slug]/events/[eventSlug]/register/payment/cancel/[paymentToken]/resume-payment-form.js app/[slug]/events/[eventSlug]/register/payment/preview/[paymentToken]/page.js app/[slug]/admin/actions.js app/[slug]/admin/login/page.js app/admin/actions.js app/admin/login/page.js test/passreserve-config.test.js test/passreserve-password-reset.test.js test/passreserve-registrations.test.js`
- `npm run build`
- checked current production deployment history in Vercel MCP and confirmed live production is still on commit `e94331c` (`fix: simplify homepage event search actions`)
- checked Vercel production runtime logs for recent `createRegistrationHold` / `P2028` / payment-hold failures and found no matching runtime error entries in the queried windows

## Vercel deployment status

- no push was performed in this phase-closeout step
- therefore no new Vercel deployment was triggered for these changes yet
- last confirmed production deployment remains `dpl_Gnck2qbTeLKN1vzhSKxQ14tTBAK1` on commit `e94331ce9db35b7babc9cd88c66e546a7c8a01cb`

## Problems and risks

- these hardening changes are still only local in the workspace at the time of this patch note; production does not benefit from them until commit, push, and deploy happen
- the user-reported mobile booking error (`We couldn't create the registration hold right now`) was not reproduced from the currently queried live runtime logs, so this note documents the hardening work itself but does not claim that the live mobile regression has already been proven resolved
- many public registration fields and schemas still carry legacy optional `baseUrl` shape support in service validation for backward compatibility, even though the browser-controlled inputs were removed from the public/admin flows touched here

## Notes for the next AI agent

- read this patch note together with the latest activity entry in [001_PASSRESERVE_IMPLEMENTATION_PHASES.md](/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md) before touching payment or auth flows again
- do not assume production already includes this hardening: it does not until the local workspace changes are committed and pushed
- before claiming the mobile booking error is fixed, rerun a live public booking test against `https://passreserve.com/sillico/events/divini-sapori/register` after deployment and recheck Vercel runtime logs around the test window
- preserve the local-only preview payment path for smoke tests and non-Vercel development; the security intent is to block that path in protected production, not to remove local preview tooling entirely
