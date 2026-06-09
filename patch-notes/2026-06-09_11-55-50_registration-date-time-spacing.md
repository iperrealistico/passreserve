# Registration date/time spacing

- Fixed the public registration date cards so the occurrence label and time are visually separated instead of collapsing into a single string like `03 Jul 202620:30 to 23:59`.
- Updated `app/[slug]/events/[eventSlug]/register/registration-flow-experience.js` to use a dedicated `registration-choice-copy` wrapper for the date/time stack.
- Added explicit stacked typography rules for `.registration-choice-copy` in `app/globals.css` so the date and time keep a clean vertical rhythm across the public booking flow.
- Verification completed with `npx eslint app/[slug]/events/[eventSlug]/register/registration-flow-experience.js` and `npm run build`.
- Production deployment verification was completed after the final GitHub push in this handoff.
