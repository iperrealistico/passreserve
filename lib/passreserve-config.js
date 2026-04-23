import path from "node:path";

import { hasCompatibleDatabaseSchema } from "./passreserve-prisma.js";

export const DEFAULT_LOCAL_PASSWORD = "Passreserve123!";
export const DEFAULT_PLATFORM_ADMIN_EMAIL = "admin@passreserve.local";
export const DEFAULT_PLATFORM_ADMIN_NAME = "Passreserve Admin";
export const SESSION_COOKIE_NAME = "passreserve_session";
export const SESSION_PASSWORD =
  process.env.SESSION_SECRET?.trim() || "passreserve-local-session-secret-change-me";
export const HOLD_DURATION_MINUTES = 30;
export const PAYMENT_WINDOW_HOURS = 12;
export const SYSTEM_LOCK_ID = 482019;

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
  return hasDatabase() && hasCompatibleDatabaseSchema() ? "database" : "file";
}

export function getStorageSummary() {
  const mode = getStorageMode();

  if (mode === "database") {
    return {
      mode,
      label: "Postgres + Prisma",
      detail: "This environment is using PostgreSQL through Prisma as the system of record."
    };
  }

  if (hasDatabase()) {
    return {
      mode,
      label: "Runtime file store",
      detail:
        "This runtime is serving from the file store right now because the configured database is not yet aligned with the current Passreserve schema."
    };
  }

  return {
    mode,
    label: "Runtime file store",
    detail:
      process.env.VERCEL === "1"
        ? "This environment is using an ephemeral runtime file store. It is useful for previews, but production still needs PostgreSQL."
        : "This environment is using a local runtime file store. It is durable on this machine and ideal for development and smoke checks."
  };
}
