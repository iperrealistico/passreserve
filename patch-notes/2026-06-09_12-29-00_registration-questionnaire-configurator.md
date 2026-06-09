# Registration questionnaire configurator

- Added a configurable registration-questionnaire system that distinguishes the lead booking participant from the rest of the group, with `required`, `optional`, and `hidden` modes for attendee fields.
- Introduced shared questionnaire resolution and validation in `lib/passreserve-registration-questionnaire.js`, then wired the public registration flow, shared registration builder, and organizer manual-registration flow to that same source of truth.
- Added organizer-level default questionnaire settings plus per-event override support, stored as JSON config on both `Organizer` and `EventType` through the Prisma migration `20260609121500_add_registration_questionnaire_config`.
- Shipped a new admin questionnaire editor in Settings and Events with inheritance controls, presets, live previews, and clear role separation between `lead` and `participant`.
- Preserved backward compatibility by keeping the default behavior aligned with the current runtime and by resolving legacy dietary collection rules cleanly when no explicit override exists yet.
- Verification completed with targeted ESLint, `npx prisma generate`, `npm run test -- test/passreserve-registration-questionnaire.test.js test/passreserve-registration-core.test.js test/passreserve-registrations.test.js test/passreserve-organizer-registrations.test.js`, `npm run build`, `npm run test:smoke`, and `npm run verify`.
- Production deployment verification was completed after the final GitHub push in this handoff.
