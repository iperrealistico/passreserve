CREATE TYPE "RegistrationConfirmationMode" AS ENUM ('EMAIL_LINK_REQUIRED', 'DIRECT_CONFIRM');

ALTER TABLE "Organizer"
ADD COLUMN "registrationConfirmationMode" "RegistrationConfirmationMode" NOT NULL DEFAULT 'EMAIL_LINK_REQUIRED';

ALTER TABLE "EventType"
ADD COLUMN "registrationConfirmationMode" "RegistrationConfirmationMode";
