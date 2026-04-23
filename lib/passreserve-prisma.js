import { PrismaClient } from "@prisma/client";

let prisma;
let schemaCompatibilityState = "unknown";
let loggedSchemaFallback = false;

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
