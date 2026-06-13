import path from "node:path";

import { hasCompatibleDatabaseSchema } from "./passreserve-prisma.js";
import {
  decideStoragePolicy,
  isProtectedProductionRuntime
} from "./passreserve-storage-policy.js";

export const DEFAULT_LOCAL_PASSWORD = "Passreserve123!";
export const DEFAULT_PLATFORM_ADMIN_EMAIL = "admin@passreserve.local";
export const DEFAULT_PLATFORM_ADMIN_NAME = "Passreserve Admin";
export const SESSION_COOKIE_NAME = "passreserve_session";
export const HOLD_DURATION_MINUTES = 30;
export const PAYMENT_WINDOW_HOURS = 12;
export const SYSTEM_LOCK_ID = 482019;

function parsePositiveInteger(value, fallback, minimum = 1) {
  const normalized = Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isFinite(normalized) || normalized < minimum) {
    return fallback;
  }

  return normalized;
}

export function resolveSessionPassword(env = process.env) {
  const configuredSecret = env.SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (isProtectedProductionRuntime(env)) {
    throw new Error(
      "SESSION_SECRET is required in protected production runtimes. Refusing to start with an insecure fallback session secret."
    );
  }

  return "passreserve-local-session-secret-change-me";
}

export const SESSION_PASSWORD = resolveSessionPassword();

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getBaseUrl() {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (explicitBaseUrl) {
    return stripTrailingSlash(explicitBaseUrl);
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionUrl) {
    return `https://${stripTrailingSlash(productionUrl)}`;
  }

  const previewUrl = process.env.VERCEL_URL?.trim();

  if (previewUrl) {
    return `https://${stripTrailingSlash(previewUrl)}`;
  }

  return "http://localhost:3000";
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function hasResend() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.FROM_EMAIL?.trim());
}

export function hasStripeLive() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim()
  );
}

export function getDefaultCurrency() {
  return (process.env.STRIPE_CURRENCY_DEFAULT?.trim() || "eur").toUpperCase();
}

export function getStateFilePath() {
  if (process.env.PASSRESERVE_STATE_FILE?.trim()) {
    return process.env.PASSRESERVE_STATE_FILE.trim();
  }

  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "passreserve-state.json");
  }

  return path.join(process.cwd(), ".runtime-data", "passreserve-state.json");
}

export function getBootstrapPlatformAdmin() {
  return {
    email:
      process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() ||
      DEFAULT_PLATFORM_ADMIN_EMAIL,
    password: process.env.PLATFORM_ADMIN_PASSWORD?.trim() || DEFAULT_LOCAL_PASSWORD,
    name: process.env.PLATFORM_ADMIN_NAME?.trim() || DEFAULT_PLATFORM_ADMIN_NAME
  };
}

export function getStorageMode() {
  return getStorageSummary().mode;
}

export function getStorageSummary() {
  return decideStoragePolicy({
    protectedProductionRuntime: isProtectedProductionRuntime(),
    databaseConfigured: hasDatabase(),
    databaseCompatible: hasCompatibleDatabaseSchema()
  });
}

export function getTechnicalAuditLogRetentionDays(env = process.env) {
  return parsePositiveInteger(env.PASSRESERVE_TECHNICAL_AUDIT_LOG_RETENTION_DAYS, 120, 7);
}
