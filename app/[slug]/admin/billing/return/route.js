import { NextResponse } from "next/server";

import { refreshOrganizerStripeConnection } from "../../../../../lib/passreserve-admin-service.js";
import { getCurrentSessionUser } from "../../../../../lib/passreserve-auth.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { slug } = await params;
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser || sessionUser.type !== "organizer" || sessionUser.organizerSlug !== slug) {
    return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.url));
  }

  try {
    await refreshOrganizerStripeConnection(slug, sessionUser.userId);

    return NextResponse.redirect(
      new URL(`/${slug}/admin/billing?message=stripe-connected`, request.url)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe status could not be refreshed.";

    return NextResponse.redirect(
      new URL(`/${slug}/admin/billing?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
