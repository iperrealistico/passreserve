# 2026-06-11 20:44 CEST — Single-panel organizer login and reset

## Summary
- Removed the two-panel organizer login layout.
- Kept only one panel visible at a time.
- Default view is sign-in.
- Added a `Reset password` button on the sign-in panel.
- Added a `Back to sign in` button on the reset-password panel.
- Preserved the existing auth and reset logic.

## Files changed
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/login/page.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/app/[slug]/admin/actions.js`
- `/Users/leonardofiori/Documents/Antigravity/gatherpass/001_PASSRESERVE_IMPLEMENTATION_PHASES.md`

## Verification
- `npm run build`
