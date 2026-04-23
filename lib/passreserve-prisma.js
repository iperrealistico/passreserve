import { PrismaClient } from "@prisma/client";

let prisma;
let schemaCompatibilityState = "unknown";
let loggedSchemaFallback = false;
let schemaRepairPromise = null;

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}

export function hasCompatibleDatabaseSchema() {
  return schemaCompatibilityState !== "incompatible";
}

export function isDatabaseSchemaError(error) {
  return error?.code === "P2021" || error?.code === "P2022";
}

export function markDatabaseSchemaCompatibility(error) {
  if (isDatabaseSchemaError(error)) {
    schemaCompatibilityState = "incompatible";
  }
}

export async function repairPassreserveSchema(error) {
  if (!isDatabaseSchemaError(error)) {
    return false;
  }

  if (schemaRepairPromise) {
    return schemaRepairPromise;
  }

  const client = getPrismaClient();

  schemaRepairPromise = (async () => {
    try {
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "Organizer" ADD COLUMN IF NOT EXISTS "contentI18n" JSONB;'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "EventType" ADD COLUMN IF NOT EXISTS "salesWindowStartsAt" TIMESTAMP(3);'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "EventType" ADD COLUMN IF NOT EXISTS "salesWindowEndsAt" TIMESTAMP(3);'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "EventType" ADD COLUMN IF NOT EXISTS "contentI18n" JSONB;'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "EventOccurrence" ADD COLUMN IF NOT EXISTS "salesWindowStartsAt" TIMESTAMP(3);'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "EventOccurrence" ADD COLUMN IF NOT EXISTS "salesWindowEndsAt" TIMESTAMP(3);'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "EventOccurrence" ADD COLUMN IF NOT EXISTS "contentI18n" JSONB;'
      );
      await client.$executeRawUnsafe(
        'ALTER TABLE IF EXISTS "Registration" ADD COLUMN IF NOT EXISTS "registrationLocale" TEXT NOT NULL DEFAULT \'en\';'
      );
      await client.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "RegistrationAttendee" (
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "RegistrationAttendee_pkey" PRIMARY KEY ("id")
        );
      `);
      await client.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "RegistrationAttendee_registrationId_sortOrder_idx" ON "RegistrationAttendee"("registrationId", "sortOrder");'
      );
      await client.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'RegistrationAttendee'
          ) AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'RegistrationAttendee_registrationId_fkey'
          ) THEN
            ALTER TABLE "RegistrationAttendee"
            ADD CONSTRAINT "RegistrationAttendee_registrationId_fkey"
            FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
          END IF;
        END $$;
      `);

      schemaCompatibilityState = "compatible";
      return true;
    } catch (repairError) {
      markDatabaseSchemaCompatibility(repairError);
      console.error("[passreserve-schema] automatic schema alignment failed", repairError);
      return false;
    } finally {
      schemaRepairPromise = null;
    }
  })();

  return schemaRepairPromise;
}

export function logDatabaseFallback(message, error) {
  markDatabaseSchemaCompatibility(error);

  if (isDatabaseSchemaError(error)) {
    if (!loggedSchemaFallback) {
      loggedSchemaFallback = true;
      console.warn(`${message} Incompatible schema detected; using the file store instead.`, {
        code: error.code,
        modelName: error?.meta?.modelName ?? null,
        column: error?.meta?.column ?? null
      });
    }

    return;
  }

  console.error(message, error);
}
