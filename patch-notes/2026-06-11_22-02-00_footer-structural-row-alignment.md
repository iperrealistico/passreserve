# 2026-06-11 22:02 CEST — Footer structural row alignment

## Summary
- replaced the old desktop footer alignment hack with a structural grid layout
- positioned the footer navigation on the same desktop grid row as the summary line
- removed desktop-only vertical padding from footer nav links so the text aligns visually with the summary copy

## Why
- the previous fix only adjusted `padding-top` on the nav container, which could not reliably align the nav text with a descendant text line inside the brand block
- the footer needed a real shared layout row, not another magic offset

## Validation
- `npm run build`
- live browser geometry check on `/` footer alignment
