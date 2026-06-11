# 2026-06-11 20:49 CEST — Remove login panel stock copy

## Summary
- removed the generic stock heading, descriptive paragraph, and feature pills from the default organizer-admin sign-in panel
- kept the organizer name kicker and the form actions intact
- left the reset-password panel explanatory copy in place

## Why
- the generic admin marketing copy was distracting on a utilitarian sign-in screen
- the user already knows they are signing into the organizer admin area
- simplifying the panel makes the screen feel cleaner and more direct

## Validation
- `npm run build`
- live route check on `/sillico/admin/login`
