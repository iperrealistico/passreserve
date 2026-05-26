-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('PUBLIC', 'ORGANIZER_MANUAL', 'IMPORT');

-- AlterTable
ALTER TABLE "Registration"
ADD COLUMN "source" "RegistrationSource" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "origin" TEXT NOT NULL DEFAULT '';
