import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import zlib from "node:zlib";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export const DEFAULT_BACKUP_ROOT = ".ops/backups/passreserve";
export const DEFAULT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.production.pulled",
  ".env.production.local",
  ".env.vercel.local",
  ".env.backup.local"
];

export function resolveRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function stripMatchingQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFileContents(source) {
  const entries = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value = stripMatchingQuotes(rawValue).replace(/\\n/g, "\n");

    if (key) {
      entries[key] = value;
    }
  }

  return entries;
}

export async function loadWorkspaceEnv({
  cwd = resolveRepoRoot(),
  envFiles = DEFAULT_ENV_FILES,
  target = process.env
} = {}) {
  const merged = {};
  const loadedFiles = [];

  for (const relativePath of envFiles) {
    const absolutePath = path.resolve(cwd, relativePath);

    try {
      const source = await fs.readFile(absolutePath, "utf8");
      Object.assign(merged, parseEnvFileContents(source));
      loadedFiles.push(relativePath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  for (const [key, value] of Object.entries(merged)) {
    if (!target[key]) {
      target[key] = value;
    }
  }

  return loadedFiles;
}

export function resolveBackupDirectories(root = DEFAULT_BACKUP_ROOT) {
  return {
    root,
    archives: path.join(root, "archives"),
    metadata: path.join(root, "metadata"),
    logs: path.join(root, "logs")
  };
}

export async function ensureBackupDirectories(root = DEFAULT_BACKUP_ROOT) {
  const directories = resolveBackupDirectories(root);

  await Promise.all(
    Object.values(directories).map((directory) =>
      fs.mkdir(directory, {
        recursive: true
      })
    )
  );

  return directories;
}

export function formatTimestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function sanitizeDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const schema = url.searchParams.get("schema");
    const safeUser = url.username ? "***" : "";
    const authPrefix = safeUser ? `${safeUser}@` : "";
    const schemaSuffix = schema ? `?schema=${schema}` : "";
    return `${url.protocol}//${authPrefix}${url.host}${url.pathname}${schemaSuffix}`;
  } catch {
    return "unparseable-database-url";
  }
}

export async function writeJsonGzip(filePath, value) {
  const serialized = JSON.stringify(value, null, 2);
  const compressed = await gzip(serialized, {
    level: 9
  });
  await fs.writeFile(filePath, compressed);
}

export async function readJsonGzip(filePath) {
  const compressed = await fs.readFile(filePath);
  const raw = await gunzip(compressed);
  return JSON.parse(raw.toString("utf8"));
}

export async function writeJsonFile(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function sha256File(filePath) {
  const contents = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(contents).digest("hex");
}

export async function listBackupRecords(root = DEFAULT_BACKUP_ROOT) {
  const directories = resolveBackupDirectories(root);
  try {
    const metadataFiles = await fs.readdir(directories.metadata);
    const records = [];

    for (const fileName of metadataFiles.sort()) {
      if (!fileName.endsWith(".json") || fileName === "latest.json") {
        continue;
      }

      const metadataPath = path.join(directories.metadata, fileName);
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
      const archivePath = path.join(root, metadata.archivePath);
      const logPath = metadata.logPath ? path.join(root, metadata.logPath) : null;

      records.push({
        id: metadata.id,
        createdAt: metadata.createdAt,
        archivePath,
        metadataPath,
        logPath,
        metadata
      });
    }

    return records.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function selectBackupRecordsToKeep(
  records,
  { retainWeekly = 12, retainMonthly = 12 } = {}
) {
  const keepIds = new Set();
  const sorted = [...records].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  for (const record of sorted.slice(0, Math.max(0, retainWeekly))) {
    keepIds.add(record.id);
  }

  const monthKeys = new Set();

  for (const record of sorted) {
    if (keepIds.has(record.id)) {
      continue;
    }

    const monthKey = String(record.createdAt).slice(0, 7);

    if (monthKeys.has(monthKey)) {
      continue;
    }

    keepIds.add(record.id);
    monthKeys.add(monthKey);

    if (monthKeys.size >= Math.max(0, retainMonthly)) {
      break;
    }
  }

  return keepIds;
}

export async function pruneBackupRecords(records, keepIds, logger = () => undefined) {
  const removedIds = [];

  for (const record of records) {
    if (keepIds.has(record.id)) {
      continue;
    }

    for (const filePath of [record.archivePath, record.metadataPath, record.logPath]) {
      if (!filePath) {
        continue;
      }

      try {
        await fs.rm(filePath, {
          force: true
        });
      } catch (error) {
        logger(`Could not remove ${filePath}: ${error.message}`);
      }
    }

    removedIds.push(record.id);
  }

  return removedIds;
}
