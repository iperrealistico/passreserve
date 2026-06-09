"use server";

import { redirect } from "next/navigation";

import {
  changeOrganizerAdminPassword,
  deleteOrganizerEvent,
  markAdminLogin,
  publishOrganizerProfile,
  recordVenuePayment,
  retryOrganizerOccurrenceFailedRefunds,
  saveOrganizerEvent,
  saveOrganizerOccurrence,
  toggleOrganizerEventSuspended,
  updateOrganizerSettings,
  updateOrganizerRegistration
} from "../../../lib/passreserve-admin-service.js";
import {
  createOrganizerRegistration,
  ORGANIZER_MANUAL_REGISTRATION_MODE,
  organizerManualRegistrationSchema
} from "../../../lib/passreserve-registrations.js";
import {
  authenticateOrganizerAdmin,
  requestOrganizerPasswordReset,
  resetOrganizerPassword
} from "../../../lib/passreserve-service.js";
import {
  clearAdminLoginRateLimit,
  consumeAdminLoginRateLimit
} from "../../../lib/passreserve-auth-security.js";
import {
  requireOrganizerAdminSession,
  restorePlatformAdminSession,
  signInOrganizerAdmin,
  signOutPassreserve
} from "../../../lib/passreserve-auth.js";

function value(formData, key) {
  return String(formData.get(key) || "").trim();
}

function checked(formData, key) {
  return formData.get(key) === "on";
}

function parseOptionalJsonObjectField(formData, key) {
  const rawValue = value(formData, key);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function withRegistrationFilters(path, eventFilter = "", occurrenceFilter = "") {
  const params = new URLSearchParams();

  if (eventFilter) {
    params.set("event", eventFilter);
  }

  if (occurrenceFilter) {
    params.set("occurrence", occurrenceFilter);
  }

  const query = params.toString();

  if (!query) {
    return path;
  }

  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

function withQueryUpdates(path, updates = {}) {
  const [pathname, search = ""] = String(path || "").split("?");
  const params = new URLSearchParams(search);

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === "string" && value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getRegistrationsReturnPath(formData, slug, eventFilter = "", occurrenceFilter = "") {
  const fallback = withRegistrationFilters(`/${slug}/admin/registrations`, eventFilter, occurrenceFilter);
  const returnTo = value(formData, "returnTo");

  if (!returnTo.startsWith(`/${slug}/admin/registrations`)) {
    return fallback;
  }

  return returnTo;
}

function parseEurosToCents(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");

  if (!normalized) {
    return 0;
  }

  return Math.max(0, Math.round(Number(normalized) * 100));
}

function parseOptionalEurosToCents(rawValue) {
  const normalized = String(rawValue || "").trim();

  if (!normalized) {
    return "";
  }

  return String(parseEurosToCents(normalized));
}

function parseJsonArrayField(formData, key, emptyMessage) {
  const rawValue = value(formData, key);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      throw new Error(emptyMessage);
    }

    return parsed;
  } catch {
    throw new Error(emptyMessage);
  }
}

export async function organizerLoginAction(formData) {
  const slug = value(formData, "slug");
  const rateLimit = await consumeAdminLoginRateLimit("organizer", {
    slug
  });

  if (!rateLimit.success) {
    redirect(`/${slug}/admin/login?error=rate-limited`);
  }

  const login = await authenticateOrganizerAdmin(
    slug,
    value(formData, "email"),
    value(formData, "password")
  );

  if (!login) {
    redirect(`/${slug}/admin/login?error=invalid`);
  }

  await clearAdminLoginRateLimit("organizer", {
    slug
  });
  await markAdminLogin("organizer", login.admin.id);
  await signInOrganizerAdmin(login.admin, login.organizer);
  redirect(`/${slug}/admin/dashboard`);
}

export async function organizerLogoutAction(formData) {
  const slug = value(formData, "slug");

  await signOutPassreserve();
  redirect(`/${slug}/admin/login?message=signed-out`);
}

export async function returnToPlatformDashboardAction() {
  const restored = await restorePlatformAdminSession();

  if (!restored) {
    redirect("/admin/login");
  }

  redirect("/admin");
}

export async function organizerRequestResetAction(formData) {
  const slug = value(formData, "slug");

  await requestOrganizerPasswordReset(
    slug,
    value(formData, "email"),
    value(formData, "baseUrl")
  );
  redirect(`/${slug}/admin/login?message=reset-sent`);
}

export async function organizerResetPasswordAction(formData) {
  const slug = value(formData, "slug");
  const result = await resetOrganizerPassword(slug, {
    token: value(formData, "token"),
    password: value(formData, "password")
  });

  if (!result.ok) {
    redirect(`/${slug}/admin/login/reset/${value(formData, "token")}?error=invalid`);
  }

  redirect(`/${slug}/admin/login?message=password-updated`);
}

export async function saveOrganizerEventAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  let savedEvent;

  try {
    savedEvent = await saveOrganizerEvent(
      slug,
      {
        id: value(formData, "id"),
        title: value(formData, "titleEn") || value(formData, "titleIt"),
        slug: value(formData, "eventSlug"),
        category: value(formData, "category"),
        visibility: value(formData, "visibility"),
        titleIt: value(formData, "titleIt"),
        titleEn: value(formData, "titleEn"),
        summary: value(formData, "summaryEn") || value(formData, "summaryIt"),
        summaryIt: value(formData, "summaryIt"),
        summaryEn: value(formData, "summaryEn"),
        description: value(formData, "descriptionEn") || value(formData, "descriptionIt"),
        descriptionIt: value(formData, "descriptionIt"),
        descriptionEn: value(formData, "descriptionEn"),
        audience: value(formData, "audienceEn") || value(formData, "audienceIt"),
        audienceIt: value(formData, "audienceIt"),
        audienceEn: value(formData, "audienceEn"),
        durationMinutes: value(formData, "durationMinutes"),
        venueTitle: value(formData, "venueTitleEn") || value(formData, "venueTitleIt"),
        venueTitleIt: value(formData, "venueTitleIt"),
        venueTitleEn: value(formData, "venueTitleEn"),
        venueDetail: value(formData, "venueDetailEn") || value(formData, "venueDetailIt"),
        venueDetailIt: value(formData, "venueDetailIt"),
        venueDetailEn: value(formData, "venueDetailEn"),
        mapHref: value(formData, "mapHref"),
        basePriceCents: value(formData, "basePriceCents"),
        ticketCatalogJson: value(formData, "ticketCatalogJson"),
        prepayPercentage: value(formData, "prepayPercentage"),
        registrationQuestionnaireConfig: parseOptionalJsonObjectField(
          formData,
          "registrationQuestionnaireConfigJson"
        ),
        registrationConfirmationMode: value(formData, "registrationConfirmationMode"),
        salesWindowStartsAt: value(formData, "salesWindowStartsAt"),
        salesWindowEndsAt: value(formData, "salesWindowEndsAt"),
        attendeeInstructions:
          value(formData, "attendeeInstructionsEn") || value(formData, "attendeeInstructionsIt"),
        attendeeInstructionsIt: value(formData, "attendeeInstructionsIt"),
        attendeeInstructionsEn: value(formData, "attendeeInstructionsEn"),
        organizerNotes: value(formData, "organizerNotes"),
        cancellationPolicy:
          value(formData, "cancellationPolicyEn") || value(formData, "cancellationPolicyIt"),
        cancellationPolicyIt: value(formData, "cancellationPolicyIt"),
        cancellationPolicyEn: value(formData, "cancellationPolicyEn"),
        highlights: value(formData, "highlightsEn") || value(formData, "highlightsIt"),
        highlightsIt: value(formData, "highlightsIt"),
        highlightsEn: value(formData, "highlightsEn"),
        included: value(formData, "includedEn") || value(formData, "includedIt"),
        includedIt: value(formData, "includedIt"),
        includedEn: value(formData, "includedEn"),
        policies: value(formData, "policiesEn") || value(formData, "policiesIt"),
        policiesIt: value(formData, "policiesIt"),
        policiesEn: value(formData, "policiesEn"),
        galleryJson: value(formData, "galleryJson"),
        imageUrl: value(formData, "imageUrl")
      },
      user.userId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The event could not be saved.";
    redirect(`/${slug}/admin/events?error=${encodeURIComponent(message)}`);
  }

  if (savedEvent?.id) {
    redirect(`/${slug}/admin/events?message=saved&edit=${encodeURIComponent(savedEvent.id)}#event-form`);
  }

  redirect(`/${slug}/admin/events?message=saved`);
}

export async function suspendOrganizerEventAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  await toggleOrganizerEventSuspended(slug, value(formData, "eventId"), user.userId);
  redirect(`/${slug}/admin/events?message=status-updated`);
}

export async function deleteOrganizerEventAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  try {
    await deleteOrganizerEvent(slug, value(formData, "eventId"), user.userId);
    redirect(`/${slug}/admin/events?message=deleted`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The event could not be deleted.";

    redirect(`/${slug}/admin/events?error=${encodeURIComponent(message)}`);
  }
}

export async function saveOrganizerOccurrenceAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  let savedOccurrence;

  try {
    savedOccurrence = await saveOrganizerOccurrence(
      slug,
      {
        id: value(formData, "id"),
        eventTypeId: value(formData, "eventTypeId"),
        status: value(formData, "status"),
        startsAt: value(formData, "startsAt"),
        endsAt: value(formData, "endsAt"),
        capacity: value(formData, "capacity"),
        priceCents: parseOptionalEurosToCents(formData.get("priceEuros")),
        prepayPercentage: value(formData, "prepayPercentage"),
        salesWindowStartsAt: value(formData, "salesWindowStartsAt"),
        salesWindowEndsAt: value(formData, "salesWindowEndsAt"),
        venueTitle: value(formData, "venueTitleEn") || value(formData, "venueTitleIt"),
        venueTitleIt: value(formData, "venueTitleIt"),
        venueTitleEn: value(formData, "venueTitleEn"),
        note: value(formData, "noteEn") || value(formData, "noteIt"),
        noteIt: value(formData, "noteIt"),
        noteEn: value(formData, "noteEn"),
        imageUrl: value(formData, "imageUrl"),
        published: value(formData, "published"),
        cancelMode: value(formData, "cancelMode")
      },
      user.userId
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The occurrence could not be saved.";

    redirect(
      withRegistrationFilters(
        `/${slug}/admin/calendar?error=${encodeURIComponent(message)}`,
        eventFilter
      )
    );
  }

  if (savedOccurrence?.id) {
    const cancellationSummary = savedOccurrence.cancellationSummary;

    if (cancellationSummary) {
      const occurrenceMessage =
        Number(cancellationSummary.refundFailedCount || 0) > 0
          ? "occurrence-cancelled-refund-failed"
          : "occurrence-cancelled";
      redirect(
        withRegistrationFilters(
          `/${slug}/admin/calendar?message=${encodeURIComponent(occurrenceMessage)}&edit=${encodeURIComponent(savedOccurrence.id)}&cancelled=${encodeURIComponent(String(cancellationSummary.cancelledCount || 0))}&refundRequested=${encodeURIComponent(String(cancellationSummary.refundRequestedCount || 0))}&refundRequestedCents=${encodeURIComponent(String(cancellationSummary.refundRequestedCents || 0))}&refundSkipped=${encodeURIComponent(String(cancellationSummary.refundSkippedCount || 0))}&refundFailed=${encodeURIComponent(String(cancellationSummary.refundFailedCount || 0))}#date-form`,
          eventFilter
        )
      );
    }

    redirect(
      withRegistrationFilters(
        `/${slug}/admin/calendar?message=saved&edit=${encodeURIComponent(savedOccurrence.id)}#date-form`,
        eventFilter
      )
    );
  }
}

export async function retryOrganizerOccurrenceRefundsAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  const occurrenceId = value(formData, "occurrenceId");
  let retrySummary;

  try {
    retrySummary = await retryOrganizerOccurrenceFailedRefunds(slug, occurrenceId, user.userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The failed Stripe refunds could not be retried.";

    redirect(
      withRegistrationFilters(
        `/${slug}/admin/calendar?error=${encodeURIComponent(message)}&edit=${encodeURIComponent(occurrenceId)}#date-form`,
        eventFilter
      )
    );
  }

  const message =
    Number(retrySummary?.refundFailedCount || 0) > 0
      ? "occurrence-refunds-retry-failed"
      : "occurrence-refunds-retried";

  redirect(
    withRegistrationFilters(
      `/${slug}/admin/calendar?message=${encodeURIComponent(message)}&edit=${encodeURIComponent(occurrenceId)}&retried=${encodeURIComponent(String(retrySummary?.retryableCount || 0))}&refundRequested=${encodeURIComponent(String(retrySummary?.refundRequestedCount || 0))}&refundRequestedCents=${encodeURIComponent(String(retrySummary?.refundRequestedCents || 0))}&refundSkipped=${encodeURIComponent(String(retrySummary?.refundSkippedCount || 0))}&refundFailed=${encodeURIComponent(String(retrySummary?.refundFailedCount || 0))}#date-form`,
      eventFilter
    )
  );
}

export async function updateOrganizerRegistrationAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  const occurrenceFilter = value(formData, "occurrenceFilter");
  const action = value(formData, "action");
  const cancelMode = value(formData, "cancelMode");
  const returnPath = getRegistrationsReturnPath(formData, slug, eventFilter, occurrenceFilter);

  try {
    await updateOrganizerRegistration(
      slug,
      value(formData, "registrationId"),
      action,
      user.userId,
      {
        cancelMode
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The registration could not be updated.";

    redirect(withQueryUpdates(returnPath, { error: message, message: null }));
  }

  const message =
    action === "retry_refund"
      ? "refund_retried"
      : action === "cancel"
      ? cancelMode === "CANCEL_AND_REFUND_ONLINE"
        ? "refund_requested"
        : "cancelled"
      : "updated";

  redirect(withQueryUpdates(returnPath, { message, error: null }));
}

export async function recordVenuePaymentAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  const occurrenceFilter = value(formData, "occurrenceFilter");
  const amountCents = parseEurosToCents(formData.get("amountEuros"));
  const returnPath = getRegistrationsReturnPath(formData, slug, eventFilter, occurrenceFilter);

  if (amountCents <= 0) {
    redirect(
      withQueryUpdates(returnPath, {
        error: "Enter a valid amount collected at the venue.",
        message: null
      })
    );
  }

  try {
    await recordVenuePayment(slug, value(formData, "registrationId"), amountCents, user.userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The venue payment could not be recorded.";

    redirect(withQueryUpdates(returnPath, { error: message, message: null }));
  }

  redirect(withQueryUpdates(returnPath, { message: "recorded", error: null }));
}

export async function createOrganizerRegistrationAction(_previousState, formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  let items;
  let attendees;

  try {
    items = parseJsonArrayField(
      formData,
      "itemsJson",
      "The ticket selection payload could not be parsed."
    );
    attendees = parseJsonArrayField(
      formData,
      "attendeesJson",
      "The participant payload could not be parsed."
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The registration payload could not be parsed.";

    return {
      ok: false,
      message,
      fieldErrors: {
        attendees: message
      }
    };
  }

  const mode = value(formData, "mode");
  const parsedMode = Object.values(ORGANIZER_MANUAL_REGISTRATION_MODE).includes(mode)
    ? mode
    : ORGANIZER_MANUAL_REGISTRATION_MODE.REQUEST_CONFIRMATION;
  const parsed = organizerManualRegistrationSchema.safeParse({
    eventTypeId: value(formData, "eventTypeId"),
    occurrenceId: value(formData, "occurrenceId"),
    items,
    registrationLocale: value(formData, "registrationLocale") || "en",
    origin: value(formData, "origin") || "staff",
    attendees,
    mode: parsedMode,
    note: value(formData, "note"),
    baseUrl: value(formData, "baseUrl")
  });

  if (!parsed.success) {
    const fieldErrors = {};

    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0]] = issue.message;
    }

    return {
      ok: false,
      message: "We still need a few registration details before this registration can be created.",
      fieldErrors
    };
  }

  return createOrganizerRegistration(slug, parsed.data, {
    actorId: user.userId
  });
}

export async function saveOrganizerSettingsAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  await updateOrganizerSettings(
    slug,
    {
      name: value(formData, "nameEn") || value(formData, "nameIt"),
      nameIt: value(formData, "nameIt"),
      nameEn: value(formData, "nameEn"),
      tagline: value(formData, "taglineEn") || value(formData, "taglineIt"),
      taglineIt: value(formData, "taglineIt"),
      taglineEn: value(formData, "taglineEn"),
      description: value(formData, "descriptionEn") || value(formData, "descriptionIt"),
      descriptionIt: value(formData, "descriptionIt"),
      descriptionEn: value(formData, "descriptionEn"),
      publicSlug: value(formData, "publicSlug"),
      city: value(formData, "city"),
      region: value(formData, "region"),
      publicEmail: value(formData, "publicEmail"),
      publicPhone: value(formData, "publicPhone"),
      interestEmail: value(formData, "interestEmail"),
      venueTitle: value(formData, "venueTitleEn") || value(formData, "venueTitleIt"),
      venueTitleIt: value(formData, "venueTitleIt"),
      venueTitleEn: value(formData, "venueTitleEn"),
      venueDetail: value(formData, "venueDetailEn") || value(formData, "venueDetailIt"),
      venueDetailIt: value(formData, "venueDetailIt"),
      venueDetailEn: value(formData, "venueDetailEn"),
      venueMapHref: value(formData, "venueMapHref"),
      venuesText: value(formData, "venuesText"),
      adminEmail: value(formData, "adminEmail"),
      adminName: value(formData, "adminName"),
      registrationQuestionnaireConfig: parseOptionalJsonObjectField(
        formData,
        "registrationQuestionnaireConfigJson"
      ),
      registrationConfirmationMode: value(formData, "registrationConfirmationMode"),
      minAdvanceHours: value(formData, "minAdvanceHours"),
      maxAdvanceDays: value(formData, "maxAdvanceDays"),
      registrationRemindersEnabled: checked(formData, "registrationRemindersEnabled"),
      registrationReminderLeadHours: value(formData, "registrationReminderLeadHours"),
      registrationReminderNote: value(formData, "registrationReminderNote")
    },
    user.userId
  );
  redirect(`/${slug}/admin/settings?message=saved&tab=general`);
}

export async function publishOrganizerProfileAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const result = await publishOrganizerProfile(slug, user.userId);

  if (!result.ok) {
    redirect(`/${slug}/admin/settings?error=${encodeURIComponent(result.message)}&tab=general`);
  }

  redirect(`/${slug}/admin/settings?message=published&tab=general`);
}

export async function organizerChangePasswordAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const result = await changeOrganizerAdminPassword(
    slug,
    user.userId,
    value(formData, "currentPassword"),
    value(formData, "newPassword")
  );

  if (!result.ok) {
    redirect(`/${slug}/admin/settings?error=${encodeURIComponent(result.message)}&tab=security`);
  }

  redirect(`/${slug}/admin/settings?message=password-updated&tab=security`);
}
