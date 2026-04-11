import { NextResponse } from "next/server";

import {
  constructStripeWebhookEvent
} from "../../../../lib/passreserve-payments.js";
import { processStripeWebhook } from "../../../../lib/passreserve-service.js";

export const runtime = "nodejs";

export async function POST(request) {
  const result = await constructStripeWebhookEvent(request);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message
      },
      {
        status: result.status
      }
    );
  }

  const processing = await processStripeWebhook(result.event);

  return NextResponse.json({
    ok: true,
    received: true,
    processing
  });
}
