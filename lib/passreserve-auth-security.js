import fs from "node:fs/promises";
import path from "node:path";

import { headers } from "next/headers.js";

import { getStateFilePath, getStorageMode } from "./passreserve-config.js";
import { normalizeEmail } from "./passreserve-format.js";
import { getPrismaClient, logDatabaseFallback } from "./passreserve-prisma.js";
import { loadPersistentState } from "./passreserve-state.js";

export const ADMIN_LOGIN_RATE_LIMIT_ATTEMPTS = 5;
export const ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

let rateLimitWriteQueue = Promise.resolve();

function normalizeTokenVersion(value) {
  return Number.isInteger(value) ? value : 0;
}

function getAuthRateLimitFilePath() {
  return `${getStateFilePath()}.auth-rate-limits.json`;
}

function pruneExpiredRateLimits(entries, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(entries || {}).filter(([, entry]) => {
      const expiresAt = new Date(entry?.expiresAt || 0).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    })
  );
}

async function readRateLimitEntries() {
  const filePath = getAuthRateLimitFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return pruneExpiredRateLimits(parsed);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }

    return {};
  }
}

async function writeRateLimitEntries(entries) {
  const filePath = getAuthRateLimitFilePath();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });
  await fs.writeFile(tempPath, JSON.stringify(entries, null, 2));
  await fs.rename(tempPath, filePath);
}

async function mutateFileRateLimits(mutator) {
  rateLimitWriteQueue = rateLimitWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const entries = await readRateLimitEntries();
      const result = await mutator(entries);
      await writeRateLimitEntries(entries);

      return result;
    });

  return rateLimitWriteQueue;
}

async function consumeDatabaseRateLimit(key, limit, windowSeconds) {
  const prisma = getPrismaClient();
  const now = new Date();
  const nextExpiry = new Date(now.getTime() + windowSeconds * 1000);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.authRateLimit.findUnique({
      where: {
        key
      }
    });

    if (!existing || existing.expiresAt.getTime() <= now.getTime()) {
      await tx.authRateLimit.upsert({
        where: {
          key
        },
        update: {
          count: 1,
          expiresAt: nextExpiry
        },
        create: {
          key,
          count: 1,
          expiresAt: nextExpiry
        }
      });

      return {
        success: true,
        remaining: Math.max(0, limit - 1),
        retryAfterSeconds: 0
      };
    }

    if (existing.count >= limit) {
      return {
        success: false,
        remaining: 0,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)
        )
      };
    }

    const updated = await tx.authRateLimit.update({
      where: {
        key
      },
      data: {
        count: {
          increment: 1
        }
      }
    });

    return {
      success: true,
      remaining: Math.max(0, limit - updated.count),
      retryAfterSeconds: 0
    };
  });
}

async function clearDatabaseRateLimit(key) {
  const prisma = getPrismaClient();

  await prisma.authRateLimit.deleteMany({
    where: {
      key
    }
  });
}

async function consumeFileRateLimit(key, limit, windowSeconds) {
  return mutateFileRateLimits(async (entries) => {
    const now = Date.now();
    const current = entries[key];
    const expiresAt = current?.expiresAt ? new Date(current.expiresAt).getTime() : 0;

    if (!current || expiresAt <= now) {
      entries[key] = {
        count: 1,
        expiresAt: new Date(now + windowSeconds * 1000).toISOString()
      };

      return {
        success: true,
        remaining: Math.max(0, limit - 1),
        retryAfterSeconds: 0
      };
    }

    if (current.count >= limit) {
      return {
        success: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000))
      };
    }

    current.count += 1;
    entries[key] = current;

    return {
      success: true,
      remaining: Math.max(0, limit - current.count),
      retryAfterSeconds: 0
    };
  });
}

async function clearFileRateLimit(key) {
  await mutateFileRateLimits(async (entries) => {
    delete entries[key];
    return true;
  });
}

function buildRateLimitKey(scope, ip, slug = "") {
  const safeScope = slug ? `${scope}:${slug}` : scope;
  return `admin_login:${safeScope}:${ip}`;
}

export async function getRequestIpAddress() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return headerList.get("x-real-ip")?.trim() || "127.0.0.1";
}

export async function consumeAdminLoginRateLimit(
  scope,
  { ip, slug = "", limit = ADMIN_LOGIN_RATE_LIMIT_ATTEMPTS, windowSeconds = ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS } = {}
) {
  const resolvedIp = ip || (await getRequestIpAddress());
  const key = buildRateLimitKey(scope, resolvedIp, slug);

  if (getStorageMode() === "database") {
    try {
      return await consumeDatabaseRateLimit(key, limit, windowSeconds);
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-auth-security] admin login rate limit database check failed, falling back to file rate limits",
        error
      );
    }
  }

  return consumeFileRateLimit(key, limit, windowSeconds);
}

export async function clearAdminLoginRateLimit(scope, { ip, slug = "" } = {}) {
  const resolvedIp = ip || (await getRequestIpAddress());
  const key = buildRateLimitKey(scope, resolvedIp, slug);

  if (getStorageMode() === "database") {
    try {
      await clearDatabaseRateLimit(key);
      return;
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-auth-security] admin login rate limit database clear failed, falling back to file rate limits",
        error
      );
    }
  }

  await clearFileRateLimit(key);
}

export async function findPlatformAdminForAuthentication(email) {
  const normalizedEmail = normalizeEmail(email);

  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();

      return await prisma.platformAdminUser.findFirst({
        where: {
          email: normalizedEmail,
          isActive: true
        }
      });
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-auth-security] platform admin auth lookup failed, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();

  return (
    state.platformAdmins.find(
      (entry) => entry.email === normalizedEmail && entry.isActive
    ) ?? null
  );
}

export async function findOrganizerAdminForAuthentication(slug, email) {
  const normalizedEmail = normalizeEmail(email);

  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const organizer = await prisma.organizer.findUnique({
        where: {
          slug
        }
      });

      if (!organizer) {
        return null;
      }

      const admin = await prisma.organizerAdminUser.findFirst({
        where: {
          organizerId: organizer.id,
          email: normalizedEmail,
          isActive: true
        }
      });

      return admin
        ? {
            organizer,
            admin
          }
        : null;
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-auth-security] organizer admin auth lookup failed, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();
  const organizer = state.organizers.find((entry) => entry.slug === slug) ?? null;

  if (!organizer) {
    return null;
  }

  const admin =
    state.organizerAdmins.find(
      (entry) =>
        entry.organizerId === organizer.id &&
        entry.email === normalizedEmail &&
        entry.isActive
    ) ?? null;

  return admin
    ? {
        organizer,
        admin
      }
    : null;
}

export async function validatePlatformAdminSessionUser(sessionUser) {
  if (!sessionUser || sessionUser.type !== "platform") {
    return null;
  }

  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const admin = await prisma.platformAdminUser.findUnique({
        where: {
          id: sessionUser.userId
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          tokenVersion: true
        }
      });

      if (!admin || !admin.isActive) {
        return null;
      }

      return normalizeTokenVersion(admin.tokenVersion) ===
        normalizeTokenVersion(sessionUser.tokenVersion)
        ? admin
        : null;
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-auth-security] platform session validation failed, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();
  const admin =
    state.platformAdmins.find(
      (entry) => entry.id === sessionUser.userId && entry.isActive
    ) ?? null;

  if (!admin) {
    return null;
  }

  return normalizeTokenVersion(admin.tokenVersion) ===
    normalizeTokenVersion(sessionUser.tokenVersion)
    ? admin
    : null;
}

export async function validateOrganizerAdminSessionUser(sessionUser, slug) {
  if (!sessionUser || sessionUser.type !== "organizer" || sessionUser.organizerSlug !== slug) {
    return null;
  }

  if (getStorageMode() === "database") {
    try {
      const prisma = getPrismaClient();
      const admin = await prisma.organizerAdminUser.findUnique({
        where: {
          id: sessionUser.userId
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          tokenVersion: true,
          organizer: {
            select: {
              id: true,
              slug: true
            }
          }
        }
      });

      if (!admin || !admin.isActive || admin.organizer.slug !== slug) {
        return null;
      }

      return normalizeTokenVersion(admin.tokenVersion) ===
        normalizeTokenVersion(sessionUser.tokenVersion)
        ? admin
        : null;
    } catch (error) {
      logDatabaseFallback(
        "[passreserve-auth-security] organizer session validation failed, falling back to file state",
        error
      );
    }
  }

  const state = await loadPersistentState();
  const admin =
    state.organizerAdmins.find(
      (entry) =>
        entry.id === sessionUser.userId &&
        entry.isActive &&
        entry.organizerId === sessionUser.organizerId
    ) ?? null;
  const organizer =
    state.organizers.find((entry) => entry.id === sessionUser.organizerId && entry.slug === slug) ??
    null;

  if (!admin || !organizer) {
    return null;
  }

  return normalizeTokenVersion(admin.tokenVersion) ===
    normalizeTokenVersion(sessionUser.tokenVersion)
    ? {
        ...admin,
        organizer
      }
    : null;
}
