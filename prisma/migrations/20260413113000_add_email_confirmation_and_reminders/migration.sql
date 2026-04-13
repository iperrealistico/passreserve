ALTER TABLE "Organizer"
ADD COLUMN "registrationRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "registrationReminderLeadHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "registrationReminderNote" TEXT NOT NULL DEFAULT '';

ALTER TABLE "SiteSettings"
ADD COLUMN "registrationRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "organizerId" TEXT,
    "registrationId" TEXT,
    "occurrenceId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'SENT',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailDeliveryLog_dedupeKey_key" ON "EmailDeliveryLog"("dedupeKey");
CREATE INDEX "EmailDeliveryLog_templateSlug_sentAt_idx" ON "EmailDeliveryLog"("templateSlug", "sentAt");
CREATE INDEX "EmailDeliveryLog_organizerId_sentAt_idx" ON "EmailDeliveryLog"("organizerId", "sentAt");
CREATE INDEX "EmailDeliveryLog_registrationId_sentAt_idx" ON "EmailDeliveryLog"("registrationId", "sentAt");
CREATE INDEX "EmailDeliveryLog_occurrenceId_sentAt_idx" ON "EmailDeliveryLog"("occurrenceId", "sentAt");

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
VALUES
    (
        'email-organizer-request-alert',
        'organizer_request_alert',
        'Team',
        'Host requests',
        'New organizer request for Passreserve.com',
        'Highlights the organizer, city, and event focus so the team can reply quickly.',
        'Join request needs platform triage',
        '["{{organizer_name}}","{{city}}","{{event_focus}}","{{platform_reply_email}}"]'::jsonb,
        '<p>A new organizer request is waiting in Passreserve.</p><p><strong>Organizer:</strong> {{organizer_name}}</p><p><strong>City:</strong> {{city}}</p><p><strong>Event focus:</strong> {{event_focus}}</p><p>Reply from {{platform_reply_email}} when you are ready to follow up.</p>',
        NOW(),
        NOW()
    ),
    (
        'email-attendee-registration-cancelled',
        'attendee_registration_cancelled',
        'Attendee',
        'Registration updates',
        'Your Passreserve registration has been cancelled',
        'Confirms the cancellation clearly and explains any payment or refund state in plain language.',
        'A single registration is cancelled by the host or platform team',
        '["{{registration_code}}","{{event_name}}","{{occurrence_label}}","{{refund_state}}","{{support_reply_email}}"]'::jsonb,
        '<p>Your registration <strong>{{registration_code}}</strong> for {{event_name}} on {{occurrence_label}} has been cancelled.</p><p>{{refund_state}}</p><p>If you need help or want to discuss a replacement date, reply to {{support_reply_email}}.</p>',
        NOW(),
        NOW()
    ),
    (
        'email-attendee-occurrence-cancelled',
        'attendee_occurrence_cancelled',
        'Attendee',
        'Schedule changes',
        'Date cancelled: {{event_name}}',
        'Explains that a specific event date has been cancelled and repeats the payment or refund state clearly.',
        'A published occurrence is cancelled',
        '["{{event_name}}","{{occurrence_label}}","{{refund_state}}","{{support_reply_email}}"]'::jsonb,
        '<p>The scheduled date for <strong>{{event_name}}</strong> on {{occurrence_label}} has been cancelled.</p><p>{{refund_state}}</p><p>Please reply to {{support_reply_email}} if you need help with next steps.</p>',
        NOW(),
        NOW()
    ),
    (
        'email-attendee-occurrence-reminder',
        'attendee_occurrence_reminder',
        'Attendee',
        'Reminders',
        'Coming up soon: {{event_name}}',
        'Reminds the guest about the date, time, venue, and anything still due at the event.',
        'A confirmed registration reaches the organizer reminder window',
        '["{{attendee_name}}","{{event_name}}","{{occurrence_label}}","{{occurrence_time}}","{{venue_name}}","{{registration_code}}","{{due_at_event}}","{{organizer_reminder_note}}","{{support_reply_email}}"]'::jsonb,
        '<p>Hi {{attendee_name}},</p><p>This is a reminder for <strong>{{event_name}}</strong> on {{occurrence_label}} at {{occurrence_time}}.</p><p><strong>Venue:</strong> {{venue_name}}</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Due at the event:</strong> {{due_at_event}}</p><p>{{organizer_reminder_note}}</p><p>Reply to {{support_reply_email}} if you need help before the event.</p>',
        NOW(),
        NOW()
    ),
    (
        'email-organizer-new-registration',
        'organizer_new_registration',
        'Organizer',
        'Host updates',
        'New registration for {{event_name}}',
        'Gives hosts the attendee, date, quantity, and current payment state right away.',
        'A registration is confirmed or moves into the payment step',
        '["{{organizer_name}}","{{event_name}}","{{attendee_name}}","{{occurrence_label}}","{{quantity_label}}","{{registration_code}}","{{payment_state}}"]'::jsonb,
        '<p>A new registration is now active for <strong>{{event_name}}</strong>.</p><p><strong>Attendee:</strong> {{attendee_name}}</p><p><strong>Date:</strong> {{occurrence_label}}</p><p><strong>Quantity:</strong> {{quantity_label}}</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Payment state:</strong> {{payment_state}}</p>',
        NOW(),
        NOW()
    ),
    (
        'email-organizer-payment-received',
        'organizer_payment_received',
        'Organizer',
        'Host updates',
        'Payment received for {{event_name}}',
        'Highlights the online amount received and any balance still due at the event.',
        'Online collection completes successfully',
        '["{{registration_code}}","{{paid_online}}","{{due_at_event}}","{{occurrence_label}}","{{event_name}}"]'::jsonb,
        '<p>Online payment has been received for <strong>{{event_name}}</strong>.</p><p><strong>Registration code:</strong> {{registration_code}}</p><p><strong>Date:</strong> {{occurrence_label}}</p><p><strong>Paid online:</strong> {{paid_online}}</p><p><strong>Still due at the event:</strong> {{due_at_event}}</p>',
        NOW(),
        NOW()
    ),
    (
        'email-organizer-occurrence-cancelled',
        'organizer_occurrence_cancelled',
        'Organizer and attendee',
        'Schedule changes',
        'Occurrence cancelled: {{event_name}}',
        'Explains the cancelled date, follow-up path, and current refund state clearly.',
        'An organizer or platform operator cancels a published occurrence',
        '["{{event_name}}","{{occurrence_label}}","{{refund_state}}","{{support_reply_email}}"]'::jsonb,
        '<p>The date for <strong>{{event_name}}</strong> on {{occurrence_label}} has been cancelled.</p><p>{{refund_state}}</p><p>Reply to {{support_reply_email}} if you need help coordinating the follow-up.</p>',
        NOW(),
        NOW()
    )
ON CONFLICT ("slug") DO NOTHING;
