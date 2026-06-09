# Event detail dedup and spacing polish

- Investigated the Sillico public event page after `Apri evento` on `/sillico#agenda` and confirmed the event detail was repeating the same published dates twice: once indirectly through date-scoped ticket labels and again through the actual date cards, which made the page feel redundant instead of useful.
- Updated the organizer agenda handoff so `Apri evento` now preserves the clicked occurrence in the URL query string and lands on the event detail date section already focused on that specific published date.
- Reworked `app/[slug]/events/[eventSlug]/page.js` so the event detail now shows one highlighted selected date, one collapsed `format / what's included` section that merges duplicate date-scoped tickets into a single public-facing offer, and one clear published-dates section with direct registration CTA for each night.
- Added cleaner spacing and dot dividers for price, payment split, and venue metadata, and replaced the old cramped `Venerdì 3 luglio - Adulto€50` style layout with a dedicated price block and calmer card hierarchy.
- Verification completed with `npx eslint app/[slug]/page.js app/[slug]/events/[eventSlug]/page.js` and `npm run build`. Local runtime smoke against `localhost` could not reproduce the Sillico tenant because the local file-state dataset does not include the production organizer data, so the final UX verification was completed on production after deployment.
- Production deployment verification was completed after the final GitHub push in this handoff.
