# 2026-06-11 20:58 CEST — Compact home organizer consent checkbox

## Summary
- replaced the oversized stacked consent block in the homepage organizer access request form with a compact inline checkbox
- kept the checkbox required and preserved the links to the Privacy Notice and Terms of Use
- reduced visual noise and unused space in the modal form

## Why
- the previous layout made the checkbox comically large and visually disconnected from its copy
- the consent control should read like a normal legal acceptance row, not a separate highlighted card

## Validation
- `npm run build`
- live route check on `/`
