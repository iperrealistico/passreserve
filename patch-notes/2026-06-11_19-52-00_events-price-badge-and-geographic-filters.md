# 2026-06-11 19:52 CEST — Events price badge and geographic filters

## Summary

Improved the public `/events` discovery page by cleaning up the price row and adding country, region, and city filters with a default focus on Italy / Tuscany.

## What changed

- Removed the empty organizer-tagline placeholder that was creating a misleading leading gap before the event price.
- Reworked the event price presentation into a dedicated larger badge paired with the collection label.
- Added country, region, and city filter controls to the `/events` search form.
- Set the default discovery scope to `Italy / Tuscany` when no explicit geographic filters are provided.
- Preserved active geographic filters when using quick-search chips and the search-reset link.
- Added a `Show all` path to remove the default geographic scope and browse the wider directory.

## Why

- The previous price row looked visually weak and could show a small useless blank space before `€`.
- Geographic filtering makes the discovery surface more practical for real users, while the default Tuscany focus keeps the live directory immediately relevant.

## Verification

- `npm run build`
