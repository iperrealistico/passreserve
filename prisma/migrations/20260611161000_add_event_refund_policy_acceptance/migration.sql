CREATE TYPE "RefundPolicyType" AS ENUM ('REFUNDABLE', 'NON_REFUNDABLE', 'REFUNDABLE_WITH_CONDITIONS');

ALTER TABLE "EventType"
ADD COLUMN "refundPolicyType" "RefundPolicyType";

ALTER TABLE "Registration"
ADD COLUMN "refundPolicyAcceptedAt" TIMESTAMP(3),
ADD COLUMN "refundPolicySnapshot" JSONB;

UPDATE "EventType"
SET "refundPolicyType" = 'REFUNDABLE_WITH_CONDITIONS'
WHERE "refundPolicyType" IS NULL
  AND BTRIM(COALESCE("cancellationPolicy", '')) <> '';
