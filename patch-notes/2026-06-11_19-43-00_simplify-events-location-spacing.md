# 2026-06-11 19:43 CEST — Simplify events location spacing

## Summary

Removed the visual middle-dot separator from the public `/events` result-card location row so city and region read as plain spaced text.

## What changed

- Kept city and region as separate inline items in the result card.
- Removed the explicit `·` separator from the markup on `/events`.
- Preserved the existing inline-flex spacing between the two items.

## Why

- In the live layout the separator was not helping readability and the location could be perceived as collapsed text.
- Plain spaced text (`Pieve Fosciana Toscana`) is clearer in this result-card context.

## Verification

- `npm run build`
