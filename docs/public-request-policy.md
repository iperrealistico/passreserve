# Public request policy

Passreserve keeps speculative navigation only where it is low-risk and useful.
Links to registration, tokenized payment/status routes, and authenticated admin
navigation use `prefetch={false}`. Clicking those links behaves normally; the
change only prevents an unused background request before the click.

Ordinary public discovery links keep the Next.js default so they can benefit
from later static or cached rendering.

`/robots.txt` allows public pages and asks compliant crawlers not to visit API,
admin, registration, confirmation, or payment route families. This is crawl
guidance, not an access-control boundary. Vercel Firewall and application
authorization remain the security controls.

`/sitemap.xml` is intentionally static and contains the stable top-level public
pages. It performs no database query and exposes no admin, API, registration, or
token URL. Public organizer and event pages remain discoverable through the
public discovery and organizer links; they can be added to a cached sitemap only
after the public read model has bounded query and cache behavior.

Canonical metadata points query-string variants of discovery, organizer, and
event pages to their stable public URLs without changing the URLs users visit.
