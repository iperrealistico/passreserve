# Stripe billing diagnostics and persistence fix

- Reworked organizer Stripe connect/refresh persistence so billing no longer depends on the fragile full-state mutation fallback path when production is running on Postgres.
- Added direct Prisma writes plus audit logging for `createOrganizerStripeConnectLink()` and `refreshOrganizerStripeConnection()` so a linked Stripe account is saved to the canonical organizer record before onboarding redirects continue.
- Expanded the organizer billing read model with explicit blocker details, progress steps, next-action guidance, and clearer status headlines for `NOT_CONNECTED`, `PENDING`, `RESTRICTED`, and ready states.
- Upgraded the organizer billing page to show a real diagnostic breakdown of what is complete, what is blocking paid events, and what the organizer should do next instead of only generic `Blocked` pills.
- Made the billing refresh redirect messaging truthy so `Refresh status` now distinguishes `no linked Stripe account`, `pending onboarding`, `restricted requirements`, and `fully ready`.
- Added regression coverage for the richer billing diagnostics and Stripe gating explanations, then re-ran targeted billing tests and a production build successfully.
