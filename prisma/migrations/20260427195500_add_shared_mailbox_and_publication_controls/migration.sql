-- CreateEnum
CREATE TYPE "OrganizerPublicationState" AS ENUM ('PRIVATE', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OrganizerApplicationProvisioningStatus" AS ENUM ('PENDING', 'PROVISIONED', 'DUPLICATE', 'EMAIL_FAILED');

-- CreateEnum
CREATE TYPE "MailboxThreadStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MailboxMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "Organizer"
ADD COLUMN "publicSlug" TEXT,
ADD COLUMN "publicationState" "OrganizerPublicationState" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Organizer"
SET
  "publicSlug" = "slug",
  "publicationState" = CASE
    WHEN "status" = 'ACTIVE' THEN 'PUBLISHED'::"OrganizerPublicationState"
    ELSE 'PRIVATE'::"OrganizerPublicationState"
  END,
  "publishedAt" = CASE
    WHEN "status" = 'ACTIVE' THEN COALESCE("createdAt", NOW())
    ELSE NULL
  END
WHERE "publicSlug" IS NULL;

ALTER TABLE "Organizer"
ALTER COLUMN "publicSlug" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrganizerJoinRequest"
ADD COLUMN "provisioningStatus" "OrganizerApplicationProvisioningStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "requestedPublicSlug" TEXT NOT NULL DEFAULT '',
ADD COLUMN "provisionedAt" TIMESTAMP(3),
ADD COLUMN "accessEmailSentAt" TIMESTAMP(3),
ADD COLUMN "accessEmailSendCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "accessEmailLastError" TEXT NOT NULL DEFAULT '';

UPDATE "OrganizerJoinRequest" AS "request"
SET
  "provisioningStatus" = 'PROVISIONED'::"OrganizerApplicationProvisioningStatus",
  "requestedPublicSlug" = COALESCE("organizer"."publicSlug", "organizer"."slug", "request"."requestedPublicSlug"),
  "provisionedAt" = COALESCE("request"."approvedAt", "request"."updatedAt", "request"."createdAt")
FROM "Organizer" AS "organizer"
WHERE "request"."organizerId" = "organizer"."id";

-- CreateTable
CREATE TABLE "MailboxThread" (
    "id" TEXT NOT NULL,
    "mailboxAddress" TEXT NOT NULL,
    "participantName" TEXT NOT NULL DEFAULT '',
    "participantEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "normalizedSubject" TEXT NOT NULL DEFAULT '',
    "status" "MailboxThreadStatus" NOT NULL DEFAULT 'OPEN',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "latestMessageAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "direction" "MailboxMessageDirection" NOT NULL,
    "resendEmailId" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "references" JSONB,
    "fromName" TEXT NOT NULL DEFAULT '',
    "fromEmail" TEXT NOT NULL DEFAULT '',
    "toEmails" JSONB,
    "ccEmails" JSONB,
    "replyToEmails" JSONB,
    "subject" TEXT NOT NULL DEFAULT '',
    "textBody" TEXT NOT NULL DEFAULT '',
    "htmlBody" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "resendAttachmentId" TEXT NOT NULL,
    "resendEmailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT '',
    "contentDisposition" TEXT,
    "contentId" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_publicSlug_key" ON "Organizer"("publicSlug");

-- CreateIndex
CREATE INDEX "Organizer_publicationState_publicSlug_idx" ON "Organizer"("publicationState", "publicSlug");

-- CreateIndex
CREATE INDEX "OrganizerJoinRequest_provisioningStatus_idx" ON "OrganizerJoinRequest"("provisioningStatus");

-- CreateIndex
CREATE INDEX "MailboxThread_latestMessageAt_idx" ON "MailboxThread"("latestMessageAt");

-- CreateIndex
CREATE INDEX "MailboxThread_participantEmail_normalizedSubject_idx" ON "MailboxThread"("participantEmail", "normalizedSubject");

-- CreateIndex
CREATE INDEX "MailboxThread_mailboxAddress_status_latestMessageAt_idx" ON "MailboxThread"("mailboxAddress", "status", "latestMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxMessage_resendEmailId_key" ON "MailboxMessage"("resendEmailId");

-- CreateIndex
CREATE INDEX "MailboxMessage_threadId_receivedAt_idx" ON "MailboxMessage"("threadId", "receivedAt");

-- CreateIndex
CREATE INDEX "MailboxMessage_threadId_sentAt_idx" ON "MailboxMessage"("threadId", "sentAt");

-- CreateIndex
CREATE INDEX "MailboxMessage_messageId_idx" ON "MailboxMessage"("messageId");

-- CreateIndex
CREATE INDEX "MailboxAttachment_messageId_idx" ON "MailboxAttachment"("messageId");

-- CreateIndex
CREATE INDEX "MailboxAttachment_resendEmailId_resendAttachmentId_idx" ON "MailboxAttachment"("resendEmailId", "resendAttachmentId");

-- AddForeignKey
ALTER TABLE "MailboxMessage" ADD CONSTRAINT "MailboxMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailboxThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxAttachment" ADD CONSTRAINT "MailboxAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "MailboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
