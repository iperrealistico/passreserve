# Passreserve Aggressive Vercel Resource Optimization Plan

## Document status

- Status: execution in progress; Phases 0–12 passed their local gates on
  2026-07-30. Preview/production release (Phase 13) and the full 48-hour
  production validation (Phase 14) remain.
- Scope: Passreserve/Gatherpass on Vercel.
- Target environment: production at `passreserve.com`.
- Vercel project: `passreserve` (`prj_eU02UtIG5GkGV4wa3eMnrfqyYpyn`).
- Primary objective: materially reduce Vercel Edge Requests, Fluid Active CPU, Function Invocations, Provisioned Memory, Fast Data Transfer, ISR usage, image-related usage, and avoidable build/deployment usage.
- Product objective: preserve every existing feature and preserve current user-visible behavior, UI, UX, payment semantics, registration semantics, admin behavior, email behavior, cron behavior, and database integrity.
- Release objective: complete all approved phases in production with zero planned downtime and a tested rollback path at every phase boundary.

This document intentionally describes an aggressive implementation, but it does
not permit aggressive risk-taking. It obtains the largest safe optimization by
separating public cached content from live operational state, introducing changes
in small releases, and refusing to advance when functional or data-safety gates
fail.

## Executive decision

The implementation contains **15 phases**, numbered `0` through `14`.

The recommended strategy is:

1. Attribute usage before changing architecture.
2. Protect the application at the Vercel edge.
3. Remove avoidable requests before optimizing server execution.
4. Remove broad request interception before enabling application caching.
5. Replace the oversized public data loader with a narrow read path.
6. Introduce Next.js Cache Components only for explicitly safe public content.
7. Keep capacity, registration, payment, webhook, admin, cron, and tokenized
   routes authoritative and dynamic.
8. Deploy each subsystem independently, monitor it, and preserve the previous
   production deployment for immediate rollback.

## Why this plan can reduce usage substantially

The current repository has three high-confidence optimization opportunities:

1. Public pages are broadly marked `force-dynamic`, causing server work for
   content that changes infrequently.
2. `proxy.js` matches nearly every non-static request and runs before the cache.
3. `loadPublicOrganizerStateBySlug` loads all organizer registrations,
   registration attendees, registration items, and payment rows even though
   public pages mainly need public event content and capacity aggregates.

The plan addresses different resource classes with different controls:

| Resource | Primary reduction mechanism |
| --- | --- |
| Edge Requests | WAF mitigation, removal of unnecessary prefetches and duplicate requests, valid crawler guidance, browser caching, optional dedicated asset origin only if evidence justifies it |
| Fluid Active CPU | cached public content, smaller public read path, less JavaScript serialization/transformation, narrower proxy execution |
| Function Invocations | static shells, Cache Components, removing speculative requests to dynamic routes |
| Provisioned Memory | smaller Prisma result sets, smaller serialized objects, shorter function lifetimes, correct function/database region |
| Fast Data Transfer | optimized static images, correct dimensions, lazy loading, smaller HTML/RSC payloads, immutable versioned assets |
| Fast Origin Transfer | prevent unnecessary dynamic rendering and reduce response payload size |
| ISR Reads/Writes | long-lived tagged caches with mutation-driven invalidation instead of very short global revalidation |
| Image Optimization usage | pre-sized static WebP/AVIF/SVG assets where appropriate; do not create unbounded transformation variants |
| Build/deployment usage | isolated but consolidated releases, no dependency churn, no repeated production deployments for the same phase |
| Analytics/monitoring quotas | use existing Usage, Firewall, and runtime logs first; do not add client analytics merely to measure infrastructure usage |

## Non-negotiable functional invariants

The following must remain true throughout all phases:

- A registration can never be accepted using cached capacity as the authority.
- Registration creation must re-check capacity in the existing database
  transaction or authoritative write path.
- Stripe Checkout, Stripe Connect, refunds, payment reconciliation, and webhook
  signature validation must not change.
- Resend delivery and inbound handling must not change.
- Cron authorization and reminder behavior must not change.
- Platform admin and organizer admin authentication must not rely on cache or
  Firewall challenges.
- Tokenized confirmation, pending, preview, success, cancellation, payment, and
  password-reset routes must remain private, dynamic, and `no-store`.
- Italian and English content must never share the same incorrect cache entry.
- Existing database records must not be rewritten or deleted for optimization.
- No destructive database migration is permitted.
- No feature, field, page, image, route, payment option, registration option,
  admin control, or email behavior may be removed.
- UI text, layout, interactions, keyboard behavior, responsive behavior, and
  normal navigation must remain equivalent unless a change is proven to be a
  non-visible performance improvement.

## Route protection and caching contract

This contract is mandatory and must be encoded in automated tests before cache
rollout.

| Route family | Shared cache | WAF generic challenge/rate limit | Required behavior |
| --- | --- | --- | --- |
| `/`, `/about`, legal pages, `/organizer-access` | Yes, when locale-safe | Conservative public GET policy | Public content only |
| `/events` without arbitrary search text | Yes, tagged and bounded | Conservative public GET policy | Public discovery catalog |
| `/events` with free-text search | Dynamic or bounded short cache | Conservative public GET policy | Normalize input and avoid cache-key explosion |
| `/:slug` | Cached content plus dynamic capacity where displayed | Conservative public GET policy | Published organizer only |
| `/:slug/events/:eventSlug` | Cached content plus dynamic capacity | Conservative public GET policy | Published event only |
| `/:slug/events/:eventSlug/register` | No shared page cache | No stronger generic rule than the proven high threshold | Always fresh registration context |
| `/:slug/events/:eventSlug/register/**` | No shared cache | Explicitly excluded | Token/private/payment state |
| `/api/**` | No generic shared cache | Explicitly excluded from public GET rules | Preserve endpoint semantics |
| `/api/stripe/webhooks` | Never | Explicitly excluded | Preserve Stripe signature and response semantics |
| `/api/resend/**` | Never | Explicitly excluded | Preserve Resend semantics |
| `/api/cron/reminders` | Never | Explicitly excluded | Preserve bearer-secret authorization |
| `/api/altcha/**` | Never | Explicitly excluded | Preserve anti-spam flow |
| `/admin/**` | Never | Explicitly excluded | Platform administration |
| `/:slug/admin/**` | Never | Explicitly excluded | Organizer administration |
| All Server Actions and non-GET mutations | Never | No generic public rate limit | Preserve writes and idempotency |
| Static versioned assets | Long browser/CDN cache | No challenge | Immutable content |

## Release control model

Every phase must use the following release model:

1. Create one narrowly scoped branch or commit series.
2. Record the current production deployment ID before any release.
3. Run the complete local verification suite.
4. Deploy to Vercel Preview.
5. Run preview route, header, locale, registration, payment, webhook, admin, and
   cron checks using test-safe data.
6. Compare preview behavior against production.
7. Promote only when the phase exit gate passes.
8. Run a production read-only smoke test immediately.
9. Scan early runtime errors.
10. Monitor the phase for its defined observation window.
11. Roll back to the recorded deployment on any stop condition.

Firewall changes follow a separate staged lifecycle:

1. inspect the active rule;
2. stage the smallest change;
3. run `vercel firewall diff`;
4. use `log` before enforcement when the match set is not already proven;
5. enforce in Preview first when supported;
6. publish production enforcement only through a deliberate release gate;
7. retain the rule ID and rollback command.

An authorized implementation agent may perform repository changes, tests,
Preview deployments, production application deployment, production verification,
monitoring, and application rollback. Firewall production publishing must never
be hidden inside another operation. If the execution environment requires a
human-owned Firewall publish, the plan must stop at the reviewed draft and
present exactly one publish command; all other work remains autonomous.

## Success budgets

Exact reductions depend on the measured traffic mix. These are target budgets,
not unverified promises:

- `100%` of requests matching the known scanner-path rule must remain outside
  Next.js.
- At least `60%` fewer Function Invocations on cacheable public routes, measured
  against the normalized pre-change baseline.
- At least `50%` less Fluid Active CPU attributable to cacheable Passreserve
  public routes, or a documented explanation when the Usage dashboard cannot
  provide route-level attribution.
- At least `50%` smaller public organizer/event server payloads and Prisma result
  sets.
- At least `30%` less Fast Data Transfer from the current large public image
  surfaces, with no visible quality regression.
- No increase in 4xx/5xx rates for legitimate traffic.
- Zero missed Stripe or Resend webhooks attributable to Firewall/cache changes.
- Zero failed registrations attributable to the optimization.
- Zero cache leakage into admin, registration, token, API, webhook, or cron
  routes.
- Zero locale cross-contamination.
- No measurable regression in Core Web Vitals or interaction behavior.

Edge Request success must be reported separately:

- abusive and unnecessary Edge Requests;
- legitimate document requests;
- legitimate static-asset requests;
- Function Invocations.

Caching can eliminate Function execution without eliminating every request that
reaches Vercel. A total Edge Request target must therefore be based on the Phase
1 traffic attribution rather than assumed in advance.

# Phase overview

| Phase | Name | Main result |
| --- | --- | --- |
| 0 | Mission lock and release controls | Scope, invariants, ownership, and rollback rules are fixed |
| 1 | Usage attribution and baseline | Current Vercel consumption is measured by project, route, region, and resource |
| 2 | Recovery readiness and regression coverage | Backups, restore evidence, functional tests, and rollback drills are ready |
| 3 | Firewall and bot-protection stabilization | Waste traffic is mitigated before Next.js without touching critical routes |
| 4 | Edge-request source reduction | Speculative, duplicate, invalid, and unnecessary browser/crawler requests are reduced |
| 5 | Proxy and security-header de-invocation | Public requests stop invoking broad Next.js proxy work unnecessarily |
| 6 | Public read model v2 and capacity parity | Public pages stop loading private registration/payment detail |
| 7 | Cache architecture and locale safety | Cache Components are introduced with correct keys, tags, and exclusions |
| 8 | Static and low-change public rollout | Safe public pages become static/cached without UI or language changes |
| 9 | Organizer/event partial prerendering | Event content is cached while operational capacity remains fresh |
| 10 | Discovery and search optimization | Public catalog work is cached and arbitrary queries cannot create unbounded work |
| 11 | Asset, image, bundle, and transfer optimization | Browser payload and transfer usage are materially reduced |
| 12 | Function, database, region, and runtime efficiency | Remaining dynamic work is smaller, shorter, and correctly located |
| 13 | Staged production release | All optimized subsystems are promoted independently with immediate rollback |
| 14 | 48-hour validation and completion | Resource reductions and functional safety are confirmed in production |

# Detailed implementation phases

## Phase 0 — Mission lock and release controls

### Objective

Turn this document into the authoritative implementation checklist and prevent
scope drift.

### Actions

- Confirm the active branch, repository status, linked Vercel project, production
  domain, and current production deployment.
- Confirm that no unrelated local changes will be included.
- Create a phase checklist and evidence directory under the local operations
  control plane.
- Define one release owner and one rollback owner. They may be the same
  authorized agent.
- Record the current Firewall rule IDs and actions.
- Record all environment flags introduced by later phases.
- Adopt the route protection contract above as a mandatory test fixture.
- Define phase stop conditions:
  - unexpected 5xx;
  - registration failure;
  - capacity inconsistency;
  - Stripe/Resend webhook failure;
  - admin/login failure;
  - language mismatch;
  - private response with cacheable headers;
  - material UI/UX regression.

### Deliverables

- Phase checklist.
- Current deployment and Firewall snapshot.
- Rollback responsibility recorded.
- No production mutation.

### Exit gate

The linked project and production deployment are unambiguous, the worktree scope
is clean or isolated, and the critical route list is complete.

### Rollback

No application change exists in this phase.

## Phase 1 — Usage attribution and baseline

### Objective

Measure what Passreserve actually consumes before deciding which optimization
subsystems must carry the reduction.

### Actions

- Use the Vercel Usage dashboard for:
  - current cycle;
  - last 24 hours;
  - last 7 days;
  - last 30 days when available.
- Capture:
  - Edge Requests;
  - Fast Data Transfer;
  - Fast Origin Transfer;
  - Fluid Active CPU;
  - Provisioned Memory;
  - Function Invocations;
  - ISR Reads and Writes;
  - Image Optimization usage;
  - Runtime/Data Cache usage;
  - Web Analytics and Speed Insights usage if active;
  - build execution and deployment counts.
- Break down usage by project and region before attributing team usage to
  Passreserve.
- For Passreserve, record top paths, route types, status codes, bot categories,
  and Firewall actions.
- Separate:
  - requests blocked by WAF;
  - requests reaching static content;
  - requests reaching proxy;
  - requests reaching functions.
- Capture response headers for representative routes, including Vercel cache
  headers where available.
- Record a production network trace for:
  - homepage;
  - organizer page;
  - event page;
  - registration page.
- Count automatic Next.js prefetch/RSC requests that occur without a user click.
- Do not send a synthetic high-volume burst to production.

### Evidence rule

If Observability Plus is unavailable, use the Usage dashboard, Firewall traffic
view, runtime logs, and controlled browser traces. Runtime log counts must not be
reported as Edge Request counts or CPU percentages.

### Important Vercel billing verification

The May 18, 2026 Vercel changelog says WAF-denied, challenged, and rate-limited
traffic has CDN Requests and Fast Data Transfer waived. An older WAF pricing
page describes narrower waiver behavior. Treat the newer announcement as the
working rule, but confirm actual Usage dashboard behavior during this phase
before relying on the waiver in success calculations.

### Deliverables

- Baseline table by project and resource.
- Passreserve top-route table.
- Browser request waterfall.
- Initial target values for Phase 14.

### Exit gate

Passreserve's contribution is known well enough to set measurable goals. If
another project dominates team usage, record it separately; this plan still
optimizes Passreserve but must not claim to solve unrelated project consumption.

### Rollback

Read-only phase.

## Phase 2 — Recovery readiness and regression coverage

### Objective

Make every later optimization safely reversible before it reaches production.

### Actions

- Run the existing verified weekly database backup workflow.
- Verify:
  - archive exists;
  - manifest exists;
  - checksum matches independently;
  - gzip stream is readable;
  - JSON parses;
  - table/collection counts are plausible;
  - `metadata/latest.json` references the new backup.
- Perform a restore rehearsal against an isolated local or non-production
  database if later phases will add an index or additive read-model table.
- Add automated tests for:
  - public/private route cache classification;
  - `Cache-Control` and `X-Robots-Tag`;
  - language partitioning;
  - capacity parity for all registration statuses;
  - expired confirmation holds;
  - expired payment holds;
  - cancelled registrations;
  - attendee quantities greater than one;
  - event publication and unpublication invalidation;
  - ticket and occurrence update invalidation;
  - no cache on tokenized routes.
- Preserve and run the existing Stripe, webhook, registration, password reset,
  email, cron, admin, storage-policy, and HTTP-security tests.
- Expand the smoke check to verify both English and Italian public content.
- Add a read-only production smoke script that cannot create registrations,
  payments, emails, or admin mutations.
- Record how to restore the immediately previous Vercel production deployment.

### Deliverables

- Verified backup and restore evidence.
- New cache/read-model parity tests.
- Safe production smoke script.
- Written application and Firewall rollback commands.

### Exit gate

`npm run verify` passes and the previous production deployment can be restored
without data migration.

### Rollback

Test-only changes can be reverted as one isolated commit.

## Phase 3 — Firewall and bot-protection stabilization

### Objective

Stop abusive traffic before it reaches Next.js while preserving real users,
search engines, integrations, and all critical routes.

### Current configuration to preserve

- `Passreserve - deny malicious scanner paths`
  (`rule_passreserve_deny_malicious_scanner_paths_04MH7D`).
- `Passreserve - conservative public GET burst challenge`
  (`rule_passreserve_conservative_public_get_burst_challenge_dZwkI8`).
- Bot Protection managed rule in `log`.
- Attack Challenge Mode off.

### Actions

- Re-query live Firewall state; do not trust stale documentation.
- Correct the current documentation contradiction that says the public GET rate
  limit is both active and not enabled.
- Inspect the scanner rule and verify it still covers only known hostile paths.
- Verify the public GET rule:
  - matches only `GET`;
  - uses public route families;
  - retains the generous `120 requests / 60 seconds / IP` threshold unless
    production evidence supports a change;
  - challenges rather than denies when a real user could match;
  - excludes API, admin, token, payment, confirmation, static, and mutation
    routes.
- Keep Bot Protection in `log` until false-positive behavior is understood.
- Use the remaining Hobby custom-rule capacity only when Phase 1 identifies a
  high-volume, narrow, reliable match.
- Prefer path + method + rate evidence over user-agent-only, IP-only, country,
  ASN, or JA4-only blocking.
- Never place a reverse proxy in front of Vercel merely for bot protection;
  doing so weakens client-IP and bot signals unless Verified Proxy is used.
- Reserve Attack Challenge Mode for a confirmed active incident, not routine
  traffic management.
- Verify scanner paths return `403` and critical routes retain their existing
  application-level responses.

### Production rollout

Any new or broadened rule must pass:

1. production `log`;
2. traffic review;
3. Preview enforcement;
4. production challenge/deny;
5. 24-hour review.

### Deliverables

- Accurate Firewall documentation.
- Rule inspection/diff evidence.
- Functional exclusion verification.

### Exit gate

No legitimate user, crawler, webhook, cron, admin, registration, or payment
surface is matched by enforcement rules.

### Rollback

- Disable only the changed rule.
- Publish the staged disable.
- If the rule was never published, discard the draft.
- Keep the known scanner rule unless it is the cause of the incident.

## Phase 4 — Edge-request source reduction

### Objective

Reduce requests before relying on server caching.

### Actions

- Use browser traces to identify Next.js prefetches to dynamic/high-cost routes.
- Add `prefetch={false}` only to links whose speculative request is expensive or
  sensitive:
  - registration;
  - payment;
  - tokenized routes;
  - organizer/platform admin.
- Keep useful prefetch on lightweight cached public navigation when it improves
  UX without increasing dynamic work.
- Add a valid `robots.txt` and sitemap strategy:
  - allow public SEO pages;
  - disallow admin, API, registration, token, confirmation, and payment paths;
  - do not treat `robots.txt` as a security boundary.
- Remove recurring asset/document 404s such as a missing `robots.txt`.
- Audit favicon and manifest references so browsers do not request nonexistent
  or duplicate resources.
- Ensure links use canonical paths and avoid redirect chains.
- Normalize harmless duplicate query-string variants.
- Add canonical metadata where appropriate without changing public URLs.
- Do not merge user actions or remove navigation merely to lower request count.

### Verification

- Compare browser network request counts before and after.
- Confirm registration navigation still works on first click.
- Confirm no visible loading regression.
- Confirm search-engine public routes remain crawlable.

### Deliverables

- Reduced browser request waterfall.
- Zero recurring public 404s from first-party page markup.
- Prefetch policy documented by route type.

### Exit gate

Unnecessary requests decrease while click-to-navigation behavior and SEO remain
correct.

### Rollback

Revert the prefetch/metadata/robots commit. No data rollback is needed.

## Phase 5 — Proxy and security-header de-invocation

### Objective

Stop invoking `proxy.js` on ordinary public traffic when only static response
headers are required.

### Actions

- Convert constant security headers to deployment/project routing headers or
  `next.config.js`.
- Preserve:
  - Content Security Policy;
  - Origin-Agent-Cluster;
  - Permissions-Policy;
  - Referrer-Policy;
  - X-Content-Type-Options;
  - X-Frame-Options;
  - X-Permitted-Cross-Domain-Policies;
  - production HSTS.
- Encode sensitive-route `no-store` and `X-Robots-Tag` behavior explicitly for:
  - `/api/**`;
  - `/admin/**`;
  - `/:slug/admin/**`;
  - `/:slug/events/:eventSlug/register/**`.
- Prefer eliminating the proxy if all behavior can be represented safely in
  static route headers.
- If proxy remains necessary, replace the broad negative matcher with the
  smallest positive matcher set.
- Do not move authentication or business logic into proxy.
- Test Preview and production HTTPS behavior separately.

### Verification

- Header snapshot tests for public and sensitive routes.
- CSP browser-console test.
- `curl -I` checks on Preview.
- Confirm sensitive routes remain `no-store`.
- Confirm public routes no longer produce proxy/middleware runtime work where
  the matcher excludes them.

### Deliverables

- Static header configuration.
- Removed or narrowly matched proxy.
- Header regression suite.

### Exit gate

Security headers are equivalent or stronger, sensitive cache policy is intact,
and public proxy invocations materially decrease.

### Rollback

Restore the previous `proxy.js` deployment. Because the old proxy remains in Git
history, rollback requires no database or cache migration.

## Phase 6 — Public read model v2 and capacity parity

### Objective

Eliminate private, oversized data loading from public routes while producing the
same public output.

### Actions

- Introduce dedicated public data functions:
  - public organizer content;
  - public event content;
  - public ticket categories;
  - future published occurrences;
  - public discovery catalog;
  - capacity aggregate by occurrence.
- Use Prisma `select` for only fields consumed by the public views.
- Stop loading from the public path:
  - complete registration rows;
  - attendees;
  - registration items;
  - payment ledger rows.
- Calculate capacity using a narrow aggregate/query that preserves current
  semantics:
  - `CANCELLED` does not consume capacity;
  - unexpired `PENDING_CONFIRM` consumes capacity;
  - expired `PENDING_CONFIRM` does not;
  - unexpired `PENDING_PAYMENT` consumes capacity;
  - expired `PENDING_PAYMENT` does not;
  - confirmed/attended/no-show states preserve existing behavior;
  - quantity, not row count, is summed.
- Reuse the existing `[occurrenceId, status]` index initially.
- Run `EXPLAIN ANALYZE` or equivalent before adding an index.
- Add `[occurrenceId, status, expiresAt]` only if measurements prove it improves
  the capacity query.
- Keep all admin, confirmation, payment, refund, email, and token loaders on
  their existing private read paths.
- Add a temporary comparison mode:
  - compute legacy and v2 public output in Preview/test;
  - compare capacity and essential public fields;
  - return the legacy result until parity is proven.
- Introduce one kill switch for the v2 public read path.

### Optional additive materialized read model

Do not begin with a new database table. Add a rebuildable public snapshot table
only if the direct narrow queries remain a measured bottleneck after caching.
If needed:

- use an additive migration only;
- keep the current normalized database as source of truth;
- backfill in batches;
- compare snapshot output in shadow mode;
- switch reads behind a flag;
- never require the snapshot for writes;
- do not drop old columns or tables during this plan.

### Verification

- Automated parity matrix for statuses and expiry boundaries.
- Query row/byte count comparison.
- Public page snapshot comparison.
- Registration write-path tests unchanged.
- Production read-only comparison for a known organizer/event.

### Deliverables

- Public read path v2.
- Capacity aggregate implementation.
- Parity report.
- Kill switch.

### Exit gate

Public output and capacity match the legacy path, while registration/payment row
loading disappears from public requests.

### Rollback

Disable the v2 read flag or restore the previous deployment. Any optional
additive table remains unused and can be removed in a later maintenance window;
it is not dropped during emergency rollback.

## Phase 7 — Cache architecture and locale safety

### Objective

Enable Next.js 16 Cache Components with explicit safety boundaries before
caching a production route.

### Actions

- Add `next.config.js` with `cacheComponents: true`, preserving all existing
  build behavior.
- Remove `force-dynamic` only from routes migrated in a later phase.
- Define cache profiles:
  - `public-static`: long stale/revalidate/expire;
  - `public-content`: long-lived with mutation-driven invalidation;
  - `public-discovery`: moderate lifetime;
  - no profile for capacity or sensitive data.
- Read `cookies()`, `headers()`, and `searchParams` outside cached functions.
- Pass normalized `locale`, organizer slug, event slug, and finite filters as
  explicit serializable arguments.
- Tag caches with stable, non-sensitive tags:
  - `public-site`;
  - `about`;
  - `discovery`;
  - `organizer:<public-id>`;
  - `event:<event-id>`;
  - `occurrence-content:<occurrence-id>`.
- Do not put session IDs, hold tokens, payment tokens, confirmation tokens,
  emails, or admin identifiers into shared cache keys.
- Add invalidation after existing admin mutations:
  - organizer public content;
  - event content;
  - publication state;
  - ticket catalog;
  - occurrence content/date.
- Use immediate tag invalidation after mutations where the same request must see
  fresh public content.
- Keep a time-based expiration as a safety net, not the primary freshness
  mechanism.
- Verify that deployment Build ID changes invalidate incompatible cache entries.
- Add verbose cache logging in Preview only.

### Verification

- Build output identifies intended static/cached/dynamic routes.
- English and Italian cache entries are separate.
- Admin update invalidates only affected public content.
- Sensitive route headers remain `no-store`.
- No cache key contains secrets or tokenized values.

### Deliverables

- Cache configuration and profiles.
- Cache tagging convention.
- Invalidation map from every public-content mutation.
- Cache-safety test suite.

### Exit gate

Cache Components build successfully in Preview, all dynamic APIs are outside
cached scopes, and invalidation tests pass.

### Rollback

Restore the pre-Cache-Components deployment. No data rollback is required.

## Phase 8 — Static and low-change public rollout

### Objective

Obtain low-risk CPU and invocation reductions before caching event data.

### Route order

1. legal pages;
2. `/about`;
3. `/organizer-access`;
4. homepage static shell;
5. default public discovery shell.

### Actions

- Convert pure content sections to cached/static components.
- Preserve locale by passing the normalized locale into cached content.
- Keep query-driven homepage notices dynamic when present.
- Keep organizer request submission dynamic.
- Use tag invalidation for admin-editable About/public settings.
- Do not cache request-specific cookies, messages, or validation errors.
- Compare rendered HTML, accessibility tree, and screenshots before/after.

### Verification

- Route response and cache headers.
- English/Italian screenshots.
- Organizer-access routing behavior.
- Home organizer-request flow.
- No layout shift or interaction regression.
- Function invocation comparison.

### Deliverables

- First production-safe cached routes.
- Visual and locale parity report.

### Exit gate

Low-change routes are cached in Preview, retain identical UI/UX, and show a
measurable function reduction.

### Rollback

Restore only the Phase 8 deployment or disable the affected cache functions.

## Phase 9 — Organizer/event partial prerendering

### Objective

Cache the expensive stable portion of organizer/event pages while preserving
live operational availability.

### Architecture

Each organizer/event route is split into:

1. static shell;
2. cached public content keyed by locale and public identifier;
3. live capacity/registration-gate component inside a dynamic boundary.

Capacity must be rendered from the same request where possible. Do not add a
second browser API request merely to obtain freshness, because that would add an
Edge Request and could worsen UX.

### Actions

- Cache organizer identity, descriptions, venues, event descriptions,
  galleries, FAQs, policies, ticket labels, and published schedule content.
- Keep capacity, hold expiry, payment expiry, and current registration gate
  dynamic.
- Do not cache the registration page.
- Add `generateStaticParams` only for currently published organizer/event paths
  if build cost and dynamic fallback behavior are proven safe.
- Keep dynamic fallback for newly published organizers/events.
- Invalidate organizer/event content immediately after relevant admin writes.
- Confirm that changing visibility makes unpublished content inaccessible
  immediately.
- Confirm that registration POST remains the final capacity authority.
- If a tiny capacity cache is ever considered, it must be a separate optional
  experiment with an explicit maximum staleness budget and must not be required
  to complete this phase.

### Verification

- Organizer/event content update appears after invalidation.
- Publication/unpublication behavior is immediate.
- Capacity parity under confirmed, pending, expired, and cancelled states.
- Registration race/concurrency tests.
- No extra client-side capacity request.
- Compare CPU and serialized payload before/after.

### Deliverables

- Partial-prerendered organizer/event routes.
- Dynamic capacity boundary.
- Mutation-to-cache invalidation coverage.

### Exit gate

Public content is served from cache while operational state stays fresh and
registration semantics remain unchanged.

### Rollback

Disable the public cache/read flags or restore the Phase 8 production
deployment.

## Phase 10 — Discovery and search optimization

### Objective

Reduce repeated discovery queries without creating an unbounded cache for bot
generated search strings.

### Actions

- Build a narrow public discovery catalog from published organizer/event fields.
- Cache the default catalog and finite filter options by locale.
- Normalize:
  - country;
  - region;
  - city;
  - category;
  - free-text whitespace and case.
- Bound free-text input length.
- Reject malformed arrays/objects without expensive processing.
- Do not create persistent shared cache entries for arbitrary free-text strings
  unless a measured bounded strategy is defined.
- Prefer filtering a small cached catalog in memory when the catalog is small.
- Use the database for large/free-text searches when it is more efficient.
- Cap result count and selected fields.
- Add `discovery` tag invalidation when events/organizers are published,
  unpublished, renamed, or relocated.
- Preserve result ordering, links, filters, and visible behavior.

### Verification

- Search-result parity for representative English/Italian queries.
- Filter parity.
- Cache-cardinality test using many random queries.
- Query timing and CPU comparison.
- Bot-style query strings cannot allocate unbounded cache entries.

### Deliverables

- Cached bounded discovery catalog.
- Search normalization and limits.
- Discovery invalidation coverage.

### Exit gate

Default discovery avoids repeated database work and arbitrary search traffic
cannot create a cache or CPU amplification issue.

### Rollback

Switch discovery reads to the legacy query or restore the previous deployment.

## Phase 11 — Asset, image, bundle, and transfer optimization

### Objective

Reduce Fast Data Transfer, static Edge Requests caused by poor caching, browser
CPU, and JavaScript payload without changing appearance.

### Actions

- Inventory every public asset by:
  - file size;
  - dimensions;
  - route usage;
  - above/below fold;
  - cacheability.
- Prioritize the current large PNG files, including About and brand assets.
- Compare existing About SVG alternatives against PNG rendering.
- Use SVG when visually equivalent and safe.
- Otherwise generate visually equivalent pre-sized WebP/AVIF with PNG fallback.
- Preserve alt text and add explicit dimensions/aspect ratios.
- Lazy-load below-fold images.
- Do not introduce unbounded `next/image` variants.
- If `next/image` is used, define a small explicit `sizes`/width strategy and
  measure Image Optimization quota impact.
- Use versioned filenames for long-lived immutable caching.
- Audit the global client provider tree.
- Keep required cookie consent, interaction feedback, locale switching, and
  toasts, but load route-specific client code only where used.
- Run a bundle analyzer and remove only proven unused code/imports.
- Verify font loading remains through `next/font`.
- Reduce duplicate RSC/HTML payload fields from public read models.
- Do not remove images, visual effects, or interactions for performance.

### Conditional external asset origin

Use a dedicated asset origin only if Phase 1 and post-optimization measurements
show static media requests remain a dominant Edge Request or transfer source.
It must:

- serve only immutable public assets;
- not proxy HTML/API traffic;
- not obscure real client IPs from Vercel;
- preserve visual quality and URLs through a controlled asset helper;
- have its own rollback to Vercel-hosted assets.

### Verification

- Pixel/visual comparison at supported breakpoints.
- Lighthouse/Core Web Vitals comparison.
- Total transferred bytes per public route.
- Request count per route.
- Image transformation usage comparison.
- Browser console clean.

### Deliverables

- Optimized assets.
- Asset cache policy.
- Bundle and transfer report.

### Exit gate

Transferred bytes decrease materially with no visual, accessibility, or
interaction regression.

### Rollback

Restore previous asset references. Original files remain available until the
production observation window completes.

## Phase 12 — Function, database, region, and runtime efficiency

### Objective

Optimize the remaining unavoidable dynamic work.

### Actions

- Confirm Fluid Compute is active and inspect function metrics.
- Keep Prisma/Stripe/PDF/email code on stable Node.js runtime.
- Do not migrate critical paths to Edge or beta runtimes for speculative gains.
- Verify Prisma client reuse and production connection pooling.
- Compare the function region with the database region.
- Align them only after latency, failover, and production compatibility checks.
- Keep response work parallel where dependencies permit.
- Remove duplicate transformations and serializations.
- Reuse request-scoped calculations for metadata and page rendering.
- Avoid full-state reads in dynamic token/payment routes where a targeted
  existing read can be used without changing behavior.
- Review large imports and function bundles.
- Do not move transactional email/payment work to background execution when it
  would weaken delivery or reconciliation guarantees.
- Use post-response work only for non-critical telemetry that is already
  authorized and measured.
- Evaluate additive database indexes only from measured slow query plans.
- Do not add Edge Config, remote cache, analytics SDKs, queues, or third-party
  infrastructure unless a measured bottleneck requires them.
- If structured performance logs are added, sample them and remove/disable
  verbose mode after Phase 14 to avoid creating a new logging cost.

### Verification

- Function duration, CPU, memory, cold-start, and invocation comparison.
- Database connection count and query-plan review.
- No timeout or connection-pool regression.
- Existing payment, webhook, email, cron, admin, and registration tests pass.

### Deliverables

- Dynamic-function optimization report.
- Region and connection-pooling decision.
- Additive index evidence if applicable.

### Exit gate

Remaining dynamic routes consume less CPU/memory or are documented as already
optimal without introducing runtime risk.

### Rollback

Restore the previous deployment. Additive indexes may remain because they do not
change data semantics; they can be removed later after confirming no dependency.

## Phase 13 — Staged production release

### Objective

Bring every completed optimization live without a long outage and without
combining unrelated blast radii.

### Release groups

Promote in this order, with a separate production deployment or independently
reversible configuration for each group:

1. tests/observability and request cleanup;
2. Firewall documentation or reviewed rule changes;
3. proxy/header optimization;
4. public read model v2;
5. static/low-change cache;
6. organizer/event partial prerendering;
7. discovery optimization;
8. assets/bundle;
9. remaining function/database improvements.

### Production checks after every group

- `/`, `/about`, `/events`, known organizer, known event: expected public status.
- Italian and English output.
- registration page: expected status and current availability.
- admin login and organizer admin login: expected status and `no-store`.
- Stripe webhook unsupported `GET`: retains application-level behavior.
- cron unauthenticated `GET`: retains application-level `401`.
- scanner paths: remain blocked.
- no unexpected `5xx`.
- no cache headers on sensitive/tokenized routes.
- production deployment reaches `READY`.
- public domain resolves to the intended deployment.

Do not perform destructive production writes or synthetic payment/registration
bursts as a smoke test. Full mutation/payment tests belong in Preview with safe
test data.

### Stop and rollback conditions

Rollback immediately on:

- any payment or webhook regression;
- registration creation or capacity regression;
- admin authentication or authorization regression;
- token route cacheability;
- wrong language served from shared cache;
- unpublished event exposure;
- sustained 5xx increase;
- serious UI/UX regression.

### Deliverables

- Production deployment IDs for every group.
- Smoke-test output.
- Firewall publish/rollback evidence where applicable.

### Exit gate

All planned optimization groups are live on `passreserve.com`, each has passed
its immediate production gate, and the pre-change production deployment remains
identifiable.

### Rollback

Promote the immediately previous known-good deployment for the failing release
group. Disable only the affected Firewall rule if the incident is edge-related.

## Phase 14 — 48-hour validation and completion

### Objective

Prove that the final production system is both safer and materially less
resource intensive.

### Observation windows

- first 15 minutes: availability and error scan;
- first hour: runtime errors, 5xx, webhook/cron/admin signals;
- first 6 hours: cache behavior and Firewall false positives;
- first 24 hours: normalized resource comparison;
- 48 hours: final acceptance.

### Metrics

- Edge Requests by path/type and WAF action.
- Function Invocations by route.
- Active CPU.
- Provisioned Memory.
- Fast Data Transfer and Fast Origin Transfer.
- ISR Reads/Writes.
- cache hit/miss/revalidation behavior.
- Image Optimization usage.
- build/deployment usage.
- 4xx/5xx.
- registration success.
- payment/webhook success.
- email and cron health.
- admin access.
- locale correctness.
- Core Web Vitals and visual stability.

### Tuning rules

- Do not lower WAF thresholds from theory alone.
- Do not shorten cache lifetimes merely to reduce stale anxiety; prefer correct
  mutation-driven invalidation.
- Do not lengthen capacity cache because capacity is not required to be cached.
- If ISR writes are excessive, increase cache lifetime and fix invalidation
  fan-out.
- If Edge Requests remain high but Function usage falls, inspect legitimate
  static/request mix before changing application caching.
- If other projects dominate the team quota, report that separately.
- Remove temporary verbose diagnostics after evidence is captured.

### Final acceptance criteria

The plan is complete only when:

- all approved phases are live in production;
- all functional invariants still pass;
- no critical route is cached or WAF-blocked;
- resource usage is materially lower against the Phase 1 baseline;
- every live change has a documented rollback;
- temporary flags/logging are removed or documented;
- tracked documentation reflects the final state;
- the operations board/log/note are updated with production evidence.

### Rollback

If the 48-hour comparison shows functional risk, roll back the affected release
group. If functionality is correct but savings are smaller than expected, keep
safe proven improvements and reopen only the metric-specific phase; do not undo
unrelated successful optimizations.

# Rollback matrix

| Subsystem | Fast rollback |
| --- | --- |
| Firewall custom rule | Disable the individual rule, inspect diff, publish |
| Bot Protection | Return managed rule to `log` or disable it |
| Proxy/header change | Promote previous deployment |
| Public read model v2 | Disable v2 flag or promote previous deployment |
| Cache Components | Promote pre-cache deployment |
| Organizer/event PPR | Disable public cache flag or promote Phase 8 deployment |
| Discovery cache | Switch to legacy discovery query |
| Assets | Restore original asset references |
| Database additive index | Leave in place during incident; remove later if needed |
| Optional public snapshot table | Stop reads/dual-write flag; keep source-of-truth tables unchanged |
| Region/runtime change | Restore previous configuration/deployment |

# Required implementation artifacts

The executing agent must create or update:

- tracked implementation commits, one logical subsystem per commit;
- cache classification tests;
- capacity parity tests;
- locale isolation tests;
- header/privacy tests;
- mutation invalidation map;
- safe production smoke script;
- baseline and post-change metric report;
- current Firewall documentation;
- production deployment ledger;
- rollback command ledger;
- final 48-hour acceptance report.

# Explicit non-goals

This plan does not:

- redesign the product;
- remove features;
- simplify registration fields by deleting them;
- alter Stripe payment ownership or flow;
- alter database source-of-truth semantics;
- replace Prisma/PostgreSQL without evidence;
- move the whole site behind Cloudflare or another reverse proxy;
- add CAPTCHA to normal user flows;
- globally challenge all visitors;
- cache admin or tokenized pages;
- introduce a large framework rewrite;
- switch critical functions to beta runtimes;
- claim that caching alone eliminates Edge Requests.

# Official references

- Vercel Hobby limits:
  https://vercel.com/docs/plans/hobby
- Vercel Usage dashboard and resource breakdown:
  https://vercel.com/docs/pricing/manage-and-optimize-usage
- Fluid Compute usage and pricing:
  https://vercel.com/docs/functions/usage-and-pricing
- Vercel Firewall:
  https://vercel.com/docs/vercel-firewall
- Vercel Firewall concepts:
  https://vercel.com/docs/vercel-firewall/firewall-concepts
- WAF-mitigated traffic waiver announcement, May 18, 2026:
  https://vercel.com/changelog/web-application-firewall-mitigated-traffic-is-free-on-vercel
- Vercel Routing Middleware:
  https://vercel.com/docs/routing-middleware
- Next.js Cache Components:
  https://nextjs.org/docs/app/getting-started/partial-prerendering
- Next.js `use cache`:
  https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js `cacheLife`:
  https://nextjs.org/docs/app/api-reference/functions/cacheLife
