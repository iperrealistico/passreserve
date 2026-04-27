import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  SYSTEM_LOCK_ID,
  getStateFilePath,
  getStorageMode,
  getStorageSummary
} from "./passreserve-config.js";
import {
  appendMissingPublicCatalog,
  buildSeedState,
  createDefaultEmailTemplates,
  createSiteSettings
} from "./passreserve-seed.js";
import { getPrismaClient, logDatabaseFallback } from "./passreserve-prisma.js";

let fileWriteQueue = Promise.resolve();

function hasStateData(state) {
  return Boolean(
    state &&
      Array.isArray(state.organizers) &&
      state.organizers.length > 0 &&
      state.siteSettings &&
      state.aboutPage
  );
}

function serializeValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)])
    );
  }

  return value;
}

function toDateValue(value) {
  return value ? new Date(value) : null;
}

function mapRows(rows) {
  return rows.map((entry) => serializeValue(entry));
}

async function readPrismaState(prisma) {
  const [
    organizers,
    organizerAdmins,
    platformAdmins,
    joinRequests,
    events,
    ticketCategories,
    occurrences,
    registrations,
    payments,
    mailboxThreads,
    mailboxMessages,
    mailboxAttachments,
    emailDeliveries,
    emailTemplates,
    siteSettings,
    aboutPage,
    auditLogs
  ] = await Promise.all([
    prisma.organizer.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.organizerAdminUser.findMany({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.platformAdminUser.findMany({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.organizerJoinRequest.findMany({
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.eventType.findMany({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.ticketCategory.findMany({
      orderBy: {
        sortOrder: "asc"
      }
    }),
    prisma.eventOccurrence.findMany({
      orderBy: {
        startsAt: "asc"
      }
    }),
    prisma.registration.findMany({
      include: {
        attendees: {
          orderBy: {
            sortOrder: "asc"
          }
        },
        items: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.registrationPayment.findMany({
      orderBy: {
        occurredAt: "desc"
      }
    }),
    prisma.mailboxThread.findMany({
      orderBy: {
        latestMessageAt: "desc"
      }
    }),
    prisma.mailboxMessage.findMany({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.mailboxAttachment.findMany({
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.emailDeliveryLog.findMany({
      orderBy: {
        sentAt: "desc"
      }
    }),
    prisma.emailTemplate.findMany({
      orderBy: {
        slug: "asc"
      }
    }),
    prisma.siteSettings.findUnique({
      where: {
        id: "site-settings"
      }
    }),
    prisma.aboutPageContent.findUnique({
      where: {
        id: "about-page"
      }
    }),
    prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  return {
    version: 1,
    organizers: mapRows(organizers),
    organizerAdmins: mapRows(organizerAdmins),
    platformAdmins: mapRows(platformAdmins),
    joinRequests: mapRows(joinRequests),
    events: mapRows(events),
    ticketCategories: mapRows(ticketCategories),
    occurrences: mapRows(occurrences),
    registrations: mapRows(registrations),
    payments: mapRows(payments),
    mailboxThreads: mapRows(mailboxThreads),
    mailboxMessages: mapRows(mailboxMessages),
    mailboxAttachments: mapRows(mailboxAttachments),
    emailDeliveries: mapRows(emailDeliveries),
    emailTemplates: mapRows(emailTemplates),
    siteSettings: siteSettings ? serializeValue(siteSettings) : null,
    aboutPage: aboutPage ? serializeValue(aboutPage) : null,
    auditLogs: mapRows(auditLogs)
  };
}

async function replacePrismaState(prisma, state) {
  await prisma.registrationPayment.deleteMany();
  await prisma.mailboxAttachment.deleteMany();
  await prisma.mailboxMessage.deleteMany();
  await prisma.mailboxThread.deleteMany();
  await prisma.emailDeliveryLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.registrationItem.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.eventOccurrence.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.eventType.deleteMany();
  await prisma.organizerJoinRequest.deleteMany();
  await prisma.organizerAdminUser.deleteMany();
  await prisma.platformAdminUser.deleteMany();
  await prisma.organizer.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.aboutPageContent.deleteMany();

  for (const organizer of state.organizers) {
    await prisma.organizer.create({
      data: {
        ...organizer,
        createdAt: toDateValue(organizer.createdAt),
        updatedAt: toDateValue(organizer.updatedAt)
      }
    });
  }

  for (const admin of state.organizerAdmins) {
    await prisma.organizerAdminUser.create({
      data: {
        ...admin,
        passwordResetExpires: toDateValue(admin.passwordResetExpires),
        lastLoginAt: toDateValue(admin.lastLoginAt),
        createdAt: toDateValue(admin.createdAt),
        updatedAt: toDateValue(admin.updatedAt)
      }
    });
  }

  for (const admin of state.platformAdmins) {
    await prisma.platformAdminUser.create({
      data: {
        ...admin,
        passwordResetExpires: toDateValue(admin.passwordResetExpires),
        lastLoginAt: toDateValue(admin.lastLoginAt),
        createdAt: toDateValue(admin.createdAt),
        updatedAt: toDateValue(admin.updatedAt)
      }
    });
  }

  for (const request of state.joinRequests) {
    await prisma.organizerJoinRequest.create({
      data: {
        ...request,
        approvedAt: toDateValue(request.approvedAt),
        createdAt: toDateValue(request.createdAt),
        updatedAt: toDateValue(request.updatedAt)
      }
    });
  }

  for (const event of state.events) {
    await prisma.eventType.create({
      data: {
        ...event,
        createdAt: toDateValue(event.createdAt),
        updatedAt: toDateValue(event.updatedAt)
      }
    });
  }

  for (const ticket of state.ticketCategories) {
    await prisma.ticketCategory.create({
      data: {
        ...ticket,
        createdAt: toDateValue(ticket.createdAt),
        updatedAt: toDateValue(ticket.updatedAt)
      }
    });
  }

  for (const occurrence of state.occurrences) {
    await prisma.eventOccurrence.create({
      data: {
        ...occurrence,
        startsAt: toDateValue(occurrence.startsAt),
        endsAt: toDateValue(occurrence.endsAt),
        createdAt: toDateValue(occurrence.createdAt),
        updatedAt: toDateValue(occurrence.updatedAt)
      }
    });
  }

  for (const registration of state.registrations) {
    const attendees = Array.isArray(registration.attendees) ? registration.attendees : [];
    const items = Array.isArray(registration.items) ? registration.items : [];
    const registrationData = { ...registration };
    delete registrationData.attendees;
    delete registrationData.items;

    await prisma.registration.create({
      data: {
        ...registrationData,
        attendees: attendees.length
          ? {
              create: attendees.map((attendee) => ({
                ...attendee,
                createdAt: toDateValue(attendee.createdAt),
                updatedAt: toDateValue(attendee.updatedAt)
              }))
            }
          : undefined,
        items: items.length
          ? {
              create: items.map((item) => ({
                ...item,
                createdAt: toDateValue(item.createdAt),
                updatedAt: toDateValue(item.updatedAt)
              }))
            }
          : undefined,
        expiresAt: toDateValue(registration.expiresAt),
        confirmedAt: toDateValue(registration.confirmedAt),
        cancelledAt: toDateValue(registration.cancelledAt),
        attendedAt: toDateValue(registration.attendedAt),
        noShowAt: toDateValue(registration.noShowAt),
        termsAcceptedAt: toDateValue(registration.termsAcceptedAt),
        responsibilityAt: toDateValue(registration.responsibilityAt),
        createdAt: toDateValue(registration.createdAt),
        updatedAt: toDateValue(registration.updatedAt)
      }
    });
  }

  for (const payment of state.payments) {
    await prisma.registrationPayment.create({
      data: {
        ...payment,
        occurredAt: toDateValue(payment.occurredAt),
        createdAt: toDateValue(payment.createdAt)
      }
    });
  }

  for (const thread of state.mailboxThreads || []) {
    await prisma.mailboxThread.create({
      data: {
        ...thread,
        latestMessageAt: toDateValue(thread.latestMessageAt),
        createdAt: toDateValue(thread.createdAt),
        updatedAt: toDateValue(thread.updatedAt)
      }
    });
  }

  for (const message of state.mailboxMessages || []) {
    await prisma.mailboxMessage.create({
      data: {
        ...message,
        receivedAt: toDateValue(message.receivedAt),
        sentAt: toDateValue(message.sentAt),
        createdAt: toDateValue(message.createdAt),
        updatedAt: toDateValue(message.updatedAt)
      }
    });
  }

  for (const attachment of state.mailboxAttachments || []) {
    await prisma.mailboxAttachment.create({
      data: {
        ...attachment,
        createdAt: toDateValue(attachment.createdAt),
        updatedAt: toDateValue(attachment.updatedAt)
      }
    });
  }

  for (const delivery of state.emailDeliveries || []) {
    await prisma.emailDeliveryLog.create({
      data: {
        ...delivery,
        sentAt: toDateValue(delivery.sentAt),
        createdAt: toDateValue(delivery.createdAt)
      }
    });
  }

  for (const template of state.emailTemplates) {
    await prisma.emailTemplate.create({
      data: {
        ...template,
        createdAt: toDateValue(template.createdAt),
        updatedAt: toDateValue(template.updatedAt)
      }
    });
  }

  await prisma.siteSettings.create({
    data: {
      ...state.siteSettings,
      createdAt: toDateValue(state.siteSettings.createdAt),
      updatedAt: toDateValue(state.siteSettings.updatedAt)
    }
  });

  await prisma.aboutPageContent.create({
    data: {
      ...state.aboutPage,
      createdAt: toDateValue(state.aboutPage.createdAt),
      updatedAt: toDateValue(state.aboutPage.updatedAt)
    }
  });

  for (const log of state.auditLogs) {
    await prisma.auditLog.create({
      data: {
        ...log,
        createdAt: toDateValue(log.createdAt)
      }
    });
  }
}

async function readFileState() {
  const filePath = getStateFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return hasStateData(parsed) ? parsed : null;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      try {
        await fs.rename(filePath, `${filePath}.corrupt-${Date.now()}`);
      } catch {
        // Best effort only.
      }

      return null;
    }

    throw error;
  }
}

function reconcileStateShape(state) {
  let changed = false;
  const defaults = createSiteSettings();
  const defaultTemplates = createDefaultEmailTemplates();

  if (!Array.isArray(state.emailDeliveries)) {
    state.emailDeliveries = [];
    changed = true;
  }

  if (!Array.isArray(state.mailboxThreads)) {
    state.mailboxThreads = [];
    changed = true;
  }

  if (!Array.isArray(state.mailboxMessages)) {
    state.mailboxMessages = [];
    changed = true;
  }

  if (!Array.isArray(state.mailboxAttachments)) {
    state.mailboxAttachments = [];
    changed = true;
  }

  if (!state.siteSettings) {
    state.siteSettings = defaults;
    changed = true;
  } else if (typeof state.siteSettings.registrationRemindersEnabled !== "boolean") {
    state.siteSettings.registrationRemindersEnabled =
      defaults.registrationRemindersEnabled;
    changed = true;
  }

  if (!state.siteSettings?.launchInbox) {
    state.siteSettings.launchInbox = defaults.launchInbox;
    changed = true;
  } else if (state.siteSettings.launchInbox === "launch@passreserve.com") {
    state.siteSettings.launchInbox = defaults.launchInbox;
    changed = true;
  }

  if (!Array.isArray(state.emailTemplates)) {
    state.emailTemplates = defaultTemplates;
    changed = true;
  } else {
    const templateSlugs = new Set(state.emailTemplates.map((template) => template.slug));

    for (const template of defaultTemplates) {
      if (!templateSlugs.has(template.slug)) {
        state.emailTemplates.push(template);
        changed = true;
      }
    }

    state.emailTemplates.sort((left, right) => left.slug.localeCompare(right.slug));
  }

  for (const organizer of state.organizers || []) {
    if (typeof organizer.publicSlug !== "string" || !organizer.publicSlug) {
      organizer.publicSlug = organizer.slug;
      changed = true;
    }

    if (typeof organizer.publicationState !== "string" || !organizer.publicationState) {
      organizer.publicationState = organizer.status === "ACTIVE" ? "PUBLISHED" : "PRIVATE";
      changed = true;
    }

    if (!("publishedAt" in organizer)) {
      organizer.publishedAt =
        organizer.publicationState === "PUBLISHED" ? organizer.createdAt || null : null;
      changed = true;
    }

    if (typeof organizer.registrationRemindersEnabled !== "boolean") {
      organizer.registrationRemindersEnabled = false;
      changed = true;
    }

    if (typeof organizer.registrationReminderLeadHours !== "number") {
      organizer.registrationReminderLeadHours = 24;
      changed = true;
    }

    if (typeof organizer.registrationReminderNote !== "string") {
      organizer.registrationReminderNote = "";
      changed = true;
    }
  }

  for (const admin of state.organizerAdmins || []) {
    if (typeof admin.tokenVersion !== "number") {
      admin.tokenVersion = 0;
      changed = true;
    }
  }

  for (const admin of state.platformAdmins || []) {
    if (typeof admin.tokenVersion !== "number") {
      admin.tokenVersion = 0;
      changed = true;
    }
  }

  for (const request of state.joinRequests || []) {
    if (typeof request.provisioningStatus !== "string" || !request.provisioningStatus) {
      request.provisioningStatus =
        request.status === "APPROVED" ? "PROVISIONED" : "PENDING";
      changed = true;
    }

    if (typeof request.requestedPublicSlug !== "string") {
      request.requestedPublicSlug = "";
      changed = true;
    }

    if (!("provisionedAt" in request)) {
      request.provisionedAt =
        request.provisioningStatus === "PROVISIONED"
          ? request.approvedAt || request.updatedAt || request.createdAt || null
          : null;
      changed = true;
    }

    if (!("accessEmailSentAt" in request)) {
      request.accessEmailSentAt =
        request.provisioningStatus === "PROVISIONED"
          ? request.approvedAt || request.updatedAt || request.createdAt || null
          : null;
      changed = true;
    }

    if (typeof request.accessEmailSendCount !== "number") {
      request.accessEmailSendCount = request.accessEmailSentAt ? 1 : 0;
      changed = true;
    }

    if (typeof request.accessEmailLastError !== "string") {
      request.accessEmailLastError = "";
      changed = true;
    }
  }

  for (const event of state.events || []) {
    if (typeof event.collectDietaryInfo !== "boolean") {
      event.collectDietaryInfo = true;
      changed = true;
    }

    if (!("salesWindowStartsAt" in event)) {
      event.salesWindowStartsAt = null;
      changed = true;
    }

    if (!("salesWindowEndsAt" in event)) {
      event.salesWindowEndsAt = null;
      changed = true;
    }
  }

  for (const occurrence of state.occurrences || []) {
    if (!("salesWindowStartsAt" in occurrence)) {
      occurrence.salesWindowStartsAt = null;
      changed = true;
    }

    if (!("salesWindowEndsAt" in occurrence)) {
      occurrence.salesWindowEndsAt = null;
      changed = true;
    }
  }

  for (const ticketCategory of state.ticketCategories || []) {
    if (!("contentI18n" in ticketCategory)) {
      ticketCategory.contentI18n = null;
      changed = true;
    }

    if (!("included" in ticketCategory)) {
      ticketCategory.included = [];
      changed = true;
    }

    if (typeof ticketCategory.isActive !== "boolean") {
      ticketCategory.isActive = true;
      changed = true;
    }
  }

  for (const registration of state.registrations || []) {
    if (typeof registration.registrationLocale !== "string" || !registration.registrationLocale) {
      registration.registrationLocale = "en";
      changed = true;
    }

    if (!Array.isArray(registration.attendees) || !registration.attendees.length) {
      registration.attendees = [
        {
          id: `${registration.id}-attendee-1`,
          sortOrder: 0,
          firstName: String(registration.attendeeName || "").split(" ").slice(0, -1).join(" ") || registration.attendeeName || "",
          lastName: String(registration.attendeeName || "").split(" ").slice(-1).join("") || "",
          address: "",
          phone: registration.attendeePhone || "",
          email: registration.attendeeEmail || "",
          dietaryFlags: [],
          dietaryOther: "",
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt
        }
      ];
      changed = true;
    }

    if (!Array.isArray(registration.items) || !registration.items.length) {
      registration.items = [
        {
          id: `${registration.id}-item-1`,
          registrationId: registration.id,
          ticketCategoryId: registration.ticketCategoryId,
          sortOrder: 0,
          quantity: registration.quantity || registration.attendees.length || 1,
          unitPriceCents:
            registration.quantity > 0
              ? Math.round((registration.subtotalCents || 0) / registration.quantity)
              : registration.subtotalCents || 0,
          subtotalCents: registration.subtotalCents || 0,
          onlineAmountCents: registration.onlineAmountCents || 0,
          dueAtEventCents: registration.dueAtEventCents || 0,
          createdAt: registration.createdAt,
          updatedAt: registration.updatedAt
        }
      ];
      changed = true;
    }

    for (const attendee of registration.attendees) {
      if (!("ticketCategoryId" in attendee) || !attendee.ticketCategoryId) {
        attendee.ticketCategoryId =
          registration.items[0]?.ticketCategoryId || registration.ticketCategoryId || null;
        changed = true;
      }
    }
  }

  if (appendMissingPublicCatalog(state)) {
    changed = true;
  }

  return changed;
}

async function writeFileState(state) {
  const filePath = getStateFilePath();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;

  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2));
  await fs.rename(tempPath, filePath);
}

export async function loadFileBackedState() {
  let state = await readFileState();

  if (!state) {
    state = await buildSeedState();
    await writeFileState(state);
    return state;
  }

  if (reconcileStateShape(state)) {
    await writeFileState(state);
  }

  return state;
}

const loadPersistentStateCached = cache(async function loadPersistentStateCached() {
  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      let state = await readPrismaState(prisma);

      if (!hasStateData(state)) {
        state = await buildSeedState();
        await replacePrismaState(prisma, state);
        return state;
      }

      if (reconcileStateShape(state)) {
        await replacePrismaState(prisma, state);
      }

      return state;
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-state] database unavailable or incompatible, falling back to file state",
        error
      );
    }
  }

  return loadFileBackedState();
});

export async function loadPersistentState() {
  return loadPersistentStateCached();
}

export async function mutatePersistentState(mutator) {
  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();

      return await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYSTEM_LOCK_ID})`);
        let state = await readPrismaState(tx);

        if (!hasStateData(state)) {
          state = await buildSeedState();
        } else {
          reconcileStateShape(state);
        }

        const draft = structuredClone(state);
        const result = await mutator(draft);
        draft.version = 1;
        await replacePrismaState(tx, draft);

        return result;
      });
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-state] database mutation unavailable or incompatible, falling back to file state",
        error
      );
    }
  }

  fileWriteQueue = fileWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const state = await loadFileBackedState();
      const draft = structuredClone(state);
      const result = await mutator(draft);
      draft.version = 1;
      await writeFileState(draft);

      return result;
    });

  return fileWriteQueue;
}

export async function getPersistentStorageState() {
  const summary = getStorageSummary();
  const state = await loadPersistentState();

  return {
    ...summary,
    path: getStorageMode() === "file" ? getStateFilePath() : null,
    organizerCount: state.organizers.length,
    registrationCount: state.registrations.length
  };
}
