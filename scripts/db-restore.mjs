import path from "node:path";

import {
  DEFAULT_BACKUP_ROOT,
  DEFAULT_ENV_FILES,
  loadWorkspaceEnv,
  readJsonGzip,
  resolveRepoRoot
} from "./passreserve-backup-utils.mjs";

function parseArgs(argv) {
  const options = {
    backupRoot: DEFAULT_BACKUP_ROOT,
    envFiles: DEFAULT_ENV_FILES,
    yes: false,
    allowSameDatabase: false
  };

  for (const argument of argv) {
    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--yes") {
      options.yes = true;
      continue;
    }

    if (argument === "--allow-same-database") {
      options.allowSameDatabase = true;
      continue;
    }

    if (argument.startsWith("--file=")) {
      options.file = argument.slice("--file=".length);
      continue;
    }

    if (argument.startsWith("--backup-root=")) {
      options.backupRoot = argument.slice("--backup-root=".length);
      continue;
    }

    if (argument.startsWith("--env-file=")) {
      options.envFiles = argument
        .slice("--env-file=".length)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/db-restore.mjs --file=PATH [options]

Options:
  --file=PATH              Path to a backup archive (.json.gz)
  --backup-root=PATH       Default root used for relative archive paths. Default: ${DEFAULT_BACKUP_ROOT}
  --env-file=a,b,c         Comma-separated env files to load before connecting
  --yes                    Required acknowledgement for restore execution
  --allow-same-database    Allow restoring into the same DATABASE_URL loaded for the app
  --help                   Show this message

Environment:
  PASSRESERVE_RESTORE_DATABASE_URL or RESTORE_DATABASE_URL can override DATABASE_URL
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.file) {
    throw new Error("Missing --file=PATH");
  }

  if (!options.yes) {
    throw new Error("Restore refused. Re-run with --yes after confirming the target database.");
  }

  const repoRoot = resolveRepoRoot();
  process.chdir(repoRoot);

  await loadWorkspaceEnv({
    cwd: repoRoot,
    envFiles: options.envFiles
  });

  const { getResolvedDatabaseUrl, getPrismaClient } = await import("../lib/passreserve-prisma.js");
  const { restorePrismaStateSnapshot } = await import("../lib/passreserve-state.js");

  const sourceDatabaseUrl = getResolvedDatabaseUrl();
  const targetDatabaseUrl =
    process.env.PASSRESERVE_RESTORE_DATABASE_URL?.trim() ||
    process.env.RESTORE_DATABASE_URL?.trim() ||
    sourceDatabaseUrl;

  if (!targetDatabaseUrl) {
    throw new Error(
      "No restore target database URL found. Set PASSRESERVE_RESTORE_DATABASE_URL, RESTORE_DATABASE_URL, or DATABASE_URL."
    );
  }

  if (!options.allowSameDatabase && targetDatabaseUrl === sourceDatabaseUrl) {
    throw new Error(
      "Restore target matches the currently loaded DATABASE_URL. Refusing to restore into the primary database without --allow-same-database."
    );
  }

  process.env.DATABASE_URL = targetDatabaseUrl;

  const archivePath = path.isAbsolute(options.file)
    ? options.file
    : path.resolve(repoRoot, options.file.startsWith(".") ? options.file : path.join(options.backupRoot, options.file));
  const snapshot = await readJsonGzip(archivePath);
  const prisma = getPrismaClient();
  const summary = await restorePrismaStateSnapshot(prisma, snapshot);

  console.log("[db-restore] Restore completed.", {
    archivePath,
    summary
  });
}

main().catch((error) => {
  console.error("[db-restore] Restore failed.", {
    message: error?.message ?? String(error)
  });
  process.exitCode = 1;
});
