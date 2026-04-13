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
  requireOrganizerAdminSession,
  restorePlatformAdminSession,
  signInOrganizerAdmin,
  signOutPassreserve
} from "../../../lib/passreserve-auth.js";

function value(formData, key) {
  return String(formData.get(key) || "").trim();
}

function withEventFilter(path, eventFilter = "") {
  if (!eventFilter) {
    return path;
  }

  return `${path}${path.includes("?") ? "&" : "?"}event=${encodeURIComponent(eventFilter)}`;
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
  const login = await authenticateOrganizerAdmin(
    slug,
    value(formData, "email"),
    value(formData, "password")
  );

  if (!login) {
    redirect(`/${slug}/admin/login?error=invalid`);
  }

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

  try {
    const savedEvent = await saveOrganizerEvent(
      slug,
      {
        id: value(formData, "id"),
        title: value(formData, "title"),
        slug: value(formData, "eventSlug"),
        category: value(formData, "category"),
        visibility: value(formData, "visibility"),
        summary: value(formData, "summary"),
        description: value(formData, "description"),
        audience: value(formData, "audience"),
        durationMinutes: value(formData, "durationMinutes"),
        venueTitle: value(formData, "venueTitle"),
        venueDetail: value(formData, "venueDetail"),
        mapHref: value(formData, "mapHref"),
        basePriceCents: value(formData, "basePriceCents"),
        prepayPercentage: value(formData, "prepayPercentage"),
        attendeeInstructions: value(formData, "attendeeInstructions"),
        organizerNotes: value(formData, "organizerNotes"),
        cancellationPolicy: value(formData, "cancellationPolicy"),
        highlights: value(formData, "highlights"),
        included: value(formData, "included"),
        policies: value(formData, "policies"),
        imageUrl: value(formData, "imageUrl")
      },
      user.userId
    );

    if (savedEvent?.id) {
      redirect(`/${slug}/admin/events?message=saved&edit=${encodeURIComponent(savedEvent.id)}#event-form`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "The event could not be saved.";
    redirect(`/${slug}/admin/events?error=${encodeURIComponent(message)}`);
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

  try {
    const savedOccurrence = await saveOrganizerOccurrence(
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
        venueTitle: value(formData, "venueTitle"),
        note: value(formData, "note"),
        imageUrl: value(formData, "imageUrl"),
        published: value(formData, "published")
      },
      user.userId
    );

    if (savedOccurrence?.id) {
      redirect(
        withEventFilter(
          `/${slug}/admin/occurrences?message=saved&edit=${encodeURIComponent(savedOccurrence.id)}#date-form`,
          eventFilter
        )
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The occurrence could not be saved.";

    redirect(withEventFilter(`/${slug}/admin/occurrences?error=${encodeURIComponent(message)}`, eventFilter));
  }
}

export async function updateOrganizerRegistrationAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");

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
      withEventFilter(`/${slug}/admin/registrations?error=${encodeURIComponent(message)}`, eventFilter)
    );
  }

  redirect(withEventFilter(`/${slug}/admin/registrations?message=updated`, eventFilter));
}

export async function recordVenuePaymentAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);
  const eventFilter = value(formData, "eventFilter");
  const amountCents = parseEurosToCents(formData.get("amountEuros"));

  if (amountCents <= 0) {
    redirect(
      withEventFilter(
        `/${slug}/admin/registrations?error=${encodeURIComponent("Enter a valid amount collected at the venue.")}`,
        eventFilter
      )
    );
  }

  try {
    await recordVenuePayment(slug, value(formData, "registrationId"), amountCents, user.userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The venue payment could not be recorded.";

    redirect(
      withEventFilter(`/${slug}/admin/registrations?error=${encodeURIComponent(message)}`, eventFilter)
    );
  }

  redirect(withEventFilter(`/${slug}/admin/registrations?message=recorded`, eventFilter));
}

export async function saveOrganizerSettingsAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  await updateOrganizerSettings(
    slug,
    {
      name: value(formData, "name"),
      tagline: value(formData, "tagline"),
      description: value(formData, "description"),
      city: value(formData, "city"),
      region: value(formData, "region"),
      publicEmail: value(formData, "publicEmail"),
      publicPhone: value(formData, "publicPhone"),
      interestEmail: value(formData, "interestEmail"),
      venueTitle: value(formData, "venueTitle"),
      venueDetail: value(formData, "venueDetail"),
      venueMapHref: value(formData, "venueMapHref"),
      venuesText: value(formData, "venuesText"),
      adminEmail: value(formData, "adminEmail"),
      adminName: value(formData, "adminName"),
      minAdvanceHours: value(formData, "minAdvanceHours"),
      maxAdvanceDays: value(formData, "maxAdvanceDays")
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
