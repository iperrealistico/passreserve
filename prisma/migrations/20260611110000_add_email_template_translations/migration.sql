ALTER TABLE "EmailTemplate"
ADD COLUMN "subjectTranslations" JSONB,
ADD COLUMN "previewTranslations" JSONB,
ADD COLUMN "bodyHtmlTranslations" JSONB;

UPDATE "EmailTemplate"
SET "subjectTranslations" = jsonb_build_object('en', "subject")
WHERE "subjectTranslations" IS NULL;

UPDATE "EmailTemplate"
SET "previewTranslations" = jsonb_build_object('en', "preview")
WHERE "previewTranslations" IS NULL;

UPDATE "EmailTemplate"
SET "bodyHtmlTranslations" = jsonb_build_object('en', "bodyHtml")
WHERE "bodyHtmlTranslations" IS NULL;

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Conferma la tua registrazione Passreserve'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Invita il partecipante a confermare la hold, ripete la ripartizione del pagamento e può spiegare quando la registrazione è stata preparata dall''organizer.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>Ciao {{attendee_name}},</p><p>{{registration_source_note}}</p><p>Il tuo posto per <strong>{{event_name}}</strong> del {{occurrence_label}} è stato riservato per poco tempo.</p><p>Conferma qui: <a href="{{confirmation_url}}">{{confirmation_url}}</a></p><p>Da pagare online ora: {{online_amount}}. Da pagare all''evento: {{due_at_event}}.</p>')
WHERE "slug" = 'attendee_pending_confirmation';

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'La tua registrazione Passreserve è confermata'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Condivide il codice registrazione, il riepilogo dell''evento e le indicazioni per l''arrivo.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>{{registration_source_note}}</p><p>La tua registrazione <strong>{{registration_code}}</strong> per {{event_name}} è confermata.</p><p>Luogo: {{venue_name}}</p><p>Importo ancora dovuto all''evento: {{due_at_event}}</p>')
WHERE "slug" = 'attendee_registration_confirmed';

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Completa il pagamento per la tua registrazione Passreserve'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Spiega che l''organizer ha già preparato la registrazione e mette in evidenza il link di pagamento e la ripartizione tra online e saldo all''evento.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>Ciao {{attendee_name}},</p><p>{{registration_source_note}}</p><p>La tua registrazione <strong>{{registration_code}}</strong> per {{event_name}} del {{occurrence_label}} è pronta.</p><p>Completa qui l''importo online: <a href="{{payment_url}}">{{payment_url}}</a></p><p>Da pagare online ora: {{online_amount}}. Da pagare all''evento: {{due_at_event}}.</p><p>Domande? Rispondi a {{support_reply_email}}.</p>')
WHERE "slug" = 'attendee_payment_requested';

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'La tua registrazione Passreserve è stata annullata'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Conferma chiaramente l''annullamento e spiega lo stato di pagamento o rimborso in modo semplice.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>La tua registrazione <strong>{{registration_code}}</strong> per {{event_name}} del {{occurrence_label}} è stata annullata.</p><p>{{refund_state}}</p><p>Se hai bisogno di aiuto o vuoi valutare una data sostitutiva, rispondi a {{support_reply_email}}.</p>')
WHERE "slug" = 'attendee_registration_cancelled';

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Pagamento ricevuto per la tua registrazione Passreserve'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Conferma l''importo pagato online e ripete l''eventuale saldo rimanente all''evento.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>Pagamento ricevuto per {{event_name}}.</p><p>Registrazione: {{registration_code}}</p><p>Pagato online: {{paid_online}}</p><p>Da pagare all''evento: {{due_at_event}}</p>')
WHERE "slug" = 'attendee_payment_received';

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'In arrivo: {{event_name}}'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Ricorda al partecipante data, orario, venue e qualsiasi importo ancora dovuto all''evento.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>Ciao {{attendee_name}},</p><p>Questo è un promemoria per <strong>{{event_name}}</strong> del {{occurrence_label}}, nella fascia oraria {{occurrence_time}}.</p><p><strong>Luogo:</strong> {{venue_name}}</p><p><strong>Codice registrazione:</strong> {{registration_code}}</p><p><strong>Da pagare all''evento:</strong> {{due_at_event}}</p><p>{{organizer_reminder_note}}</p><p>Rispondi a {{support_reply_email}} se hai bisogno di aiuto prima dell''evento.</p>')
WHERE "slug" = 'attendee_occurrence_reminder';

UPDATE "EmailTemplate"
SET
  "subjectTranslations" = COALESCE("subjectTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Data annullata: {{event_name}}'),
  "previewTranslations" = COALESCE("previewTranslations", '{}'::jsonb) || jsonb_build_object('it', 'Spiega che una specifica data dell''evento è stata annullata e ripete chiaramente lo stato del pagamento o del rimborso.'),
  "bodyHtmlTranslations" = COALESCE("bodyHtmlTranslations", '{}'::jsonb) || jsonb_build_object('it', '<p>La data prevista per <strong>{{event_name}}</strong> del {{occurrence_label}} è stata annullata.</p><p>{{refund_state}}</p><p>Rispondi a {{support_reply_email}} se hai bisogno di aiuto per i prossimi passi.</p>')
WHERE "slug" = 'attendee_occurrence_cancelled';
