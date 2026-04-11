CREATE TYPE "OrganizerStripeConnectionStatus" AS ENUM (
    'NOT_CONNECTED',
    'PENDING',
    'CONNECTED',
    'RESTRICTED'
);

CREATE TYPE "OrganizerBillingStatus" AS ENUM (
    'NOT_REQUIRED',
    'ACTIVE',
    'INACTIVE'
);

ALTER TABLE "Organizer"
ADD COLUMN "stripeAccountId" TEXT,
ADD COLUMN "stripeConnectionStatus" "OrganizerStripeConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripeConnectedAt" TIMESTAMP(3),
ADD COLUMN "stripeLastSyncedAt" TIMESTAMP(3),
ADD COLUMN "onlinePaymentsMonthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "onlinePaymentsBillingStatus" "OrganizerBillingStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "onlinePaymentsBillingActivatedAt" TIMESTAMP(3);

ALTER TABLE "RegistrationPayment"
ADD COLUMN "stripeAccountId" TEXT;

CREATE UNIQUE INDEX "Organizer_stripeAccountId_key" ON "Organizer"("stripeAccountId");
CREATE INDEX "RegistrationPayment_stripeAccountId_idx" ON "RegistrationPayment"("stripeAccountId");
