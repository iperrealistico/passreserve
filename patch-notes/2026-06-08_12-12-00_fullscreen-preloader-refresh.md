# Patch Note

- Reworked the shared route preloader so it no longer renders as a tall pill card in the center of the screen.
- The loader is now a true fullscreen overlay with faster reveal timing, animated concentric spinner rings, moving load bars, and a softer full-viewport backdrop.
- Promoted the App Router `loading.js` shells to the same fullscreen treatment so organizer-admin page switches and auth transitions stay visually consistent even when the server-side loading boundary is what the user sees.

## Verification

- `npm run verify`
- Local in-app browser smoke on `http://127.0.0.1:3000/sillico/admin/dashboard -> Events`
