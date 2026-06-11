# 2026-06-11 20:22 CEST — Make event duration optional

## Summary
- Made event duration optional instead of silently forcing a default `180` minutes.
- Preserved existing saved durations such as `Divini & Sapori`'s `3h 00m`.
- Updated the public event payload so the duration pill appears only when an event actually defines a duration.

## Files changed
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/schema.prisma`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/prisma/migrations/20260611201646_make_event_duration_optional/migration.sql`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-admin-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/passreserve-service.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/events/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/lib/organizer-admin-tour.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/test/passreserve-admin-events.test.js`

## Verification
- `npx prisma generate`
- `npm run test -- test/passreserve-admin-events.test.js`
- `npm run build`
