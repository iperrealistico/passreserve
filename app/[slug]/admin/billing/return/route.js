import { NextResponse } from "next/server";

import { refreshOrganizerStripeConnection } from "../../../../../lib/passreserve-admin-service.js";
import { getValidatedOrganizerAdminSessionUser } from "../../../../../lib/passreserve-auth.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { slug } = await params;
  const sessionUser = await getValidatedOrganizerAdminSessionUser(slug);

  if (!sessionUser) {
    return NextResponse.redirect(new URL(`/${slug}/admin/login`, request.url));
  }

  try {
    const result = await refreshOrganizerStripeConnection(slug, sessionUser.userId);
    let message = "stripe-connected";

    if (!result?.stripeAccountId) {
      message = "stripe-missing";
    } else if (result.stripeConnectionStatus === "RESTRICTED") {
      message = "stripe-restricted";
    } else if (result.stripeConnectionStatus !== "CONNECTED") {
      message = "stripe-pending";
    }

    return NextResponse.redirect(
      new URL(`/${slug}/admin/billing?message=${message}`, request.url)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe status could not be refreshed.";

    return NextResponse.redirect(
      new URL(`/${slug}/admin/billing?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
