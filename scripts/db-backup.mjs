import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import {
  DEFAULT_BACKUP_ROOT,
  DEFAULT_ENV_FILES,
  ensureBackupDirectories,
  formatTimestampSlug,
  listBackupRecords,
  loadWorkspaceEnv,
  pruneBackupRecords,
  readJsonGzip,
  resolveRepoRoot,
  sanitizeDatabaseUrl,
  selectBackupRecordsToKeep,
  sha256File,
  writeJsonFile,
  writeJsonGzip
} from "./passreserve-backup-utils.mjs";

const execFile = promisify(execFileCallback);

function parseArgs(argv) {
  const options = {
    outputDir: DEFAULT_BACKUP_ROOT,
    retainWeekly: 12,
    retainMonthly: 12,
    envFiles: DEFAULT_ENV_FILES
  };

  for (const argument of argv) {
    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument.startsWith("--output-dir=")) {
      options.outputDir = argument.slice("--output-dir=".length);
      continue;
    }

    if (argument.startsWith("--retain-weekly=")) {
      options.retainWeekly = Number(argument.slice("--retain-weekly=".length));
      continue;
    }

    if (argument.startsWith("--retain-monthly=")) {
      options.retainMonthly = Number(argument.slice("--retain-monthly=".length));
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
  console.log(`Usage: node scripts/db-backup.mjs [options]

Options:
  --output-dir=PATH        Backup root directory. Default: ${DEFAULT_BACKUP_ROOT}
  --retain-weekly=NUMBER   Keep this many newest weekly backups. Default: 12
  --retain-monthly=NUMBER  Keep one older backup per month for this many months. Default: 12
  --env-file=a,b,c         Comma-separated env files to load before connecting
  --help                   Show this message
`);
}

async function getGitRevision(cwd) {
  try {
    const [branch, commit] = await Promise.all([
      execFile("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd }),
      execFile("git", ["rev-parse", "HEAD"], { cwd })
    ]);

    return {
      branch: branch.stdout.trim(),
      commit: commit.stdout.trim()
    };
  } catch {
    return {
      branch: "unknown",
      commit: "unknown"
    };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const repoRoot = resolveRepoRoot();
  process.chdir(repoRoot);

  const loadedEnvFiles = await loadWorkspaceEnv({
    cwd: repoRoot,
    envFiles: options.envFiles
  });

  const { getResolvedDatabaseUrl, getPrismaClient } = await import("../lib/passreserve-prisma.js");
  const {
    readPrismaState,
    summarizePersistentStateSnapshot
  } = await import("../lib/passreserve-state.js");

  const databaseUrl = process.env.PASSRESERVE_BACKUP_DATABASE_URL?.trim() || getResolvedDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "No database URL found for backup. Set PASSRESERVE_BACKUP_DATABASE_URL or DATABASE_URL in a loaded env file."
    );
  }

  const startedAt = new Date();
  const backupId = `passreserve-state-${formatTimestampSlug(startedAt)}`;
  const backupRoot = path.resolve(repoRoot, options.outputDir);
  const directories = await ensureBackupDirectories(backupRoot);
  const archiveRelativePath = path.join("archives", `${backupId}.json.gz`);
  const metadataRelativePath = path.join("metadata", `${backupId}.json`);
  const logRelativePath = path.join("logs", `${backupId}.log`);
  const archivePath = path.join(backupRoot, archiveRelativePath);
  const metadataPath = path.join(backupRoot, metadataRelativePath);
  const logPath = path.join(backupRoot, logRelativePath);
  const logLines = [];
  const log = (message) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    logLines.push(line);
    console.log(line);
  };

  log(`Starting Passreserve backup ${backupId}`);
  log(`Loaded env files: ${loadedEnvFiles.join(", ") || "none"}`);
  log(`Backing up from ${sanitizeDatabaseUrl(databaseUrl)}`);

  const prisma = getPrismaClient();
  const snapshot = await readPrismaState(prisma);
  const summary = summarizePersistentStateSnapshot(snapshot);
  const integrity = {
    hasSiteSettings: Boolean(snapshot.siteSettings),
    hasAboutPage: Boolean(snapshot.aboutPage),
    hasOrganizers: summary.organizerCount > 0
  };

  if (!integrity.hasSiteSettings || !integrity.hasAboutPage || !integrity.hasOrganizers) {
    log(
      "Warning: snapshot was created, but critical runtime rows are missing. Keep this backup for forensics and investigate production state."
    );
  }

  await writeJsonGzip(archivePath, snapshot);
  const roundTrip = await readJsonGzip(archivePath);
  const archiveStats = await fs.stat(archivePath);
  const checksumSha256 = await sha256File(archivePath);
  const gitRevision = await getGitRevision(repoRoot);
  const finishedAt = new Date();
  const metadata = {
    id: backupId,
    kind: "passreserve-state-snapshot",
    createdAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    archivePath: archiveRelativePath,
    metadataPath: metadataRelativePath,
    logPath: logRelativePath,
    checksumSha256,
    sizeBytes: archiveStats.size,
    summary,
    integrity,
    environment: {
      loadedEnvFiles,
      databaseUrl: sanitizeDatabaseUrl(databaseUrl),
      schema: "passreserve",
      host: os.hostname(),
      gitBranch: gitRevision.branch,
      gitCommit: gitRevision.commit
    },
    retention: {
      retainWeekly: options.retainWeekly,
      retainMonthly: options.retainMonthly
    },
    verification: {
      parseRoundTripSucceeded: Boolean(roundTrip?.version === snapshot.version)
    }
  };

  await writeJsonFile(metadataPath, metadata);

  const records = await listBackupRecords(backupRoot);
  const keepIds = selectBackupRecordsToKeep(records, {
    retainWeekly: options.retainWeekly,
    retainMonthly: options.retainMonthly
  });
  const removedIds = await pruneBackupRecords(records, keepIds, log);

  await writeJsonFile(path.join(directories.metadata, "latest.json"), metadata);

  log(`Backup archive written to ${archiveRelativePath}`);
  log(`Snapshot counts: ${JSON.stringify(summary)}`);
  log(`SHA256: ${checksumSha256}`);
  log(
    removedIds.length
      ? `Pruned old backups: ${removedIds.join(", ")}`
      : "No old backups needed pruning."
  );

  await fs.writeFile(logPath, `${logLines.join("\n")}\n`, "utf8");
}

main().catch((error) => {
  console.error("[db-backup] Backup failed.", {
    message: error?.message ?? String(error)
  });
  process.exitCode = 1;
});
