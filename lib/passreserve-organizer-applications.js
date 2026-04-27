import bcrypt from "bcryptjs";

import { getBaseUrl } from "./passreserve-config.js";
import { buildEmailDeliveryDedupeKey, sendStateTemplateEmail } from "./passreserve-email-delivery.js";
import { addHours, createToken, normalizeEmail, normalizeText, slugify } from "./passreserve-format.js";
import { loadPersistentState, mutatePersistentState } from "./passreserve-state.js";

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function buildUniqueSlug(existingValues, rawValue, fallbackPrefix = "organizer") {
  const normalizedBase = slugify(rawValue) || `${fallbackPrefix}-${createToken().slice(0, 6)}`;
  const used = new Set(ensureArray(existingValues).map((entry) => String(entry || "").trim()).filter(Boolean));

  if (!used.has(normalizedBase)) {
    return normalizedBase;
  }

  let counter = 2;

  while (counter < 10_000) {
    const suffix = `-${counter}`;
    const candidate = `${normalizedBase.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;

    if (!used.has(candidate)) {
      return candidate;
    }

    counter += 1;
  }

  return `${fallbackPrefix}-${createToken().slice(0, 8)}`;
}

function parseVenuesText(value) {
  return normalizeText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", detail = "", mapHref = ""] = line.split("|").map((entry) => entry.trim());

      return {
        title,
        detail,
        mapHref
      };
    })
    .filter((venue) => venue.title || venue.detail || venue.mapHref);
}

function buildPrimaryVenue(input) {
  const primary = {
    title: normalizeText(input.venueTitle) || `${normalizeText(input.city) || "Organizer"} venue`,
    detail:
      normalizeText(input.venueDetail) ||
      "Update the organizer venue details from the organizer dashboard.",
    mapHref: normalizeText(input.venueMapHref)
  };
  const additional = parseVenuesText(input.venuesText);

  return {
    primary,
    venues: [primary, ...additional].filter((venue) => venue.title || venue.detail || venue.mapHref)
  };
}

function findOrganizerAdminByEmail(state, email) {
  const normalized = normalizeEmail(email);

  return (
    ensureArray(state.organizerAdmins).find(
      (entry) => normalizeEmail(entry.email) === normalized && entry.isActive !== false
    ) || null
  );
}

function findOrganizerById(state, organizerId) {
  return ensureArray(state.organizers).find((entry) => entry.id === organizerId) || null;
}

function getPrimaryOrganizerAdmin(state, organizerId) {
  return (
    ensureArray(state.organizerAdmins).find(
      (entry) => entry.organizerId === organizerId && entry.isPrimary && entry.isActive !== false
    ) ||
    ensureArray(state.organizerAdmins).find(
      (entry) => entry.organizerId === organizerId && entry.isActive !== false
    ) ||
    null
  );
}

function appendAuditLog(draft, input) {
  draft.auditLogs.unshift({
    id: createToken(),
    createdAt: input.createdAt || new Date().toISOString(),
    actorType: input.actorType,
    actorId: input.actorId || null,
    organizerId: input.organizerId || null,
    registrationId: null,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId || null,
    message: input.message,
    metadata: input.metadata || null
  });
}

function buildProvisioningStatusLabel(status) {
  switch (status) {
    case "PROVISIONED":
      return "Provisioned";
    case "DUPLICATE":
      return "Duplicate email";
    case "EMAIL_FAILED":
      return "Access email failed";
    default:
      return "Pending";
  }
}

function buildOrganizerAccessReplacements(organizer, admin) {
  const resetUrl = `${getBaseUrl()}/${organizer.slug}/admin/login/reset/${admin.passwordResetToken}`;
  const loginUrl = `${getBaseUrl()}/${organizer.slug}/admin/login`;

  return {
    "{{organizer_name}}": organizer.name,
    "{{admin_name}}": admin.name,
    "{{admin_email}}": admin.email,
    "{{login_url}}": loginUrl,
    "{{reset_url}}": resetUrl,
    "{{public_slug}}": organizer.publicSlug
  };
}

function getAdminNotificationTarget(state) {
  return (
    normalizeEmail(state.siteSettings?.adminNotifications) ||
    normalizeEmail(process.env.PLATFORM_ADMIN_EMAIL) ||
    normalizeEmail(state.siteSettings?.platformEmail) ||
    normalizeEmail(state.siteSettings?.launchInbox)
  );
}

async function sendOrganizerAccessInvitation(draft, application, organizer, admin) {
  return sendStateTemplateEmail(draft, {
    templateSlug: "organizer_access_invitation",
    to: admin.email,
    organizerId: organizer.id,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "organizer_access_invitation",
      application.id,
      Number(application.accessEmailSendCount || 0) + 1
    ),
    replacements: buildOrganizerAccessReplacements(organizer, admin),
    metadata: {
      applicationId: application.id,
      organizerSlug: organizer.slug,
      publicSlug: organizer.publicSlug
    }
  });
}

async function sendOrganizerApplicationAlert(draft, application, organizer = null) {
  const target = getAdminNotificationTarget(draft);

  if (!target) {
    return {
      ok: false,
      skipped: true
    };
  }

  return sendStateTemplateEmail(draft, {
    templateSlug: "organizer_application_alert",
    to: target,
    organizerId: organizer?.id || application.organizerId || null,
    dedupeKey: buildEmailDeliveryDedupeKey(
      "organizer_application_alert",
      application.id,
      Number(application.accessEmailSendCount || 0),
      application.provisioningStatus
    ),
    replacements: {
      "{{organizer_name}}": application.organizerName,
      "{{contact_name}}": application.contactName,
      "{{contact_email}}": application.contactEmail,
      "{{city}}": application.city,
      "{{event_focus}}": application.eventFocus,
      "{{provisioning_status}}": buildProvisioningStatusLabel(application.provisioningStatus),
      "{{public_slug}}": organizer?.publicSlug || application.requestedPublicSlug || ""
    },
    metadata: {
      applicationId: application.id,
      provisioningStatus: application.provisioningStatus
    }
  });
}

async function createOrganizerAdminRecord(organizer, adminEmail, adminName) {
  const randomPassword = createToken();
  const now = new Date().toISOString();

  return {
    id: createToken(),
    organizerId: organizer.id,
    email: normalizeEmail(adminEmail),
    name: normalizeText(adminName) || `${organizer.name} Admin`,
    passwordHash: await bcrypt.hash(randomPassword, 10),
    tokenVersion: 0,
    isPrimary: true,
    isActive: true,
    passwordResetToken: createToken(),
    passwordResetExpires: addHours(now, 24),
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function buildOrganizerRecord(state, input) {
  const internalSlug = buildUniqueSlug(
    ensureArray(state.organizers).map((organizer) => organizer.slug),
    input.slug || input.name,
    "organizer"
  );
  const publicSlug = buildUniqueSlug(
    ensureArray(state.organizers).map((organizer) => organizer.publicSlug || organizer.slug),
    input.publicSlug || input.slug || input.name,
    "host"
  );
  const { primary, venues } = buildPrimaryVenue(input);
  const now = new Date().toISOString();

  return {
    id: createToken(),
    slug: internalSlug,
    publicSlug,
    name: normalizeText(input.name),
    contentI18n: null,
    status: "ACTIVE",
    publicationState: "PRIVATE",
    publishedAt: null,
    description: normalizeText(input.description || input.eventFocus),
    tagline:
      normalizeText(input.tagline) ||
      `${normalizeText(input.name)} on Passreserve`,
    city: normalizeText(input.city),
    region: normalizeText(input.region) || "Italy",
    timeZone: "Europe/Rome",
    publicEmail: normalizeEmail(input.publicEmail || input.contactEmail),
    publicPhone: normalizeText(input.publicPhone || input.contactPhone),
    venueTitle: primary.title,
    venueDetail: primary.detail,
    venueMapHref: primary.mapHref,
    venues,
    interestEmail: normalizeEmail(input.contactEmail || input.publicEmail),
    themeTags: [],
    policies: [],
    faq: [],
    photoStory: [],
    imageUrl: null,
    minAdvanceHours: 0,
    maxAdvanceDays: null,
    registrationRemindersEnabled: false,
    registrationReminderLeadHours: 24,
    registrationReminderNote: "",
    stripeAccountId: null,
    stripeConnectionStatus: "NOT_CONNECTED",
    stripeDetailsSubmitted: false,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeConnectedAt: null,
    stripeLastSyncedAt: null,
    onlinePaymentsMonthlyFeeCents: 0,
    onlinePaymentsBillingStatus: "NOT_REQUIRED",
    onlinePaymentsBillingActivatedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function buildApplicationRecord(input, organizer = null) {
  const now = new Date().toISOString();

  return {
    id: createToken(),
    status: "PENDING",
    provisioningStatus: "PENDING",
    contactName: normalizeText(input.contactName),
    contactEmail: normalizeEmail(input.contactEmail),
    contactPhone: normalizeText(input.contactPhone),
    organizerName: normalizeText(input.organizerName || input.name),
    requestedPublicSlug: normalizeText(input.requestedPublicSlug || input.publicSlug || ""),
    city: normalizeText(input.city),
    launchWindow: normalizeText(input.launchWindow),
    paymentModel: normalizeText(input.paymentModel),
    eventFocus: normalizeText(input.eventFocus || input.description),
    note: normalizeText(input.note),
    approvedAt: null,
    provisionedAt: null,
    approvedById: null,
    organizerId: organizer?.id || null,
    accessEmailSentAt: null,
    accessEmailSendCount: 0,
    accessEmailLastError: "",
    createdAt: now,
    updatedAt: now
  };
}

function decorateApplication(application, state) {
  const organizer = application.organizerId ? findOrganizerById(state, application.organizerId) : null;

  return {
    ...application,
    organizer,
    provisioningStatusLabel: buildProvisioningStatusLabel(application.provisioningStatus),
    provisioningStatusTone:
      application.provisioningStatus === "PROVISIONED"
        ? "public"
        : application.provisioningStatus === "DUPLICATE"
          ? "unlisted"
          : application.provisioningStatus === "EMAIL_FAILED"
            ? "capacity-watch"
            : "draft"
  };
}

async function provisionApplicationInDraft(draft, input, actorId = null) {
  const normalizedEmail = normalizeEmail(input.contactEmail || input.adminEmail);
  const existingAdmin = findOrganizerAdminByEmail(draft, normalizedEmail);
  const application = buildApplicationRecord(input);

  draft.joinRequests.unshift(application);

  if (existingAdmin) {
    const existingOrganizer = findOrganizerById(draft, existingAdmin.organizerId);

    application.organizerId = existingOrganizer?.id || null;
    application.provisioningStatus = "DUPLICATE";
    application.accessEmailLastError = "An organizer admin with this email already exists.";
    application.updatedAt = new Date().toISOString();

    await sendOrganizerApplicationAlert(draft, application, existingOrganizer);
    appendAuditLog(draft, {
      actorType: actorId ? "PLATFORM_ADMIN" : "SYSTEM",
      actorId,
      organizerId: existingOrganizer?.id || null,
      eventType: "organizer_application_duplicate",
      entityType: "organizer_join_request",
      entityId: application.id,
      message: `Stored duplicate organizer application for ${application.contactEmail}.`
    });

    return {
      application,
      organizer: existingOrganizer,
      duplicate: true
    };
  }

  const organizer = buildOrganizerRecord(draft, {
    ...input,
    name: input.organizerName || input.name
  });
  const admin = await createOrganizerAdminRecord(
    organizer,
    input.adminEmail || input.contactEmail,
    input.adminName || input.contactName
  );

  draft.organizers.push(organizer);
  draft.organizerAdmins.push(admin);

  application.organizerId = organizer.id;
  application.requestedPublicSlug = organizer.publicSlug;
  application.status = "APPROVED";
  application.approvedAt = new Date().toISOString();
  application.provisionedAt = application.approvedAt;
  application.updatedAt = application.approvedAt;

  const accessEmailResult = await sendOrganizerAccessInvitation(draft, application, organizer, admin);

  application.accessEmailSendCount = Number(application.accessEmailSendCount || 0) + 1;
  application.accessEmailSentAt = accessEmailResult.ok ? application.approvedAt : null;
  application.accessEmailLastError = accessEmailResult.ok
    ? ""
    : "The first-access email could not be delivered through Resend.";
  application.provisioningStatus = accessEmailResult.ok ? "PROVISIONED" : "EMAIL_FAILED";

  await sendOrganizerApplicationAlert(draft, application, organizer);

  appendAuditLog(draft, {
    actorType: actorId ? "PLATFORM_ADMIN" : "SYSTEM",
    actorId,
    organizerId: organizer.id,
    eventType: "organizer_application_provisioned",
    entityType: "organizer_join_request",
    entityId: application.id,
    message: `Provisioned organizer ${organizer.name} from an organizer application.`,
    metadata: {
      accessEmailSent: accessEmailResult.ok,
      publicSlug: organizer.publicSlug
    }
  });

  return {
    application,
    organizer,
    admin,
    duplicate: false
  };
}

export async function submitOrganizerApplication(input) {
  return mutatePersistentState(async (draft) => {
    const result = await provisionApplicationInDraft(draft, input);

    return {
      ok: true,
      application: result.application,
      organizer: result.organizer,
      duplicate: result.duplicate
    };
  });
}

export async function createOrganizerAccountFromPlatform(input, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const result = await provisionApplicationInDraft(
      draft,
      {
        ...input,
        organizerName: input.name,
        contactName: input.adminName || input.name,
        contactEmail: input.adminEmail,
        contactPhone: input.publicPhone,
        eventFocus: input.description,
        launchWindow: "Created by platform admin",
        paymentModel: "Configured later",
        note: "Manual organizer creation from platform admin."
      },
      actorId
    );

    if (result.duplicate) {
      throw new Error("An organizer admin with this email already exists.");
    }

    return {
      organizer: result.organizer,
      application: result.application
    };
  });
}

export async function listOrganizerApplications() {
  const state = await loadPersistentState();

  return ensureArray(state.joinRequests)
    .slice()
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .map((application) => decorateApplication(application, state));
}

export async function resendOrganizerApplicationAccess(applicationId, actorId = null) {
  return mutatePersistentState(async (draft) => {
    const application = ensureArray(draft.joinRequests).find((entry) => entry.id === applicationId) || null;

    if (!application?.organizerId) {
      return {
        ok: false,
        message: "This application is not linked to a provisioned organizer."
      };
    }

    const organizer = findOrganizerById(draft, application.organizerId);
    const admin = organizer ? getPrimaryOrganizerAdmin(draft, organizer.id) : null;

    if (!organizer || !admin) {
      return {
        ok: false,
        message: "The linked organizer admin account could not be found."
      };
    }

    const now = new Date().toISOString();
    admin.passwordResetToken = createToken();
    admin.passwordResetExpires = addHours(now, 24);
    admin.updatedAt = now;

    const result = await sendOrganizerAccessInvitation(draft, application, organizer, admin);

    application.accessEmailSendCount = Number(application.accessEmailSendCount || 0) + 1;
    application.accessEmailSentAt = result.ok ? now : application.accessEmailSentAt;
    application.accessEmailLastError = result.ok
      ? ""
      : "The first-access email could not be delivered through Resend.";
    application.provisioningStatus = result.ok ? "PROVISIONED" : "EMAIL_FAILED";
    application.updatedAt = now;

    appendAuditLog(draft, {
      actorType: actorId ? "PLATFORM_ADMIN" : "SYSTEM",
      actorId,
      organizerId: organizer.id,
      eventType: "organizer_access_resent",
      entityType: "organizer_join_request",
      entityId: application.id,
      message: `Resent organizer access for ${admin.email}.`,
      metadata: {
        accessEmailSent: result.ok
      }
    });

    return {
      ok: result.ok,
      message: result.ok
        ? "Organizer access was sent successfully."
        : "The organizer access email could not be sent through Resend."
    };
  });
}
