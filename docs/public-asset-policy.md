# Public Asset Transfer Policy

The About page uses versioned WebP sources with the original PNG files retained
as browser fallback and rollback assets.

## Encoding result

Seven About PNG files total `3,882,422` bytes. Their versioned WebP equivalents
total `187,568` bytes, a `95.2%` reduction for supporting browsers.

The representative hero comparison produced SSIM `0.996585`. The WebP files
retain the original `1536 x 1024` dimensions and visible composition.

The existing similarly named SVG files were not substituted: direct inspection
showed that they are different illustrations, so replacing the PNGs with SVGs
would change the UI.

## Rendering behavior

- `<picture>` advertises WebP first and keeps PNG fallback.
- The desktop above-fold hero is eager/high priority.
- All below-fold About images are lazy and asynchronously decoded.
- Explicit width and height preserve the existing `3:2` aspect ratio and avoid
  layout shift.
- Versioned `.v1.webp` filenames are safe for immutable Vercel asset caching.
- No `next/image` transformation variants are introduced, so this optimization
  does not consume Image Optimization quota.

Rollback requires only restoring the previous About image markup. Original PNG
files must remain until Phase 14 completes.

