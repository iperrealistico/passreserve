import { NextResponse } from "next/server";

import { getOrganizerRegistrationsAdmin } from "../../../../../lib/passreserve-admin-service.js";
import { getValidatedOrganizerAdminSessionUser } from "../../../../../lib/passreserve-auth.js";
import { buildRegistrationParticipantsPdf } from "../../../../../lib/passreserve-registration-pdf.js";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { slug } = await params;
  const sessionUser = await getValidatedOrganizerAdminSessionUser(slug);

  if (!sessionUser) {
    return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.url));
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "it" ? "it" : "en";
  const eventSlug = url.searchParams.get("event") || "";
  const occurrenceId = url.searchParams.get("occurrence") || "";
  const variant = url.searchParams.get("variant") === "full" ? "full" : "operational";

  if (!occurrenceId) {
    return NextResponse.json(
      {
        error: "Choose one occurrence before exporting the participant PDF."
      },
      {
        status: 400
      }
    );
  }

  const data = await getOrganizerRegistrationsAdmin(slug, locale);

  if (!data) {
    return NextResponse.json(
      {
        error: "Organizer not found."
      },
      {
        status: 404
      }
    );
  }

  const registrations = data.registrations.filter((registration) => {
    if (eventSlug && registration.eventSlug !== eventSlug) {
      return false;
    }

    return registration.occurrenceId === occurrenceId;
  });
  const occurrence = data.occurrences.find((entry) => entry.id === occurrenceId) || null;

  if (!occurrence || !registrations.length) {
    return NextResponse.json(
      {
        error: "No registrations were found for that occurrence."
      },
      {
        status: 404
      }
    );
  }

  const pdfBytes = await buildRegistrationParticipantsPdf({
    locale,
    organizerName: data.organizer.name,
    eventTitle: registrations[0].eventTitle,
    occurrenceLabel: occurrence.label,
    occurrenceTime: registrations[0].occurrenceTime,
    registrations,
    variant
  });

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="passreserve-${slug}-${occurrenceId}-${variant}.pdf"`
    }
  });
}
