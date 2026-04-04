# Passreserve.com Language And Messaging

## Purpose

This document is the Phase 03 source of truth for:

- public-facing product vocabulary
- translation from legacy MTB Reserve terms into Passreserve.com terms
- email tone and subject-line strategy
- legacy names that are intentionally allowed to remain during migration

Use this guide when adding UI copy, documentation, email scenarios, schema comments, or admin labels in the active Passreserve.com workspace.

## Naming rules

- Public product name: `Passreserve.com`
- Internal codename: `GATHERPASS`
- Legacy product name: `MTB Reserve`

Use `Passreserve.com` everywhere a customer, organizer, attendee, or search engine would see the product.

Use `GATHERPASS` only for internal planning, implementation notes, and technical references where the codename is helpful.

Use `MTB Reserve` only when explicitly describing the legacy system, archived handoff materials, or reference-only source snapshots.

## Vocabulary dictionary

| Legacy term | Passreserve.com term | Usage note |
| --- | --- | --- |
| Tenant | Organizer | The multi-tenant account holder and public host on Passreserve.com |
| Shop | Organizer | Avoid shop/storefront wording unless talking about MTB Reserve history |
| Rider | Attendee | Use attendee for the person registering for an event |
| Bike type | Event type | The reusable event template an organizer publishes |
| Booking | Registration | The attendee's event reservation record |
| Booking item | Registration item | Line items for quantity, ticket categories, or add-ons |
| Booking code | Registration code | The attendee-facing reference identifier |
| Inventory | Event catalog | Organizer-managed list of event types |
| Stock | Capacity | Capacity belongs to occurrences, not equipment |
| Booking wizard | Registration flow | Multi-step public attendee journey |
| Booking confirmation | Registration confirmation | Confirmation step before finalizing the attendee record |
| Pickup location | Venue or venue map link | Use venue-oriented language instead of pickup phrasing |
| Shop admin | Organizer admin | Protected organizer operations surface |
| Partner signup | Organizer join request | Public request to join Passreserve.com |

## Public copy rules

- Prefer `registration` over `booking` in new copy.
- Prefer `attendee` over `rider`, `guest`, or `customer` unless the feature is explicitly generic.
- Prefer `organizer` over `shop`, `tenant`, or `partner` in end-user copy.
- Prefer `event type` and `occurrence` over slot-based or inventory-based language.
- Prefer `venue`, `venue details`, or `map link` over `pickup location`.
- Use `deposit`, `online amount`, and `amount due at event` for payment explanations.

## Email tone and subject strategy

### Tone

Email copy for Passreserve.com should feel:

- calm
- practical
- specific
- operationally clear
- free of rental jargon

Avoid phrasing that implies:

- bike rental
- pickup logistics
- shop inventory
- casual marketplace chatter

Prefer language that explains:

- which event or occurrence is involved
- whether the attendee must confirm anything
- what amount was paid online
- what amount remains due at the event
- what the organizer needs to know next

### Subject line patterns

Use short, direct subject lines that start with the action or status.

Recommended baseline subjects:

- Attendee pending confirmation: `Confirm your Passreserve registration`
- Attendee registration confirmed: `Your Passreserve registration is confirmed`
- Attendee payment received: `Payment received for your Passreserve registration`
- Attendee amount due at event: `Amount due at the event`
- Organizer new registration: `New registration for {{event_name}}`
- Organizer payment received: `Payment received for {{event_name}}`
- Organizer occurrence cancelled: `Occurrence cancelled: {{event_name}}`
- Organizer join request received: `We received your Passreserve organizer request`
- Platform admin organizer request alert: `New organizer request for Passreserve.com`

### Messaging rules by scenario

- Pending confirmation emails should emphasize the event, occurrence date, and the confirmation action.
- Registration confirmation emails should emphasize the registration code, occurrence details, and next steps.
- Payment emails should always separate `paid online` from `due at event` when both exist.
- Organizer alerts should name the organizer, event, occurrence, and attendee clearly in the first screenful.

## Temporary legacy names allowed during migration

The following legacy names are intentionally allowed to remain for now:

- `GATHERPASS`
  - Internal codename for planning, branch context, and technical discussions.
- `MTB Reserve`
  - Required in archival docs that explain the origin system being transformed.
- `Tenant`, `Booking`, `BikeType`, `inventory`, `pickupLocationUrl`
  - Allowed inside historical analysis documents and future transitional implementation layers until the event schema lands.
- `unpacked/mtb-reserve`
  - Reference-only snapshot path that must keep the legacy product name for clarity.
- `mtb-reserve-full-directory.zip`
  - Historical archive filename preserved as-is.

## Where legacy names should not remain

Do not introduce legacy MTB Reserve nouns into:

- public UI copy
- metadata and SEO text
- new organizer-facing navigation labels
- new attendee-facing flows
- new Passreserve.com email scenarios

## Update rule for future agents

When a future phase adds new screens or models:

1. translate the user-facing language using this dictionary first
2. keep any unavoidable legacy physical names internal-only
3. document exceptions here if a temporary mismatch must survive another phase
