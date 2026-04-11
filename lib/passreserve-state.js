import fs from "node:fs/promises";
import path from "node:path";

import {
  SYSTEM_LOCK_ID,
  getStateFilePath,
  getStorageMode,
  getStorageSummary
} from "./passreserve-config.js";
import { buildSeedState } from "./passreserve-seed.js";
import { getPrismaClient } from "./passreserve-prisma.js";

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
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.registrationPayment.findMany({
      orderBy: {
        occurredAt: "desc"
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
    emailTemplates: mapRows(emailTemplates),
    siteSettings: siteSettings ? serializeValue(siteSettings) : null,
    aboutPage: aboutPage ? serializeValue(aboutPage) : null,
    auditLogs: mapRows(auditLogs)
  };
}

async function replacePrismaState(prisma, state) {
  await prisma.registrationPayment.deleteMany();
  await prisma.auditLog.deleteMany();
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
    await prisma.registration.create({
      data: {
        ...registration,
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

async function writeFileState(state) {
  const filePath = getStateFilePath();
  const tempPath = `${filePath}.tmp`;

  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2));
  await fs.rename(tempPath, filePath);
}

export async function loadPersistentState() {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();
    let state = await readPrismaState(prisma);

    if (!hasStateData(state)) {
      state = await buildSeedState();
      await replacePrismaState(prisma, state);
    }

    return state;
  }

  let state = await readFileState();

  if (!state) {
    state = await buildSeedState();
    await writeFileState(state);
  }

  return state;
}

export async function mutatePersistentState(mutator) {
  if (getStorageMode() === "database") {
    const prisma = getPrismaClient();

    return prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYSTEM_LOCK_ID})`);
      let state = await readPrismaState(tx);

      if (!hasStateData(state)) {
        state = await buildSeedState();
      }

      const draft = structuredClone(state);
      const result = await mutator(draft);
      draft.version = 1;
      await replacePrismaState(tx, draft);

      return result;
    });
  }

  fileWriteQueue = fileWriteQueue.then(async () => {
    const state = (await readFileState()) || (await buildSeedState());
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
