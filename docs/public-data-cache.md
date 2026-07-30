# Public Data Cache Safety Contract

## Scope

Passreserve uses the Next.js Data Cache only for bounded, stable public reads.
It does not cache complete responses and does not cache capacity, registration,
payment, webhook, email, cron, authentication, admin, or tokenized state.

The cache is disabled unless this exact Preview/Production environment value is
present:

```text
PASSRESERVE_PUBLIC_DATA_CACHE=v1
```

The bounded public database read model remains a separate switch:

```text
PASSRESERVE_PUBLIC_READ_MODEL=v2
```

Both switches default to their legacy/disabled behavior. Rollback is a flag
reversion plus redeployment, or promotion of the preceding deployment. No data
rollback is required.

## Why Cache Components are not enabled

Next.js 16 Cache Components were tested during Phase 7. The build rejected the
existing request-time locale access because Passreserve resolves the locale from
the locale cookie and `Accept-Language` before rendering `<html lang>`.

Moving locale resolution behind a static shell would make the server HTML
language incorrect, change first-request language behavior, or require new
locale-prefixed URLs. Those are accessibility, SEO, and UX changes and violate
the mission invariants.

The implementation therefore uses the official Next.js Data Cache through
`unstable_cache`. This retains the existing request-time locale behavior while
removing repeated stable database work.

## Cached data

### Organizer/event content

The cache contains only:

- published organizer public fields;
- public event content;
- active public ticket definitions;
- published future occurrence content.

A bounded cached slug index is checked before allocating an organizer cache
entry. Random bot-generated slugs therefore cannot create unbounded cache
entries.

Capacity-consuming registration rows are queried outside the cache on every
request and merged with stable content before the existing view builders run.
Registration creation still performs the authoritative write-time capacity
check.

### Discovery

There are at most two discovery catalog entries, one for `en` and one for `it`.
Arbitrary query strings are not cache keys. Search and finite location filters
run in memory against the narrow cached catalog.

- whitespace is normalized;
- non-string values become empty;
- free text over 160 characters is rejected before database/cache work;
- visible results are capped at 250;
- default discovery remains capped at 8, as before.

## Cache durations

| Cache | Revalidation safety net |
| --- | ---: |
| Organizer slug index | 15 minutes |
| Organizer/event stable content | 15 minutes |
| Discovery catalog by locale | 10 minutes |

Admin mutations use immediate `updateTag` invalidation, so these time windows
are failure-recovery limits rather than the normal freshness mechanism.

## Tags and invalidation

Stable tags:

- `public-site`;
- `about`;
- `discovery`;
- `organizer-content`;
- `organizer:<normalized-public-slug>`;
- reserved conventions `event:<id>` and `occurrence-content:<id>`.

Invalidation map:

| Mutation | Tags invalidated |
| --- | --- |
| Site settings | `public-site` |
| About content | `about` |
| Create/approve/suspend/delete organizer | `organizer-content`, `discovery` |
| Organizer public settings/publication | `organizer-content`, `discovery` |
| Event save/suspend/delete | `organizer-content`, `discovery` |
| Occurrence save/cancel/content change | `organizer-content`, `discovery` |
| Public payment-availability settings | `organizer-content`, `discovery` |
| Registration/payment status or hold change | no content invalidation; capacity is never cached |

No cache key or tag contains a session ID, hold token, payment token,
confirmation token, email address, webhook data, or admin session data.

## Explicit exclusions

The following remain dynamic and `no-store`:

- all registration and tokenized descendants;
- all `/api/**` routes;
- Stripe and Resend webhooks;
- cron and ALTCHA routes;
- platform and organizer admin;
- login and password reset;
- payment success/cancel/preview;
- all Server Actions and non-GET mutations.

