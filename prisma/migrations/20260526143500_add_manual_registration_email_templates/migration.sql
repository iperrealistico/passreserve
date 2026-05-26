UPDATE "EmailTemplate"
SET
  "preview" = 'Invites the attendee to confirm the hold, repeats the payment split, and can explain when the organizer prepared the registration.',
  "placeholders" = '["{{event_name}}","{{occurrence_label}}","{{confirmation_url}}","{{online_amount}}","{{due_at_event}}","{{registration_source_note}}","{{registration_source_label}}","{{registration_origin_label}}"]'::jsonb,
  "bodyHtml" = '<p>Hi {{attendee_name}},</p><p>{{registration_source_note}}</p><p>Your place for <strong>{{event_name}}</strong> on {{occurrence_label}} is being held briefly.</p><p>Confirm here: <a href="{{confirmation_url}}">{{confirmation_url}}</a></p><p>Online now: {{online_amount}}. Due at the event: {{due_at_event}}.</p>',
  "updatedAt" = NOW()
WHERE "slug" = 'attendee_pending_confirmation';

UPDATE "EmailTemplate"
SET
  "preview" = 'Shares the registration code, event summary, origin note, and arrival guidance.',
  "placeholders" = '["{{registration_code}}","{{event_name}}","{{venue_name}}","{{due_at_event}}","{{registration_source_note}}","{{registration_source_label}}","{{registration_origin_label}}"]'::jsonb,
  "bodyHtml" = '<p>{{registration_source_note}}</p><p>Your registration <strong>{{registration_code}}</strong> for {{event_name}} is confirmed.</p><p>Venue: {{venue_name}}</p><p>Amount still due at the event: {{due_at_event}}</p>',
  "updatedAt" = NOW()
WHERE "slug" = 'attendee_registration_confirmed';

UPDATE "EmailTemplate"
SET
  "preview" = 'Gives hosts the attendee, date, quantity, source/origin, and current payment state right away.',
  "placeholders" = '["{{organizer_name}}","{{event_name}}","{{attendee_name}}","{{occurrence_label}}","{{quantity_label}}","{{registration_code}}","{{payment_state}}","{{registration_source_label}}","{{registration_origin_label}}"]'::jsonb,
  "bodyHtml" = '<p>A new registration is now active for <strong>{{event_name}}</strong>.</p><p><strong>Attendee:</strong> {{attendee_name}}</p><p><strong>Date:</strong> {{occurrence_label}}</p><p><strong>Quantity:</strong> {{quantity_label}}</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Source:</strong> {{registration_source_label}} · {{registration_origin_label}}</p><p><strong>Payment state:</strong> {{payment_state}}</p>',
  "updatedAt" = NOW()
WHERE "slug" = 'organizer_new_registration';

INSERT INTO "EmailTemplate" (
  "id",
  "slug",
  "audience",
  "category",
  "subject",
  "preview",
  "trigger",
  "placeholders",
  "bodyHtml",
  "createdAt",
  "updatedAt"
)
VALUES (
  'email-attendee-payment-requested',
  'attendee_payment_requested',
  'Attendee',
  'Payments',
  'Complete payment for your Passreserve registration',
  'Explains that the organizer already prepared the registration, then leads with the payment link and the online-versus-venue split.',
  'An organizer creates a registration manually and asks the attendee to complete the online amount',
  '["{{attendee_name}}","{{registration_code}}","{{event_name}}","{{occurrence_label}}","{{payment_url}}","{{online_amount}}","{{due_at_event}}","{{registration_source_note}}","{{support_reply_email}}"]'::jsonb,
  '<p>Hi {{attendee_name}},</p><p>{{registration_source_note}}</p><p>Your registration <strong>{{registration_code}}</strong> for {{event_name}} on {{occurrence_label}} is ready.</p><p>Complete the online amount here: <a href="{{payment_url}}">{{payment_url}}</a></p><p>Online now: {{online_amount}}. Due at the event: {{due_at_event}}.</p><p>Questions? Reply to {{support_reply_email}}.</p>',
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;
