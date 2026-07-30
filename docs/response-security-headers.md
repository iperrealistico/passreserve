# Response security headers

Passreserve defines constant browser security headers in `next.config.js`.
Next.js and Vercel compile these declarations into deployment routing rules, so
ordinary requests no longer invoke a broad application Proxy merely to add
headers.

The routing configuration preserves:

- Content Security Policy;
- Origin-Agent-Cluster;
- Permissions-Policy;
- Referrer-Policy;
- X-Content-Type-Options;
- X-Frame-Options;
- X-Permitted-Cross-Domain-Policies;
- HTTPS Strict-Transport-Security.

API, platform admin, organizer admin, and registration route families also
receive browser, CDN, and Vercel CDN `no-store` controls plus
`X-Robots-Tag: noindex, nofollow`.

Authentication and all business logic remain inside the application. To roll
back, restore `proxy.js` from the previous commit and remove `next.config.js`;
no database, cache, or Vercel Firewall change is involved.
