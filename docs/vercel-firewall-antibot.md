# Passreserve Vercel Firewall antibot

This document records the small, reversible edge-only protection enabled for the
Passreserve Vercel project. It does not replace application security controls and
does not require a deployment.

## Live configuration

- Project: `passreserve` (`prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn`)
- Domain: `passreserve.com`
- Custom rule: `Passreserve - deny malicious scanner paths`
- Rule id: `rule_passreserve_deny_malicious_scanner_paths_04MH7D`
- Action: `deny` at the Vercel Firewall edge
- Public GET burst rule: `Passreserve - conservative public GET burst challenge`
- Public GET rule id: `rule_passreserve_conservative_public_get_burst_challenge_dZwkI8`
- Public GET rule: `120 requests / 60 seconds / IP`, fixed window, then Vercel
  `challenge`
- Bot Protection: enabled with action `log` only; it does not challenge or deny
- Attack Challenge Mode: not enabled
- Public GET rate limiting: enabled with the conservative challenge threshold
  above

The custom rule matches only these path families:

- `/.env*`
- `/.git/*`
- `/wp-*`
- `/phpmyadmin*` and `/adminer*`
- any path ending in `.bak`, `.sql`, `.zip`, `.tar.gz`, `.old`, or `.backup`

The public GET rate-limit rule matches only `GET` requests for the homepage,
top-level public pages, organizer pages, public event pages, and public
registration pages. It does not match `POST` requests, API routes, admin routes,
static assets, confirmation routes, or payment-token routes.

Both custom rules run at the Vercel Firewall edge, before Next.js. They do not
alter `proxy.js`, Next.js middleware behavior, database access, caching,
payments, email, or cron execution.

## Functional routes left alone

Neither custom rule matches any of the following functional surfaces:

- registration submissions and ALTCHA APIs;
- Stripe webhook and billing return/connect routes;
- Resend routes;
- `/api/cron/reminders`;
- platform admin and organizer admin routes, including login and reset flows.
- tokenized registration confirmation, pending, success, cancel, preview, and
  payment routes.

Normal `GET` visits to the public homepage, public organizer pages, public event
pages, and public registration entry pages remain available. Only an IP that
exceeds 120 matching public `GET` requests within 60 seconds receives a Vercel
challenge. No public `POST`, API, admin, confirmation, or tokenized payment route
is included in that rule.

Bot Protection is currently log-only, so it does not block any functional
surface. If it is later changed to `challenge`, the functional exclusions above
must be rechecked before publishing that change.

## Verification

The following production checks were performed after publishing the rule:

- scanner paths returned `403`: `/wp-admin/install.php`, `/.env.local`,
  `/.git/config`, `/backup.sql`;
- `/`, `/sillico`, the public registration page, and `/admin/login` returned
  `200`;
- `/api/stripe/webhooks` returned its application-level `405` for an unsupported
  GET, and `/api/cron/reminders` returned its application-level `401`;
- the new public GET rule was verified live with normal requests returning `200`;
  no synthetic 121-request burst was sent to production, so the challenge was
  not intentionally triggered during the smoke check;
- no Next.js code, database schema, feature, payment flow, email flow, or cron
  code was changed.

## Fast rollback

Disable the custom rule, then publish the staged change:

```bash
npx --yes vercel@56.4.0 firewall rules disable \
  rule_passreserve_deny_malicious_scanner_paths_04MH7D \
  --project prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn \
  --scope team_HkXanAKxflViaTU8bv2zg4Cf
npx --yes vercel@56.4.0 firewall publish \
  --project prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn \
  --scope team_HkXanAKxflViaTU8bv2zg4Cf \
  --yes
```

If only the public-page rate limiter needs to be disabled, use its rule id in
the same two-step sequence:

```bash
npx --yes vercel@56.4.0 firewall rules disable \
  rule_passreserve_conservative_public_get_burst_challenge_dZwkI8 \
  --project prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn \
  --scope team_HkXanAKxflViaTU8bv2zg4Cf
npx --yes vercel@56.4.0 firewall publish \
  --project prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn \
  --scope team_HkXanAKxflViaTU8bv2zg4Cf \
  --yes
```

Bot Protection can be disabled immediately from the Vercel project Firewall
panel by turning off the `bot_protection` managed rule. It is currently in
monitoring mode, so disabling it is not needed to restore traffic unless the
monitoring configuration itself causes an issue.

## Monitoring window

For the next 24–48 hours, record Firewall events and runtime request counts for:

- blocked requests by rule and path family;
- Bot Protection log volume and likely false positives;
- runtime invocations and Fluid Active CPU;
- successful public registration, payment, webhook, email, admin, and cron
  checks.

Do not lower the public GET threshold, expand its route scope, or change Bot
Protection to `challenge` until those checks show a clear abuse pattern and the
functional exclusions have been tested.
