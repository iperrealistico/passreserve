export function isProtectedProductionRuntime(env = process.env) {
  return env.VERCEL === "1" && env.VERCEL_ENV === "production";
}

export function decideStoragePolicy({
  protectedProductionRuntime,
  databaseConfigured,
  databaseCompatible
}) {
  if (protectedProductionRuntime) {
    if (databaseConfigured && databaseCompatible) {
      return {
        mode: "database",
        label: "Postgres + Prisma",
        detail:
          "This production runtime is using PostgreSQL through Prisma as the system of record.",
        isHealthy: true,
        failClosed: true
      };
    }

    if (databaseConfigured) {
      return {
        mode: "database",
        label: "Production database required",
        detail:
          "The configured production database is unavailable or not aligned with the current Passreserve schema. Production is fail-closed and will not fall back to the file store.",
        isHealthy: false,
        failClosed: true
      };
    }

    return {
      mode: "database",
      label: "Production database missing",
      detail:
        "DATABASE_URL is missing in production. Production is fail-closed and will not fall back to the file store.",
      isHealthy: false,
      failClosed: true
    };
  }

  if (databaseConfigured && databaseCompatible) {
    return {
      mode: "database",
      label: "Postgres + Prisma",
      detail: "This environment is using PostgreSQL through Prisma as the system of record.",
      isHealthy: true,
      failClosed: false
    };
  }

  if (databaseConfigured) {
    return {
      mode: "file",
      label: "Runtime file store",
      detail:
        "This runtime is serving from the file store right now because the configured database is not yet aligned with the current Passreserve schema.",
      isHealthy: false,
      failClosed: false
    };
  }

  return {
    mode: "file",
    label: "Runtime file store",
    detail:
      process.env.VERCEL === "1"
        ? "This environment is using an ephemeral runtime file store. It is useful for previews, but production still needs PostgreSQL."
        : "This environment is using a local runtime file store. It is durable on this machine and ideal for development and smoke checks.",
    isHealthy: true,
    failClosed: false
  };
}
