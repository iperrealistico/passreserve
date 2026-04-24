"use server";

import { redirect } from "next/navigation";

import {
  changeOrganizerAdminPassword,
  deleteOrganizerEvent,
  markAdminLogin,
  recordVenuePayment,
  saveOrganizerEvent,
  saveOrganizerOccurrence,
  toggleOrganizerEventSuspended,
  updateOrganizerSettings,
  updateOrganizerRegistration
} from "../../../lib/passreserve-admin-service.js";
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
        collectDietaryInfo: checked(formData, "collectDietaryInfo"),
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
        published: value(formData, "published")
      },
      user.userId
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The occurrence could not be saved.";

    redirect(
      withRegistrationFilters(
        `/${slug}/admin/occurrences?error=${encodeURIComponent(message)}`,
        eventFilter
      )
    );
  }

  if (savedOccurrence?.id) {
    redirect(
      withRegistrationFilters(
        `/${slug}/admin/occurrences?message=saved&edit=${encodeURIComponent(savedOccurrence.id)}#date-form`,
        eventFilter
      )
    );
  }
}

export async function updateOrganizerRegistrationAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  const occurrenceFilter = value(formData, "occurrenceFilter");

  try {
    await updateOrganizerRegistration(
      slug,
      value(formData, "registrationId"),
      value(formData, "action"),
      user.userId
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The registration could not be updated.";

    redirect(
      withRegistrationFilters(
        `/${slug}/admin/registrations?error=${encodeURIComponent(message)}`,
        eventFilter,
        occurrenceFilter
      )
    );
  }

  redirect(
    withRegistrationFilters(
      `/${slug}/admin/registrations?message=updated`,
      eventFilter,
      occurrenceFilter
    )
  );
}

export async function recordVenuePaymentAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  const occurrenceFilter = value(formData, "occurrenceFilter");
  const amountCents = parseEurosToCents(formData.get("amountEuros"));

  if (amountCents <= 0) {
    redirect(
      withRegistrationFilters(
        `/${slug}/admin/registrations?error=${encodeURIComponent("Enter a valid amount collected at the venue.")}`,
        eventFilter,
        occurrenceFilter
      )
    );
  }

  try {
    await recordVenuePayment(slug, value(formData, "registrationId"), amountCents, user.userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The venue payment could not be recorded.";

    redirect(
      withRegistrationFilters(
        `/${slug}/admin/registrations?error=${encodeURIComponent(message)}`,
        eventFilter,
        occurrenceFilter
      )
    );
  }

  redirect(
    withRegistrationFilters(
      `/${slug}/admin/registrations?message=recorded`,
      eventFilter,
      occurrenceFilter
    )
  );
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
