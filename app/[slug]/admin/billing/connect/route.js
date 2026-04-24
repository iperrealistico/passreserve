import { NextResponse } from "next/server";

import { createOrganizerStripeConnectLink } from "../../../../../lib/passreserve-admin-service.js";
import { getValidatedOrganizerAdminSessionUser } from "../../../../../lib/passreserve-auth.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { slug } = await params;
  const sessionUser = await getValidatedOrganizerAdminSessionUser(slug);

  if (!sessionUser) {
    return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.url));
  }

  try {
    const result = await createOrganizerStripeConnectLink(slug, sessionUser.userId);

    if (!result?.url) {
      return NextResponse.redirect(
        new URL(`/${slug}/admin/billing?error=Organizer%20not%20found`, request.url)
      );
    }

    return NextResponse.redirect(result.url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Connect onboarding could not start.";

    return NextResponse.redirect(
      new URL(`/${slug}/admin/billing?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
