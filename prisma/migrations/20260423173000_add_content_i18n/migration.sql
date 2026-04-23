ALTER TABLE "Organizer"
ADD COLUMN "contentI18n" JSONB;

ALTER TABLE "EventType"
ADD COLUMN "contentI18n" JSONB;

ALTER TABLE "EventOccurrence"
ADD COLUMN "contentI18n" JSONB;
