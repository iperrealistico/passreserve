ALTER TABLE "Organizer"
ADD COLUMN "registrationQuestionnaireConfig" JSONB;

ALTER TABLE "EventType"
ADD COLUMN "registrationQuestionnaireConfig" JSONB;
