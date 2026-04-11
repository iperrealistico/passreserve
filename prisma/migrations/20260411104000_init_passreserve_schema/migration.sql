-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_CONFIRM', 'PENDING_PAYMENT', 'CONFIRMED_UNPAID', 'CONFIRMED_PARTIALLY_PAID', 'CONFIRMED_PAID', 'ATTENDED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'VENUE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('CHECKOUT_SESSION', 'CAPTURE', 'REFUND', 'WEBHOOK', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'PLATFORM_ADMIN', 'ORGANIZER_ADMIN', 'ATTENDEE', 'STRIPE');

-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrganizerStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "publicEmail" TEXT NOT NULL DEFAULT '',
    "publicPhone" TEXT NOT NULL DEFAULT '',
    "venueTitle" TEXT NOT NULL DEFAULT '',
    "venueDetail" TEXT NOT NULL DEFAULT '',
    "venueMapHref" TEXT NOT NULL DEFAULT '',
    "interestEmail" TEXT NOT NULL DEFAULT '',
    "themeTags" JSONB,
    "policies" JSONB,
    "faq" JSONB,
    "photoStory" JSONB,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerAdminUser" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerAdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizerJoinRequest" (
    "id" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "organizerName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "launchWindow" TEXT NOT NULL,
    "paymentModel" TEXT NOT NULL,
    "eventFocus" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "organizerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "visibility" "EventVisibility" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL DEFAULT 180,
    "venueTitle" TEXT NOT NULL DEFAULT '',
    "venueDetail" TEXT NOT NULL DEFAULT '',
    "mapHref" TEXT NOT NULL DEFAULT '',
    "basePriceCents" INTEGER NOT NULL DEFAULT 0,
    "prepayPercentage" INTEGER NOT NULL DEFAULT 0,
    "attendeeInstructions" TEXT NOT NULL DEFAULT '',
    "organizerNotes" TEXT NOT NULL DEFAULT '',
    "cancellationPolicy" TEXT NOT NULL DEFAULT '',
    "highlights" JSONB,
    "included" JSONB,
    "policies" JSONB,
    "faq" JSONB,
    "gallery" JSONB,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unitPriceCents" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOccurrence" (
    "id" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "prepayPercentage" INTEGER NOT NULL,
    "venueTitle" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "ticketCategoryId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_CONFIRM',
    "attendeeName" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "attendeePhone" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotalCents" INTEGER NOT NULL,
    "onlineAmountCents" INTEGER NOT NULL,
    "dueAtEventCents" INTEGER NOT NULL,
    "onlineCollectedCents" INTEGER NOT NULL DEFAULT 0,
    "venueCollectedCents" INTEGER NOT NULL DEFAULT 0,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "holdToken" TEXT,
    "paymentToken" TEXT,
    "confirmationToken" TEXT,
    "registrationCode" TEXT,
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),
    "noShowAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "responsibilityAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationPayment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "externalEventId" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT NOT NULL DEFAULT '',
    "placeholders" JSONB,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site-settings',
    "siteName" TEXT NOT NULL,
    "siteDescription" TEXT NOT NULL,
    "keywords" JSONB,
    "platformEmail" TEXT NOT NULL,
    "launchInbox" TEXT NOT NULL,
    "adminNotifications" TEXT NOT NULL,
    "supportResponseTarget" TEXT NOT NULL,
    "stripeCurrencyDefault" TEXT NOT NULL DEFAULT 'eur',
    "deploymentRule" TEXT NOT NULL DEFAULT '',
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutPageContent" (
    "id" TEXT NOT NULL DEFAULT 'about-page',
    "heroEyebrow" TEXT NOT NULL DEFAULT '',
    "heroTitle" TEXT NOT NULL DEFAULT '',
    "heroSummary" TEXT NOT NULL DEFAULT '',
    "sections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "organizerId" TEXT,
    "registrationId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerAdminUser_passwordResetToken_key" ON "OrganizerAdminUser"("passwordResetToken");

-- CreateIndex
CREATE INDEX "OrganizerAdminUser_organizerId_idx" ON "OrganizerAdminUser"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerAdminUser_organizerId_email_key" ON "OrganizerAdminUser"("organizerId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdminUser_email_key" ON "PlatformAdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdminUser_passwordResetToken_key" ON "PlatformAdminUser"("passwordResetToken");

-- CreateIndex
CREATE INDEX "OrganizerJoinRequest_status_idx" ON "OrganizerJoinRequest"("status");

-- CreateIndex
CREATE INDEX "OrganizerJoinRequest_contactEmail_idx" ON "OrganizerJoinRequest"("contactEmail");

-- CreateIndex
CREATE INDEX "EventType_organizerId_visibility_idx" ON "EventType"("organizerId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_organizerId_slug_key" ON "EventType"("organizerId", "slug");

-- CreateIndex
CREATE INDEX "TicketCategory_eventTypeId_sortOrder_idx" ON "TicketCategory"("eventTypeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TicketCategory_eventTypeId_slug_key" ON "TicketCategory"("eventTypeId", "slug");

-- CreateIndex
CREATE INDEX "EventOccurrence_eventTypeId_startsAt_idx" ON "EventOccurrence"("eventTypeId", "startsAt");

-- CreateIndex
CREATE INDEX "EventOccurrence_published_startsAt_idx" ON "EventOccurrence"("published", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_holdToken_key" ON "Registration"("holdToken");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_paymentToken_key" ON "Registration"("paymentToken");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_confirmationToken_key" ON "Registration"("confirmationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_registrationCode_key" ON "Registration"("registrationCode");

-- CreateIndex
CREATE INDEX "Registration_organizerId_status_idx" ON "Registration"("organizerId", "status");

-- CreateIndex
CREATE INDEX "Registration_occurrenceId_status_idx" ON "Registration"("occurrenceId", "status");

-- CreateIndex
CREATE INDEX "Registration_attendeeEmail_idx" ON "Registration"("attendeeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationPayment_externalEventId_key" ON "RegistrationPayment"("externalEventId");

-- CreateIndex
CREATE INDEX "RegistrationPayment_registrationId_occurredAt_idx" ON "RegistrationPayment"("registrationId", "occurredAt");

-- CreateIndex
CREATE INDEX "RegistrationPayment_stripeSessionId_idx" ON "RegistrationPayment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "RegistrationPayment_stripePaymentIntentId_idx" ON "RegistrationPayment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_createdAt_idx" ON "AuditLog"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizerId_createdAt_idx" ON "AuditLog"("organizerId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizerAdminUser" ADD CONSTRAINT "OrganizerAdminUser_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerJoinRequest" ADD CONSTRAINT "OrganizerJoinRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "PlatformAdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizerJoinRequest" ADD CONSTRAINT "OrganizerJoinRequest_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCategory" ADD CONSTRAINT "TicketCategory_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOccurrence" ADD CONSTRAINT "EventOccurrence_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_ticketCategoryId_fkey" FOREIGN KEY ("ticketCategoryId") REFERENCES "TicketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPayment" ADD CONSTRAINT "RegistrationPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
