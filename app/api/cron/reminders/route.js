import { NextResponse } from "next/server";

import { processRegistrationReminderDeliveries } from "../../../../lib/passreserve-service.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        message: "CRON_SECRET is required before reminder processing can run."
      },
      {
        status: 503
      }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized"
      },
      {
        status: 401
      }
    );
  }

  const result = await processRegistrationReminderDeliveries();

  return NextResponse.json(result);
}
