# 2026-06-13 22:29:50 CEST — Registration checkout handoff hotfix

## Phase

- Phase number: `Post-release hotfix`
- Phase title: `Sillico public registration checkout handoff stabilization`

## Timestamp

- Completed at: `2026-06-13 22:29:50 Europe/Rome`

## Summary

- Reproduced the live public booking failure reported from mobile on the Sillico event flow, where the final `Continue to payment / Vai al pagamento` submit returned `We couldn't create the registration hold right now.` instead of opening Stripe Checkout.
- Confirmed the failing request was the production server action on `/sillico/events/divini-sapori/register`, then hardened `lib/passreserve-service.js` so the post-registration checkout handoff no longer aborts when secondary follow-up work fails after a Stripe Checkout session has already been created.
- The hotfix now treats these steps as non-blocking during the public direct-confirm and payment-resume flows:
  - persisting the local `RegistrationPayment(kind=CHECKOUT_SESSION)` row
  - writing checkout-started / checkout-failed audit entries
  - sending the organizer new-registration alert during the payment handoff
- Created code commit `f8d0386c3a284cba50e03ec39835948830d0519e` (`fix: harden registration checkout handoff`), pushed `main`, and verified the resulting Vercel production deployment `dpl_HGwsXHmaj9SJQLZyX5kRTQCdSJJb` reached `READY`.
- Post-deploy verification against the pinned production deployment confirmed the live server action can now create disposable `PENDING_PAYMENT` registrations and live Stripe Checkout session IDs successfully. The temporary verification registrations were deleted immediately from the canonical database after the check.

## Files changed

- `lib/passreserve-service.js`
- `001_PASSRESERVE_IMPLEMENTATION_PHASES.md`
- `patch-notes/2026-06-13_22-29-50_registration-checkout-handoff-hotfix.md`

## Checks performed

- `npx eslint lib/passreserve-service.js`
- `npx vitest run test/passreserve-registrations.test.js test/passreserve-payments.test.js test/passreserve-operational-housekeeping.test.js`
- Vercel deployment verification for production deployment `dpl_HGwsXHmaj9SJQLZyX5kRTQCdSJJb`
- Live production reproduction on the previous deployment via the browser CLI against:
  - `https://passreserve.com/sillico/events/divini-sapori/register?occurrence=occ-divini-sapori-2026-07-03-restored`
- Live production request inspection:
  - captured the failing server-action body and response for the red-banner submission
  - captured the response headers showing the request was pinned to deployment `dpl_HGwsXHmaj9SJQLZyX5kRTQCdSJJb`
- Live production server-action verification after deploy:
  - replayed the exact registration action against `passreserve.com`
  - replayed the same action pinned explicitly to deployment `dpl_HGwsXHmaj9SJQLZyX5kRTQCdSJJb`
  - confirmed both replays created disposable `PENDING_PAYMENT` registrations with live Stripe Checkout session IDs in Postgres
- Live production data cleanup:
  - deleted the temporary verification registrations plus their local audit/payment/email-log rows from the canonical database once the checkout handoff had been verified

## Vercel deployment status

- Hotfix deployment: `dpl_HGwsXHmaj9SJQLZyX5kRTQCdSJJb` — `READY`
- Verification method: `Vercel MCP` deployment inspection plus live server-action replay against `passreserve.com`
- Production aliases confirmed on the hotfix deployment:
  - `passreserve.com`
  - `passreserve.vercel.app`
  - `passreserve-iperrealisticos-projects.vercel.app`
  - `passreserve-git-main-iperrealisticos-projects.vercel.app`

## Problems and risks

- The local browser CLI still surfaced one stale red-banner response during interactive verification even though equivalent pinned production server-action replays succeeded and created real `PENDING_PAYMENT` registrations. That means the backend failure path itself no longer reproduced after the hotfix, but any future report of the same banner should also inspect the client-side action-state behavior and not assume the backend is still the only culprit.
- Verification created open Stripe Checkout sessions on the connected Sillico account. Their matching Passreserve registrations were deleted from Postgres immediately after the check, but the remote Checkout sessions themselves were left to expire naturally inside Stripe.
- This patch deliberately did not change organizer/event data, refund logic, or webhook reconciliation behavior; it only hardened the checkout handoff so secondary bookkeeping cannot block a successful Stripe redirect.

## Notes for the next AI agent

- If this red-banner issue ever reappears, compare three things before changing schema or organizer data:
  - the raw server-action request body
  - the pinned deployment ID from the request headers
  - whether the corresponding registration row and `CHECKOUT_SESSION` payment row were created in Postgres
- Preserve the new fail-open behavior around `persistPrismaCheckoutLaunchSideEffects()` and `persistPrismaCheckoutFallbackSideEffects()` unless you have a stronger transactional replacement that keeps Stripe handoff user-safe.
- When re-testing this flow on production, use disposable attendee emails and clean the resulting verification registrations back out of Postgres immediately after the check so organizer dashboards stay clean.

## Commit and push status

- Code commit created: `f8d0386c3a284cba50e03ec39835948830d0519e` — `fix: harden registration checkout handoff`
- Code push completed successfully to `origin/main`
- Documentation closeout commit/push status: pending until this patch note and the updated master ledger are committed and pushed
