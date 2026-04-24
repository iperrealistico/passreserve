ALTER TABLE "TicketCategory"
ADD COLUMN "contentI18n" JSONB,
ADD COLUMN "included" JSONB,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "RegistrationAttendee"
ADD COLUMN "ticketCategoryId" TEXT;

CREATE TABLE "RegistrationItem" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "ticketCategoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "onlineAmountCents" INTEGER NOT NULL,
    "dueAtEventCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationItem_registrationId_sortOrder_idx" ON "RegistrationItem"("registrationId", "sortOrder");
CREATE INDEX "RegistrationAttendee_ticketCategoryId_idx" ON "RegistrationAttendee"("ticketCategoryId");

ALTER TABLE "RegistrationAttendee"
ADD CONSTRAINT "RegistrationAttendee_ticketCategoryId_fkey"
FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationItem"
ADD CONSTRAINT "RegistrationItem_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationItem"
ADD CONSTRAINT "RegistrationItem_ticketCategoryId_fkey"
FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "RegistrationItem" (
  "id",
  "registrationId",
  "ticketCategoryId",
  "sortOrder",
  "quantity",
  "unitPriceCents",
  "subtotalCents",
  "onlineAmountCents",
  "dueAtEventCents",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-item-' || "id",
  "id",
  "ticketCategoryId",
  0,
  "quantity",
  CASE WHEN "quantity" > 0 THEN ROUND(("subtotalCents"::numeric / "quantity"))::integer ELSE 0 END,
  "subtotalCents",
  "onlineAmountCents",
  "dueAtEventCents",
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "Registration";

UPDATE "RegistrationAttendee" attendee
SET "ticketCategoryId" = registration."ticketCategoryId"
FROM "Registration" registration
WHERE attendee."registrationId" = registration."id"
  AND attendee."ticketCategoryId" IS NULL;
