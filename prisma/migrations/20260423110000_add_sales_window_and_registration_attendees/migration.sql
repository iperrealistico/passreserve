-- AlterTable
ALTER TABLE "EventType"
ADD COLUMN "salesWindowStartsAt" TIMESTAMP(3),
ADD COLUMN "salesWindowEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EventOccurrence"
ADD COLUMN "salesWindowStartsAt" TIMESTAMP(3),
ADD COLUMN "salesWindowEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Registration"
ADD COLUMN "registrationLocale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "RegistrationAttendee" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dietaryFlags" JSONB,
    "dietaryOther" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationAttendee_registrationId_sortOrder_idx" ON "RegistrationAttendee"("registrationId", "sortOrder");

-- AddForeignKey
ALTER TABLE "RegistrationAttendee"
ADD CONSTRAINT "RegistrationAttendee_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
