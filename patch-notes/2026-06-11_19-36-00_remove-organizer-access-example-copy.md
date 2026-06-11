# 2026-06-11 19:36 CEST — Remove organizer access example copy

## Summary

Removed the example/demo copy from the public organizer access page so the slug-login entrypoint stays minimal and does not show `example` as guidance text.

## What changed

- Removed the muted example paragraph under the organizer login CTA row on `/organizer-access`.
- Cleared the slug input placeholder so it no longer shows `example`.
- Preserved the organizer-access form action and platform-admin panel unchanged.

## Why

- The example copy was visually noisy and implied a demo value on a production login screen.
- Organizers already know their slug, so the extra sentence did not add meaningful guidance.

## Verification

- `npm run build`
