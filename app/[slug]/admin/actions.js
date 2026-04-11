"use server";

import { redirect } from "next/navigation";

import {
  markAdminLogin,
  recordVenuePayment,
  saveOrganizerEvent,
  saveOrganizerOccurrence,
  updateOrganizerRegistration
} from "../../../lib/passreserve-admin-service.js";
import {
  authenticateOrganizerAdmin,
  requestOrganizerPasswordReset,
  resetOrganizerPassword
} from "../../../lib/passreserve-service.js";
import {
  requireOrganizerAdminSession,
  signInOrganizerAdmin,
  signOutPassreserve
} from "../../../lib/passreserve-auth.js";

function value(formData, key) {
  return String(formData.get(key) || "").trim();
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

  await saveOrganizerEvent(
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
  redirect(`/${slug}/admin/events?message=saved`);
}

export async function saveOrganizerOccurrenceAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  await saveOrganizerOccurrence(
    slug,
    {
      id: value(formData, "id"),
      eventTypeId: value(formData, "eventTypeId"),
      status: value(formData, "status"),
      startsAt: value(formData, "startsAt"),
      endsAt: value(formData, "endsAt"),
      capacity: value(formData, "capacity"),
      priceCents: value(formData, "priceCents"),
      prepayPercentage: value(formData, "prepayPercentage"),
      venueTitle: value(formData, "venueTitle"),
      note: value(formData, "note"),
      imageUrl: value(formData, "imageUrl"),
      published: value(formData, "published")
    },
    user.userId
  );
  redirect(`/${slug}/admin/occurrences?message=saved`);
}

export async function updateOrganizerRegistrationAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  await updateOrganizerRegistration(
    slug,
    value(formData, "registrationId"),
    value(formData, "action"),
    user.userId
  );
  redirect(`/${slug}/admin/registrations?message=updated`);
}

export async function recordVenuePaymentAction(formData) {
  const slug = value(formData, "slug");
  const user = await requireOrganizerAdminSession(slug);

  await recordVenuePayment(
    slug,
    value(formData, "registrationId"),
    value(formData, "amountCents"),
    user.userId
  );
  redirect(`/${slug}/admin/payments?message=recorded`);
}
