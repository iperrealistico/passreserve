import { PrismaClient } from "@prisma/client";

import { isProtectedProductionRuntime } from "./passreserve-storage-policy.js";

let prisma;
let schemaCompatibilityState = "unknown";
let loggedSchemaFallback = false;
const DATABASE_URL_FALLBACK_KEYS = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING"
];
const DEFAULT_PASSRESERVE_SCHEMA = "passreserve";

export class ProductionDatabaseFallbackError extends Error {
  constructor(message, error) {
    super(
      `${message} Production is configured to fail closed instead of falling back to the file store.`
    );
    this.name = "ProductionDatabaseFallbackError";
    this.cause = error;
    this.originalCode = error?.code ?? null;
  }
}

function normalizeFallbackDatabaseUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (!url.searchParams.get("schema")) {
      url.searchParams.set("schema", DEFAULT_PASSRESERVE_SCHEMA);
    }

    return url.toString();
  } catch {
    return value;
  }
}

export function getResolvedDatabaseUrl() {
  const directDatabaseUrl = process.env.DATABASE_URL?.trim();

  if (directDatabaseUrl) {
    return directDatabaseUrl;
  }

  for (const key of DATABASE_URL_FALLBACK_KEYS) {
    const fallbackUrl = process.env[key]?.trim();

    if (fallbackUrl) {
      return normalizeFallbackDatabaseUrl(fallbackUrl);
    }
  }

  return "";
}

const resolvedDatabaseUrl = getResolvedDatabaseUrl();

if (resolvedDatabaseUrl && process.env.DATABASE_URL?.trim() !== resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}

export function hasCompatibleDatabaseSchema() {
  return schemaCompatibilityState !== "incompatible";
}

export function isDatabaseSchemaError(error) {
  return error?.code === "P2021" || error?.code === "P2022";
}

export function markDatabaseSchemaCompatibility(error) {
  if (isDatabaseSchemaError(error)) {
    schemaCompatibilityState = "incompatible";
  }
}

export function logDatabaseFallback(message, error) {
  markDatabaseSchemaCompatibility(error);

  if (error instanceof ProductionDatabaseFallbackError) {
    throw error;
  }

  if (isProtectedProductionRuntime()) {
    console.error(
      `${message} Production is configured to fail closed instead of using the file store.`,
      {
        code: error?.code ?? null,
        modelName: error?.meta?.modelName ?? null,
        column: error?.meta?.column ?? null
      }
    );
    throw new ProductionDatabaseFallbackError(message, error);
  }

  if (isDatabaseSchemaError(error)) {
    if (!loggedSchemaFallback) {
      loggedSchemaFallback = true;
      console.warn(`${message} Incompatible schema detected; using the file store instead.`, {
        code: error.code,
        modelName: error?.meta?.modelName ?? null,
        column: error?.meta?.column ?? null
      });
    }

    return;
  }

  console.error(message, error);
}
