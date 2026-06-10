ALTER TABLE "Organizer"
ADD COLUMN "registrationLanguagePromptEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "EventType"
ADD COLUMN "registrationLanguagePromptEnabled" BOOLEAN;
