# Patch note — 2026-06-10 14:45 CEST

## Summary

Implemented the first full Passreserve legal-compliance foundation for EU privacy and cookie handling without altering the existing booking, payment, refund, or organizer-dashboard business flows.

This release adds:

- public legal pages for `Privacy Notice`, `Cookie Policy`, and `Terms of Use`
- a first-party cookie consent layer with:
  - `Accept all`
  - `Reject non-essential`
  - `Customize`
- persistent legal/footer navigation across the public site and admin shells
- explicit legal acceptance in:
  - organizer access requests
  - attendee booking confirmation steps

## Problem

Before this pass, Passreserve had no production-ready EU compliance surface for:

- privacy disclosures
- cookie consent and preference management
- public legal pages
- persistent legal navigation
- explicit site-terms acknowledgement in organizer requests and attendee bookings

The runtime already processed real personal data and payment-related metadata, but the UI and document layer had not yet caught up.

## What changed

### Legal documents

Added a centralized legal-content module plus public pages for:

- `/privacy`
- `/cookie-policy`
- `/terms`

The documents now disclose:

- controller/operator identity:
  - Leonardo Fiori
  - Partita IVA `IT02639600465`
  - Via Nicola Raffaelli 2, 55020 Fosciandora (LU), Italia
- Passreserve vs organizer vs Stripe responsibility boundaries
- real categories of personal data treated by the platform
- current essential cookies and browser storage
- attendee, organizer, and platform obligations
- strong but bounded limitation-of-liability wording

### Cookie consent

Added a first-party cookie-consent provider and preference modal with:

- default-blocking of non-essential categories
- versioned stored consent
- footer shortcut to reopen preferences
- category controls for:
  - necessary
  - preferences
  - analytics
  - marketing

Current runtime reality is reflected honestly:

- necessary cookies/storage are active
- optional analytics/marketing categories are not currently active

### Public and admin navigation

Added legal links and cookie-preferences access to:

- the public footer
- organizer admin shell footer
- platform admin shell footer

### Organizer request legal acceptance

The public organizer request modal now requires explicit acknowledgement of:

- the Privacy Notice
- the Terms of Use

before submission is accepted.

### Booking legal acceptance

The attendee booking flow now uses linked, explicit legal acceptance copy in both confirmation models:

- direct-confirm review step
- email-link confirmation page

This keeps the current registration logic intact while making the legal clickwrap clear and auditable.

## Verification

- `npx eslint app/layout.js app/providers.js app/public-footer.js app/[slug]/admin/layout.js app/admin/(platform)/layout.js app/actions.js app/home-organizer-request-modal.js app/[slug]/events/[eventSlug]/register/registration-flow-experience.js app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/confirmation-form.js app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js components/admin-legal-footer.js components/booking-legal-copy.js components/cookie-consent-provider.js components/cookie-preferences-button.js components/legal-document-page.js components/legal-links-row.js components/locale-switcher.js lib/passreserve-legal.js lib/passreserve-service.js test/passreserve-legal.test.js`
- `npm run test -- test/passreserve-organizer-signup.test.js test/passreserve-legal.test.js test/passreserve-registrations.test.js`
- `npm run verify`

Attempted browser-plugin smoke on the local dev server, but the in-app browser in this environment could not reach the local `localhost:3000` target, so local visual confirmation fell back to build/test verification and then final production checks after deployment.

## Files touched

- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/layout.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/providers.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/public-footer.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/globals.css`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/actions.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/home-organizer-request-modal.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/privacy/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/cookie-policy/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/terms/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/layout.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/admin/(platform)/layout.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/organizer-admin-tour.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/registration-flow-experience.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/confirmation-form.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/events/[eventSlug]/register/confirm/[holdToken]/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/admin-legal-footer.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/booking-legal-copy.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/cookie-consent-provider.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/cookie-preferences-button.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/legal-document-page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/legal-links-row.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/components/locale-switcher.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-legal.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-legal.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-organizer-signup.test.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Caveats and unresolved risks

- This pass creates a substantially stronger legal/compliance baseline, but it is still not a substitute for a lawyer’s final review under Italian/EU consumer and privacy law.
- The current cookie categories are future-ready. If analytics, marketing scripts, embeds, or new third-party tools are added later, they must remain gated by consent before activation.
- The legal texts strongly limit Passreserve responsibility, but mandatory consumer, privacy, and gross-negligence carveouts still apply and should not be removed.

## Next guidance

- Run a final legal review with an Italian privacy/IT counsel before treating the texts as definitive.
- If new analytics or marketing tooling is introduced, wire it through the consent provider instead of loading it eagerly.
- Consider adding organizer-facing legal/public-policy fields next if Passreserve wants each organizer to expose a public refund policy or legal contact on event pages.

## Commit, push, and deployment status

- Commit(s): completed successfully on `main`
- Push to GitHub: completed successfully
- Vercel production deployment: verified `READY` after the final push for this work, with the live aliases continuing to resolve on:
  - `https://passreserve.com`
  - `https://passreserve.vercel.app`
