import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const REQUEST_TABLE = "organizer_signup_requests";
const FILE_STORE_PATH = path.join(
  process.cwd(),
  ".runtime-data",
  "organizer-signup-requests.json"
);

const STATUS_META = {
  PENDING: {
    label: "Needs reply",
    tone: "capacity-watch"
  },
  REPLIED: {
    label: "Replied",
    tone: "public"
  },
  ARCHIVED: {
    label: "Archived",
    tone: "unlisted"
  }
};

let poolPromise;

function getRequestFilePath() {
  return process.env.ORGANIZER_REQUESTS_FILE || FILE_STORE_PATH;
}

function canUseDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function canUseFileFallback() {
  return process.env.NODE_ENV === "test" || process.env.VERCEL !== "1";
}

function getStatusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.PENDING;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function toIsoString(value) {
  return new Date(value).toISOString();
}

function decorateRequest(request) {
  const status = request.status || "PENDING";
  const { label, tone } = getStatusMeta(status);

  return {
    ...request,
    status,
    statusLabel: label,
    statusTone: tone
  };
}

function mapRequestRow(row) {
  return decorateRequest({
    id: row.id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone || "",
    organizerName: row.organizer_name,
    city: row.city,
    launchWindow: row.launch_window,
    paymentModel: row.payment_model,
    eventFocus: row.event_focus,
    note: row.note || "",
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function createRequestRecord(input) {
  const now = new Date().toISOString();

  return decorateRequest({
    id: crypto.randomUUID(),
    contactName: normalizeText(input.contactName),
    contactEmail: normalizeText(input.contactEmail).toLowerCase(),
    contactPhone: normalizeText(input.contactPhone),
    organizerName: normalizeText(input.organizerName),
    city: normalizeText(input.city),
    launchWindow: normalizeText(input.launchWindow),
    paymentModel: normalizeText(input.paymentModel),
    eventFocus: normalizeText(input.eventFocus),
    note: normalizeText(input.note),
    status: "PENDING",
    createdAt: now,
    updatedAt: now
  });
}

async function getPool() {
  if (!canUseDatabase()) {
    return null;
  }

  if (!poolPromise) {
    poolPromise = import("pg").then(({ Pool }) => {
      return new Pool({
        connectionString: process.env.DATABASE_URL
      });
    });
  }

  return poolPromise;
}

async function ensureRequestTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${REQUEST_TABLE} (
      id TEXT PRIMARY KEY,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      organizer_name TEXT NOT NULL,
      city TEXT NOT NULL,
      launch_window TEXT NOT NULL,
      payment_model TEXT NOT NULL,
      event_focus TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT organizer_signup_requests_status_check
        CHECK (status IN ('PENDING', 'REPLIED', 'ARCHIVED'))
    )
  `);
}

async function withDatabase(callback) {
  const pool = await getPool();

  if (!pool) {
    return null;
  }

  const client = await pool.connect();

  try {
    await ensureRequestTable(client);
    return await callback(client);
  } finally {
    client.release();
  }
}

async function readRequestsFromFile() {
  const filePath = getRequestFilePath();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.map(decorateRequest) : [];
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeRequestsToFile(requests) {
  const filePath = getRequestFilePath();

  await fs.mkdir(path.dirname(filePath), {
    recursive: true
  });
  await fs.writeFile(filePath, JSON.stringify(requests, null, 2));
}

function buildStorageState(mode, detail) {
  return {
    mode,
    label:
      mode === "database"
        ? "Database inbox"
        : mode === "file"
          ? "Local inbox"
          : "Unavailable",
    detail
  };
}

function buildNotificationResult(mode, detail) {
  return {
    mode,
    label:
      mode === "email"
        ? "Email sent"
        : mode === "log"
          ? "Logged locally"
          : "Delivery unavailable",
    detail
  };
}

function shouldSendEmail() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.FROM_EMAIL?.trim());
}

async function postResendEmail(payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Resend request failed (${response.status}): ${text}`);
  }
}

function renderAcknowledgementEmail(request) {
  return `
    <h1>Thanks for reaching out to Passreserve.com</h1>
    <p>Hi ${request.contactName},</p>
    <p>We received your request for <strong>${request.organizerName}</strong> in ${request.city}.</p>
    <p>We’ll review your launch window, payment setup, and event focus, then reply with the next step.</p>
    <ul>
      <li><strong>Launch window:</strong> ${request.launchWindow}</li>
      <li><strong>Payment setup:</strong> ${request.paymentModel}</li>
      <li><strong>What you host:</strong> ${request.eventFocus}</li>
    </ul>
    <p>Reply to this email if you want to add more detail before we get back to you.</p>
  `;
}

function renderNotificationEmail(request) {
  return `
    <h1>New organizer request</h1>
    <p><strong>Organizer:</strong> ${request.organizerName}</p>
    <p><strong>Contact:</strong> ${request.contactName} · ${request.contactEmail}</p>
    <p><strong>Phone:</strong> ${request.contactPhone || "Not provided"}</p>
    <p><strong>City:</strong> ${request.city}</p>
    <p><strong>Launch window:</strong> ${request.launchWindow}</p>
    <p><strong>Payment setup:</strong> ${request.paymentModel}</p>
    <p><strong>What they host:</strong> ${request.eventFocus}</p>
    <p><strong>Notes:</strong> ${request.note || "No extra notes."}</p>
    <p><strong>Request ID:</strong> ${request.id}</p>
  `;
}

async function notifyOrganizerRequest(request) {
  const launchInbox =
    process.env.ORGANIZER_REQUESTS_NOTIFY_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    "launch@passreserve.com";

  if (!shouldSendEmail()) {
    console.info("[organizer-request] stored request", {
      id: request.id,
      organizerName: request.organizerName,
      contactEmail: request.contactEmail,
      launchInbox
    });

    return buildNotificationResult(
      "log",
      "No live email credentials were configured, so the request was logged locally for follow-up."
    );
  }

  await Promise.all([
    postResendEmail({
      from: process.env.FROM_EMAIL,
      to: request.contactEmail,
      reply_to: launchInbox,
      subject: "We received your Passreserve organizer request",
      html: renderAcknowledgementEmail(request)
    }),
    postResendEmail({
      from: process.env.FROM_EMAIL,
      to: launchInbox,
      reply_to: request.contactEmail,
      subject: `New organizer request: ${request.organizerName}`,
      html: renderNotificationEmail(request)
    })
  ]);

  return buildNotificationResult(
    "email",
    `Acknowledgement and launch-inbox emails were sent for ${request.organizerName}.`
  );
}

async function listFromDatabase() {
  const rows = await withDatabase(async (client) => {
    const result = await client.query(`
      SELECT
        id,
        contact_name,
        contact_email,
        contact_phone,
        organizer_name,
        city,
        launch_window,
        payment_model,
        event_focus,
        note,
        status,
        created_at,
        updated_at
      FROM ${REQUEST_TABLE}
      ORDER BY created_at DESC
    `);

    return result.rows;
  });

  return rows ? rows.map(mapRequestRow) : null;
}

async function insertIntoDatabase(request) {
  const inserted = await withDatabase(async (client) => {
    const result = await client.query(
      `
        INSERT INTO ${REQUEST_TABLE} (
          id,
          contact_name,
          contact_email,
          contact_phone,
          organizer_name,
          city,
          launch_window,
          payment_model,
          event_focus,
          note,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING
          id,
          contact_name,
          contact_email,
          contact_phone,
          organizer_name,
          city,
          launch_window,
          payment_model,
          event_focus,
          note,
          status,
          created_at,
          updated_at
      `,
      [
        request.id,
        request.contactName,
        request.contactEmail,
        request.contactPhone || null,
        request.organizerName,
        request.city,
        request.launchWindow,
        request.paymentModel,
        request.eventFocus,
        request.note || null,
        request.status,
        request.createdAt,
        request.updatedAt
      ]
    );

    return mapRequestRow(result.rows[0]);
  });

  return inserted;
}

export async function getOrganizerRequestStorageState() {
  if (canUseDatabase()) {
    try {
      await withDatabase(async () => true);

      return buildStorageState(
        "database",
        "Organizer requests are stored in the configured database and stay visible in the team inbox."
      );
    } catch (error) {
      if (!canUseFileFallback()) {
        return buildStorageState(
          "unavailable",
          "The configured database could not be reached, so organizer requests cannot be accepted until storage is restored."
        );
      }

      console.error("[organizer-request] database unavailable, falling back to local file", error);
    }
  }

  if (canUseFileFallback()) {
    return buildStorageState(
      "file",
      "Organizer requests are stored in a local JSON inbox for this environment."
    );
  }

  return buildStorageState(
    "unavailable",
    "No durable organizer-request storage is configured for this environment."
  );
}

export async function listOrganizerRequests() {
  if (canUseDatabase()) {
    try {
      const databaseRequests = await listFromDatabase();

      if (databaseRequests) {
        return databaseRequests;
      }
    } catch (error) {
      if (!canUseFileFallback()) {
        throw error;
      }

      console.error("[organizer-request] could not read database inbox", error);
    }
  }

  if (!canUseFileFallback()) {
    return [];
  }

  return readRequestsFromFile();
}

export async function submitOrganizerRequest(input) {
  const request = createRequestRecord(input);
  const storage = await getOrganizerRequestStorageState();

  if (storage.mode === "unavailable") {
    return {
      ok: false,
      message:
        "Organizer requests are temporarily unavailable in this environment. Please email launch@passreserve.com instead."
    };
  }

  try {
    let storedRequest = request;

    if (storage.mode === "database") {
      storedRequest = await insertIntoDatabase(request);
    } else {
      const current = await readRequestsFromFile();
      await writeRequestsToFile([storedRequest, ...current]);
    }

    const notifications = await notifyOrganizerRequest(storedRequest);

    return {
      ok: true,
      request: storedRequest,
      storage,
      notifications
    };
  } catch (error) {
    console.error("[organizer-request] submit failed", error);

    return {
      ok: false,
      message:
        "We couldn’t save this organizer request right now. Please try again in a moment or email launch@passreserve.com."
    };
  }
}
