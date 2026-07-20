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
- Bot Protection: enabled with action `log` only; it does not challenge or deny
- Attack Challenge Mode: not enabled
- Public GET rate limiting: not enabled yet; wait for 24–48 hours of evidence

The custom rule matches only these path families:

- `/.env*`
- `/.git/*`
- `/wp-*`
- `/phpmyadmin*` and `/adminer*`
- any path ending in `.bak`, `.sql`, `.zip`, `.tar.gz`, `.old`, or `.backup`

The rule is intentionally path-only and has no application route match. It does
not alter `proxy.js`, Next.js middleware behavior, database access, caching,
payments, email, or cron execution.

## Functional routes left alone

The rule does not match any of the following functional surfaces:

- public homepage, organizer, event, registration, confirmation, or payment pages;
- registration and ALTCHA APIs;
- Stripe webhook and billing return/connect routes;
- Resend routes;
- `/api/cron/reminders`;
- platform admin and organizer admin routes, including login and reset flows.

Bot Protection is currently log-only, so it also does not block any functional
surface. If it is later changed to `challenge` or a rate limit is introduced,
these surfaces must remain explicitly excluded before publishing that change.

## Verification

The following production checks were performed after publishing the rule:

- scanner paths returned `403`: `/wp-admin/install.php`, `/.env.local`,
  `/.git/config`, `/backup.sql`;
- `/`, `/sillico`, the public registration page, and `/admin/login` returned
  `200`;
- `/api/stripe/webhooks` returned its application-level `405` for an unsupported
  GET, and `/api/cron/reminders` returned its application-level `401`;
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

Do not enable a public GET rate limit or change Bot Protection to `challenge`
until those checks show a clear abuse pattern and the functional exclusions have
been tested.
