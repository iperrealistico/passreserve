# 2026-06-11 20:07 CEST — Organizer agenda first occurrence per event

## Summary

Changed the public organizer-page agenda to show only the next upcoming occurrence for each event type.

## What changed

- Replaced the previous flat list of all occurrences across all event types.
- The organizer agenda now keeps only the first upcoming occurrence from each public event.
- Event detail pages still show the full date list for the selected event type.

## Why

- Repeating every date of the same event in the organizer overview made the page noisier than needed.
- The organizer page should act as a clean summary across event types, while the event detail page remains the place where guests choose among all available dates.

## Verification

- `npm run build`
